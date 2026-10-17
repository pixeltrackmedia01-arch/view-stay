import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; type?: string }> }) {
  const { next, type } = await searchParams;
  return (
    <AuthShell title="Create your account" subtitle="Choose rooms, save favourites and keep every booking in one place.">
      <RegisterForm next={next} initialType={type === "partner" ? "PARTNER" : "CUSTOMER"} />
    </AuthShell>
  );
}
