import Link from "next/link";

export function DashboardShell({ title, nav, children }: { title: string; nav: { href: string; label: string }[]; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[200px_1fr]">
      <aside>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <nav aria-label={title} className="flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm">
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
