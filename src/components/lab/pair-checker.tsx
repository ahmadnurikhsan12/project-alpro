"use client";

import { CheckCircle2, Eye, FlaskConical, XCircle } from "lucide-react";
import { useState } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { Button, Card, inputClass, MathBlock } from "@/components/ui";
import { add, frac, mul, parseFraction, type Fraction } from "@/lib/math/fraction";
import { formatEquation, formatValue, isValidEquation, satisfies, solveSystem, type Equation } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { EquationInput, PRESETS } from "./equation-input";

const wrap = (f: Fraction) => (f.n < 0 ? `(${formatValue(f)})` : formatValue(f));

/** Baris substitusi, mis. "2·(3) + 3·(2) = 6 + 6 = 12" */
export function substitutionLines(eq: Equation, x: Fraction, y: Fraction): string[] {
  const t1 = mul(frac(eq.a), x);
  const t2 = mul(frac(eq.b), y);
  const left = add(t1, t2);
  return [
    `${formatEquation(eq)}`,
    `${eq.a}·${wrap(x)} + ${eq.b < 0 ? `(${formatValue(frac(eq.b))})` : eq.b}·${wrap(y)}`.replace(/-/g, "−"),
    `= ${formatValue(t1)} + ${wrap(t2)}`,
    `= ${formatValue(left)}`,
  ];
}

export function PairChecker() {
  const { record } = useProgress();
  const [e1, setE1] = useState<Equation>(PRESETS[0].e1);
  const [e2, setE2] = useState<Equation>(PRESETS[0].e2);
  const [xs, setXs] = useState("");
  const [ys, setYs] = useState("");
  const [result, setResult] = useState<null | { x: Fraction; y: Fraction; ok1: boolean; ok2: boolean }>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const valid = isValidEquation(e1) && isValidEquation(e2);
  const solution = valid ? solveSystem(e1, e2) : null;

  const test = () => {
    const x = parseFraction(xs);
    const y = parseFraction(ys);
    if (!x || !y) {
      setError("Masukkan nilai x dan y berupa bilangan (contoh: 3, -2, 1/2, atau 2,5).");
      setResult(null);
      return;
    }
    setError(null);
    const r = { x, y, ok1: satisfies(e1, x, y), ok2: satisfies(e2, x, y) };
    setResult(r);
    if (r.ok1 && r.ok2 && !recorded) {
      setRecorded(true);
      void record({ type: "lab", tool: "checker" });
    }
  };

  const reset = (a: Equation, b: Equation) => {
    setE1(a);
    setE2(b);
    setResult(null);
    setShowSolution(false);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <FlaskConical className="h-5 w-5 text-brand-600" /> Uji Pasangan Nilai
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Tulis dua persamaan, lalu tebak pasangan (x, y). Lab akan memeriksa apakah pasangan itu memenuhi keduanya.</p>
        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">Misi: temukan pasangan yang memenuhi kedua persamaan.</p>

        <label htmlFor="preset-check" className="mt-4 block text-sm font-semibold text-ink">
          Contoh sistem
        </label>
        <select
          id="preset-check"
          className={cn(inputClass, "mt-1.5")}
          onChange={(e) => {
            const p = PRESETS[Number(e.target.value)];
            reset(p.e1, p.e2);
          }}
          defaultValue="0"
        >
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="mt-4 space-y-3">
          <EquationInput label="Persamaan (1)" value={e1} onChange={(v) => reset(v, e2)} />
          <EquationInput label="Persamaan (2)" value={e2} onChange={(v) => reset(e1, v)} tone="grape" />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          {(
            [
              ["x", xs, setXs],
              ["y", ys, setYs],
            ] as const
          ).map(([name, val, set]) => (
            <div key={name} className="w-28">
              <label htmlFor={`check-${name}`} className="mb-1.5 block text-sm font-semibold text-ink">
                Nilai {name}
              </label>
              <input id={`check-${name}`} className={cn(inputClass, "text-lg font-semibold")} inputMode="decimal" value={val} onChange={(e) => set(e.target.value)} onKeyDown={(e) => e.key === "Enter" && test()} />
            </div>
          ))}
          <Button onClick={test} disabled={!valid}>
            Uji Pasangan
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm font-medium text-rose-600" role="alert">
            {error}
          </p>
        )}
      </Card>

      <Card aria-live="polite">
        <h3 className="font-bold text-ink">Langkah pemeriksaan</h3>
        {!result ? (
          <p className="mt-3 text-sm text-ink-muted">Hasil pemeriksaan akan muncul di sini. Lab mensubstitusikan nilai x dan y ke setiap persamaan, lalu membandingkan ruas kiri dengan ruas kanan.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {[
              { eq: e1, ok: result.ok1, n: 1 },
              { eq: e2, ok: result.ok2, n: 2 },
            ].map(({ eq, ok, n }) => (
              <div key={n} className={cn("rounded-xl border p-3", ok ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60")}>
                <p className={cn("flex items-center gap-2 text-sm font-bold", ok ? "text-emerald-800" : "text-rose-800")}>
                  {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  Persamaan ({n}) {ok ? "terpenuhi" : "tidak terpenuhi"}
                </p>
                <MathBlock lines={[...substitutionLines(eq, result.x, result.y), ok ? `${"= " + formatValue(frac(eq.c))} ✓  (sama dengan ruas kanan)` : `≠ ${formatValue(frac(eq.c))} ✗  (ruas kanan ${formatValue(frac(eq.c))})`]} className="my-2" />
              </div>
            ))}
            <div className={cn("rounded-xl p-4 font-semibold", result.ok1 && result.ok2 ? "bg-emerald-600 text-white" : "bg-slate-100 text-ink")}>
              {result.ok1 && result.ok2
                ? `(${formatValue(result.x)}, ${formatValue(result.y)}) adalah penyelesaian SPLDV ini! 🎉`
                : result.ok1 || result.ok2
                  ? `(${formatValue(result.x)}, ${formatValue(result.y)}) hanya memenuhi satu persamaan, jadi BUKAN penyelesaian SPLDV.`
                  : `(${formatValue(result.x)}, ${formatValue(result.y)}) tidak memenuhi kedua persamaan.`}
            </div>
          </div>
        )}

        {solution && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            {!showSolution ? (
              <Button variant="ghost" size="sm" onClick={() => setShowSolution(true)}>
                <Eye className="h-4 w-4" /> Lihat penyelesaian sebenarnya
              </Button>
            ) : (
              <p className="text-sm text-ink-soft">
                {solution.kind === "unique" ? (
                  <>
                    Penyelesaian sistem ini adalah{" "}
                    <strong className="text-ink">
                      ({formatValue(solution.x)}, {formatValue(solution.y)})
                    </strong>
                    . Coba buktikan dengan tombol &quot;Uji Pasangan&quot;, atau pelajari caranya di Simulasi Eliminasi.
                  </>
                ) : solution.kind === "none" ? (
                  "Sistem ini tidak memiliki penyelesaian (kedua garis sejajar)."
                ) : (
                  "Sistem ini memiliki tak hingga penyelesaian (kedua garis berimpit)."
                )}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
