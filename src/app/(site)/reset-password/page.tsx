import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      {token && token.length >= 20 ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <Alert title="This reset link is incomplete">Open the link from your email again, or request a new one.</Alert>
          <LinkButton href="/forgot-password" variant="secondary" className="w-full">Request a new link</LinkButton>
        </div>
      )}
    </AuthShell>
  );
}
