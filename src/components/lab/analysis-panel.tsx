"use client";

import { ArrowRight, CheckCircle2, Lightbulb, Target } from "lucide-react";
import { useState } from "react";
import { Button, inputClass } from "@/components/ui";
import {
  CELL_IDS,
  GOAL_CORRECT,
  GOAL_OPTIONS,
  RELATION_LABEL,
  checkTable,
  relationOf,
  type CellId,
  type GoalId,
  type Relation,
} from "@/lib/lab/la";
import { formatEquation, type Equation, type Variable } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";

const GOAL_LABEL: Record<GoalId, string> = {
  pasangan: "Menemukan pasangan (x, y) yang memenuhi kedua persamaan sekaligus",
  x_saja: "Menemukan nilai x saja",
  persamaan_mudah: "Membuat persamaan baru yang lebih mudah, tanpa mencari nilai variabel",
};

const CELL_LABEL: Record<CellId, string> = {
  a1: "koefisien x pada persamaan (1)",
  b1: "koefisien y pada persamaan (1)",
  c1: "konstanta persamaan (1)",
  a2: "koefisien x pada persamaan (2)",
  b2: "koefisien y pada persamaan (2)",
  c2: "konstanta persamaan (2)",
};

const HINTS = [
  "Ubah setiap persamaan ke bentuk ax + by = c: a di depan x, b di depan y, c di ruas kanan. Tanda minus ikut menjadi bagian angkanya.",
  "Jika x atau y tidak tertulis angkanya, koefisiennya 1. Jika tandanya minus tanpa angka, koefisiennya −1.",
  "Bandingkan dua angka di kolom yang sama: apakah besarnya sama? Jika sama besar, apakah tandanya sama atau berlawanan?",
];

export interface AnalysisResult {
  percobaan: number;
  petunjuk: number;
}

/**
 * ANALISIS TUGAS: sebelum merencanakan, siswa menyatakan (1) apa yang diketahui (tabel koefisien),
 * (2) apa tujuan tugas, dan (3) bagaimana hubungan koefisien tiap variabel.
 * Semua jawaban diperiksa dari mesin matematika; petunjuk bersifat opsional dan bertingkat.
 */
