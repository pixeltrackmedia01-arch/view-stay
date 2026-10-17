import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-sm",
  accent: "bg-accent text-primary-dark hover:bg-accent-hover shadow-sm font-semibold",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-subtle",
  outline: "border border-primary text-primary hover:bg-primary hover:text-white",
  ghost: "text-ink hover:bg-subtle",
  inverse: "bg-white/95 text-primary hover:bg-white shadow-sm",
  danger: "bg-danger text-white hover:brightness-95",
  dangerOutline: "border border-danger/40 text-danger hover:bg-danger-soft bg-surface",
} as const;

const sizes = {
  sm: "h-[var(--height-control-sm)] px-3 text-sm gap-1.5",
  md: "h-[var(--height-control)] px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "size-[var(--height-control)] justify-center",
  iconSm: "size-[var(--height-control-sm)] justify-center",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none select-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
});

export function LinkButton({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
