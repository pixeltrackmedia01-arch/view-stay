import { DashboardShell } from "@/components/dashboard-shell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      title="Partner"
      nav={[
        { href: "/partner", label: "Overview" },
        { href: "/partner/bookings", label: "Bookings" },
        { href: "/partner/hotels/new", label: "Add property" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
