"use client";

import { ArrowDown, ArrowUp, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { formatEquation, formatNumber, formatValue, generateSystem, easiestVariable, planElimination, shuffle, type Difficulty } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { GameHud, type GameProps } from "./game-shell";

const PUZZLES = 3;

function makePuzzle(d: Difficulty) {
  const g = generateSystem(Math.random, d === "mudah" ? "mudah" : d === "sedang" ? "sedang" : "sulit");
  const v = easiestVariable(g.e1, g.e2);
  const p = planElimination(g.e1, g.e2, v)!;
  const keepVal = p.keep === "x" ? g.x : g.y;
  const otherVal = p.keep === "x" ? g.y : g.x;
  const coef = p.resultCoef === 1 ? "" : p.resultCoef === -1 ? "−" : formatNumber(p.resultCoef);
  const all = [
    { id: "susun", text: `Tulis kedua persamaan: (1) ${formatEquation(g.e1)} dan (2) ${formatEquation(g.e2)}.` },
    { id: "pilih", text: `Pilih variabel ${v} untuk dieliminasi (koefisien ${formatNumber(p.coef1)} dan ${formatNumber(p.coef2)}).` },
    {
      id: "kali",
      text:
        p.m1 === 1 && p.m2 === 1
          ? `Koefisien ${v} sudah sama besar, jadi tidak perlu dikalikan.`
          : `Kalikan (1) dengan ${p.m1} dan (2) dengan ${p.m2}: ${formatEquation(p.scaled1)} dan ${formatEquation(p.scaled2)}.`,
    },
    { id: "operasi", text: `${p.operation === "add" ? "Jumlahkan" : "Kurangkan"} kedua persamaan sehingga ${v} hilang: ${coef}${p.keep} = ${formatNumber(p.resultConst)}.` },
    { id: "hitung", text: `Hitung ${p.keep} = ${formatNumber(p.resultConst)} : ${formatNumber(p.resultCoef)} = ${formatNumber(keepVal)}.` },
    { id: "subs", text: `Substitusikan ${p.keep} = ${formatNumber(keepVal)} ke persamaan (1) sehingga ${v} = ${formatNumber(otherVal)}.` },
    { id: "cek", text: `Periksa ke kedua persamaan, lalu tulis himpunan penyelesaian {(${formatNumber(g.x)}, ${formatNumber(g.y)})}.` },
  ];
  const pickIds: Record<Difficulty, string[]> = {
    mudah: ["susun", "kali", "operasi", "hitung", "subs"],
    sedang: ["susun", "pilih", "kali", "operasi", "hitung", "subs"],
    sulit: ["susun", "pilih", "kali", "operasi", "hitung", "subs", "cek"],
  };
  const steps = all.filter((s) => pickIds[d].includes(s.id));
  let order = shuffle(Math.random, steps);
  while (order.every((s, i) => s.id === steps[i].id)) order = shuffle(Math.random, steps);
  return { steps, order, valueText: `(${formatValue({ n: g.x, d: 1 })}, ${formatValue({ n: g.y, d: 1 })})` };
}

export function SusunLangkah({ difficulty, onFinish }: GameProps) {
  const puzzles = useMemo(() => Array.from({ length: PUZZLES }, () => makePuzzle(difficulty)), [difficulty]);
  const [i, setI] = useState(0);
  const [order, setOrder] = useState(puzzles[0].order);
  const [checks, setChecks] = useState(0);
  const [result, setResult] = useState<boolean[] | null>(null);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [perfect, setPerfect] = useState(0);

  const pz = puzzles[i];
  const points = Math.max(20, 100 - checks * 20);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || solved) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
    setResult(null);
  };

  const check = () => {
    const r = order.map((s, k) => s.id === pz.steps[k].id);
    setResult(r);
    if (r.every(Boolean)) {
      setSolved(true);
      setScore((s) => s + points);
      if (checks === 0) setPerfect((p) => p + 1);
    } else {
      setChecks((c) => c + 1);
    }
  };

  const next = () => {
    if (i === PUZZLES - 1) {
      onFinish({ score, correct: perfect, total: PUZZLES, summary: `${perfect} teka-teki benar pada percobaan pertama.` });
      return;
    }
    setI(i + 1);
    setOrder(puzzles[i + 1].order);
    setChecks(0);
    setResult(null);
    setSolved(false);
  };

  return (
    <>
      <GameHud
        items={[
          { label: "Teka-teki", value: `${i + 1}/${PUZZLES}` },
          { label: "Skor", value: score },
          { label: "Nilai teka-teki", value: solved ? "—" : points },
        ]}
      />
      <Card>
        <p className="font-semibold text-ink">Urutkan langkah eliminasi dari yang pertama sampai terakhir:</p>
        <ol className="mt-4 space-y-2">
          {order.map((s, k) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-3 transition",
                result ? (result[k] ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50") : "border-slate-200 bg-white",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 font-bold text-sky-800">{k + 1}</span>
              <span className="flex-1 text-sm text-ink">{s.text}</span>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button type="button" onClick={() => move(k, k - 1)} disabled={k === 0 || solved} className="rounded-lg border border-slate-200 bg-white p-1.5 hover:bg-slate-50 disabled:opacity-30" aria-label={`Naikkan langkah ${k + 1}`}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(k, k + 1)} disabled={k === order.length - 1 || solved} className="rounded-lg border border-slate-200 bg-white p-1.5 hover:bg-slate-50 disabled:opacity-30" aria-label={`Turunkan langkah ${k + 1}`}>
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {result && !solved && <p className="text-sm font-medium text-rose-700">{result.filter(Boolean).length} dari {result.length} kartu sudah di posisi benar. (−20 poin)</p>}
          {solved && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Urutan benar! Penyelesaian: {pz.valueText}. +{points} poin
            </p>
          )}
          <div className="ml-auto">{solved ? <Button onClick={next}>{i === PUZZLES - 1 ? "Lihat hasil akhir" : "Teka-teki berikutnya"}</Button> : <Button onClick={check}>Periksa Urutan</Button>}</div>
        </div>
      </Card>
    </>
  );
}
