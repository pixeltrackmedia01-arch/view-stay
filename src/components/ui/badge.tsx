import { cn } from "@/lib/utils";

const tones = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "slate", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent", tones[tone], className)}
      {...props}
    />
  );
}

export function Alert({ tone = "rose", className, ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: BadgeTone }) {
  return <div role="alert" className={cn("rounded-lg px-4 py-3 text-sm ring-1 ring-inset", tones[tone], className)} {...props} />;
}
