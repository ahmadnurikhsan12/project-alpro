"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProgressState } from "@/lib/progress/types";

const BRAND = "#2546ea";
const GRID = "#e2e8f0";
const AXIS = { fontSize: 12, fill: "#64748b" };

const dayLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

/** XP kumulatif per hari dari riwayat aktivitas. */
export function xpSeries(state: ProgressState) {
  const byDay = new Map<string, number>();
  for (const a of state.activity) byDay.set(a.createdAt.slice(0, 10), (byDay.get(a.createdAt.slice(0, 10)) ?? 0) + a.xp);
  const days = [...byDay.keys()].sort();
  const inList = [...byDay.values()].reduce((s, v) => s + v, 0);
  // XP dari aktivitas lama yang sudah terpangkas dari riwayat menjadi titik awal
  let running = Math.max(0, state.xp - inList);
  return days.map((d) => ({ day: dayLabel.format(new Date(d)), xp: (running += byDay.get(d)!) })).slice(-14);
}

export function scoreSeries(state: ProgressState) {
  return state.attempts
    .slice(0, 10)
    .reverse()
    .map((a, i) => ({ n: `#${i + 1}`, title: a.title, score: a.score }));
}

function TooltipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card">
      <p className="text-xs text-ink-muted">{title}</p>
      <p className="font-bold text-ink">{value}</p>
    </div>
  );
}

export function XpChart({ data }: { data: { day: string; xp: number }[] }) {
  return (
    <div className="h-56" role="img" aria-label={`Grafik XP kumulatif, ${data.length} hari terakhir, terakhir ${data.at(-1)?.xp ?? 0} XP`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} content={({ active, payload, label }) => (active && payload?.length ? <TooltipBox title={String(label)} value={`${payload[0].value} XP`} /> : null)} />
          <Line type="monotone" dataKey="xp" stroke={BRAND} strokeWidth={2} dot={{ r: 4, fill: BRAND, stroke: "white", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreChart({ data }: { data: { n: string; title: string; score: number }[] }) {
  return (
    <div className="h-56" role="img" aria-label={`Grafik nilai ${data.length} aktivitas terakhir`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="n" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(37,70,234,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { title: string; score: number };
              return <TooltipBox title={p.title} value={`Nilai ${p.score}`} />;
            }}
          />
          <Bar dataKey="score" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
