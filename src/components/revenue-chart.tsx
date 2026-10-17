"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueChart({ data }: { data: { day: string; revenue: number; bookings: number }[] }) {
  const fmt = (v: number) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`;
  return (
    <div className="h-64 w-full" role="img" aria-label="Revenue by booking date over the last 30 days">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} interval={4} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#64748b" }} width={48} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
            cursor={{ fill: "#f1f5f9" }}
          />
          <Bar dataKey="revenue" fill="#14a38b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
