import type { Metadata } from "next";
import { HotelAdminList } from "@/components/admin/hotel-admin-list";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Properties" };
export const dynamic = "force-dynamic";

export default async function AdminHotels({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Properties</h1>
      <HotelAdminList q={sp.q?.slice(0, 60)} page={Math.max(1, Number(sp.page) || 1)} basePath="/admin/hotels" />
    </div>
  );
}
