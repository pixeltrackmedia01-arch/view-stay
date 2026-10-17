import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/layout/page-intro";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="container-page space-y-8 py-12">
      <PageIntro eyebrow="Legal" title="Privacy">What this demo stores and why.</PageIntro>
      <Prose>
        <ul>
          <li>Account details: name, email, optional phone, and a salted password hash. Passwords are never stored in plain text.</li>
          <li>Bookings: dates, rooms, guest contact details you enter at checkout, and payment results. Only the last four card digits are kept.</li>
          <li>A signed session cookie keeps you signed in. No advertising or third-party tracking cookies are used.</li>
          <li>Partners see bookings for their own properties only. Administrators can see bookings for support, and their actions are audit-logged.</li>
          <li>Uploaded photos are stored on the server and served from this site.</li>
        </ul>
        <p>Because this is a demo, data may be reset at any time. Please don&apos;t enter sensitive real information.</p>
      </Prose>
    </div>
  );
}
