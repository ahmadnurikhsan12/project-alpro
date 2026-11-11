"use client";

import { CheckCircle2, Circle, LineChart } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { Button, Card } from "@/components/ui";
import { frac, toNumber } from "@/lib/math/fraction";
import { formatEquation, formatValue, satisfies, solveSystem, type Equation } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";

const R = 10; // rentang sumbu: -10..10
const SIZE = 400;
const sx = (x: number) => ((x + R) / (2 * R)) * SIZE;
const sy = (y: number) => SIZE - ((y + R) / (2 * R)) * SIZE;

function lineEndpoints(eq: Equation): [number, number, number, number] | null {
  if (eq.a === 0 && eq.b === 0) return null;
  if (eq.b === 0) {
    const x = eq.c / eq.a;
    return [x, -R - 1, x, R + 1];
  }
  const y = (x: number) => (eq.c - eq.a * x) / eq.b;
  return [-R - 1, y(-R - 1), R + 1, y(R + 1)];
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-6 font-mono text-sm font-bold text-ink">
        {label}
      </label>
      <input id={id} type="range" min={-10} max={10} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 flex-1 cursor-pointer accent-brand-600" />
      <output htmlFor={id} className="w-8 text-right font-mono text-sm font-semibold tabular-nums">
        {value}
      </output>
    </div>
  );
}

function EquationSliders({ label, eq, onChange, color }: { label: string; eq: Equation; onChange: (e: Equation) => void; color: string }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-bold" style={{ color }}>
        <span className="inline-block h-1 w-5 rounded" style={{ background: color }} /> {label}: <span className="font-mono">{eq.a === 0 && eq.b === 0 ? "—" : formatEquation(eq)}</span>
      </legend>
      <div className="space-y-2">
        <Slider label="a" value={eq.a} onChange={(a) => onChange({ ...eq, a })} />
        <Slider label="b" value={eq.b} onChange={(b) => onChange({ ...eq, b })} />
        <Slider label="c" value={eq.c} onChange={(c) => onChange({ ...eq, c })} />
      </div>
    </fieldset>
  );
}

const MISSIONS = [
  { id: "point", text: "Atur kedua garis agar berpotongan tepat di titik (2, 3)." },
  { id: "parallel", text: "Buat kedua garis sejajar (tidak punya penyelesaian)." },
  { id: "same", text: "Buat kedua garis berimpit (penyelesaian tak hingga)." },
] as const;

