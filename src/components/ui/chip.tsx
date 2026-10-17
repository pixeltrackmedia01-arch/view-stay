"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToggleChip({ pressed, onClick, children, className, icon: Icon }: { pressed: boolean; onClick: () => void; children: React.ReactNode; className?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        pressed ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-line-strong",
        className,
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function RemovableChip({ children, onRemove, label }: { children: React.ReactNode; onRemove: () => void; label: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-accent-soft py-1 pr-1 pl-3 text-sm text-primary-dark ring-1 ring-accent/30 ring-inset">
      {children}
      <button type="button" onClick={onRemove} aria-label={`Remove filter: ${label}`} className="grid size-7 place-items-center rounded-full hover:bg-accent/25">
        <X className="size-3.5" />
      </button>
    </span>
  );
}
