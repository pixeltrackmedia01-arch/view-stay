import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Photo } from "@/components/ui/photo";
import { requireUser } from "@/lib/auth";
import { TEMPLATE_INFO } from "@/lib/catalog-types";
import { listPartnerHotels } from "@/server/partner";

export const metadata: Metadata = { title: "Your properties" };
export const dynamic = "force-dynamic";

export default async function PartnerHotels() {
  const user = await requireUser("PARTNER", "ADMIN");
  const hotels = await listPartnerHotels(user.id);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Properties</h1>
        <LinkButton href="/partner/hotels/new" variant="accent"><Plus className="size-4" aria-hidden /> Add property</LinkButton>
      </div>
      {hotels.length === 0 ? (
        <EmptyState icon={Building2} title="No properties yet" action={<LinkButton href="/partner/hotels/new">Add a property</LinkButton>}>Your listed properties will appear here.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {hotels.map((h) => (
            <li key={h.id} className="relative flex gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-3" data-testid="partner-hotel">
              <Photo src={h.photos[0]?.asset.path} alt={h.name} ratio="4/3" className="w-32 shrink-0 rounded-[var(--radius-md)]" />
              <div className="min-w-0 space-y-1">
                <Badge tone={h.status === "APPROVED" ? "success" : h.status === "PENDING" ? "warning" : "danger"}>{h.status === "PENDING" ? "Awaiting approval" : h.status.toLowerCase()}</Badge>
                <h2 className="font-display text-lg text-ink"><Link href={`/partner/hotels/${h.id}`} className="after:absolute after:inset-0">{h.name}</Link></h2>
                <p className="text-sm text-ink-2">{h.destination.name} · {TEMPLATE_INFO[h.template].label}</p>
                <p className="text-sm text-ink-3">{h._count.rooms} rooms · {h._count.bookings} bookings</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
