import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HotelTabs } from "@/components/partner/hotel-tabs";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { isAppError } from "@/lib/errors";
import { assertHotelAccess } from "@/server/partner";

export default async function PartnerHotelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const user = await requireUser("PARTNER", "ADMIN");
  const { id } = await params;
  const hotel = await assertHotelAccess(user, id).catch((e) => {
    if (isAppError(e)) notFound();
    throw e;
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3"><Link href="/partner/hotels" className="hover:underline">Properties</Link> / {hotel.destination.name}</p>
          <h1 className="font-display text-3xl font-semibold">{hotel.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={hotel.status === "APPROVED" ? "success" : hotel.status === "PENDING" ? "warning" : "danger"}>{hotel.status === "PENDING" ? "Awaiting approval" : hotel.status.toLowerCase()}</Badge>
          <Link href={`/hotels/${hotel.slug}`} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line px-3 text-sm hover:border-primary">
            {hotel.status === "APPROVED" ? "View live page" : "Preview page"} <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
      <HotelTabs id={id} />
      {children}
    </div>
  );
}
