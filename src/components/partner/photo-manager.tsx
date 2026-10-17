"use client";

import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Photo } from "@/components/ui/photo";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export const ROOM_PHOTO_CATEGORIES: [string, string][] = [
  ["ROOM_OVERVIEW", "Room overview"], ["SLEEPING_AREA", "Sleeping area"], ["WINDOW_VIEW", "Window view"], ["BALCONY", "Balcony"],
  ["BATHROOM", "Bathroom"], ["SEATING_AREA", "Seating area"], ["WORKSPACE", "Workspace"], ["SPECIAL_FEATURE", "Special feature"],
];
const MAX = 5 * 1024 * 1024;

export interface ManagedPhoto { id: string; path: string; alt: string; category: string; isPrimary: boolean; illustrative: boolean }

export function PhotoManager({ roomId, roomNumber, photos }: { roomId: string; roomNumber: string; photos: ManagedPhoto[] }) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("ROOM_OVERVIEW");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ManagedPhoto | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      if (ok) toast({ tone: "success", title: ok });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const pick = (f: File | null) => {
    setError(null);
    if (f && !["image/jpeg", "image/png", "image/webp"].includes(f.type)) return setError("Choose a JPEG, PNG or WebP image.");
    if (f && f.size > MAX) return setError("Images must be 5 MB or smaller.");
    setFile(f);
  };

  const move = (i: number, d: -1 | 1) => {
    const order = photos.map((p) => p.id);
    [order[i], order[i + d]] = [order[i + d], order[i]];
    run(`move-${i}`, () => api(`/api/partner/rooms/${roomId}/photos`, { method: "PUT", body: { order } }));
  };

  return (
    <div className="space-y-5" data-testid="photo-manager">
      {error && <Alert>{error}</Alert>}
      <form
        className="grid gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 sm:grid-cols-[1fr_200px] lg:grid-cols-[1fr_200px_1fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!file) return setError("Choose an image to upload.");
          if (alt.trim().length < 5) return setError("Describe the photo for guests using screen readers (5+ characters).");
          const fd = new FormData();
          fd.set("file", file);
          fd.set("category", category);
          fd.set("alt", alt.trim());
          run("upload", async () => {
            await api(`/api/partner/rooms/${roomId}/photos`, { body: fd });
            setFile(null); setAlt("");
            if (fileRef.current) fileRef.current.value = "";
          }, "Photo uploaded");
        }}
      >
        <Field label={`Photo for room ${roomNumber}`} htmlFor="up-file" hint="JPEG, PNG or WebP · up to 5 MB · at least 400 × 300">
          <Input id="up-file" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="Category" htmlFor="up-cat"><Select id="up-cat" value={category} onChange={(e) => setCategory(e.target.value)}>{ROOM_PHOTO_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Description (alt text)" htmlFor="up-alt"><Input id="up-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="King bed facing the lake window" /></Field>
        <Button type="submit" loading={busy === "upload"}><Upload className="size-4" aria-hidden /> Upload</Button>
      </form>

      {photos.length === 0 ? (
        <Alert tone="info" title="No photos for this room">Guests will see the room&apos;s details without photos. Upload at least an overview and a window-view photo.</Alert>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              <Photo src={p.path} alt={p.alt} ratio="16/10" illustrative={p.illustrative} />
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{ROOM_PHOTO_CATEGORIES.find(([k]) => k === p.category)?.[1] ?? p.category}</Badge>
                  {p.isPrimary && <Badge tone="accent">Cover</Badge>}
                  <Badge tone={p.illustrative ? "info" : "success"}>{p.illustrative ? "Illustrative" : "Uploaded"}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-ink-2">{p.alt}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="iconSm" variant="ghost" aria-label="Move earlier" disabled={i === 0 || !!busy} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                  <Button size="iconSm" variant="ghost" aria-label="Move later" disabled={i === photos.length - 1 || !!busy} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                  {!p.isPrimary && <Button size="sm" variant="ghost" loading={busy === `cover-${p.id}`} onClick={() => run(`cover-${p.id}`, () => api(`/api/partner/photos/${p.id}`, { method: "PATCH", body: { isPrimary: true } }), "Cover photo updated")}><Star className="size-4" aria-hidden /> Make cover</Button>}
                  <Button size="sm" variant="ghost" className="ml-auto text-danger" onClick={() => setRemoving(p)}><Trash2 className="size-4" aria-hidden /> Remove</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title="Remove this photo?" tone="danger" confirmLabel="Remove photo" busy={busy === "remove"} onConfirm={() => run("remove", async () => { await api(`/api/partner/photos/${removing!.id}`, { method: "DELETE" }); setRemoving(null); }, "Photo removed")}>
        {removing?.illustrative ? "Illustrative photos are regenerated if you change this room's view or balcony." : "The uploaded file will be deleted."}
      </ConfirmDialog>
    </div>
  );
}
