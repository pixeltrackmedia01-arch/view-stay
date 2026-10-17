import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">Welcome back</h1>
      <Card>
        <CardContent className="py-6">
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
