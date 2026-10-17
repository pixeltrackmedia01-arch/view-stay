import type { Metadata } from "next";
import { HotelAdminList } from "@/components/admin/hotel-admin-list";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Approvals" };
export const dynamic = "force-dynamic";

export default async function Approvals({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Approvals</h1>
      <p className="text-ink-2">Review new listings before they go live. Open a property to preview its page, floor plans and photos.</p>
      <HotelAdminList status="PENDING" q={sp.q?.slice(0, 60)} page={Math.max(1, Number(sp.page) || 1)} basePath="/admin/approvals" />
    </div>
  );
}
