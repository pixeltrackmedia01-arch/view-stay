"use client";

import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

/** Accessible tablist with arrow-key navigation. Render panels with id `${idPrefix}-panel-${id}`. */
export function Tabs<T extends string>({ tabs, value, onChange, label, idPrefix, variant = "underline", className }: { tabs: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; idPrefix: string; variant?: "underline" | "pill"; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + dir + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };
  return (
    <div role="tablist" aria-label={label} className={cn(variant === "underline" ? "flex gap-1 overflow-x-auto border-b border-line scrollbar-none" : "inline-flex rounded-full bg-subtle p-1", className)}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium transition-colors",
              variant === "underline"
                ? cn("-mb-px border-b-2 px-3", active ? "border-accent text-primary" : "border-transparent text-ink-2 hover:text-ink")
                : cn("rounded-full px-4", active ? "bg-surface text-primary shadow-sm" : "text-ink-2 hover:text-ink"),
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {t.label}
            {t.badge !== undefined && <span className="rounded-full bg-muted px-1.5 text-xs text-ink-2">{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Two-to-four option segmented control (radio group semantics). */
export function Segmented<T extends string>({ options, value, onChange, label, className }: { options: { id: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-[var(--radius-sm)] border border-line bg-surface p-0.5", className)}>
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-[6px] px-3 text-sm font-medium transition-colors", active ? "bg-primary text-white" : "text-ink-2 hover:bg-subtle hover:text-ink")}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
