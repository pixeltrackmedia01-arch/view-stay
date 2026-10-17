import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account/account-nav";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AccountNav name={user.name} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
