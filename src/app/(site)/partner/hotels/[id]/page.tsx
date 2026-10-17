import type { Metadata } from "next";
import { HotelProfileForm } from "@/components/partner/hotel-profile-form";
import { Alert } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { assertHotelAccess } from "@/server/partner";

export const metadata: Metadata = { title: "Property profile" };
export const dynamic = "force-dynamic";

export default async function PartnerHotelProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const { id } = await params;
  const { created } = await searchParams;
  const h = await assertHotelAccess(user, id);
  return (
    <div className="space-y-4">
      {created && (
        <Alert tone="success" title="Property created">
          We generated floors, rooms, a 3D model and illustrative photos from your template. Review the floor plans, room details and prices, then upload your own photos. An administrator will approve the listing before it appears in search.
        </Alert>
      )}
      <HotelProfileForm
        id={h.id}
        initial={{ name: h.name, description: h.description, address: h.address, neighborhood: h.neighborhood, amenities: h.amenities, highlights: h.highlights, houseRules: h.houseRules, checkInTime: h.checkInTime, checkOutTime: h.checkOutTime, cancellationPolicy: h.cancellationPolicy }}
      />
    </div>
  );
}
