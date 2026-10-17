import type { Metadata } from "next";
import { DestinationEditor } from "@/components/admin/destination-editor";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Destinations" };
export const dynamic = "force-dynamic";

export default async function AdminDestinations() {
  await requireUser("ADMIN");
  const dests = await db.destination.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { hotels: { where: { status: "APPROVED" } } } } } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Destinations</h1>
      <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
        {dests.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-56 flex-1">
              <p className="font-medium text-ink">{d.name} <span className="font-normal text-ink-3">· {d.state}</span> {d.featured && <Badge tone="accent">featured</Badge>}</p>
              <p className="text-sm text-ink-3">{d._count.hotels} live properties · {d.tagline}</p>
            </div>
            <DestinationEditor d={{ id: d.id, name: d.name, tagline: d.tagline, description: d.description, featured: d.featured, attractions: d.attractions }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
