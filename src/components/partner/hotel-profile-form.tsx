"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { POLICY_INFO } from "@/lib/cancellation";
import { api } from "@/lib/client";
import { hotelProfileInput } from "@/lib/validation";

// The form edits list fields as one-per-line text.
const formSchema = hotelProfileInput.extend({ amenities: z.string(), highlights: z.string(), houseRules: z.string() });
type Values = z.input<typeof formSchema>;
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function HotelProfileForm({ id, initial }: { id: string; initial: z.input<typeof hotelProfileInput> }) {
  const router = useRouter();
  const toast = useToast();
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...initial, amenities: (initial.amenities ?? []).join("\n"), highlights: (initial.highlights ?? []).join("\n"), houseRules: (initial.houseRules ?? []).join("\n") },
  });
  const onSubmit = handleSubmit(async (v) => {
    const body = { ...v, amenities: lines(v.amenities), highlights: lines(v.highlights), houseRules: lines(v.houseRules) };
    const parsed = hotelProfileInput.safeParse(body);
    if (!parsed.success) return setError("root", { message: parsed.error.issues[0].message });
    try {
      await api(`/api/partner/hotels/${id}`, { method: "PATCH", body: parsed.data });
      toast({ tone: "success", title: "Property details saved" });
      reset(v);
      router.refresh();
    } catch (e) {
      setError("root", { message: (e as Error).message });
    }
  });
  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          {errors.root && <Alert className="sm:col-span-2">{errors.root.message}</Alert>}
          <Field label="Name" htmlFor="hp-name" error={errors.name?.message}><Input id="hp-name" {...register("name")} /></Field>
          <Field label="Neighbourhood" htmlFor="hp-nb" error={errors.neighborhood?.message}><Input id="hp-nb" {...register("neighborhood")} /></Field>
          <Field label="Address" htmlFor="hp-addr" error={errors.address?.message} className="sm:col-span-2"><Input id="hp-addr" {...register("address")} /></Field>
          <Field label="Description" htmlFor="hp-desc" error={errors.description?.message} className="sm:col-span-2"><Textarea id="hp-desc" rows={5} {...register("description")} /></Field>
          <Field label="Check-in from" htmlFor="hp-ci" error={errors.checkInTime?.message}><Input id="hp-ci" type="time" {...register("checkInTime")} /></Field>
          <Field label="Check-out until" htmlFor="hp-co" error={errors.checkOutTime?.message}><Input id="hp-co" type="time" {...register("checkOutTime")} /></Field>
          <Field label="Cancellation policy" htmlFor="hp-pol" className="sm:col-span-2">
            <Select id="hp-pol" {...register("cancellationPolicy")}>
              {Object.entries(POLICY_INFO).map(([k, p]) => <option key={k} value={k}>{p.label}: {p.summary}</option>)}
            </Select>
          </Field>
          <Field label="Amenities (one per line)" htmlFor="hp-am"><Textarea id="hp-am" rows={6} {...register("amenities")} /></Field>
          <Field label="Highlights (one per line)" htmlFor="hp-hl"><Textarea id="hp-hl" rows={6} {...register("highlights")} /></Field>
          <Field label="House rules (one per line)" htmlFor="hp-hr" className="sm:col-span-2"><Textarea id="hp-hr" rows={4} {...register("houseRules")} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save details</Button>
            <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => reset()}>Discard changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
