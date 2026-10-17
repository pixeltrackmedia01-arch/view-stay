import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Email outbox" };
export const dynamic = "force-dynamic";

/** Reset links are credentials: never show them to staff, even in a demo. */
const redact = (body: string) => body.replace(/token=[A-Za-z0-9_-]+/g, "token=[redacted]");

export default async function AdminOutbox() {
  await requireUser("ADMIN");
  const messages = await db.emailMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Email outbox</h1>
      <p className="text-ink-2">This demo records emails instead of sending them. Password-reset links are redacted here.</p>
      {messages.length === 0 ? (
        <EmptyState icon={Mail} title="No emails yet">Password resets will appear here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 text-sm">
              <p className="font-medium text-ink">{m.subject}</p>
              <p className="text-ink-3">To {m.to} · {m.kind} · {m.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-ink-2">{redact(m.body)}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
