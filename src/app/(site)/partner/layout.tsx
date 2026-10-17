import { redirect } from "next/navigation";
import { PartnerNav } from "@/components/partner/partner-nav";
import { getCurrentUser } from "@/lib/auth";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/partner");
  if (user.role !== "PARTNER" && user.role !== "ADMIN") redirect("/");
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <PartnerNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
