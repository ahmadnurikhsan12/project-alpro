"use client";

import { Flame, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, MathBlock, ProgressBar } from "@/components/ui";
import { GAME_BY_ID } from "@/content/games";
import { coefficientOf, formatEquation, formatNumber, generateSystem, pick, planElimination, shuffle, type Difficulty, type Variable } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { kilatMetrics, kilatMirror } from "@/lib/games/rmt";
import { GameHud, type GameProps } from "./game-shell";

const DURATION: Record<Difficulty, number> = { mudah: 90, sedang: 75, sulit: 60 };
const MAX_ANSWERS = GAME_BY_ID["eliminasi-kilat"].maxTotal;

interface KQ {
  prompt: string;
  lines: string[];
  options: string[];
  answer: number;
  /** Alasan matematis jawaban benar — ditampilkan saat jawaban salah (makna, bukan hanya hafalan). */
  why: string;
}

function uniqueOptions(correct: string, candidates: string[]): { options: string[]; answer: number } {
  const set = [correct];
  for (const c of candidates) if (!set.includes(c) && set.length < 4) set.push(c);
  const options = shuffle(Math.random, set);
  return { options, answer: options.indexOf(correct) };
}

function makeQuestion(d: Difficulty): KQ {
  const g = generateSystem(Math.random, d);
  const kinds = d === "mudah" ? ["op", "op", "value"] : d === "sedang" ? ["op", "mult", "value"] : ["op", "mult", "value", "value"];
  const kind = pick(Math.random, kinds);
  const v: Variable = pick(Math.random, ["x", "y"] as const);
  const plan = planElimination(g.e1, g.e2, v) ?? planElimination(g.e1, g.e2, v === "x" ? "y" : "x")!;
  const base = [`(1)  ${formatEquation(g.e1)}`, `(2)  ${formatEquation(g.e2)}`];

  if (kind === "op") {
    const scaled = plan.m1 !== 1 || plan.m2 !== 1;
    const lines = scaled ? [`(1') ${formatEquation(plan.scaled1)}`, `(2') ${formatEquation(plan.scaled2)}`] : base;
    const correct = plan.operation === "add" ? "Dijumlahkan" : "Dikurangkan";
    return {
      prompt: `${scaled ? "Setelah dikalikan, a" : "A"}gar ${plan.eliminate} hilang, kedua persamaan ...`,
      lines,
      why: `Koefisien ${plan.eliminate} adalah ${formatNumber(coefficientOf(scaled ? plan.scaled1 : g.e1, plan.eliminate))} dan ${formatNumber(coefficientOf(scaled ? plan.scaled2 : g.e2, plan.eliminate))}: ${plan.operation === "add" ? "berlawanan tanda, jadi dijumlahkan agar menjadi 0" : "sama besar dan bertanda sama, jadi dikurangkan agar menjadi 0"}.`,
      ...uniqueOptions(correct, ["Dijumlahkan", "Dikurangkan"]),
    };
  }
  if (kind === "mult") {
    const c1 = Math.abs(plan.coef1);
    const c2 = Math.abs(plan.coef2);
    const fmt = (a: number, b: number) => `(1) ×${a} dan (2) ×${b}`;
    return {
      prompt: `Pengali terkecil agar koefisien ${plan.eliminate} sama besar?`,
      lines: base,
      why: `Koefisien ${plan.eliminate} adalah ${c1} dan ${c2}. KPK-nya ${plan.target}, jadi pengalinya = KPK dibagi koefisien tiap persamaan.`,
      ...uniqueOptions(fmt(plan.m1, plan.m2), [fmt(plan.m2, plan.m1), fmt(c1, c2), fmt(plan.m1 + 1, plan.m2 + 1), fmt(plan.m1 * 2, plan.m2 * 2), fmt(1, plan.m2 + 1)]),
    };
  }
  const target = pick(Math.random, ["x", "y"] as const);
  const val = target === "x" ? g.x : g.y;
  const other = target === "x" ? g.y : g.x;
  return {
    prompt: `Berapakah nilai ${target}?`,
    lines: base,
    why: `Nilai ${target} dapat diperiksa dengan substitusi ke kedua persamaan: pasangan yang benar harus memenuhi keduanya.`,
    ...uniqueOptions(formatNumber(val), [formatNumber(val + 1), formatNumber(-val), formatNumber(other), formatNumber(val - 1), formatNumber(val + 2)]),
  };
}

