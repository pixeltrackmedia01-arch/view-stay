"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  center: "m-auto w-[min(94vw,var(--dialog-w))] max-h-[90vh] rounded-[var(--radius-xl)]",
  bottom: "mt-auto mb-0 w-full max-w-none max-h-[88dvh] rounded-t-[var(--radius-xl)] sm:m-auto sm:w-[min(94vw,var(--dialog-w))] sm:rounded-[var(--radius-xl)] sm:max-h-[90vh]",
  right: "ml-auto mr-0 my-0 h-dvh max-h-none w-[min(100vw,var(--dialog-w))] rounded-l-[var(--radius-xl)]",
  fullscreen: "m-0 h-dvh max-h-none w-screen max-w-none",
} as const;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  width?: number;
  hideTitle?: boolean;
  className?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

/** Accessible modal built on the native <dialog> element: focus trapping, Escape and backdrop close. */
export function Dialog({ open, onClose, title, description, children, variant = "center", width = 560, hideTitle, className, bodyClassName, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      if (!open) document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        document.documentElement.style.overflow = "";
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      style={{ "--dialog-w": `${width}px` } as React.CSSProperties}
      className={cn("flex-col overflow-hidden bg-surface p-0 text-ink shadow-[var(--shadow-pop)] open:flex backdrop:bg-transparent", variants[variant], className)}
    >
      {open && (
        <>
          <div className={cn("flex shrink-0 items-start justify-between gap-4 px-5 pt-5 pb-3", hideTitle && "sr-only")}>
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 text-sm text-ink-2">
                  {description}
                </p>
              )}
            </div>
            {!hideTitle && (
              <button type="button" onClick={onClose} className="-m-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-subtle hover:text-ink" aria-label="Close">
                <X className="size-5" />
              </button>
            )}
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 pb-5", bodyClassName)}>{children}</div>
          {footer && <div className="shrink-0 border-t border-line bg-surface px-5 py-3">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirm", tone = "primary", busy }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; children?: React.ReactNode; confirmLabel?: string; tone?: "primary" | "danger"; busy?: boolean }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={460}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-[var(--radius-sm)] px-4 text-sm font-medium text-ink hover:bg-subtle">
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn("inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] px-4 text-sm font-medium text-white disabled:opacity-60", tone === "danger" ? "bg-danger" : "bg-primary")}
          >
            {busy && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm text-ink-2">{children}</div>
    </Dialog>
  );
}
