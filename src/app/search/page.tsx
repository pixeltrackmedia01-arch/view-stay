import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { HotelCard } from "@/components/hotel-card";
import { SearchForm } from "@/components/search-form";
import { Alert } from "@/components/ui/badge";
import { defaultStay, nightsBetween, parseDateOnly } from "@/lib/dates";
import { VIEW_LABELS } from "@/lib/labels";
import { VIEW_TYPES, stayInput } from "@/lib/validation";
import { searchHotels } from "@/server/search";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Search hotels" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const fallback = defaultStay();
  const raw = { checkIn: get("checkIn") ?? fallback.checkIn, checkOut: get("checkOut") ?? fallback.checkOut, guests: get("guests") ?? "2" };
  const parsed = stayInput.safeParse(raw);
  const city = get("city") ?? "";
  const view = VIEW_TYPES.find((v) => v === get("view"));
  const balcony = get("balcony") === "1";
  const sort = (["price", "rating", "view"] as const).find((s) => s === get("sort")) ?? "price";
  const minStars = Number(get("minStars")) || undefined;

  const base = { city, checkIn: raw.checkIn, checkOut: raw.checkOut, guests: raw.guests };
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...base, view, balcony: balcony ? "1" : undefined, sort, minStars: minStars?.toString(), ...patch })) {
      if (v) p.set(k, v);
    }
    return `/search?${p}`;
  };

  const hotels = parsed.success
    ? await searchHotels({
        city,
        checkIn: parseDateOnly(parsed.data.checkIn)!,
        checkOut: parseDateOnly(parsed.data.checkOut)!,
        guests: parsed.data.guests,
        view,
        balcony,
        sort,
        minStars,
      })
    : [];
  const stayQuery = new URLSearchParams({ checkIn: raw.checkIn, checkOut: raw.checkOut, guests: raw.guests, ...(view ? { view } : {}) }).toString();
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-sm", active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 bg-white hover:border-slate-400");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <SearchForm compact defaults={{ city, checkIn: raw.checkIn, checkOut: raw.checkOut, guests: Number(raw.guests) || 2 }} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Filters" className="space-y-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">View</h2>
            <div className="flex flex-wrap gap-2">
              <Link href={link({ view: undefined })} className={chip(!view)}>Any</Link>
              {VIEW_TYPES.filter((v) => v !== "NONE").map((v) => (
                <Link key={v} href={link({ view: v })} className={chip(view === v)}>{VIEW_LABELS[v].replace(" view", "")}</Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Room features</h2>
            <Link href={link({ balcony: balcony ? undefined : "1" })} className={chip(balcony)}>Private balcony</Link>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Star rating</h2>
            <div className="flex flex-wrap gap-2">
              {[undefined, 3, 4, 5].map((s) => (
                <Link key={s ?? 0} href={link({ minStars: s?.toString() })} className={chip(minStars === s)}>{s ? `${s}★ +` : "Any"}</Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Sort by</h2>
            <div className="flex flex-wrap gap-2">
              {(["price", "rating", "view"] as const).map((s) => (
                <Link key={s} href={link({ sort: s })} className={chip(sort === s)}>
                  {s === "price" ? "Lowest price" : s === "rating" ? "Top rated" : "Best view"}
                </Link>
              ))}
            </div>
          </div>
        </aside>
        <section aria-live="polite">
          {!parsed.success ? (
            <Alert>{parsed.error.issues[0]?.message ?? "Please check your search dates."}</Alert>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                {hotels.length} {hotels.length === 1 ? "property" : "properties"}
                {city && <> for “{city}”</>} · {nightsBetween(parseDateOnly(raw.checkIn)!, parseDateOnly(raw.checkOut)!)} nights · {raw.guests} guests
              </p>
              {hotels.length === 0 ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <SearchX className="size-10 text-slate-400" aria-hidden />
                  <p className="mt-3 font-medium">No hotels match your search</p>
                  <p className="text-sm text-slate-500">Try another destination or remove filters.</p>
                  <Link href="/search" className="mt-4 text-sm font-medium text-brand-700 underline">Show all hotels</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {hotels.map((h) => (
                    <HotelCard key={h.id} hotel={h} query={stayQuery} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
