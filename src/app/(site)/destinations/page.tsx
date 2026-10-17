import type { Metadata } from "next";
import Link from "next/link";
import { DestinationCard } from "@/components/home/destination-card";
import { cn } from "@/lib/utils";
import { destinationCards } from "@/server/home";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Destinations" };

const REGIONS = ["All", "Himalaya", "Nilgiris", "Western Ghats", "Northeast", "Coast", "Islands", "Rajasthan", "Heartland", "Deccan"];

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const { region } = await searchParams;
  const all = await destinationCards();
  const active = REGIONS.includes(region ?? "") ? region! : "All";
  const list = active === "All" ? all : all.filter((d) => d.region === active);
  return (
    <div className="container-page py-10 sm:py-14">
      <p className="text-sm font-semibold tracking-wide text-accent-hover uppercase">Destinations</p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">35 places, 350 stays, one room at a time</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">From Himalayan valleys to backwater villages. Each destination has ten fictional demo properties whose rooms you can explore floor by floor.</p>
      <nav aria-label="Filter by region" className="mt-8 flex flex-wrap gap-2">
        {REGIONS.filter((r) => r === "All" || all.some((d) => d.region === r)).map((r) => (
          <Link key={r} href={r === "All" ? "/destinations" : `/destinations?region=${encodeURIComponent(r)}`} aria-current={r === active ? "page" : undefined} className={cn("inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium", r === active ? "border-primary bg-primary text-white" : "border-line bg-surface hover:border-line-strong")}>
            {r}
          </Link>
        ))}
      </nav>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${list.length} destinations`}>
        {list.map((d, i) => (
          <li key={d.slug}>
            <DestinationCard d={d} size="md" priority={i < 3} />
          </li>
        ))}
      </ul>
    </div>
  );
}
