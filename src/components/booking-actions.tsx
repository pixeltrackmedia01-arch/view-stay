"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";
import { reviewInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function CancelBookingButton({ code, size = "sm" }: { code: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outlineDanger"
        size={size}
        loading={busy}
        data-testid={`cancel-${code}`}
        onClick={async () => {
          if (!confirm(`Cancel booking ${code}? The payment will be refunded.`)) return;
          setBusy(true);
          setError(null);
          try {
            await api(`/api/bookings/${code}/cancel`, { method: "POST" });
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Cancel booking
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

type ReviewValues = z.input<typeof reviewInput>;

export function ReviewForm({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ReviewValues>({
    resolver: zodResolver(reviewInput),
    defaultValues: { rating: 5, comment: "" },
  });
  const rating = Number(watch("rating"));
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          await api(`/api/bookings/${code}/review`, { body: v });
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        }
      })}
    >
      {error && <Alert>{error}</Alert>}
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setValue("rating", n)}>
            <Star className={cn("size-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
      </div>
      <Field label="Your review" htmlFor={`comment-${code}`} error={errors.comment?.message}>
        <Textarea id={`comment-${code}`} {...register("comment")} placeholder="How was the room you picked?" />
      </Field>
      <Button type="submit" size="sm" loading={isSubmitting}>Submit review</Button>
    </form>
  );
}