export function EliminasiKilat({ difficulty, onFinish }: GameProps) {
  const total = DURATION[difficulty];
  const endAt = useRef(Date.now() + total * 1000);
  const [left, setLeft] = useState(total);
  const [q, setQ] = useState<KQ>(() => makeQuestion(difficulty));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<null | { ok: boolean; idx: number }>(null);
  const done = useRef(false);
  const stats = useRef({ score: 0, answered: 0, correct: 0 });
  stats.current = { score, answered, correct };
  const shownAt = useRef(Date.now());
  const answerSeconds = useRef(0);
  const maxCombo = useRef(0);
  const [lastWhy, setLastWhy] = useState<string | null>(null);

  const end = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const s = stats.current;
    const ks = { answered: s.answered, correct: s.correct, maxCombo: maxCombo.current, answerSeconds: answerSeconds.current };
    onFinish({ score: s.score, correct: s.correct, total: s.answered, summary: `${s.correct} benar dari ${s.answered} jawaban.`, la: kilatMetrics(ks), reflect: kilatMirror(ks) });
  }, [onFinish]);

  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) end();
    }, 200);
    return () => clearInterval(t);
  }, [end]);

  const choose = (idx: number) => {
    if (flash || done.current) return;
    const ok = idx === q.answer;
    answerSeconds.current += Math.min(60, (Date.now() - shownAt.current) / 1000);
    setAnswered((a) => a + 1);
    if (ok) {
      const bonus = Math.min(combo, 5);
      setScore((s) => s + 10 + bonus);
      setCorrect((c) => c + 1);
      setCombo((c) => c + 1);
      maxCombo.current = Math.max(maxCombo.current, combo + 1);
      setLastWhy(null);
    } else {
      setCombo(0);
      setLastWhy(q.why);
      endAt.current -= 3000;
    }
    setFlash({ ok, idx });
    const reachedCap = answered + 1 >= MAX_ANSWERS;
    setTimeout(
      () => {
        setFlash(null);
        if (reachedCap) end();
        else {
          setQ(makeQuestion(difficulty));
          shownAt.current = Date.now();
        }
      },
      ok ? 350 : 1600,
    );
  };

  return (
    <>
      <GameHud
        items={[
          { label: "Skor", value: score },
          { label: "Benar", value: `${correct}/${answered}` },
          {
            label: "Combo",
            value: (
              <span className="inline-flex items-center gap-1">
                <Flame className={cn("h-4 w-4", combo >= 3 ? "text-orange-500" : "text-slate-300")} /> {combo}
              </span>
            ),
          },
        ]}
      />
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Timer className={cn("h-5 w-5", left <= 10 ? "text-rose-600" : "text-brand-600")} />
          <ProgressBar value={(left / total) * 100} color={left <= 10 ? "amber" : "brand"} label="Sisa waktu" />
          <span role="timer" className={cn("w-12 text-right font-mono text-lg font-bold", left <= 10 ? "text-rose-600" : "text-ink")}>
            {left}s
          </span>
        </div>
        <MathBlock lines={q.lines} />
        <p className="mt-2 text-lg font-semibold text-ink">{q.prompt}</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {q.options.map((o, i) => (
            <button
              key={`${o}-${i}`}
              type="button"
              onClick={() => choose(i)}
              disabled={!!flash}
              className={cn(
                "min-h-[3.25rem] rounded-xl border-2 px-4 py-2 text-left font-mono text-base font-semibold transition",
                flash && i === q.answer
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : flash && flash.idx === i && !flash.ok
                    ? "animate-shake border-rose-400 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50",
              )}
            >
              {o}
            </button>
          ))}
        </div>
        {flash && !flash.ok && (
          <p className="mt-3 text-sm font-medium text-rose-700" role="status" data-testid="kilat-why">
            Salah! Waktu berkurang 3 detik. {lastWhy}
          </p>
        )}
      </Card>
    </>
  );
}
