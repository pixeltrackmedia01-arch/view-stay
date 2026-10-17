import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-subtle text-ink-2 ring-line",
  primary: "bg-primary text-white ring-primary",
  accent: "bg-accent-soft text-primary-dark ring-accent/40",
  success: "bg-available-soft text-available ring-available/25",
  warning: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/25",
  info: "bg-info-soft text-info ring-info/25",
  glass: "bg-white/90 text-ink ring-white/60 backdrop-blur",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)} {...props} />;
}

const alertIcons = { info: Info, success: CheckCircle2, warning: TriangleAlert, danger: AlertCircle } as const;

export function Alert({ tone = "danger", title, children, className, action, ...rest }: { tone?: keyof typeof alertIcons; title?: string; children?: React.ReactNode; className?: string; action?: React.ReactNode; "data-testid"?: string }) {
  const Icon = alertIcons[tone];
  return (
    <div {...rest} role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cn("flex gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm ring-1 ring-inset", tones[tone], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-ink-2 [&_a]:underline")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
