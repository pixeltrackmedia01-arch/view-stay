"use client";

import { BedDouble, Building2, ClipboardCheck, History, LayoutDashboard, Mail, MapPinned, Percent, Users } from "lucide-react";
import { ConsoleNav } from "@/components/partner/console-nav";

export function AdminNav() {
  return (
    <ConsoleNav
      title="Admin"
      links={[
        { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck },
        { href: "/admin/hotels", label: "Properties", icon: Building2 },
        { href: "/admin/destinations", label: "Destinations", icon: MapPinned },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/bookings", label: "Bookings", icon: BedDouble },
        { href: "/admin/commission", label: "Commission", icon: Percent },
        { href: "/admin/audit", label: "Audit log", icon: History },
        { href: "/admin/outbox", label: "Email outbox", icon: Mail },
      ]}
    />
  );
}
