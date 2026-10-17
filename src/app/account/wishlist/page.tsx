import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { HotelCover } from "@/components/hotel-cover";
import { Stars } from "@/components/stars";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/wishlist");
  const items = await db.wishlist.findMany({
    where: { userId: user.id, hotel: { status: "APPROVED" } },
    include: { hotel: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Wishlist</h1>
      {items.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Heart className="size-10 text-slate-400" aria-hidden />
          <p className="mt-3 font-medium">No saved hotels yet</p>
          <Link href="/search" className="mt-3 text-sm font-medium text-brand-700 underline">Explore hotels</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ hotel }) => (
            <li key={hotel.id}>
              <Link href={`/hotels/${hotel.slug}`} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white">
                <HotelCover hue={hotel.coverHue} name={hotel.name} className="h-32" />
                <div className="p-4">
                  <p className="font-semibold group-hover:text-brand-700">{hotel.name}</p>
                  <p className="text-sm text-slate-500">{hotel.city} · <Stars count={hotel.starRating} /></p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
