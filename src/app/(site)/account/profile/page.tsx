import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/account/profile-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile & security" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Profile & security</h1>
      <ProfileForm name={user.name} phone={user.phone ?? ""} email={user.email} />
      <PasswordForm />
    </div>
  );
}
