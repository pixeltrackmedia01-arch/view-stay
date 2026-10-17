import { Building2, Mountain, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

/** Generated illustrative cover so the MVP has no external image dependency. */
export function HotelCover({ hue, name, viewTypes = [], className }: { hue: number; name: string; viewTypes?: string[]; className?: string }) {
  const Icon = viewTypes.includes("SEA") ? Waves : viewTypes.includes("MOUNTAIN") ? Mountain : Building2;
  return (
    <div
      role="img"
      aria-label={`${name} cover`}
      className={cn("relative overflow-hidden", className)}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 65% 42%), hsl(${(hue + 40) % 360} 70% 62%))`,
      }}
    >
      <svg className="absolute inset-x-0 bottom-0 h-1/2 w-full opacity-30" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 60 Q 100 20 200 55 T 400 45 V100 H0Z" fill="white" />
        <path d="M0 75 Q 120 50 240 75 T 400 70 V100 H0Z" fill="white" opacity="0.6" />
      </svg>
      <Icon className="absolute right-4 top-4 size-8 text-white/70" aria-hidden />
    </div>
  );
}
