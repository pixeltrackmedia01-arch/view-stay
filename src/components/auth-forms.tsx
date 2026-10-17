"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client";
import { loginInput, registerInput, type LoginInput } from "@/lib/validation";
import type { z } from "zod";
import { cn } from "@/lib/utils";

/** Only allow same-site relative redirects. */
function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function homeFor(role: string) {
  return role === "ADMIN" ? "/admin" : role === "PARTNER" ? "/partner" : "/account";
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginInput) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { user } = await api<{ user: { role: string } }>("/api/auth/login", { body: values });
      router.push(safeNext(next, homeFor(user.role)));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-medium">Demo accounts (password <code>Password123!</code>)</p>
        <div className="flex flex-wrap gap-1">
          {["customer", "partner", "admin"].map((who) => (
            <button
              key={who}
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 hover:border-brand-500"
              onClick={() => {
                setValue("email", `${who}@viewstay.dev`);
                setValue("password", "Password123!");
              }}
            >
              {who}@viewstay.dev
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-slate-600">
        New to ViewStay? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 underline">Create an account</Link>
      </p>
    </form>
  );
}

type RegisterValues = z.input<typeof registerInput>;

export function RegisterForm({ next, initialType }: { next?: string; initialType: "CUSTOMER" | "PARTNER" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerInput),
    defaultValues: { accountType: initialType },
  });
  const type = watch("accountType");

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { user } = await api<{ user: { role: string } }>("/api/auth/register", { body: values });
      router.push(safeNext(next, homeFor(user.role)));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-2">
        {(["CUSTOMER", "PARTNER"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setValue("accountType", t)}
            className={cn("rounded-lg border p-3 text-left text-sm", type === t ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white")}
          >
            <span className="block font-semibold">{t === "CUSTOMER" ? "Traveller" : "Hotel partner"}</span>
            <span className="text-xs text-slate-500">{t === "CUSTOMER" ? "Book exact rooms" : "List & manage a property"}</span>
          </button>
        ))}
      </div>
      <Field label="Full name" htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} aria-invalid={!!errors.phone} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters">
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      <p className="text-center text-sm text-slate-600">
        Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 underline">Sign in</Link>
      </p>
    </form>
  );
}
