"use client";

/**
 * Procedural 3D property model. Geometry is generated from the stored floor layout (wings, rooms, window and
 * balcony sides, common areas) and the property's template and exterior palette, so the 3D model and the 2D
 * floor plan always describe the same building. Each room mesh is bound to its stable physical-room ID.
 */
import { CameraControls, Html } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SideKey } from "@/lib/catalog-types";
import { AVAILABILITY_LABEL, type ExplorerData, type ExplorerRoom } from "@/lib/explorer-types";
import { subtractAll, type Rect } from "@/lib/layout/geometry";
import { exteriorPalette } from "@/lib/layout/palettes";
import { rng } from "@/lib/random";
import { SELECTED_COLOR, STATUS_3D } from "./status";
import type { FloorMode } from "./store";

export const FH = 1.3; // storey height in grid units (1 unit = 2.5 m)
const SLAB = 0.14;
const EXPLODE_GAP = 1.1;

export type CameraPreset = "overview" | "front" | "left" | "right" | "back" | "top";

export interface SceneHandle {
  preset: (p: CameraPreset) => void;
  zoom: (dir: 1 | -1) => void;
  rotate: (dir: 1 | -1) => void;
  focusRoom: (id: string) => void;
}

export interface SceneProps {
  data: ExplorerData;
  activeFloorId: string;
  floorMode: FloorMode;
  colorMode: "availability" | "exterior";
  selectedId: string | null;
  hoverId: string | null;
  cart: string[];
  matching: Set<string>;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

interface Layout {
  cx: number;
  cy: number;
  maxW: number;
  maxH: number;
  levelBase: (level: number) => number;
  height: number;
}

function useLayout(data: ExplorerData, floorMode: FloorMode): Layout {
  return useMemo(() => {
    const maxW = Math.max(...data.floors.map((f) => f.width));
    const maxH = Math.max(...data.floors.map((f) => f.height));
    const gap = floorMode === "explode" ? EXPLODE_GAP : 0;
    const levelBase = (level: number) => (level - 1) * (FH + gap);
    const top = Math.max(...data.floors.map((f) => f.level));
    return { cx: maxW / 2, cy: maxH / 2, maxW, maxH, levelBase, height: levelBase(top) + FH };
  }, [data.floors, floorMode]);
}

/** Plan rect -> world centre. Plan y=0 (front facade) faces +z, towards the default camera. */
const center = (L: Layout, r: Rect): [number, number] => [r.x + r.w / 2 - L.cx, L.cy - (r.y + r.h / 2)];

// ---------------------------------------------------------------- shared resources
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitPlane = new THREE.PlaneGeometry(1, 1);

function useMaterials() {
  const cache = useRef(new Map<string, THREE.MeshStandardMaterial>());
  useEffect(() => {
    const c = cache.current;
    return () => {
      c.forEach((m) => m.dispose());
      c.clear();
    };
  }, []);
  return (color: string, opts: { opacity?: number; emissive?: string; rough?: number; metal?: number } = {}) => {
    const key = `${color}|${opts.opacity ?? 1}|${opts.emissive ?? ""}|${opts.rough ?? 0.85}|${opts.metal ?? 0}`;
    let m = cache.current.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.rough ?? 0.85,
        metalness: opts.metal ?? 0,
        transparent: (opts.opacity ?? 1) < 1,
        opacity: opts.opacity ?? 1,
        depthWrite: (opts.opacity ?? 1) >= 1,
        emissive: opts.emissive ? new THREE.Color(opts.emissive) : undefined,
        emissiveIntensity: opts.emissive ? 0.35 : 0,
      });
      cache.current.set(key, m);
    }
    return m;
  };
}
type Mat = ReturnType<typeof useMaterials>;

