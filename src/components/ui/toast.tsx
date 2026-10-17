"use client";

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "danger" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

const Ctx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ push }), [push]);
  const icons = { success: CheckCircle2, danger: AlertCircle, info: Info };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-md)] bg-primary-dark px-4 py-3 text-sm text-white shadow-[var(--shadow-pop)]">
              <Icon className={cn("mt-0.5 size-4 shrink-0", t.tone === "success" ? "text-accent" : t.tone === "danger" ? "text-red-300" : "text-sky-200")} aria-hidden />
              <div className="flex-1">
                <p className="font-medium">{t.title}</p>
                {t.body && <p className="mt-0.5 text-white/75">{t.body}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-m-1 grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.push;
}
