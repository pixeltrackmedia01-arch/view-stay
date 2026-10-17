"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Daily revenue over the last 30 days. A data table follows for screen readers. */
export function RevenueChart({ data }: { data: { day: string; revenue: number; bookings: number }[] }) {
  const fmt = (v: number) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`;
  return (
    <figure>
      <div className="h-64" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e8edeb" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#647278" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#647278" }} tickLine={false} axisLine={false} width={44} />
            <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} cursor={{ fill: "#f0f3f2" }} />
            <Bar dataKey="revenue" fill="#173f4f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>Revenue by booking date, last 30 days</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}><th>{d.day}</th><td>₹{d.revenue.toLocaleString("en-IN")}</td><td>{d.bookings} bookings</td></tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
