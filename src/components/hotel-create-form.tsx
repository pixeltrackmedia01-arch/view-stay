"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";
import { VIEW_LABELS } from "@/lib/labels";
import { VIEW_TYPES, hotelCreateInput } from "@/lib/validation";

// The form collects rupees and a comma list; the API takes paise and an array.
const formSchema = hotelCreateInput.omit({ basePrice: true, amenities: true }).extend({
  basePriceRupees: z.coerce.number().min(500, "Minimum ₹500").max(1_000_000),
  amenitiesText: z.string().optional(),
});
type Values = z.input<typeof formSchema>;

export function HotelCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { country: "India", starRating: 3, floors: 3, roomsPerFloor: 8, maxGuests: 2, roomTypeName: "Deluxe", basePriceRupees: 4000, primaryView: "CITY" },
  });

  const onSubmit = handleSubmit(async (raw) => {
    setError(null);
    const v = formSchema.parse(raw);
    const { basePriceRupees, amenitiesText, ...rest } = v;
    try {
      const { hotel } = await api<{ hotel: { id: string } }>("/api/partner/hotels", {
        body: {
          ...rest,
          basePrice: Math.round(basePriceRupees * 100),
          amenities: (amenitiesText ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      router.push(`/partner/hotels/${hotel.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  });
  const err = (k: keyof Values) => errors[k]?.message as string | undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {error && <Alert className="sm:col-span-2">{error}</Alert>}
      <Field label="Property name" htmlFor="name" error={err("name")}><Input id="name" {...register("name")} /></Field>
      <Field label="Star rating" htmlFor="starRating" error={err("starRating")}>
        <Select id="starRating" {...register("starRating")}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star</option>)}</Select>
      </Field>
      <Field label="Description" htmlFor="description" error={err("description")} className="sm:col-span-2"><Textarea id="description" {...register("description")} /></Field>
      <Field label="Address" htmlFor="address" error={err("address")} className="sm:col-span-2"><Input id="address" {...register("address")} /></Field>
      <Field label="City" htmlFor="city" error={err("city")}><Input id="city" {...register("city")} /></Field>
      <Field label="Country" htmlFor="country" error={err("country")}><Input id="country" {...register("country")} /></Field>
      <Field label="Amenities" htmlFor="amenitiesText" hint="Comma separated, e.g. Pool, Free Wi-Fi, Spa" className="sm:col-span-2"><Input id="amenitiesText" {...register("amenitiesText")} /></Field>
      <h2 className="pt-2 font-semibold sm:col-span-2">Floor plan generator</h2>
      <p className="-mt-3 text-sm text-slate-500 sm:col-span-2">We create floors, a corridor, lift and stairs, and numbered rooms. Front rooms face your primary view; fine-tune each room afterwards.</p>
      <Field label="Floors" htmlFor="floors" error={err("floors")}><Input id="floors" type="number" min={1} max={10} {...register("floors")} /></Field>
      <Field label="Rooms per floor" htmlFor="roomsPerFloor" error={err("roomsPerFloor")}><Input id="roomsPerFloor" type="number" min={2} max={10} {...register("roomsPerFloor")} /></Field>
      <Field label="Room type name" htmlFor="roomTypeName" error={err("roomTypeName")}><Input id="roomTypeName" {...register("roomTypeName")} /></Field>
      <Field label="Base price per night (₹)" htmlFor="basePriceRupees" error={err("basePriceRupees")}><Input id="basePriceRupees" type="number" {...register("basePriceRupees")} /></Field>
      <Field label="Max guests per room" htmlFor="maxGuests" error={err("maxGuests")}><Input id="maxGuests" type="number" min={1} max={8} {...register("maxGuests")} /></Field>
      <Field label="Primary view (front rooms)" htmlFor="primaryView" error={err("primaryView")}>
        <Select id="primaryView" {...register("primaryView")}>{VIEW_TYPES.map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}</Select>
      </Field>
      <div className="sm:col-span-2"><Button type="submit" loading={isSubmitting}>Create property</Button></div>
    </form>
  );
}
