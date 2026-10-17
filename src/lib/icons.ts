import {
  Accessibility, Baby, Building, Building2, CircleParking, Coffee, ConciergeBell, Dumbbell, EyeOff, Flame, Flower2, Landmark, Leaf, Mountain, MountainSnow,
  PawPrint, Plane, PlugZap, Sailboat, Trees, UtensilsCrossed, Waves, WavesLadder, Wifi, Ship, Castle, Home, Hotel, TreePine, type LucideIcon,
} from "lucide-react";
import type { HotelTemplateKey, ViewKey } from "./catalog-types";

export const VIEW_ICONS: Record<ViewKey, LucideIcon> = {
  SEA: Waves,
  LAKE: Sailboat,
  RIVER: Ship,
  MOUNTAIN: Mountain,
  VALLEY: MountainSnow,
  GARDEN: Trees,
  CITY: Building2,
  COURTYARD: Landmark,
  POOL: WavesLadder,
  NONE: EyeOff,
};

export const AMENITY_ICONS: Record<string, LucideIcon> = {
  "Free Wi-Fi": Wifi,
  "Breakfast available": Coffee,
  Restaurant: UtensilsCrossed,
  "Room service": ConciergeBell,
  "Swimming pool": WavesLadder,
  Spa: Flower2,
  "Fitness centre": Dumbbell,
  Parking: CircleParking,
  "Airport transfer": Plane,
  "Pet-friendly": PawPrint,
  "Yoga deck": Leaf,
  "Bonfire area": Flame,
  "Rooftop terrace": Building,
  "Kids' club": Baby,
  "EV charging": PlugZap,
  "Wheelchair accessible": Accessibility,
};

export const TEMPLATE_ICONS: Record<HotelTemplateKey, LucideIcon> = {
  MOUNTAIN_LODGE: TreePine,
  HERITAGE_BOUTIQUE: Castle,
  CITY_MODERN: Hotel,
  COASTAL_RESORT: Waves,
  GARDEN_RETREAT: Home,
};

