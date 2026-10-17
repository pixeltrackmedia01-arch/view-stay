"use client";

import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RemovableChip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Label, Select } from "@/components/ui/input";
import { FILTER_AMENITIES } from "@/lib/amenities";
import { HOTEL_TEMPLATES, TEMPLATE_INFO, VIEW_KEYS, VIEW_LABELS } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["priceMin", "priceMax", "minRating", "minStars", "types", "amenities", "views", "balcony", "corner", "accessible", "minFloor", "beds", "minSize", "freeCancel"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type Draft = Partial<Record<FilterKey, string>>;

const BEDS = ["Queen", "Twin", "King", "King + Sofa bed"];

function readDraft(sp: URLSearchParams): Draft {
  const d: Draft = {};
  for (const k of FILTER_KEYS) {
    const v = sp.get(k);
    if (v) d[k] = v;
  }
  return d;
}

const listOf = (v?: string) => (v ? v.split(",").filter(Boolean) : []);

function FilterForm({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const set = (k: FilterKey, v: string | undefined) => setDraft({ ...draft, [k]: v || undefined });
  const toggle = (k: FilterKey, item: string) => {
    const cur = listOf(draft[k]);
    set(k, (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]).join(","));
  };
  const section = "border-b border-line py-5 first:pt-0 last:border-0";
  const h = "mb-3 text-sm font-semibold text-ink";
  return (
    <div>
      <fieldset className={section}>
        <legend className={h}>Price per night (₹)</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="f-pmin" className="text-xs text-ink-2">Min</Label>
            <Input id="f-pmin" inputMode="numeric" type="number" min={0} step={500} value={draft.priceMin ?? ""} onChange={(e) => set("priceMin", e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label htmlFor="f-pmax" className="text-xs text-ink-2">Max</Label>
            <Input id="f-pmax" inputMode="numeric" type="number" min={0} step={500} value={draft.priceMax ?? ""} onChange={(e) => set("priceMax", e.target.value)} placeholder="Any" />
          </div>
        </div>
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>View from the room</legend>
        <div className="grid grid-cols-2 gap-x-2">
          {VIEW_KEYS.filter((v) => v !== "NONE").map((v) => (
            <Checkbox key={v} id={`f-v-${v}`} label={VIEW_LABELS[v]} checked={listOf(draft.views).includes(v)} onChange={() => toggle("views", v)} />
          ))}
        </div>
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>Room features</legend>
        <Checkbox id="f-balcony" label="Private balcony" checked={draft.balcony === "1"} onChange={(e) => set("balcony", e.target.checked ? "1" : undefined)} />
        <Checkbox id="f-corner" label="Corner room" description="Windows on two sides" checked={draft.corner === "1"} onChange={(e) => set("corner", e.target.checked ? "1" : undefined)} />
        <Checkbox id="f-access" label="Accessible room" checked={draft.accessible === "1"} onChange={(e) => set("accessible", e.target.checked ? "1" : undefined)} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="f-floor" className="text-xs text-ink-2">Floor</Label>
            <Select id="f-floor" value={draft.minFloor ?? ""} onChange={(e) => set("minFloor", e.target.value)}>
              <option value="">Any floor</option>
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>Floor {n} or higher</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="f-size" className="text-xs text-ink-2">Room size</Label>
            <Select id="f-size" value={draft.minSize ?? ""} onChange={(e) => set("minSize", e.target.value)}>
              <option value="">Any size</option>
              {[25, 30, 40, 60].map((n) => <option key={n} value={n}>{n} m² or more</option>)}
            </Select>
          </div>
        </div>
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>Bed type</legend>
        <div className="grid grid-cols-2 gap-x-2">
          {BEDS.map((b) => <Checkbox key={b} id={`f-b-${b}`} label={b} checked={listOf(draft.beds).includes(b)} onChange={() => toggle("beds", b)} />)}
        </div>
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>Guest rating</legend>
        <div className="flex flex-wrap gap-2">
          {[["", "Any"], ["3.5", "3.5+"], ["4", "4+"], ["4.5", "4.5+"]].map(([v, l]) => (
            <button key={l} type="button" aria-pressed={(draft.minRating ?? "") === v} onClick={() => set("minRating", v)} className={cn("min-h-10 rounded-full border px-3.5 text-sm", (draft.minRating ?? "") === v ? "border-primary bg-primary text-white" : "border-line hover:border-line-strong")}>{l}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>Star rating</legend>
        <div className="flex flex-wrap gap-2">
          {[["", "Any"], ["3", "3★+"], ["4", "4★+"], ["5", "5★"]].map(([v, l]) => (
            <button key={l} type="button" aria-pressed={(draft.minStars ?? "") === v} onClick={() => set("minStars", v)} className={cn("min-h-10 rounded-full border px-3.5 text-sm", (draft.minStars ?? "") === v ? "border-primary bg-primary text-white" : "border-line hover:border-line-strong")}>{l}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>Property type</legend>
        {HOTEL_TEMPLATES.map((t) => <Checkbox key={t} id={`f-t-${t}`} label={TEMPLATE_INFO[t].label} checked={listOf(draft.types).includes(t)} onChange={() => toggle("types", t)} />)}
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>Amenities</legend>
        <div className="grid grid-cols-2 gap-x-2">
          {FILTER_AMENITIES.map((a) => <Checkbox key={a} id={`f-a-${a}`} label={a} checked={listOf(draft.amenities).includes(a)} onChange={() => toggle("amenities", a)} />)}
        </div>
      </fieldset>
      <fieldset className={section}>
        <legend className={h}>Cancellation</legend>
        <Checkbox id="f-cancel" label="Free cancellation available" checked={draft.freeCancel === "1"} onChange={(e) => set("freeCancel", e.target.checked ? "1" : undefined)} />
      </fieldset>
    </div>
  );
}

export function chipLabels(sp: URLSearchParams): { key: FilterKey; value?: string; label: string }[] {
  const out: { key: FilterKey; value?: string; label: string }[] = [];
  const pmin = sp.get("priceMin");
  const pmax = sp.get("priceMax");
  if (pmin) out.push({ key: "priceMin", label: `Min ₹${Number(pmin).toLocaleString("en-IN")}` });
  if (pmax) out.push({ key: "priceMax", label: `Max ₹${Number(pmax).toLocaleString("en-IN")}` });
  for (const v of listOf(sp.get("views") ?? undefined)) out.push({ key: "views", value: v, label: VIEW_LABELS[v as keyof typeof VIEW_LABELS] ?? v });
  for (const v of listOf(sp.get("types") ?? undefined)) out.push({ key: "types", value: v, label: TEMPLATE_INFO[v as keyof typeof TEMPLATE_INFO]?.label ?? v });
  for (const v of listOf(sp.get("amenities") ?? undefined)) out.push({ key: "amenities", value: v, label: v });
  for (const v of listOf(sp.get("beds") ?? undefined)) out.push({ key: "beds", value: v, label: `${v} bed` });
  if (sp.get("balcony")) out.push({ key: "balcony", label: "Balcony" });
  if (sp.get("corner")) out.push({ key: "corner", label: "Corner room" });
  if (sp.get("accessible")) out.push({ key: "accessible", label: "Accessible" });
  if (sp.get("freeCancel")) out.push({ key: "freeCancel", label: "Free cancellation" });
  if (sp.get("minFloor")) out.push({ key: "minFloor", label: `Floor ${sp.get("minFloor")}+` });
  if (sp.get("minSize")) out.push({ key: "minSize", label: `${sp.get("minSize")} m²+` });
  if (sp.get("minRating")) out.push({ key: "minRating", label: `Rated ${sp.get("minRating")}+` });
  if (sp.get("minStars")) out.push({ key: "minStars", label: `${sp.get("minStars")}★+` });
  return out;
}

/** Filters: sidebar on desktop, bottom sheet on mobile. Draft state is applied to the URL on "Apply". */
export function SearchFilters({ resultCount }: { resultCount: number }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initial = useMemo(() => readDraft(new URLSearchParams(sp.toString())), [sp]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [open, setOpen] = useState(false);
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setDraft(initial);
  }

  const apply = (d: Draft) => {
    const p = new URLSearchParams(sp.toString());
    for (const k of FILTER_KEYS) p.delete(k);
    for (const [k, v] of Object.entries(d)) if (v) p.set(k, v);
    p.delete("page");
    router.push(`${pathname}?${p}`, { scroll: false });
    setOpen(false);
  };
  const remove = (key: FilterKey, value?: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) {
      const rest = listOf(p.get(key) ?? undefined).filter((x) => x !== value);
      if (rest.length) p.set(key, rest.join(","));
      else p.delete(key);
    } else p.delete(key);
    p.delete("page");
    router.push(`${pathname}?${p}`, { scroll: false });
  };
  const chips = chipLabels(new URLSearchParams(sp.toString()));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const footer = (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={() => { setDraft({}); apply({}); }} disabled={!chips.length && !Object.keys(draft).length}>Clear all</Button>
      <Button className="flex-1" onClick={() => apply(draft)} data-testid="apply-filters">Apply filters</Button>
    </div>
  );

  return (
    <>
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-24 rounded-[var(--radius-lg)] border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">Filters</h2>
            {chips.length > 0 && <button type="button" onClick={() => apply({})} className="text-sm font-medium text-primary underline">Clear all</button>}
          </div>
          <div className="max-h-[calc(100dvh-16rem)] overflow-y-auto px-5 py-5">
            <FilterForm draft={draft} setDraft={setDraft} />
          </div>
          <div className={cn("border-t border-line px-5 py-3", !dirty && "opacity-60")}>
            <Button className="w-full" onClick={() => apply(draft)} disabled={!dirty}>Apply filters</Button>
          </div>
        </div>
      </aside>
      <div className="lg:hidden">
        <Button variant="secondary" onClick={() => setOpen(true)} data-testid="open-filters">
          <SlidersHorizontal className="size-4" aria-hidden /> Filters{chips.length ? ` (${chips.length})` : ""}
        </Button>
        <Dialog open={open} onClose={() => setOpen(false)} title="Filters" description={`${resultCount} properties match your current filters`} variant="bottom" width={560} footer={footer}>
          <FilterForm draft={draft} setDraft={setDraft} />
        </Dialog>
      </div>
      {chips.length > 0 && (
        <ul className="col-span-full flex flex-wrap gap-2 lg:col-start-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={`${c.key}:${c.value ?? ""}`}>
              <RemovableChip label={c.label} onRemove={() => remove(c.key, c.value)}>{c.label}</RemovableChip>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
