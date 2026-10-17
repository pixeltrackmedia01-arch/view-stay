import type { Metadata } from "next";
import { Box, CalendarCheck, Images, Lock, MousePointerClick, Search } from "lucide-react";
import { MiniPlan } from "@/components/explorer/mini-plan";
import { CORE_FAQ, Faq } from "@/components/home/faq";
import { PageIntro } from "@/components/layout/page-intro";
import { LinkButton } from "@/components/ui/button";
import { generateBuilding } from "@/lib/layout/templates";

export const metadata: Metadata = { title: "How it works", description: "How ViewStay lets you choose the exact physical room you'll stay in." };

const STEPS = [
  { icon: Search, title: "Search a destination", body: "Filter by the view, balcony, floor, bed type and size you care about, not just by price." },
  { icon: Box, title: "Explore the property", body: "Orbit an illustrative 3D model of the building, switch to the 2D floor plan, or browse a plain room list. All three show the same rooms." },
  { icon: Images, title: "Inspect the exact room", body: "See each room's floor, window orientation, outlook, size, photos and price for your dates. Compare up to three rooms side by side." },
  { icon: MousePointerClick, title: "Choose it", body: "Pick room 304, not 'a deluxe room'. Booking several rooms? Choose each one." },
  { icon: Lock, title: "Hold and pay", body: "We hold your exact room for 10 minutes while you check out, re-check availability and price, then confirm it. We never swap in a different room." },
  { icon: CalendarCheck, title: "Manage your stay", body: "Cancel within the property's policy, review after you stay, or book the same room again later." },
];

export default function HowItWorksPage() {
  const plan = generateBuilding("COASTAL_RESORT", "how-it-works").floors[1] ?? generateBuilding("COASTAL_RESORT", "how-it-works").floors[0];
  return (
    <div className="container-page space-y-16 py-12">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <PageIntro eyebrow="How it works" title="Book the room, not the category">
          Most sites sell you a room type and assign the actual room at check-in. ViewStay shows you the building and lets you choose the precise room, floor and outlook before you pay.
        </PageIntro>
        <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
          <MiniPlan floor={plan} highlight={plan.rooms[2]?.number} className="w-full" />
          <p className="mt-2 text-center text-xs text-ink-3">Illustrative floor plan. The highlighted room is the one you&apos;d book.</p>
        </div>
      </div>
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-primary"><s.icon className="size-5" aria-hidden /></span>
              <span className="text-sm font-semibold text-ink-3">Step {i + 1}</span>
            </div>
            <h2 className="mt-3 font-display text-xl text-ink">{s.title}</h2>
            <p className="mt-1 text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold">Questions</h2>
        <Faq items={CORE_FAQ} />
      </section>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/search" variant="accent" size="lg">Explore stays</LinkButton>
        <LinkButton href="/explore-3d" variant="outline" size="lg">Try the 3D explorer</LinkButton>
      </div>
    </div>
  );
}
