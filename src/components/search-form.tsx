"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/input";
import { stayInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

const schema = z.object({ city: z.string().trim().min(1, "Where are you going?") }).and(stayInput);
type Values = z.input<typeof schema>;

export function SearchForm({
  defaults,
  compact,
}: {
  defaults: { city?: string; checkIn: string; checkOut: string; guests: number };
  compact?: boolean;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { city: "", ...defaults } });

  const onSubmit = handleSubmit((v) => {
    const p = new URLSearchParams({ city: String(v.city), checkIn: v.checkIn, checkOut: v.checkOut, guests: String(v.guests) });
    router.push(`/search?${p}`);
  });

  const cell = "flex flex-col gap-1 px-3 py-2";
  const lbl = "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500";
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Search hotels"
      className={cn(
        "grid gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200 md:grid-cols-[1.5fr_1fr_1fr_0.7fr_auto] md:items-start",
        compact && "shadow-sm",
      )}
    >
      <div className={cell}>
        <label htmlFor="city" className={lbl}>
          <MapPin className="size-3.5" /> Destination
        </label>
        <Input id="city" placeholder="Goa, Manali, Mumbai…" {...register("city")} aria-invalid={!!errors.city} />
        <FieldError message={errors.city?.message} />
      </div>
      <div className={cell}>
        <label htmlFor="checkIn" className={lbl}>
          <CalendarDays className="size-3.5" /> Check-in
        </label>
        <Input id="checkIn" type="date" {...register("checkIn")} aria-invalid={!!errors.checkIn} />
        <FieldError message={errors.checkIn?.message} />
      </div>
      <div className={cell}>
        <label htmlFor="checkOut" className={lbl}>
          <CalendarDays className="size-3.5" /> Check-out
        </label>
        <Input id="checkOut" type="date" {...register("checkOut")} aria-invalid={!!errors.checkOut} />
        <FieldError message={errors.checkOut?.message} />
      </div>
      <div className={cell}>
        <label htmlFor="guests" className={lbl}>
          <Users className="size-3.5" /> Guests
        </label>
        <Input id="guests" type="number" min={1} max={8} {...register("guests")} aria-invalid={!!errors.guests} />
        <FieldError message={errors.guests?.message} />
      </div>
      <div className="p-2 md:pt-7">
        <Button type="submit" size="lg" className="w-full">
          <Search className="size-4" /> Search
        </Button>
      </div>
    </form>
  );
}
