"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function DestinationEditor({ d }: { d: { id: string; name: string; tagline: string; description: string; featured: boolean; attractions: string[] } }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ ...d, attractions: d.attractions.join("\n") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setError(null);
    try {
      await api(`/api/admin/destinations/${d.id}`, { method: "PATCH", body: { tagline: v.tagline, description: v.description, featured: v.featured, attractions: v.attractions.split("\n").map((s) => s.trim()).filter(Boolean) } });
      toast({ tone: "success", title: `${d.name} updated` });
      setOpen(false);
      router.refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Edit</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Edit ${d.name}`} width={620} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></div>}>
        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Tagline" htmlFor={`dt-${d.id}`}><Input id={`dt-${d.id}`} value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></Field>
          <Field label="Description" htmlFor={`dd-${d.id}`}><Textarea id={`dd-${d.id}`} rows={5} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
          <Field label="Attractions (one per line)" htmlFor={`da-${d.id}`}><Textarea id={`da-${d.id}`} rows={4} value={v.attractions} onChange={(e) => setV({ ...v, attractions: e.target.value })} /></Field>
          <Checkbox label="Feature on the homepage" checked={v.featured} onChange={(e) => setV({ ...v, featured: e.target.checked })} />
        </div>
      </Dialog>
    </>
  );
}
