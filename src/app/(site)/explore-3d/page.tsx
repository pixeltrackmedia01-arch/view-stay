import type { Metadata } from "next";
import { ArrowRight, Box } from "lucide-react";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Photo } from "@/components/ui/photo";
import { HOTEL_TEMPLATES, TEMPLATE_INFO } from "@/lib/catalog-types";
import { db } from "@/lib/db";
import { defaultStay } from "@/lib/dates";
import { TEMPLATE_ICONS } from "@/lib/icons";

export const metadata: Metadata = { title: "Explore in 3D", description: "Walk around illustrative 3D models of five property styles and choose your exact room." };
export const dynamic = "force-dynamic";

export default async function Explore3DPage() {
  const picks = await Promise.all(
    HOTEL_TEMPLATES.map((t) =>
      db.hotel.findFirst({
        where: { template: t, status: "APPROVED" },
        orderBy: [{ featured: "desc" }, { ratingAvg: "desc" }],
        select: { slug: true, name: true, template: true, destination: { select: { name: true } }, photos: { where: { category: "EXTERIOR" }, take: 1, select: { alt: true, asset: { select: { path: true } } } }, _count: { select: { rooms: true, floors: true } } },
      }),
    ),
  );
  const q = new URLSearchParams({ ...defaultStay(), guests: "2", rooms: "1", view: "3d" }).toString();
  return (
    <div className="container-page space-y-10 py-12">
      <PageIntro eyebrow="3D explorer" title="See the building before you choose your room">
        Each property has an illustrative 3D model generated from its real room layout. Orbit it, lift off a floor, and tap the room you want. The 2D floor plan and room list show exactly the same rooms if you prefer.
      </PageIntro>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {picks.filter((h): h is NonNullable<typeof h> => !!h).map((h) => {
          const Icon = TEMPLATE_ICONS[h.template];
          return (
            <li key={h.slug} className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)]">
              <Photo src={h.photos[0]?.asset.path} alt={h.photos[0]?.alt ?? h.name} ratio="3/2" illustrative />
              <div className="space-y-1 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent-hover uppercase"><Icon className="size-4" aria-hidden /> {TEMPLATE_INFO[h.template].label}</p>
                <h2 className="font-display text-xl text-ink">
                  <Link href={`/hotels/${h.slug}/explore?${q}`} className="after:absolute after:inset-0">{h.name}</Link>
                </h2>
                <p className="text-sm text-ink-2">{h.destination.name} · {h._count.floors} floors · {h._count.rooms} rooms</p>
                <p className="text-sm text-ink-3">{TEMPLATE_INFO[h.template].description}</p>
                <span className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary"><Box className="size-4" aria-hidden /> Open in 3D <ArrowRight className="size-4" aria-hidden /></span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-ink-3">Models are illustrative: they show each room&apos;s floor, position and orientation, not exact architecture or finishes. Needs WebGL; without it you&apos;ll get the floor plan instead.</p>
    </div>
  );
}
