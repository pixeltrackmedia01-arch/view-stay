import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HotelCreateForm } from "@/components/hotel-create-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add property" };

export default async function NewHotelPage() {
  const user = await requireUser("PARTNER", "ADMIN");
  if (user.role !== "PARTNER") redirect("/admin");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Add a property</h1>
        <p className="text-sm text-slate-600">New properties go live once a ViewStay admin approves them.</p>
      </div>
      <Card><CardContent className="py-6"><HotelCreateForm /></CardContent></Card>
    </div>
  );
}
