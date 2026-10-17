import type { Metadata } from "next";
import { BarChart3, Building2, CalendarRange, Grid2x2, Images, Percent } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { LinkButton } from "@/components/ui/button";
import { COMMISSION_RATE } from "@/lib/config";

export const metadata: Metadata = { title: "List your property" };

const FEATURES = [
  { icon: Grid2x2, title: "Floor-plan editor", body: "Lay out each floor once. The same layout powers your 2D plan, 3D model and room pages." },
  { icon: Images, title: "Photos per room", body: "Upload photos for each physical room and property area, reorder them and pick the cover." },
  { icon: CalendarRange, title: "Availability calendar", body: "See every room by date, close rooms for maintenance and keep inventory accurate." },
  { icon: Building2, title: "Room-level pricing", body: "Set a base price per room type and adjust individual rooms with better views or more space." },
  { icon: BarChart3, title: "Analytics", body: "Occupancy, revenue and which rooms guests choose most." },
  { icon: Percent, title: "Simple commission", body: `A flat ${COMMISSION_RATE * 100}% commission per confirmed booking in this demo.` },
];

export default function PartnersPage() {
  return (
    <div className="container-page space-y-12 py-12">
      <PageIntro eyebrow="For hotels" title="Let guests choose your best rooms">
        Rooms with a view sell themselves when guests can see them. List your property, map your rooms and let travellers pick exactly where they stay.
      </PageIntro>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <f.icon className="size-6 text-secondary" aria-hidden />
            <h2 className="mt-3 font-display text-xl text-ink">{f.title}</h2>
            <p className="mt-1 text-ink-2">{f.body}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/register?type=partner" variant="accent" size="lg">Create a partner account</LinkButton>
        <LinkButton href="/partner" variant="outline" size="lg">Partner dashboard</LinkButton>
      </div>
      <p className="text-sm text-ink-3">New properties are reviewed by an administrator before they appear in search. Demo partner login: partner@viewstay.dev / Password123!</p>
    </div>
  );
}
