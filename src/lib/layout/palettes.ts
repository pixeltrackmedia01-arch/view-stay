import type { HotelTemplateKey } from "@/lib/catalog-types";

/** Exterior material palettes per template. Shared by exterior photography and the 3D model. */
export interface ExteriorPalette {
  name: string;
  wall: string;
  base: string;
  roof: string;
  trim: string;
  glass: string;
  accent: string;
}

export const EXTERIOR_PALETTES: Record<HotelTemplateKey, ExteriorPalette[]> = {
  MOUNTAIN_LODGE: [
    { name: "Cedar & slate", wall: "#8a5a3b", base: "#8d8577", roof: "#3d4a52", trim: "#efe4d2", glass: "#9fb7c4", accent: "#c98930" },
    { name: "Pine & red tin", wall: "#a0704a", base: "#9b9284", roof: "#7a2f2a", trim: "#f4ead8", glass: "#a7bfca", accent: "#e6a64b" },
    { name: "Walnut & forest tin", wall: "#6e4a32", base: "#7f786d", roof: "#2f4a3a", trim: "#e9dcc6", glass: "#9db4bf", accent: "#c98930" },
  ],
  HERITAGE_BOUTIQUE: [
    { name: "Sandstone", wall: "#e2b07e", base: "#c98b5b", roof: "#d9a46c", trim: "#f6e7cf", glass: "#7a5a4a", accent: "#8f2d3c" },
    { name: "Pink city", wall: "#dd947a", base: "#c27a62", roof: "#d78c70", trim: "#f8e6d6", glass: "#6e4a3c", accent: "#2d6c91" },
    { name: "Lime-washed white", wall: "#f2ead8", base: "#d9ccb2", roof: "#e8dcc4", trim: "#ffffff", glass: "#5f7a86", accent: "#2d6c91" },
  ],
  CITY_MODERN: [
    { name: "Limestone & glass", wall: "#d9d4cc", base: "#b9b2a6", roof: "#8e8a84", trim: "#f4f2ee", glass: "#6f93a8", accent: "#e6a64b" },
    { name: "Graphite", wall: "#3c4a55", base: "#2e3a43", roof: "#252f37", trim: "#c9d2d8", glass: "#8fb1c4", accent: "#e6a64b" },
    { name: "Terracotta fins", wall: "#c98f6a", base: "#a87454", roof: "#8a604a", trim: "#f3e6da", glass: "#5f8798", accent: "#173f4f" },
  ],
  COASTAL_RESORT: [
    { name: "Whitewash & teal", wall: "#f5f2ea", base: "#e2d9c6", roof: "#d8cfbd", trim: "#ffffff", glass: "#7fb6c2", accent: "#2f8f9d" },
    { name: "Sand & amber", wall: "#f2e3cf", base: "#dcc6a6", roof: "#c9a77f", trim: "#fffaf2", glass: "#86b2bd", accent: "#c98930" },
    { name: "Sea-salt & navy", wall: "#e9f1ef", base: "#cfdcd8", roof: "#b9c9c5", trim: "#ffffff", glass: "#7aa9b6", accent: "#173f4f" },
  ],
  GARDEN_RETREAT: [
    { name: "Cream & terracotta", wall: "#efe6d6", base: "#c9b89c", roof: "#a5523a", trim: "#ffffff", glass: "#8fb0b8", accent: "#5f7d4a" },
    { name: "Sage & teak", wall: "#dfe5d2", base: "#b9c2a6", roof: "#5a3a2a", trim: "#f7f5ef", glass: "#90adb3", accent: "#8a6a3e" },
    { name: "Chalk & moss", wall: "#f4efe4", base: "#d5cbb6", roof: "#3d5a4a", trim: "#ffffff", glass: "#8aa9b2", accent: "#b66a16" },
  ],
};

export function exteriorPalette(template: HotelTemplateKey, index: number): ExteriorPalette {
  const list = EXTERIOR_PALETTES[template];
  return list[((index % list.length) + list.length) % list.length];
}
