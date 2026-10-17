import type { Metadata } from "next";
import { UserActiveToggle } from "@/components/admin-actions";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Admin · Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const admin = await requireUser("ADMIN");
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { bookings: true, hotels: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.name}<br /><span className="text-xs text-slate-500">{u.email}</span></td>
                <td className="px-4 py-3"><Badge tone={u.role === "ADMIN" ? "rose" : u.role === "PARTNER" ? "brand" : "slate"}>{u.role.toLowerCase()}</Badge></td>
                <td className="px-4 py-3 text-xs text-slate-600">{u._count.bookings} bookings · {u._count.hotels} hotels</td>
                <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3"><Badge tone={u.isActive ? "green" : "rose"}>{u.isActive ? "active" : "deactivated"}</Badge></td>
                <td className="px-4 py-3"><UserActiveToggle userId={u.id} isActive={u.isActive} disabled={u.id === admin.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