// ---------------------------------------------------------------- room
function sidePlacement(room: ExplorerRoom, side: SideKey, L: Layout, offset: number) {
  const [x, z] = center(L, room);
  const hw = room.w / 2;
  const hd = room.h / 2;
  switch (side) {
    case "TOP":
      return { pos: [x, z + hd + offset] as const, rotY: 0, len: room.w };
    case "BOTTOM":
      return { pos: [x, z - hd - offset] as const, rotY: Math.PI, len: room.w };
    case "LEFT":
      return { pos: [x - hw - offset, z] as const, rotY: -Math.PI / 2, len: room.h };
    case "RIGHT":
      return { pos: [x + hw + offset, z] as const, rotY: Math.PI / 2, len: room.h };
  }
}

function RoomMesh({ room, L, base, mat, wallColor, trim, glass, opacity, selected, hovered, inCart, interactive, colorMode, onSelect, onHover }: {
  room: ExplorerRoom; L: Layout; base: number; mat: Mat; wallColor: string; trim: string; glass: string; opacity: number; selected: boolean; hovered: boolean; inCart: boolean; interactive: boolean;
  colorMode: "availability" | "exterior"; onSelect: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const [x, z] = center(L, room);
  const h = FH - SLAB - 0.02;
  const y = base + SLAB + h / 2;
  const color = selected || inCart ? SELECTED_COLOR : colorMode === "availability" ? STATUS_3D[room.status] : wallColor;
  const material = mat(color, { opacity, emissive: selected ? SELECTED_COLOR : hovered ? "#ffffff" : undefined });
  const glassMat = mat(glass, { opacity: Math.min(opacity, 0.92), rough: 0.15, metal: 0.2 });
  const railMat = mat(trim, { opacity });
  const slabMat = mat("#d8d2c6", { opacity });

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(room.id);
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          onHover(null);
          document.body.style.cursor = "";
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return; // a drag/orbit, not a click
          onSelect(room.id);
        },
      }
    : {};

  const windows = [room.windowSide, room.secondaryWindowSide].filter(Boolean) as SideKey[];
  return (
    <group userData={{ roomId: room.id }}>
      <mesh geometry={unitBox} material={material} position={[x, y, z]} scale={[room.w - 0.1, h, room.h - 0.1]} {...handlers} name={`room-${room.number}`} />
      {windows.map((side) => {
        const p = sidePlacement(room, side, L, -0.04);
        return <mesh key={side} geometry={unitPlane} material={glassMat} position={[p.pos[0], y + 0.05, p.pos[1]]} rotation={[0, p.rotY, 0]} scale={[p.len * 0.62, h * 0.55, 1]} />;
      })}
      {room.balconySide && (() => {
        const p = sidePlacement(room, room.balconySide, L, 0.24);
        const along = p.len - 0.3;
        return (
          <group position={[p.pos[0], base + SLAB, p.pos[1]]} rotation={[0, p.rotY, 0]}>
            <mesh geometry={unitBox} material={slabMat} position={[0, -0.04, 0]} scale={[along, 0.08, 0.48]} />
            <mesh geometry={unitBox} material={railMat} position={[0, 0.22, 0.22]} scale={[along, 0.04, 0.04]} />
            <mesh geometry={unitBox} material={glassMat} position={[0, 0.11, 0.23]} scale={[along, 0.2, 0.01]} />
          </group>
        );
      })()}
      {(hovered || selected) && interactive && (
        <Html position={[x, base + FH + 0.25, z]} center distanceFactor={undefined} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="rounded-full bg-primary-dark px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-lg">
            {room.number} · {selected ? "Selected" : AVAILABILITY_LABEL[room.status]}
          </div>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- roofs, slabs, surroundings
function GableRoof({ r, L, y, color, mat }: { r: Rect; L: Layout; y: number; color: string; mat: Mat }) {
  const geom = useMemo(() => {
    const alongX = r.w >= r.h;
    const span = (alongX ? r.h : r.w) + 0.6;
    const len = (alongX ? r.w : r.h) + 0.6;
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2, 0);
    shape.lineTo(span / 2, 0);
    shape.lineTo(0, Math.min(span * 0.42, 2.4));
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    g.translate(0, 0, -len / 2);
    if (alongX) g.rotateY(Math.PI / 2);
    return g;
  }, [r.w, r.h]);
  useEffect(() => () => geom.dispose(), [geom]);
  const [x, z] = center(L, r);
  return <mesh geometry={geom} material={mat(color, { rough: 0.7 })} position={[x, y, z]} castShadow />;
}

function Parapet({ r, L, y, color, mat }: { r: Rect; L: Layout; y: number; color: string; mat: Mat }) {
  const [x, z] = center(L, r);
  const m = mat(color);
  const t = 0.12;
  const hgt = 0.35;
  return (
    <group position={[x, y + hgt / 2, z]}>
      <mesh geometry={unitBox} material={m} position={[0, 0, r.h / 2 - t / 2]} scale={[r.w, hgt, t]} />
      <mesh geometry={unitBox} material={m} position={[0, 0, -r.h / 2 + t / 2]} scale={[r.w, hgt, t]} />
      <mesh geometry={unitBox} material={m} position={[r.w / 2 - t / 2, 0, 0]} scale={[t, hgt, r.h]} />
      <mesh geometry={unitBox} material={m} position={[-r.w / 2 + t / 2, 0, 0]} scale={[t, hgt, r.h]} />
    </group>
  );
}

function Chhatri({ x, z, y, color, trim, mat }: { x: number; z: number; y: number; color: string; trim: string; mat: Mat }) {
  return (
    <group position={[x, y, z]}>
      {[[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].map(([dx, dz], i) => (
        <mesh key={i} material={mat(trim)} position={[dx, 0.35, dz]}>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
        </mesh>
      ))}
      <mesh material={mat(color)} position={[0, 0.72, 0]}>
        <boxGeometry args={[1, 0.08, 1]} />
      </mesh>
      <mesh material={mat(color)} position={[0, 0.76, 0]}>
        <sphereGeometry args={[0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

function Tree({ x, z, s, kind }: { x: number; z: number; s: number; kind: "pine" | "round" | "palm" }) {
  if (kind === "pine")
    return (
      <group position={[x, 0, z]} scale={s}>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.08, 0.1, 0.6, 6]} /><meshStandardMaterial color="#6b4a35" /></mesh>
        <mesh position={[0, 1.2, 0]}><coneGeometry args={[0.6, 1.8, 8]} /><meshStandardMaterial color="#2b5443" roughness={0.9} /></mesh>
      </group>
    );
  if (kind === "palm")
    return (
      <group position={[x, 0, z]} scale={s}>
        <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0.12]}><cylinderGeometry args={[0.06, 0.09, 1.8, 6]} /><meshStandardMaterial color="#8a6a4c" /></mesh>
        <mesh position={[0.1, 1.85, 0]}><sphereGeometry args={[0.55, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2.4]} /><meshStandardMaterial color="#2f7a46" roughness={0.9} /></mesh>
      </group>
    );
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.08, 0.1, 0.7, 6]} /><meshStandardMaterial color="#6b4a35" /></mesh>
      <mesh position={[0, 1.05, 0]}><icosahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color="#4b8a45" roughness={0.9} flatShading /></mesh>
    </group>
  );
}

