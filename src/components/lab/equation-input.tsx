"use client";

import { useId } from "react";
import { formatEquation, type Equation } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";

const LIMIT = 99;

function clampInt(raw: string, fallback: number) {
  if (raw === "-" || raw === "") return fallback;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(-LIMIT, Math.min(LIMIT, n));
}

/** Editor persamaan ax + by = c dengan koefisien bilangan bulat. */
export function EquationInput({ label, value, onChange, tone = "brand" }: { label: string; value: Equation; onChange: (e: Equation) => void; tone?: "brand" | "grape" }) {
  const uid = useId();
  const field = (key: keyof Equation, suffix: string) => (
    <div className="flex items-center gap-1">
      <label htmlFor={`${uid}-${key}`} className="sr-only">
        {label}: {key === "c" ? "konstanta c" : `koefisien ${suffix}`}
      </label>
      <input
        id={`${uid}-${key}`}
        type="number"
        inputMode="numeric"
        min={-LIMIT}
        max={LIMIT}
        step={1}
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: clampInt(e.target.value, value[key]) })}
        className="h-11 w-16 rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-lg font-semibold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
      {suffix && <span className="font-mono text-lg font-bold text-ink">{suffix}</span>}
    </div>
  );
  const invalid = value.a === 0 && value.b === 0;
  return (
    <fieldset className={cn("rounded-xl border-2 p-3", tone === "brand" ? "border-brand-200 bg-brand-50/40" : "border-grape-200 bg-grape-50/40")}>
      <legend className={cn("px-1 text-sm font-bold", tone === "brand" ? "text-brand-700" : "text-grape-700")}>{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {field("a", "x")}
        <span className="font-mono text-lg font-bold text-ink-muted">+</span>
        {field("b", "y")}
        <span className="font-mono text-lg font-bold text-ink-muted">=</span>
        {field("c", "")}
      </div>
      <p className={cn("mt-2 font-mono text-sm", invalid ? "text-rose-600" : "text-ink-muted")} aria-live="polite">
        {invalid ? "Koefisien x dan y tidak boleh keduanya 0." : formatEquation(value)}
      </p>
    </fieldset>
  );
}

export const PRESETS: { label: string; e1: Equation; e2: Equation }[] = [
  { label: "x + y = 7 dan x − y = 1", e1: { a: 1, b: 1, c: 7 }, e2: { a: 1, b: -1, c: 1 } },
  { label: "2x + 3y = 12 dan 3x + 4y = 17", e1: { a: 2, b: 3, c: 12 }, e2: { a: 3, b: 4, c: 17 } },
  { label: "3x − 2y = 4 dan 2x + 5y = 9", e1: { a: 3, b: -2, c: 4 }, e2: { a: 2, b: 5, c: 9 } },
  { label: "2x + y = 10 dan x + y = 7", e1: { a: 2, b: 1, c: 10 }, e2: { a: 1, b: 1, c: 7 } },
  { label: "5x + 2y = 4 dan 3x − 4y = 18", e1: { a: 5, b: 2, c: 4 }, e2: { a: 3, b: -4, c: 18 } },
];