export function GraphLab() {
  const { record } = useProgress();
  const [e1, setE1] = useState<Equation>({ a: 1, b: 1, c: 7 });
  const [e2, setE2] = useState<Equation>({ a: 1, b: -1, c: 1 });
  const [done, setDone] = useState<Record<string, boolean>>({});
  const recorded = useRef(false);

  const valid = !(e1.a === 0 && e1.b === 0) && !(e2.a === 0 && e2.b === 0);
  const sol = valid ? solveSystem(e1, e2) : null;

  useEffect(() => {
    if (!sol) return;
    const updates: Record<string, boolean> = {};
    if (sol.kind === "unique" && satisfies(e1, frac(2), frac(3)) && satisfies(e2, frac(2), frac(3))) updates.point = true;
    if (sol.kind === "none") updates.parallel = true;
    if (sol.kind === "infinite") updates.same = true;
    if (Object.keys(updates).some((k) => !done[k])) setDone((d) => ({ ...d, ...updates }));
  }, [sol, e1, e2, done]);

  useEffect(() => {
    if (!recorded.current && MISSIONS.every((m) => done[m.id])) {
      recorded.current = true;
      void record({ type: "lab", tool: "graph" });
    }
  }, [done, record]);

  const l1 = lineEndpoints(e1);
  const l2 = lineEndpoints(e2);
  const point = sol?.kind === "unique" ? { x: toNumber(sol.x), y: toNumber(sol.y) } : null;
  const inView = point && Math.abs(point.x) <= R && Math.abs(point.y) <= R;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <Card className="p-3 sm:p-4">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full rounded-xl bg-white" role="img" aria-label={`Grafik ${formatEquation(e1)} dan ${formatEquation(e2)}`}>
          <defs>
            <clipPath id="plot">
              <rect width={SIZE} height={SIZE} />
            </clipPath>
          </defs>
          {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
            <g key={v}>
              <line x1={sx(v)} y1={0} x2={sx(v)} y2={SIZE} stroke={v === 0 ? "#334155" : "#e2e8f0"} strokeWidth={v === 0 ? 1.6 : 1} />
              <line x1={0} y1={sy(v)} x2={SIZE} y2={sy(v)} stroke={v === 0 ? "#334155" : "#e2e8f0"} strokeWidth={v === 0 ? 1.6 : 1} />
              {v !== 0 && v % 2 === 0 && Math.abs(v) !== R && (
                <>
                  <text x={sx(v)} y={sy(0) + 13} fontSize="9" textAnchor="middle" fill="#64748b">
                    {v}
                  </text>
                  <text x={sx(0) - 5} y={sy(v) + 3} fontSize="9" textAnchor="end" fill="#64748b">
                    {v}
                  </text>
                </>
              )}
            </g>
          ))}
          <text x={SIZE - 10} y={sy(0) - 6} fontSize="12" fontWeight="700" fill="#334155">
            x
          </text>
          <text x={sx(0) + 6} y={12} fontSize="12" fontWeight="700" fill="#334155">
            y
          </text>
          <g clipPath="url(#plot)">
            {l1 && <line x1={sx(l1[0])} y1={sy(l1[1])} x2={sx(l1[2])} y2={sy(l1[3])} stroke="#2546ea" strokeWidth={4} strokeLinecap="round" />}
            {l2 && (
              <line
                x1={sx(l2[0])}
                y1={sy(l2[1])}
                x2={sx(l2[2])}
                y2={sy(l2[3])}
                stroke="#7c3aed"
                strokeWidth={sol?.kind === "infinite" ? 4 : 4}
                strokeDasharray={sol?.kind === "infinite" ? "10 8" : undefined}
                strokeLinecap="round"
              />
            )}
            {point && inView && (
              <>
                <line x1={sx(point.x)} y1={sy(point.y)} x2={sx(point.x)} y2={sy(0)} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
                <line x1={sx(point.x)} y1={sy(point.y)} x2={sx(0)} y2={sy(point.y)} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
                <circle cx={sx(point.x)} cy={sy(point.y)} r={8} fill="#10b981" stroke="white" strokeWidth={3} />
              </>
            )}
          </g>
        </svg>
      </Card>

      <div className="space-y-4">
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <LineChart className="h-5 w-5 text-brand-600" /> Grafik SPLDV
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Geser nilai a, b, c untuk mengubah persamaan ax + by = c dan lihat garisnya bergerak.</p>
          <div className="mt-4 space-y-3">
            <EquationSliders label="Garis 1" eq={e1} onChange={setE1} color="#2546ea" />
            <EquationSliders label="Garis 2" eq={e2} onChange={setE2} color="#7c3aed" />
          </div>
        </Card>

        <Card aria-live="polite">
          {!valid ? (
            <p className="text-sm font-medium text-rose-600">Koefisien a dan b pada satu persamaan tidak boleh keduanya 0.</p>
          ) : sol?.kind === "unique" ? (
            <>
              <p className="text-sm font-bold text-emerald-700">Berpotongan di satu titik → tepat satu penyelesaian</p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-ink">
                ({formatValue(sol.x)}, {formatValue(sol.y)})
              </p>
              {sol.x.d !== 1 || sol.y.d !== 1 ? (
                <p className="text-xs text-ink-muted">
                  ≈ ({toNumber(sol.x).toFixed(2)}, {toNumber(sol.y).toFixed(2)})
                </p>
              ) : null}
              {!inView && <p className="mt-1 text-xs text-amber-700">Titik potong berada di luar area grafik (−10 sampai 10).</p>}
              <p className="mt-3 text-sm text-ink-soft">
                Titik ini terletak pada <strong>kedua</strong> garis, sehingga nilai x = {formatValue(sol.x)} dan y = {formatValue(sol.y)} memenuhi kedua persamaan. Itulah penyelesaian SPLDV.
              </p>
            </>
          ) : sol?.kind === "none" ? (
            <>
              <p className="text-sm font-bold text-rose-700">Sejajar → tidak ada penyelesaian</p>
              <p className="mt-2 text-sm text-ink-soft">Kedua garis memiliki kemiringan sama tetapi tidak pernah bertemu. Tidak ada pasangan (x, y) yang memenuhi keduanya.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-grape-700">Berimpit → tak hingga penyelesaian</p>
              <p className="mt-2 text-sm text-ink-soft">Kedua persamaan sebenarnya sama (salah satunya kelipatan yang lain). Setiap titik di garis adalah penyelesaian.</p>
            </>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-ink">Misi eksplorasi</h3>
          <ul className="mt-2 space-y-2">
            {MISSIONS.map((m) => (
              <li key={m.id} className={cn("flex gap-2 text-sm", done[m.id] ? "text-emerald-800" : "text-ink-soft")}>
                {done[m.id] ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
                {m.text}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setE1({ a: 1, b: 1, c: 7 });
                setE2({ a: 1, b: -1, c: 1 });
              }}
            >
              Reset grafik
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-muted">Selesaikan ketiga misi untuk mendapatkan XP Lab hari ini.</p>
        </Card>
      </div>
    </div>
  );
}
