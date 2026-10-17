import type { Metadata } from "next";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";
const PAGE = 50;

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const action = sp.action?.replace(/[^a-z._]/g, "").slice(0, 40);
  const where = action ? { action: { startsWith: action } } : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { actor: { select: { name: true, email: true, role: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Audit log</h1>
      <p className="text-sm text-ink-2">{total.toLocaleString("en-IN")} entries. Every partner and admin change, booking confirmation and cancellation is recorded.</p>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-subtle text-left text-ink-2"><tr><th className="p-3 font-medium">When</th><th className="p-3 font-medium">Who</th><th className="p-3 font-medium">Action</th><th className="p-3 font-medium">Record</th></tr></thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="p-3 whitespace-nowrap">{l.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</td>
                <td className="p-3">{l.actor ? `${l.actor.name} (${l.actor.role.toLowerCase()})` : "System"}</td>
                <td className="p-3 font-mono text-xs">{l.action}</td>
                <td className="p-3 text-xs text-ink-2">{l.entity} {l.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE))} href={(p) => `?${new URLSearchParams({ ...(action ? { action } : {}), page: String(p) })}`} />
    </div>
  );
}
