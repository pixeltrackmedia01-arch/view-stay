"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/badge";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

/** A PATCH action that always asks for confirmation first, then refreshes the page. */
export function AdminAction({ url, body, label, confirmTitle, confirmText, variant = "secondary", danger, done }: { url: string; body: unknown; label: string; confirmTitle: string; confirmText: string; variant?: ButtonVariant; danger?: boolean; done: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>{label}</Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={confirmTitle}
        tone={danger ? "danger" : "primary"}
        confirmLabel={label}
        busy={busy}
        onConfirm={async () => {
          setBusy(true); setError(null);
          try {
            await api(url, { method: "PATCH", body });
            toast({ tone: "success", title: done });
            setOpen(false);
            router.refresh();
          } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
        }}
      >
        <p>{confirmText}</p>
        {error && <Alert className="mt-3">{error}</Alert>}
      </ConfirmDialog>
    </>
  );
}
