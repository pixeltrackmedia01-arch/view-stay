import type { FloorSpec } from "@/lib/layout/templates";

/** Static SVG preview of a floor plan (marketing / how-it-works). The interactive plan lives in floor-plan.tsx. */
export function MiniPlan({ floor, highlight, className }: { floor: FloorSpec; highlight?: string; className?: string }) {
  const u = 20;
  return (
    <svg viewBox={`-6 -6 ${floor.width * u + 12} ${floor.height * u + 12}`} className={className} role="img" aria-label={`Illustrative floor plan with ${floor.rooms.length} rooms`}>
      {floor.wings.map((w, i) => (
        <rect key={i} x={w.x * u} y={w.y * u} width={w.w * u} height={w.h * u} fill="var(--color-subtle)" stroke="var(--color-line-strong)" strokeWidth={2} />
      ))}
      {floor.elements.map((e, i) => (
        <rect key={`e${i}`} x={e.x * u + 2} y={e.y * u + 2} width={e.w * u - 4} height={e.h * u - 4} rx={3} fill={e.kind === "COURTYARD" || e.kind === "GARDEN" ? "#d9ead8" : "var(--color-muted)"} />
      ))}
      {floor.rooms.map((r) => {
        const sel = r.number === highlight;
        return (
          <g key={r.number}>
            <rect x={r.x * u + 3} y={r.y * u + 3} width={r.w * u - 6} height={r.h * u - 6} rx={4} fill={sel ? "var(--color-accent)" : "#fff"} stroke={sel ? "var(--color-accent-hover)" : "var(--color-available)"} strokeWidth={sel ? 3 : 2} />
            <text x={(r.x + r.w / 2) * u} y={(r.y + r.h / 2) * u + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--color-ink)">{r.number}</text>
          </g>
        );
      })}
    </svg>
  );
}
