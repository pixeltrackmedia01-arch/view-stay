import type { HotelStatus, Prisma } from "@prisma/client";
import { Building2, Search } from "lucide-react";
import Link from "next/link";
import { AdminAction } from "@/components/admin/admin-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { TEMPLATE_INFO } from "@/lib/catalog-types";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";

const PAGE = 25;

export async function HotelAdminList({ status, q, page, basePath }: { status?: HotelStatus; q?: string; page: number; basePath: string }) {
  const where: Prisma.HotelWhereInput = {
    ...(status && { status }),
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { owner: { email: { contains: q, mode: "insensitive" } } }] }),
  };
  const [hotels, total] = await Promise.all([
    db.hotel.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE, select: { id: true, slug: true, name: true, status: true, featured: true, template: true, createdAt: true, destination: { select: { name: true } }, owner: { select: { name: true, email: true } }, _count: { select: { rooms: true } } } }),
    db.hotel.count({ where }),
  ]);
  const qs = (p: number) => `${basePath}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return (
    <div className="space-y-4">
      <form className="flex gap-2" role="search" aria-label="Search properties">
        <Input name="q" defaultValue={q} placeholder="Name, city or partner email" className="max-w-sm" aria-label="Search properties" />
        <Button type="submit" variant="secondary"><Search className="size-4" aria-hidden /> Search</Button>
      </form>
      <p className="text-sm text-ink-2">{total} propert{total === 1 ? "y" : "ies"}</p>
      {hotels.length === 0 ? (
        <EmptyState icon={Building2} title={status === "PENDING" ? "Nothing waiting for approval" : "No properties found"}>{status === "PENDING" ? "New partner listings will appear here." : "Try another search."}</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
          {hotels.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 p-3" data-testid="admin-hotel">
              <div className="min-w-56 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/hotels/${h.slug}`} className="font-medium text-ink hover:underline">{h.name}</Link>
                  <Badge tone={h.status === "APPROVED" ? "success" : h.status === "PENDING" ? "warning" : "danger"}>{h.status.toLowerCase()}</Badge>
                  {h.featured && <Badge tone="accent">featured</Badge>}
                </div>
                <p className="text-sm text-ink-3">{h.destination.name} · {TEMPLATE_INFO[h.template].label} · {h._count.rooms} rooms · {h.owner.name} ({h.owner.email}) · listed {formatDate(h.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {h.status !== "APPROVED" && <AdminAction url={`/api/admin/hotels/${h.id}`} body={{ status: "APPROVED" }} label="Approve" variant="primary" confirmTitle={`Approve ${h.name}?`} confirmText="It will appear in search and can take bookings immediately." done={`${h.name} approved`} />}
                {h.status === "APPROVED" && <AdminAction url={`/api/admin/hotels/${h.id}`} body={{ featured: !h.featured }} label={h.featured ? "Unfeature" : "Feature"} confirmTitle={h.featured ? `Remove ${h.name} from featured?` : `Feature ${h.name}?`} confirmText={h.featured ? "It will no longer be promoted on the homepage." : "It will be promoted on the homepage and destination pages."} done="Featured status updated" />}
                {h.status !== "SUSPENDED" && <AdminAction url={`/api/admin/hotels/${h.id}`} body={{ status: "SUSPENDED" }} label={h.status === "PENDING" ? "Reject" : "Suspend"} variant="dangerOutline" danger confirmTitle={`${h.status === "PENDING" ? "Reject" : "Suspend"} ${h.name}?`} confirmText="It will be hidden from search and no new bookings can be made. Existing bookings are kept." done={`${h.name} suspended`} />}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE))} href={qs} />
    </div>
  );
}
