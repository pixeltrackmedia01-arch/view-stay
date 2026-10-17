import Link from "next/link";
import { Eye, Map, MousePointerClick, ShieldCheck, Timer } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { HotelCover } from "@/components/hotel-cover";
import { defaultStay } from "@/lib/dates";
import { db } from "@/lib/db";
import { listCities } from "@/server/search";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stay = defaultStay();
  const [cities, featured] = await Promise.all([
    listCities(),
    db.hotel.findMany({ where: { status: "APPROVED" }, take: 4, orderBy: { starRating: "desc" } }),
  ]);
  const q = (city: string) => new URLSearchParams({ city, ...stay, guests: "2" }).toString();

  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-sky-700 text-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:pt-20">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            <Map className="size-4" aria-hidden /> Room-level hotel booking
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Choose your room, not just your room category.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Pick the exact room on a live floor map — the sea-facing corner on the fourth floor, the balcony away from the lift, or
            the same room you loved last time.
          </p>
          <div className="mt-8 text-ink">
            <SearchForm defaults={{ ...stay, guests: 2 }} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-bold">How ViewStay works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Map, title: "Explore the floor map", text: "See every physical room, the lift, corridors and which side faces the view." },
            { icon: Eye, title: "Compare real attributes", text: "Verified view scores, balconies, corner rooms, windows and floor level." },
            { icon: Timer, title: "Hold it while you book", text: "Your chosen room is reserved for you for 10 minutes while you check out." },
            { icon: MousePointerClick, title: "Rebook in one click", text: "Loved room 204? Book the same room again from My Bookings." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <Icon className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <h2 className="text-2xl font-bold">Popular destinations</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((h) => (
            <Link key={h.id} href={`/hotels/${h.slug}?${q(h.city).replace(/city=[^&]*&/, "")}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
              <HotelCover hue={h.coverHue} name={h.name} className="h-32" />
              <div className="p-4">
                <p className="font-semibold group-hover:text-brand-700">{h.name}</p>
                <p className="text-sm text-slate-500">{h.city}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {cities.map((c) => (
            <Link key={c.city} href={`/search?${q(c.city)}`} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm hover:border-brand-500">
              {c.city} <span className="text-slate-400">({c.hotels})</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="size-5 text-brand-600" aria-hidden /> Own a hotel?
            </h2>
            <p className="text-slate-600">Map your rooms, price premium views, and manage inventory down to the room.</p>
          </div>
          <Link href="/register?type=partner" className="rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
            List your property
          </Link>
        </div>
      </section>
    </>
  );
}
