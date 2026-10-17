"use client";

import { BedDouble, Building2, LayoutDashboard, Plus } from "lucide-react";
import { ConsoleNav } from "./console-nav";

export function PartnerNav() {
  return (
    <ConsoleNav
      title="Partner"
      links={[
        { href: "/partner", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/partner/hotels", label: "Properties", icon: Building2 },
        { href: "/partner/bookings", label: "Bookings", icon: BedDouble },
        { href: "/partner/hotels/new", label: "Add property", icon: Plus, exact: true },
      ]}
    />
  );
}
