"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" });
        qc.clear();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut className="size-4" /> <span className="sr-only sm:not-sr-only">Sign out</span>
    </Button>
  );
}