function Surroundings({ data, L }: { data: ExplorerData; L: Layout }) {
  const view = data.hotel.frontView;
  const r = rng(`scene3d:${data.hotel.id}`);
  const front = L.maxH / 2;
  const groundColor = view === "CITY" ? "#b9bfbf" : view === "SEA" ? "#e7dcc1" : view === "COURTYARD" ? "#d9c9a8" : "#a8c48e";
  const trees = useMemo(() => {
    const kind: "pine" | "round" | "palm" = data.hotel.template === "MOUNTAIN_LODGE" || view === "MOUNTAIN" || view === "VALLEY" ? "pine" : view === "SEA" || data.hotel.template === "COASTAL_RESORT" ? "palm" : "round";
    const out: { x: number; z: number; s: number; kind: typeof kind }[] = [];
    for (let i = 0; i < 26; i++) {
      const ang = r.range(0, Math.PI * 2);
      const rad = Math.max(L.maxW, L.maxH) / 2 + r.range(2.5, 9);
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      if (z > front + 1 && (view === "SEA" || view === "LAKE" || view === "RIVER")) continue;
      out.push({ x, z, s: r.range(0.9, 1.6), kind });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.hotel.id]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>
      {(view === "SEA" || view === "LAKE" || view === "RIVER") && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, front + 4 + 20]}>
          <planeGeometry args={[120, 40]} />
          <meshStandardMaterial color={view === "SEA" ? "#3f9fb8" : "#4f8fa6"} roughness={0.25} metalness={0.1} />
        </mesh>
      )}
      {view === "POOL" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, front + 3.2]}>
          <planeGeometry args={[Math.max(6, L.maxW * 0.6), 3]} />
          <meshStandardMaterial color="#5fc4d6" roughness={0.2} />
        </mesh>
      )}
      {(view === "MOUNTAIN" || view === "VALLEY") &&
        [-30, -18, -5, 9, 22, 34].map((x, i) => (
          <group key={i} position={[x, 0, -32 - (i % 2) * 6]}>
            <mesh position={[0, 6 + (i % 3) * 2, 0]}><coneGeometry args={[9, 12 + (i % 3) * 4, 6]} /><meshStandardMaterial color="#6f8796" flatShading /></mesh>
            <mesh position={[0, 11.5 + (i % 3) * 4, 0]}><coneGeometry args={[3.2, 3.5, 6]} /><meshStandardMaterial color="#f4f6f7" flatShading /></mesh>
          </group>
        ))}
      {view === "CITY" &&
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const rad = Math.max(L.maxW, L.maxH) / 2 + 14 + (i % 3) * 4;
          const h = 4 + ((i * 7) % 9);
          return (
            <mesh key={i} position={[Math.cos(a) * rad, h / 2, Math.sin(a) * rad - 4]}>
              <boxGeometry args={[4, h, 4]} />
              <meshStandardMaterial color={i % 2 ? "#8e9aa6" : "#a8b1ba"} />
            </mesh>
          );
        })}
      {trees.map((t, i) => (
        <Tree key={i} {...t} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- building
function Building(props: SceneProps & { L: Layout }) {
  const { data, L, activeFloorId, floorMode, colorMode, selectedId, hoverId, cart, matching, onSelect, onHover } = props;
  const mat = useMaterials();
  const pal = exteriorPalette(data.hotel.template, data.hotel.palette);
  const activeLevel = data.floors.find((f) => f.id === activeFloorId)?.level ?? 1;
  const topLevel = Math.max(...data.floors.map((f) => f.level));
  const roomsByFloor = useMemo(() => {
    const m = new Map<string, ExplorerRoom[]>();
    for (const r of data.rooms) m.set(r.floorId, [...(m.get(r.floorId) ?? []), r]);
    return m;
  }, [data.rooms]);

  return (
    <group>
      {data.floors.map((f) => {
        const hidden = floorMode === "cutaway" && f.level > activeLevel;
        if (hidden) return null;
        const isActive = f.level === activeLevel;
        const focus = floorMode !== "all";
        const opacity = focus && !isActive ? 0.28 : 1;
        const base = L.levelBase(f.level);
        const above = data.floors.find((x) => x.level === f.level + 1);
        const showRoof = f.level === topLevel || floorMode === "explode" || (floorMode === "cutaway" && isActive);
        const roofRects = showRoof ? f.wings : subtractAll(f.wings, above?.wings ?? []);
        const isTop = f.level === topLevel && floorMode !== "explode" && !(floorMode === "cutaway" && isActive && f.level !== topLevel);
        const roofY = base + FH;
        return (
          <group key={f.id} name={`floor-${f.level}`}>
            {f.wings.map((w, i) => {
              const [x, z] = center(L, w);
              return <mesh key={i} geometry={unitBox} material={mat(pal.base, { opacity })} position={[x, base + SLAB / 2, z]} scale={[w.w, SLAB, w.h]} />;
            })}
            {f.elements
              .filter((e) => e.kind === "ELEVATOR" || e.kind === "STAIRS" || e.kind === "LOBBY")
              .map((e) => {
                const [x, z] = center(L, e);
                return <mesh key={e.id} geometry={unitBox} material={mat(e.kind === "LOBBY" ? pal.glass : pal.base, { opacity })} position={[x, base + FH / 2, z]} scale={[e.w - 0.1, FH - 0.04, e.h - 0.1]} />;
              })}
            {f.level === 1 &&
              f.elements
                .filter((e) => e.kind === "COURTYARD" || e.kind === "GARDEN")
                .map((e) => {
                  const [x, z] = center(L, e);
                  return (
                    <group key={e.id}>
                      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}>
                        <planeGeometry args={[e.w, e.h]} />
                        <meshStandardMaterial color={e.kind === "GARDEN" ? "#8fbf72" : "#e4d3b0"} />
                      </mesh>
                      {e.kind === "COURTYARD" && (
                        <mesh position={[x, 0.15, z]}>
                          <cylinderGeometry args={[Math.min(e.w, e.h) * 0.25, Math.min(e.w, e.h) * 0.28, 0.3, 20]} />
                          <meshStandardMaterial color="#6cc0d1" />
                        </mesh>
                      )}
                    </group>
                  );
                })}
            {(roomsByFloor.get(f.id) ?? []).map((room) => (
              <RoomMesh
                key={room.id}
                room={room}
                L={L}
                base={base}
                mat={mat}
                wallColor={pal.wall}
                trim={pal.trim}
                glass={pal.glass}
                opacity={opacity < 1 ? opacity : matching.has(room.id) ? 1 : 0.35}
                selected={room.id === selectedId}
                hovered={room.id === hoverId}
                inCart={cart.includes(room.id)}
                interactive={!focus || isActive}
                colorMode={colorMode}
                onSelect={onSelect}
                onHover={onHover}
              />
            ))}
            {roofRects.map((r, i) => {
              const [x, z] = center(L, r);
              return (
                <group key={`roof-${i}`}>
                  <mesh geometry={unitBox} material={mat(pal.roof, { opacity })} position={[x, roofY + 0.06, z]} scale={[r.w + 0.2, 0.12, r.h + 0.2]} />
                  {isTop && (data.hotel.template === "MOUNTAIN_LODGE" || data.hotel.template === "GARDEN_RETREAT") && opacity === 1 && <GableRoof r={r} L={L} y={roofY + 0.12} color={pal.roof} mat={mat} />}
                  {(!isTop || data.hotel.template === "CITY_MODERN" || data.hotel.template === "COASTAL_RESORT" || data.hotel.template === "HERITAGE_BOUTIQUE") && opacity === 1 && <Parapet r={r} L={L} y={roofY + 0.12} color={pal.trim} mat={mat} />}
                </group>
              );
            })}
            {isTop && data.hotel.template === "HERITAGE_BOUTIQUE" && opacity === 1 &&
              (() => {
                const all = f.wings;
                const x0 = Math.min(...all.map((w) => w.x));
                const x1 = Math.max(...all.map((w) => w.x + w.w));
                const y0 = Math.min(...all.map((w) => w.y));
                const y1 = Math.max(...all.map((w) => w.y + w.h));
                return [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, y1 - 1], [x1 - 1, y1 - 1]].map(([px, py], i) => (
                  <Chhatri key={i} x={px - L.cx} z={L.cy - py} y={roofY + 0.12} color={pal.roof} trim={pal.trim} mat={mat} />
                ));
              })()}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------- camera + test hook
const Rig = forwardRef<SceneHandle, { data: ExplorerData; L: Layout; activeFloorId: string; reducedMotion: boolean; floorMode: FloorMode }>(function Rig({ data, L, activeFloorId, reducedMotion, floorMode }, ref) {
  const controls = useRef<CameraControls>(null);
  const { camera, size, invalidate } = useThree();
  const D = Math.max(L.maxW, L.maxH, L.height) * 1.35 + 8;
  const activeLevel = data.floors.find((f) => f.id === activeFloorId)?.level ?? 1;
  const targetY = floorMode === "all" ? L.height * 0.45 : L.levelBase(activeLevel) + FH / 2;
  const animate = !reducedMotion;

  const preset = (p: CameraPreset) => {
    const c = controls.current;
    if (!c) return;
    const t = targetY;
    const pos: Record<CameraPreset, [number, number, number]> = {
      overview: [D * 0.62, t + D * 0.55, D * 0.85],
      front: [0, t + D * 0.25, D * 1.05],
      back: [0, t + D * 0.25, -D * 1.05],
      left: [-D * 1.05, t + D * 0.25, 0],
      right: [D * 1.05, t + D * 0.25, 0],
      top: [0, t + D * 1.5, 0.01],
    };
    c.setLookAt(...pos[p], 0, t, 0, animate);
  };

  useImperativeHandle(ref, () => ({
    preset,
    zoom: (dir) => controls.current?.dolly(dir * D * 0.18, animate),
    rotate: (dir) => controls.current?.rotate((dir * Math.PI) / 8, 0, animate),
    focusRoom: (id) => {
      const r = data.rooms.find((x) => x.id === id);
      if (!r || !controls.current) return;
      const [x, z] = center(L, r);
      controls.current.setTarget(x, L.levelBase(r.level) + FH / 2, z, animate);
    },
  }));

  useLayoutEffect(() => {
    preset("overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.hotel.id]);

  // Keep the orbit target on the active floor so floor changes visibly move the scene.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const t = new THREE.Vector3();
    c.getTarget(t);
    c.setTarget(t.x, targetY, t.z, animate);
  }, [targetY, animate]);

  // Test/automation hook: project a room's centre to canvas pixels.
  useEffect(() => {
    const w = window as unknown as { __viewstay3d?: unknown };
    w.__viewstay3d = {
      ready: true,
      project: (roomId: string) => {
        const r = data.rooms.find((x) => x.id === roomId);
        if (!r) return null;
        const [x, z] = center(L, r);
        const v = new THREE.Vector3(x, L.levelBase(r.level) + FH / 2, z).project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
      rerender: () => invalidate(),
    };
    return () => {
      delete w.__viewstay3d;
    };
  }, [data, L, camera, size, invalidate]);

  return <CameraControls ref={controls} makeDefault minDistance={4} maxDistance={D * 2.2} maxPolarAngle={Math.PI / 2 - 0.05} dollySpeed={0.6} smoothTime={0.35} />;
});

export const HotelScene = forwardRef<SceneHandle, SceneProps>(function HotelScene(props, ref) {
  const L = useLayout(props.data, props.floorMode);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 40, near: 0.1, far: 400, position: [20, 20, 30] }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      onPointerMissed={() => props.onHover(null)}
      style={{ background: "linear-gradient(#cfe1ea, #eef3f1)" }}
    >
      <hemisphereLight args={["#f3f7fb", "#8a9a7a", 1.1]} />
      <directionalLight position={[18, 30, 22]} intensity={1.6} />
      <directionalLight position={[-20, 12, -10]} intensity={0.45} />
      <Surroundings data={props.data} L={L} />
      <Building {...props} L={L} />
      <Rig ref={ref} data={props.data} L={L} activeFloorId={props.activeFloorId} reducedMotion={props.reducedMotion} floorMode={props.floorMode} />
    </Canvas>
  );
});