export function AnalysisPanel({
  e1,
  e2,
  usable,
  onComplete,
}: {
  e1: Equation;
  e2: Equation;
  usable: Variable[];
  onComplete: (r: AnalysisResult) => void;
}) {
  const [input, setInput] = useState<Record<CellId, string>>({ a1: "", b1: "", c1: "", a2: "", b2: "", c2: "" });
  const [ok, setOk] = useState<Record<CellId, boolean> | null>(null);
  const [tableDone, setTableDone] = useState(false);
  const [goal, setGoal] = useState<GoalId | "">("");
  const [rel, setRel] = useState<Partial<Record<Variable, Relation>>>({});
  const [tries, setTries] = useState(0);
  const [hints, setHints] = useState(0);

  const truthRel = (v: Variable) => (v === "x" ? relationOf(e1.a, e2.a) : relationOf(e1.b, e2.b));
  const goalOk = goal === GOAL_CORRECT;
  const relOk = usable.every((v) => rel[v] === truthRel(v));
  const complete = tableDone && goalOk && relOk;

  const checkTableNow = () => {
    const r = checkTable(e1, e2, input);
    setOk(r.ok);
    setTries((t) => t + 1);
    if (r.allOk) setTableDone(true);
  };

  return (
    <div data-testid="analysis-panel" className="mt-4 space-y-5 rounded-2xl border border-brand-100 bg-white p-4">
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <span>
          <strong className="text-ink">Tujuan bagian ini:</strong> memahami tugasnya dulu — apa yang diketahui dan apa yang dicari — sebelum memilih cara.
        </span>
      </p>

      {/* A. apa yang diketahui */}
      <section aria-labelledby="an-a">
        <h4 id="an-a" className="text-sm font-bold text-ink">
          A. Apa yang diketahui? Tulis koefisien dan konstanta
        </h4>
        <p className="mt-1 font-mono text-sm text-ink-soft">
          (1) {formatEquation(e1)} &nbsp;&nbsp; (2) {formatEquation(e2)}
        </p>
        <table className="mt-2 text-center">
          <caption className="sr-only">Tabel koefisien</caption>
          <thead>
            <tr className="text-xs text-ink-muted">
              <th className="px-1"><span className="sr-only">Persamaan</span></th>
              <th className="px-1 font-mono">x</th>
              <th className="px-1 font-mono">y</th>
              <th className="px-1">konstanta</th>
            </tr>
          </thead>
          <tbody>
            {([1, 2] as const).map((n) => (
              <tr key={n}>
                <th scope="row" className="pr-2 text-xs font-semibold text-ink-muted">
                  ({n})
                </th>
                {(["a", "b", "c"] as const).map((k) => {
                  const id = `${k}${n}` as CellId;
                  return (
                    <td key={id} className="p-1">
                      <input
                        aria-label={`Tabel: ${CELL_LABEL[id]}`}
                        inputMode="numeric"
                        disabled={tableDone}
                        value={input[id]}
                        onChange={(e) => {
                          setInput((s) => ({ ...s, [id]: e.target.value }));
                          setOk(null);
                        }}
                        className={cn(inputClass, "w-20 text-center font-mono", ok && (ok[id] ? "border-emerald-400" : "border-rose-400"))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!tableDone && (
          <Button size="sm" className="mt-2" disabled={CELL_IDS.some((id) => input[id].trim() === "")} onClick={checkTableNow}>
            Periksa tabel
          </Button>
        )}
        {ok && !tableDone && (
          <p role="status" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
            Ada sel yang belum tepat (bergaris merah). Periksa tandanya, dan ingat koefisien yang tidak tertulis angkanya adalah 1.
          </p>
        )}
        {tableDone && (
          <p role="status" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Tabel sudah tepat.
          </p>
        )}
      </section>

      {/* B. apa yang dicari */}
      {tableDone && (
        <section aria-labelledby="an-b">
          <h4 id="an-b" className="text-sm font-bold text-ink">
            B. Apa yang dicari?
          </h4>
          <div role="radiogroup" aria-labelledby="an-b" className="mt-2 grid gap-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={goal === g}
                onClick={() => setGoal(g)}
                className={cn(
                  "rounded-xl border-2 px-3 py-2 text-left text-sm transition",
                  goal === g ? (g === GOAL_CORRECT ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50") : "border-slate-200 hover:border-brand-300",
                )}
              >
                {GOAL_LABEL[g]}
              </button>
            ))}
          </div>
          {goal && (
            <p role="status" className={cn("mt-2 rounded-lg px-3 py-2 text-sm", goalOk ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900")}>
              {goalOk
                ? "Tepat. Eliminasi hanyalah alat; tugas utamanya menemukan pasangan (x, y) yang berlaku untuk kedua persamaan."
                : "Ingat definisi penyelesaian SPLDV: sebuah pasangan (x, y) yang benar untuk kedua persamaan. Eliminasi membantu mencapainya, bukan tujuan akhirnya."}
            </p>
          )}
        </section>
      )}

      {/* C. hubungan koefisien */}
      {tableDone && goalOk && (
        <section aria-labelledby="an-c">
          <h4 id="an-c" className="text-sm font-bold text-ink">
            C. Bagaimana hubungan koefisien tiap variabel pada kedua persamaan?
          </h4>
          <div className="mt-2 space-y-3">
            {usable.map((v) => {
              const c1 = v === "x" ? e1.a : e1.b;
              const c2 = v === "x" ? e2.a : e2.b;
              return (
                <div key={v}>
                  <p className="text-sm text-ink-soft">
                    Koefisien <span className="font-mono font-bold">{v}</span>: {c1.toString().replace("-", "−")} dan {c2.toString().replace("-", "−")}
                  </p>
                  <div role="radiogroup" aria-label={`Hubungan koefisien ${v}`} className="mt-1 flex flex-wrap gap-2">
                    {(Object.keys(RELATION_LABEL) as Relation[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={rel[v] === r}
                        onClick={() => setRel((s) => ({ ...s, [v]: r }))}
                        className={cn(
                          "rounded-xl border-2 px-3 py-1.5 text-sm transition",
                          rel[v] === r ? (r === truthRel(v) ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50") : "border-slate-200 hover:border-brand-300",
                        )}
                      >
                        {RELATION_LABEL[r]}
                      </button>
                    ))}
                  </div>
                  {rel[v] && rel[v] !== truthRel(v) && (
                    <p role="status" className="mt-1 text-sm text-rose-800">
                      Bandingkan lagi angka {c1.toString().replace("-", "−")} dan {c2.toString().replace("-", "−")}: apakah besarnya sama, dan bagaimana tandanya?
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* petunjuk opsional */}
      {!complete && (
        <div className="space-y-2">
          {HINTS.slice(0, hints).map((h, i) => (
            <p key={i} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>Petunjuk analisis {i + 1}:</strong> {h}
              </span>
            </p>
          ))}
          {hints < HINTS.length && (
            <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-50" onClick={() => setHints((h) => h + 1)}>
              <Lightbulb className="h-4 w-4" /> Butuh petunjuk analisis? ({hints}/{HINTS.length})
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled={!complete} onClick={() => onComplete({ percobaan: tries, petunjuk: hints })}>
          Lanjut ke perencanaan <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
