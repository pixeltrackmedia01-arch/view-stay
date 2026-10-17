import { json, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getHotelBySlug } from "@/server/hotels";

/** Property details with the ordered photo gallery. */
export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const hotel = await getHotelBySlug((await params).slug, await getCurrentUser());
  return json({
    hotel: {
      id: hotel.id, slug: hotel.slug, name: hotel.name, description: hotel.description, starRating: hotel.starRating, template: hotel.template,
      destination: hotel.destination, neighborhood: hotel.neighborhood, amenities: hotel.amenities, highlights: hotel.highlights, houseRules: hotel.houseRules,
      cancellationPolicy: hotel.cancellationPolicy, checkInTime: hotel.checkInTime, checkOutTime: hotel.checkOutTime, ratingAvg: hotel.ratingAvg, reviewCount: hotel.reviewCount,
      photos: hotel.photos.map((p) => ({ id: p.id, category: p.category, path: p.asset.path, alt: p.alt, width: p.asset.width, height: p.asset.height, illustrative: p.asset.illustrative })),
      roomTypes: hotel.roomTypes.map((t) => ({ id: t.id, name: t.name, category: t.category, bedType: t.bedType, maxGuests: t.maxGuests, sizeSqm: t.sizeSqm, basePrice: t.basePrice })),
    },
  });
});
