"use client";

import { createContext, useContext, useMemo, useRef } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { ExplorerData, ExplorerRoom } from "@/lib/explorer-types";
import type { ViewKey } from "@/lib/catalog-types";

export type ExplorerMode = "3d" | "plan" | "list";
export type FloorMode = "all" | "cutaway" | "explode";

export interface RoomFilters {
  views: ViewKey[];
  balcony: boolean;
  corner: boolean;
  highFloor: boolean;
  largeWindows: boolean;
  availableOnly: boolean;
  categories: string[];
  maxPrice: number | null;
  minSize: number | null;
}

export const EMPTY_FILTERS: RoomFilters = { views: [], balcony: false, corner: false, highFloor: false, largeWindows: false, availableOnly: false, categories: [], maxPrice: null, minSize: null };

export interface ExplorerState {
  data: ExplorerData;
  mode: ExplorerMode;
  floorId: string;
  floorMode: FloorMode;
  colorMode: "availability" | "exterior";
  selectedRoomId: string | null;
  hoverRoomId: string | null;
  /** Rooms the customer intends to book together (up to stay.rooms). */
  cart: string[];
  compare: string[];
  filters: RoomFilters;
  galleryRoomId: string | null;
  interiorRoomId: string | null;
  compareOpen: boolean;
  /** Mobile bottom sheet with the selected room. */
  sheetOpen: boolean;
  setData: (d: ExplorerData) => void;
  setMode: (m: ExplorerMode) => void;
  setFloor: (id: string) => void;
  setFloorMode: (m: FloorMode) => void;
  setColorMode: (m: "availability" | "exterior") => void;
  selectRoom: (id: string | null, opts?: { openSheet?: boolean }) => void;
  hoverRoom: (id: string | null) => void;
  toggleCart: (id: string) => void;
  clearCart: () => void;
  toggleCompare: (id: string) => void;
  setFilters: (f: Partial<RoomFilters>) => void;
  resetFilters: () => void;
  openGallery: (id: string | null) => void;
  openInterior: (id: string | null) => void;
  setCompareOpen: (v: boolean) => void;
  setSheetOpen: (v: boolean) => void;
}

const Ctx = createContext<StoreApi<ExplorerState> | null>(null);

export function ExplorerProvider({ data, initialRoomId, initialMode, children }: { data: ExplorerData; initialRoomId?: string | null; initialMode?: ExplorerMode; children: React.ReactNode }) {
  const ref = useRef<StoreApi<ExplorerState> | null>(null);
  if (!ref.current) {
    const initialRoom = data.rooms.find((r) => r.id === initialRoomId) ?? null;
    const firstFloor = initialRoom?.floorId ?? data.floors.find((f) => data.rooms.some((r) => r.floorId === f.id && r.status === "AVAILABLE"))?.id ?? data.floors[0]?.id ?? "";
    ref.current = createStore<ExplorerState>((set, get) => ({
      data,
      mode: initialMode ?? "plan",
      floorId: firstFloor,
      floorMode: initialRoom ? "cutaway" : "all",
      colorMode: "availability",
      selectedRoomId: initialRoom?.id ?? null,
      hoverRoomId: null,
      cart: initialRoom && (initialRoom.status === "AVAILABLE" || initialRoom.status === "HELD_BY_YOU") ? [initialRoom.id] : [],
      compare: [],
      filters: EMPTY_FILTERS,
      galleryRoomId: null,
      interiorRoomId: null,
      compareOpen: false,
      sheetOpen: false,
      setData: (d) => {
        // Keep selection, but drop cart/compare entries that are no longer bookable.
        const ok = new Set(d.rooms.filter((r) => r.status === "AVAILABLE" || r.status === "HELD_BY_YOU").map((r) => r.id));
        set({ data: d, cart: get().cart.filter((id) => ok.has(id)), compare: get().compare.filter((id) => d.rooms.some((r) => r.id === id)) });
      },
      setMode: (mode) => set({ mode }),
      setFloor: (floorId) => set((s) => ({ floorId, floorMode: s.floorMode === "all" ? "cutaway" : s.floorMode })),
      setFloorMode: (floorMode) => set({ floorMode }),
      setColorMode: (colorMode) => set({ colorMode }),
      selectRoom: (id, opts) => {
        const room = id ? get().data.rooms.find((r) => r.id === id) : null;
        set((s) => ({ selectedRoomId: id, floorId: room?.floorId ?? s.floorId, sheetOpen: opts?.openSheet ?? s.sheetOpen }));
      },
      hoverRoom: (hoverRoomId) => set({ hoverRoomId }),
      toggleCart: (id) =>
        set((s) => {
          if (s.cart.includes(id)) return { cart: s.cart.filter((x) => x !== id) };
          const max = s.data.stay.rooms;
          return { cart: max === 1 ? [id] : s.cart.length >= max ? [...s.cart.slice(1), id] : [...s.cart, id] };
        }),
      clearCart: () => set({ cart: [] }),
      toggleCompare: (id) => set((s) => ({ compare: s.compare.includes(id) ? s.compare.filter((x) => x !== id) : [...s.compare, id].slice(-3) })),
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: EMPTY_FILTERS }),
      openGallery: (galleryRoomId) => set({ galleryRoomId }),
      openInterior: (interiorRoomId) => set({ interiorRoomId }),
      setCompareOpen: (compareOpen) => set({ compareOpen }),
      setSheetOpen: (sheetOpen) => set({ sheetOpen }),
    }));
  }
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}

export function useExplorer<T>(selector: (s: ExplorerState) => T): T {
  const store = useContext(Ctx);
  if (!store) throw new Error("useExplorer must be used inside ExplorerProvider");
  return useStore(store, selector);
}

export function useExplorerApi() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useExplorerApi must be used inside ExplorerProvider");
  return store;
}

export function roomMatches(r: ExplorerRoom, f: RoomFilters, maxLevel: number) {
  if (f.views.length && !f.views.includes(r.viewType)) return false;
  if (f.balcony && !r.hasBalcony) return false;
  if (f.corner && !r.isCorner) return false;
  if (f.highFloor && r.level < Math.max(2, maxLevel - 1)) return false;
  if (f.largeWindows && r.windowCount < 2) return false;
  if (f.availableOnly && r.status !== "AVAILABLE" && r.status !== "HELD_BY_YOU") return false;
  if (f.categories.length && !f.categories.includes(r.category)) return false;
  if (f.maxPrice && r.nightlyRate > f.maxPrice) return false;
  if (f.minSize && r.sizeSqm < f.minSize) return false;
  return true;
}

export function useFilteredIds() {
  const rooms = useExplorer((s) => s.data.rooms);
  const filters = useExplorer((s) => s.filters);
  const maxLevel = useExplorer((s) => Math.max(...s.data.floors.map((f) => f.level)));
  return useMemo(() => new Set(rooms.filter((r) => roomMatches(r, filters, maxLevel)).map((r) => r.id)), [rooms, filters, maxLevel]);
}

export function useSelectedRoom() {
  return useExplorer((s) => (s.selectedRoomId ? (s.data.rooms.find((r) => r.id === s.selectedRoomId) ?? null) : null));
}
