import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/layout/page-intro";

export const metadata: Metadata = { title: "About this demo" };

export default function AboutPage() {
  return (
    <div className="container-page space-y-8 py-12">
      <PageIntro eyebrow="About" title="About this demo">ViewStay is a working demonstration of exact-room hotel booking.</PageIntro>
      <Prose>
        <p>Everything a booking needs actually works here: search, live availability, room holds, checkout, cancellation, reviews, and the partner and admin tools. What isn&apos;t real is the inventory and the money.</p>
        <h2>What is illustrative</h2>
        <ul>
          <li>All 350 properties across 35 Indian destinations are fictional. Names, addresses and reviews are generated sample content.</li>
          <li>Room and property images are generated illustrations. They represent a room&apos;s category, interior style, view type and features, and are labelled &ldquo;Illustrative&rdquo;. They are not photographs of real places.</li>
          <li>3D property models and floor plans are generated from each property&apos;s stored room layout. They show position and orientation, not exact architecture.</li>
          <li>Maps are simulated and positions are approximate.</li>
          <li>Prices are demo prices, and the 12% tax is a demo rate. Payments use a simulator; no card is charged and card numbers are not stored.</li>
          <li>Emails (such as password reset links) are recorded in an outbox rather than delivered.</li>
        </ul>
        <h2>What is real</h2>
        <ul>
          <li>Availability is enforced by the database: a room can never be double-booked for overlapping dates.</li>
          <li>Holds, price-change checks and idempotent checkout behave as they would in production.</li>
          <li>Room recommendations are simple, explained rules based on view score, floor, size and price. No AI is involved.</li>
        </ul>
      </Prose>
    </div>
  );
}
