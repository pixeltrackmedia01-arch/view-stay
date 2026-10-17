"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";
import { changePasswordInput, profileInput } from "@/lib/validation";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const router = useRouter();
  const toast = useToast();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = useForm<z.input<typeof profileInput>>({ resolver: zodResolver(profileInput), defaultValues: { name, phone } });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await api("/api/account/profile", { method: "PATCH", body: v });
      toast({ tone: "success", title: "Profile saved" });
      router.refresh();
    } catch (e) {
      setError("root", { message: (e as Error).message });
    }
  });
  return (
    <Card>
      <CardHeader><CardTitle as="h2">Profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="pf-name" error={errors.name?.message}>
            <Input id="pf-name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Phone" htmlFor="pf-phone" error={errors.phone?.message}>
            <Input id="pf-phone" type="tel" autoComplete="tel" {...register("phone")} aria-invalid={!!errors.phone} />
          </Field>
          <Field label="Email" htmlFor="pf-email" hint="Email changes aren't supported in this demo." className="sm:col-span-2">
            <Input id="pf-email" value={email} readOnly disabled />
          </Field>
          {errors.root && <p className="text-sm text-danger sm:col-span-2" role="alert">{errors.root.message}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<z.input<typeof changePasswordInput>>({ resolver: zodResolver(changePasswordInput) });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await api("/api/account/password", { body: v });
      toast({ tone: "success", title: "Password updated" });
      reset({ currentPassword: "", newPassword: "" });
    } catch (e) {
      setError("root", { message: (e as Error).message });
    }
  });
  return (
    <Card>
      <CardHeader><CardTitle as="h2">Password</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password" htmlFor="pw-current" error={errors.currentPassword?.message}>
            <Input id="pw-current" type="password" autoComplete="current-password" {...register("currentPassword")} aria-invalid={!!errors.currentPassword} />
          </Field>
          <Field label="New password" htmlFor="pw-new" error={errors.newPassword?.message} hint="At least 8 characters">
            <Input id="pw-new" type="password" autoComplete="new-password" {...register("newPassword")} aria-invalid={!!errors.newPassword} />
          </Field>
          {errors.root && <p className="text-sm text-danger sm:col-span-2" role="alert">{errors.root.message}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" loading={isSubmitting}>Change password</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
