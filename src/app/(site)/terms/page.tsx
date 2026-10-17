import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/layout/page-intro";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="container-page space-y-8 py-12">
      <PageIntro eyebrow="Legal" title="Terms of use">Demo terms. This site is not a commercial service.</PageIntro>
      <Prose>
        <p>ViewStay is a demonstration. No real accommodation is offered, no contract for accommodation is formed, and no payment is taken. Do not enter real card details; use the test numbers shown at checkout.</p>
        <h2>Accounts</h2>
        <p>Demo accounts and data may be reset at any time. Keep your password private; you are responsible for activity on your account.</p>
        <h2>Bookings</h2>
        <p>A booking reserves one specific physical room for the dates shown. Cancellation follows the property&apos;s policy and the rate plan you chose, as shown before payment.</p>
        <h2>Content</h2>
        <p>Images, models and descriptions are illustrative and may not represent any real place. Reviews must relate to a completed stay and must not contain unlawful or abusive content.</p>
      </Prose>
    </div>
  );
}
