"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { AMENITIES } from "@/lib/amenities";
import { HOTEL_TEMPLATES, TEMPLATE_INFO, VIEW_KEYS, VIEW_LABELS } from "@/lib/catalog-types";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { hotelCreateInput } from "@/lib/validation";

type Values = z.input<typeof hotelCreateInput>;

export function NewHotelForm({ destinations }: { destinations: { id: string; name: string; state: string }[] }) {
  const router = useRouter();
  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(hotelCreateInput),
    defaultValues: { template: "CITY_MODERN", palette: 0, starRating: 4, amenities: ["Free Wi-Fi"], frontView: "CITY", backView: "GARDEN", basePrice: 4500_00 },
  });
  const template = watch("template");
  const amenities = watch("amenities") ?? [];
  const onSubmit = handleSubmit(async (v) => {
    try {
      const { hotel } = await api<{ hotel: { id: string } }>("/api/partner/hotels", { body: v });
      router.push(`/partner/hotels/${hotel.id}?created=1`);
    } catch (e) {
      setError("root", { message: (e as Error).message });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {errors.root && <Alert>{errors.root.message}</Alert>}
      <Card>
        <CardHeader><CardTitle as="h2">Building style</CardTitle></CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Building template" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HOTEL_TEMPLATES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={template === t} onClick={() => setValue("template", t)} className={cn("rounded-[var(--radius-md)] border p-3 text-left", template === t ? "border-primary bg-accent-soft ring-2 ring-primary/20" : "border-line hover:border-line-strong")}>
                <span className="font-semibold text-ink">{TEMPLATE_INFO[t].label}</span>
                <span className="mt-1 block text-sm text-ink-2">{TEMPLATE_INFO[t].description}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-3">We generate floors, rooms, a 3D model and illustrative photos from this template. You can edit the floor plan, rooms and photos after creating it.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle as="h2">Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Property name" htmlFor="nh-name" error={errors.name?.message}><Input id="nh-name" {...register("name")} aria-invalid={!!errors.name} /></Field>
          <Field label="Destination" htmlFor="nh-dest" error={errors.destinationId?.message}>
            <Select id="nh-dest" {...register("destinationId")} defaultValue="" aria-invalid={!!errors.destinationId}>
              <option value="" disabled>Choose…</option>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.state}</option>)}
            </Select>
          </Field>
          <Field label="Street address" htmlFor="nh-addr" error={errors.address?.message} className="sm:col-span-2"><Input id="nh-addr" {...register("address")} aria-invalid={!!errors.address} /></Field>
          <Field label="Description" htmlFor="nh-desc" error={errors.description?.message} className="sm:col-span-2"><Textarea id="nh-desc" rows={4} {...register("description")} aria-invalid={!!errors.description} /></Field>
          <Field label="Star rating" htmlFor="nh-stars"><Select id="nh-stars" {...register("starRating")}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</Select></Field>
          <Field label="Standard room price per night (₹)" htmlFor="nh-price" error={errors.basePrice?.message} hint="Deluxe and suite prices are set relative to this; you can change them later.">
            <Input id="nh-price" type="number" min={500} step={100} defaultValue={4500} onChange={(e) => setValue("basePrice", Math.round(Number(e.target.value) * 100), { shouldValidate: true })} />
          </Field>
          <Field label="Front facade faces" htmlFor="nh-fv"><Select id="nh-fv" {...register("frontView")}>{VIEW_KEYS.map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}</Select></Field>
          <Field label="Rear facade faces" htmlFor="nh-bv"><Select id="nh-bv" {...register("backView")}>{VIEW_KEYS.map((v) => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}</Select></Field>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-ink">Amenities</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = amenities.includes(a);
                return (
                  <button key={a} type="button" aria-pressed={on} onClick={() => setValue("amenities", on ? amenities.filter((x) => x !== a) : [...amenities, a])} className={cn("min-h-10 rounded-full border px-3 text-sm", on ? "border-primary bg-primary text-white" : "border-line bg-surface")}>{a}</button>
                );
              })}
            </div>
          </fieldset>
        </CardContent>
      </Card>
      <Button type="submit" variant="accent" size="lg" loading={isSubmitting}>Create property</Button>
      <p className="text-sm text-ink-3">New properties are hidden from search until an administrator approves them.</p>
    </form>
  );
}
