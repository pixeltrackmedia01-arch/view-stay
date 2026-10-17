"use client";

import dynamic from "next/dynamic";
import { Box, Building2, Layers, Minus, Palette, Plus, RotateCcw, RotateCw, ScanEye } from "lucide-react";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CameraPreset, SceneHandle } from "./hotel-scene";
import { useExplorer, useFilteredIds } from "./store";

const HotelScene = dynamic(() => import("./hotel-scene").then((m) => m.HotelScene), {
  ssr: false,
  loading: () => <SceneLoading />,
});

function SceneLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(180deg,#eef3f4,#f7f5ef)]" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-sm text-ink-2">
        <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        Building the 3D property model…
      </div>
    </div>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("3D explorer failed, falling back to the floor plan", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "front", label: "Front" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "back", label: "Back" },
  { id: "top", label: "Top" },
];

/**
 * Interactive procedural 3D model of the property. The model is generated from the same stored floor layout as the
 * 2D plan, so room identity, position and status are shared. Falls back to the plan when WebGL is unavailable.
 */
export function Hotel3D({ className, onFallback, tall }: { className?: string; onFallback?: () => void; tall?: boolean }) {
  const data = useExplorer((s) => s.data);
  const floorId = useExplorer((s) => s.floorId);
  const floorMode = useExplorer((s) => s.floorMode);
  const colorMode = useExplorer((s) => s.colorMode);
  const selectedId = useExplorer((s) => s.selectedRoomId);
  const hoverId = useExplorer((s) => s.hoverRoomId);
  const cart = useExplorer((s) => s.cart);
  const selectRoom = useExplorer((s) => s.selectRoom);
  const hoverRoom = useExplorer((s) => s.hoverRoom);
  const setFloorMode = useExplorer((s) => s.setFloorMode);
  const setColorMode = useExplorer((s) => s.setColorMode);
  const setFloor = useExplorer((s) => s.setFloor);
  const matching = useFilteredIds();
  const reducedMotion = usePrefersReducedMotion();
  const scene = useRef<SceneHandle>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [preset, setPreset] = useState<CameraPreset>("overview");

  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => {
    if (selectedId) scene.current?.focusRoom(selectedId);
  }, [selectedId]);

  const activeFloor = data.floors.find((f) => f.id === floorId);
  const fallback = (
    <div className="absolute inset-0 grid place-items-center p-6">
      <Alert tone="info" title="3D view isn't available on this device" action={onFallback && <Button size="sm" variant="secondary" onClick={onFallback}>Open the 2D floor plan</Button>}>
        Your browser couldn&apos;t start WebGL. The floor plan and room list show exactly the same rooms and availability.
      </Alert>
    </div>
  );

  // Keyboard: arrows move between rooms on the active floor, PageUp/PageDown change floors, Enter selects.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const floorRooms = data.rooms.filter((r) => r.floorId === floorId).sort((a, b) => a.y - b.y || a.x - b.x);
    if (!floorRooms.length) return;
    const idx = floorRooms.findIndex((r) => r.id === selectedId);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      selectRoom(floorRooms[(idx + 1) % floorRooms.length].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectRoom(floorRooms[(idx - 1 + floorRooms.length) % floorRooms.length].id);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const fi = data.floors.findIndex((f) => f.id === floorId);
      const next = data.floors[Math.max(0, Math.min(data.floors.length - 1, fi + (e.key === "PageUp" ? 1 : -1)))];
      if (next) setFloor(next.id);
    } else if (e.key === "+" || e.key === "=") scene.current?.zoom(1);
    else if (e.key === "-") scene.current?.zoom(-1);
  };

  const selected = data.rooms.find((r) => r.id === selectedId);
  return (
    <div
      className={cn("relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-[linear-gradient(180deg,#e7eff1,#f8f6f0)]", tall ? "h-[min(72dvh,720px)]" : "h-[440px] sm:h-[520px]", className)}
      data-testid="hotel-3d"
      data-active-level={activeFloor?.level}
      data-selected-room={selected?.number ?? ""}
      data-floor-mode={floorMode}
    >
      <div
        tabIndex={0}
        role="application"
        aria-label={`Illustrative 3D model of ${data.hotel.name}. ${activeFloor ? `Showing ${activeFloor.name}.` : ""} Use arrow keys to move between rooms, Page Up and Page Down to change floors, plus and minus to zoom.${selected ? ` Selected: room ${selected.number}.` : ""}`}
        onKeyDown={onKeyDown}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        {webgl === null ? (
          <SceneLoading />
        ) : webgl ? (
          <SceneBoundary fallback={fallback}>
            <HotelScene
              ref={scene}
              data={data}
              activeFloorId={floorId}
              floorMode={floorMode}
              colorMode={colorMode}
              selectedId={selectedId}
              hoverId={hoverId}
              cart={cart}
              matching={matching}
              reducedMotion={reducedMotion}
              onSelect={(id) => selectRoom(id, { openSheet: true })}
              onHover={hoverRoom}
            />
          </SceneBoundary>
        ) : (
          fallback
        )}
      </div>

      {/* Top-left: honesty label */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink-2 shadow-sm backdrop-blur">
        <Box className="size-3.5" aria-hidden /> Illustrative 3D property model
      </div>

      {webgl && (
        <>
          {/* Top-right: view presets */}
          <div className="absolute top-3 right-3 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-1 max-sm:top-12 max-sm:left-3 max-sm:justify-start" role="group" aria-label="Camera views">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => {
                  setPreset(p.id);
                  scene.current?.preset(p.id);
                }}
                className={cn("min-h-9 rounded-full px-3 text-xs font-medium shadow-sm backdrop-blur transition-colors", preset === p.id ? "bg-primary text-white" : "bg-white/90 text-ink hover:bg-white")}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Bottom-left: floor mode + colour mode */}
          <div className="absolute bottom-3 left-3 flex flex-wrap items-end gap-2">
            <Segmented
              label="Floor display"
              value={floorMode}
              onChange={setFloorMode}
              className="bg-white/90 shadow-sm backdrop-blur"
              options={[
                { id: "all", label: "Whole building", icon: Building2 },
                { id: "cutaway", label: "Cutaway", icon: ScanEye },
                { id: "explode", label: "Exploded", icon: Layers },
              ]}
            />
            <button
              type="button"
              onClick={() => setColorMode(colorMode === "availability" ? "exterior" : "availability")}
              aria-pressed={colorMode === "exterior"}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-medium text-ink shadow-sm backdrop-blur hover:bg-white"
            >
              <Palette className="size-4" aria-hidden />
              {colorMode === "availability" ? "Show exterior colours" : "Show availability"}
            </button>
          </div>

          {/* Bottom-right: zoom / rotate / reset */}
          <div className="absolute right-3 bottom-3 flex flex-col gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur" role="group" aria-label="Camera controls">
            <IconCtl label="Zoom in" onClick={() => scene.current?.zoom(1)} icon={Plus} />
            <IconCtl label="Zoom out" onClick={() => scene.current?.zoom(-1)} icon={Minus} />
            <IconCtl label="Rotate left" onClick={() => scene.current?.rotate(-1)} icon={RotateCcw} />
            <IconCtl label="Rotate right" onClick={() => scene.current?.rotate(1)} icon={RotateCw} />
            <IconCtl
              label="Reset view"
              onClick={() => {
                setPreset("overview");
                scene.current?.preset("overview");
              }}
              icon={ScanEye}
            />
          </div>
        </>
      )}
    </div>
  );
}

function IconCtl({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-10 place-items-center rounded-full text-ink hover:bg-subtle">
      <Icon className="size-4" />
    </button>
  );
}
