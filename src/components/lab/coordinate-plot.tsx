"use client";

import type { Equation } from "@/lib/math/spldv";

export interface PlotLine {
  eq: Equation;
  color: string;
  label: string;
  dashed?: boolean;
  width?: number;
}
export interface PlotPoint {
  x: number;
  y: number;
  color: string;
  label: string;
}

const SIZE = 320;
const PAD = 22;

/** Titik potong garis ax+by=c dengan kotak [-R,R]². Mengembalikan 2 titik, atau null. */
export function clipLine(eq: Equation, R: number): [{ x: number; y: number }, { x: number; y: number }] | null {
  const pts: { x: number; y: number }[] = [];
  const add = (x: number, y: number) => {
    if (Math.abs(x) <= R + 1e-9 && Math.abs(y) <= R + 1e-9 && !pts.some((p) => Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9)) pts.push({ x, y });
  };
  if (eq.b !== 0) {
    add(-R, (eq.c - eq.a * -R) / eq.b);
    add(R, (eq.c - eq.a * R) / eq.b);
  }
  if (eq.a !== 0) {
    add((eq.c - eq.b * -R) / eq.a, -R);
    add((eq.c - eq.b * R) / eq.a, R);
  }
  return pts.length >= 2 ? [pts[0], pts[1]] : null;
}

/** Bidang koordinat statis untuk menghubungkan bentuk aljabar dengan visualnya. */
export function CoordinatePlot({ lines, points, range, caption }: { lines: PlotLine[]; points?: PlotPoint[]; range: number; caption: string }) {
  const R = range;
  const sx = (x: number) => PAD + ((x + R) / (2 * R)) * (SIZE - 2 * PAD);
  const sy = (y: number) => SIZE - PAD - ((y + R) / (2 * R)) * (SIZE - 2 * PAD);
  const step = R <= 10 ? 2 : R <= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = -R + ((R % step) || 0); t <= R; t += step) if (t !== 0) ticks.push(t);

  return (
    <figure data-testid="coordinate-plot" className="mt-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={caption} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} y1={PAD} x2={sx(t)} y2={SIZE - PAD} stroke="#e2e8f0" strokeWidth={0.5} />
            <line x1={PAD} y1={sy(t)} x2={SIZE - PAD} y2={sy(t)} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={sx(t)} y={sy(0) + 12} fontSize={8} textAnchor="middle" fill="#64748b">{t}</text>
            <text x={sx(0) - 4} y={sy(t) + 3} fontSize={8} textAnchor="end" fill="#64748b">{t}</text>
          </g>
        ))}
        <line x1={PAD} y1={sy(0)} x2={SIZE - PAD} y2={sy(0)} stroke="#334155" strokeWidth={1} />
        <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={SIZE - PAD} stroke="#334155" strokeWidth={1} />
        <text x={SIZE - PAD + 4} y={sy(0) + 3} fontSize={10} fill="#334155">x</text>
        <text x={sx(0) + 4} y={PAD - 6} fontSize={10} fill="#334155">y</text>
        {lines.map((l) => {
          const seg = clipLine(l.eq, R);
          if (!seg) return null;
          return (
            <g key={l.label}>
              <line
                x1={sx(seg[0].x)}
                y1={sy(seg[0].y)}
                x2={sx(seg[1].x)}
                y2={sy(seg[1].y)}
                stroke={l.color}
                strokeWidth={l.width ?? 2.5}
                strokeDasharray={l.dashed ? "6 4" : undefined}
                strokeLinecap="round"
              />
              <text x={sx(seg[1].x) + (seg[1].x > R * 0.6 ? -4 : 4)} y={sy(seg[1].y) + (seg[1].y > R * 0.6 ? 12 : -4)} fontSize={9} fontWeight={700} fill={l.color} textAnchor={seg[1].x > R * 0.6 ? "end" : "start"}>
                {l.label}
              </text>
            </g>
          );
        })}
        {points?.map((p) => (
          <g key={p.label}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={5} fill={p.color} stroke="#fff" strokeWidth={1.5} />
            <text x={sx(p.x) + 8} y={sy(p.y) - 8} fontSize={10} fontWeight={700} fill={p.color}>{p.label}</text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1.5 text-xs text-ink-muted">{caption}</figcaption>
    </figure>
  );
}
