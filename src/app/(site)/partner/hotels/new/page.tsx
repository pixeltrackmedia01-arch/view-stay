import type { Metadata } from "next";
import { NewHotelForm } from "@/components/partner/new-hotel-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Add a property" };

export default async function NewHotelPage() {
  const destinations = await db.destination.findMany({ select: { id: true, name: true, state: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Add a property</h1>
      <NewHotelForm destinations={destinations} />
    </div>
  );
}
