import { DashboardShell } from "@/components/dashboard-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      title="Admin"
      nav={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/hotels", label: "Hotels" },
        { href: "/admin/bookings", label: "Bookings" },
        { href: "/admin/users", label: "Users" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
