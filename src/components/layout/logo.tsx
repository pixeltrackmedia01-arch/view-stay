import { cn } from "@/lib/utils";

/** ViewStay mark: an arched window framing a peak and the horizon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-primary)" />
      <path d="M9 25V14a7 7 0 0 1 14 0v11Z" fill="var(--color-accent-soft)" />
      <path d="M9 25v-4.5l4.3-4.8 3.1 3.2 2.4-2.4L23 21v4Z" fill="var(--color-secondary)" />
      <circle cx="19.2" cy="12.6" r="1.9" fill="var(--color-accent)" />
      <path d="M8 25.5h16" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("font-display text-[22px] font-semibold tracking-tight", inverse ? "text-white" : "text-primary")}>ViewStay</span>
    </span>
  );
}
