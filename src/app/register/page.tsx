import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; type?: string }> }) {
  const { next, type } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">Create your ViewStay account</h1>
      <Card>
        <CardContent className="py-6">
          <RegisterForm next={next} initialType={type === "partner" ? "PARTNER" : "CUSTOMER"} />
        </CardContent>
      </Card>
    </div>
  );
}
