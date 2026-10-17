import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 transition-colors hover:border-line-strong focus:border-secondary focus:outline-none focus:shadow-[var(--shadow-focus)] disabled:bg-subtle disabled:text-ink-3 aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, "h-[var(--height-control)]", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(base, "h-[var(--height-control)] pr-8", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-24 py-2.5", className)} {...props} />;
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />;
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">
      {message}
    </p>
  );
}

export function Field({ label, htmlFor, error, children, hint, className }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>}
      <FieldError id={`${htmlFor}-error`} message={error} />
    </div>
  );
}

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: string }>(function Checkbox({ label, description, className, id, ...props }, ref) {
  return (
    <label htmlFor={id} className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-sm text-ink", className)}>
      <input ref={ref} id={id} type="checkbox" className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded accent-[var(--color-primary)]" {...props} />
      <span>
        {label}
        {description && <span className="block text-[13px] text-ink-3">{description}</span>}
      </span>
    </label>
  );
});
