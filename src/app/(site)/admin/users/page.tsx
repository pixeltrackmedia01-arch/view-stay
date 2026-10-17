import type { Metadata } from "next";
import type { Prisma, Role } from "@prisma/client";
import { Search } from "lucide-react";
import Link from "next/link";
import { AdminAction } from "@/components/admin/admin-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";
const PAGE = 30;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; page?: string }> }) {
  const admin = await requireUser("ADMIN");
  const sp = await searchParams;
  const role = (["CUSTOMER", "PARTNER", "ADMIN"] as const).find((r) => r === sp.role) ?? "CUSTOMER";
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = { role: role as Role, ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }) };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, name: true, email: true, isActive: true, createdAt: true, _count: { select: { bookings: true, hotels: true } } } }),
    db.user.count({ where }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Users</h1>
      <nav aria-label="Role" className="flex gap-1 border-b border-line">
        {[["CUSTOMER", "Customers"], ["PARTNER", "Partners"], ["ADMIN", "Admins"]].map(([r, l]) => (
          <Link key={r} href={`?role=${r}`} aria-current={r === role ? "page" : undefined} className={cn("-mb-px flex min-h-11 items-center border-b-2 px-4 text-sm font-medium", r === role ? "border-primary text-primary" : "border-transparent text-ink-2")}>{l}</Link>
        ))}
      </nav>
      <form className="flex gap-2" role="search" aria-label="Search users">
        <input type="hidden" name="role" value={role} />
        <Input name="q" defaultValue={q} placeholder="Name or email" className="max-w-sm" aria-label="Search users" />
        <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden /> Search</Button>
      </form>
      <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-56 flex-1">
              <p className="font-medium text-ink">{u.name} {!u.isActive && <Badge tone="danger">deactivated</Badge>}</p>
              <p className="text-sm text-ink-3">{u.email} · joined {formatDate(u.createdAt)} · {role === "PARTNER" ? `${u._count.hotels} properties` : `${u._count.bookings} bookings`}</p>
            </div>
            {u.id !== admin.id && (
              <AdminAction
                url={`/api/admin/users/${u.id}`}
                body={{ isActive: !u.isActive }}
                label={u.isActive ? "Deactivate" : "Reactivate"}
                variant={u.isActive ? "dangerOutline" : "secondary"}
                danger={u.isActive}
                confirmTitle={`${u.isActive ? "Deactivate" : "Reactivate"} ${u.name}?`}
                confirmText={u.isActive ? "They will be signed out and unable to sign in. Their bookings and properties are kept." : "They will be able to sign in again."}
                done="Account updated"
              />
            )}
          </li>
        ))}
      </ul>
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE))} href={(p) => `?${new URLSearchParams({ role, ...(q ? { q } : {}), page: String(p) })}`} />
    </div>
  );
}
