import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, children, action, className }: { icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-subtle text-secondary">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
