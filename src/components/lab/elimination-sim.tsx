"use client";

import { ArrowRight, CheckCircle2, Dices, Info, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { Button, Card, inputClass } from "@/components/ui";
import { div, equals, frac, lcm, mul, parseFraction, sub } from "@/lib/math/fraction";
import {
  coefficientOf,
  formatEquation,
  formatNumber,
  formatValue,
  generateSystem,
  isValidEquation,
  scaleEquation,
  type Difficulty,
  type Equation,
  type Variable,
} from "@/lib/math/spldv";
import {
  REASON_IDS,
  comparePrediction,
  efficientVariables,
  elimMetrics,
  eliminationOutcome,
  niceRange,
  reasonFeedback,
  relationOf,
  resultLine,
  RELATION_LABEL,
  variableCost,
  type PredictionResult,
  type ReasonId,
} from "@/lib/lab/la";
import { solveSystem } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { AnalysisPanel, type AnalysisResult } from "./analysis-panel";
import { CoordinatePlot, type PlotLine, type PlotPoint } from "./coordinate-plot";
import { EquationInput, PRESETS } from "./equation-input";
import { substitutionLines } from "./pair-checker";
import { ReflectionForm } from "./reflection-form";

const STEPS = ["Analisis", "Rencana", "Pengali", "Kalikan", "Operasi", "Eliminasi", "Substitusi", "Periksa", "Refleksi"];

const REASON_LABEL: Record<ReasonId, string> = {
  pengali_kecil: "Pengali yang diperlukan lebih kecil",
  koefisien_sudah_sama: "Koefisiennya sudah sama besar",
  koefisien_kecil: "Koefisiennya tampak lebih kecil",
  asal_pilih: "Memilih saja",
};

function fmtTerm(c: number, v: string, lead: boolean) {
  if (c === 0) return lead ? "0" : "+ 0";
  const abs = Math.abs(c);
  const body = `${abs === 1 ? "" : abs}${v}`;
  if (lead) return c < 0 ? `−${body}` : body;
  return c < 0 ? `− ${body}` : `+ ${body}`;
}

/** Baris persamaan dalam bentuk kolom agar suku sejenis sejajar. */
function EqRow({ eq, label, highlight, className }: { eq: Equation; label?: string; highlight?: Variable; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[3.5rem_5rem_5.5rem_1rem_4.5rem] items-center gap-1 font-mono text-lg", className)}>
      <span className="text-xs font-sans font-semibold text-ink-muted">{label}</span>
      <span className={cn("text-right", highlight === "x" && "rounded bg-amber-200/70 px-1 font-bold")}>{fmtTerm(eq.a, "x", true)}</span>
      <span className={cn("text-right", highlight === "y" && "rounded bg-amber-200/70 px-1 font-bold")}>{fmtTerm(eq.b, "y", false)}</span>
      <span className="text-center">=</span>
      <span className="text-right">{formatNumber(eq.c)}</span>
    </div>
  );
}

function Why({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex gap-2.5 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <strong>Mengapa? </strong>
        {children}
      </div>
    </div>
  );
}

function Hints({ hints, onReveal, canReveal, onHint }: { hints: string[]; onReveal?: () => void; canReveal?: boolean; onHint?: () => void }) {
  const [shown, setShownRaw] = useState(0);
  const setShown = (n: number) => {
    setShownRaw(n);
    onHint?.();
  };
  return (
    <div className="mt-3 space-y-2">
      {hints.slice(0, shown).map((h, i) => (
        <p key={i} className="flex animate-fade-up gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>Petunjuk {i + 1}:</strong> {h}
          </span>
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        {shown < hints.length && (
          <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-50" onClick={() => setShown(shown + 1)}>
            <Lightbulb className="h-4 w-4" /> Petunjuk {shown + 1}/{hints.length}
          </Button>
        )}
        {shown >= hints.length && canReveal && onReveal && (
          <Button size="sm" variant="ghost" onClick={onReveal}>
            Tampilkan jawaban langkah ini
          </Button>
        )}
      </div>
    </div>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role="status" className={cn("mt-3 flex animate-fade-up items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium", ok ? "bg-emerald-50 text-emerald-900" : "animate-shake bg-rose-50 text-rose-900")}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}

export function EliminationSim() {
  const { record } = useProgress();
  const [e1, setE1] = useState<Equation>(PRESETS[1].e1);
  const [e2, setE2] = useState<Equation>(PRESETS[1].e2);
  const [step, setStep] = useState(0);
  const [elim, setElim] = useState<Variable | null>(null);
  const [m1s, setM1s] = useState("");
  const [m2s, setM2s] = useState("");
  const [mFeedback, setMFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [mWrong, setMWrong] = useState(0);
  const [op, setOp] = useState<"add" | "subtract" | null>(null);
  const [opFeedback, setOpFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [keepS, setKeepS] = useState("");
  const [keepFeedback, setKeepFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [subInto, setSubInto] = useState<1 | 2>(1);
  const [otherS, setOtherS] = useState("");
  const [otherFeedback, setOtherFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [runs, setRuns] = useState(0);
  const [guess, setGuess] = useState<"" | "x" | "y" | "sama" | "belum_tahu">("");
  // ---- Learning Activity (Tahap 3)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [reason, setReason] = useState<ReasonId | "">("");
  const [pred, setPred] = useState({ coef: "", konst: "" });
  const [predState, setPredState] = useState<"belum" | "dikirim" | "dilewati">("belum");
  const [changes, setChanges] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [opTries, setOpTries] = useState(0);
  const [marked, setMarked] = useState(false);
  const [reflState, setReflState] = useState<null | "terkirim" | "dilewati">(null);
  const countHint = () => setHintCount((h) => h + 1);

  const keep: Variable = elim === "y" ? "x" : "y";
  const m1 = Number(m1s);
  const m2 = Number(m2s);

  const derived = useMemo(() => {
    if (!elim) return null;
    const c1 = coefficientOf(e1, elim);
    const c2 = coefficientOf(e2, elim);
    if (c1 === 0 || c2 === 0) return null;
    const target = lcm(c1, c2);
    return { c1, c2, target, min1: target / Math.abs(c1), min2: target / Math.abs(c2) };
  }, [e1, e2, elim]);

  const scaled = useMemo(() => {
    if (step < 3 || !derived) return null;
    const s1 = scaleEquation(e1, m1);
    const s2 = scaleEquation(e2, m2);
    const sameSign = Math.sign(coefficientOf(s1, elim!)) === Math.sign(coefficientOf(s2, elim!));
    const correctOp: "add" | "subtract" = sameSign ? "subtract" : "add";
    const combine = (p: number, q: number) => (sameSign ? p - q : p + q);
    const rc = combine(coefficientOf(s1, keep), coefficientOf(s2, keep));
    const rk = combine(s1.c, s2.c);
    return { s1, s2, correctOp, rc, rk, keepValue: rc !== 0 ? frac(rk, rc) : null };
  }, [step, derived, e1, e2, m1, m2, elim, keep]);

  const otherInfo = useMemo(() => {
    if (!scaled?.keepValue || !elim) return null;
    const eq = subInto === 1 ? e1 : e2;
    const oc = coefficientOf(eq, elim);
    if (oc === 0) return null;
    const kc = coefficientOf(eq, keep);
    const kTerm = mul(frac(kc), scaled.keepValue);
    const rhs = sub(frac(eq.c), kTerm);
    return { eq, oc, kc, kTerm, rhs, value: div(rhs, frac(oc)) };
  }, [scaled, subInto, e1, e2, elim, keep]);

  // Hasil eliminasi nyata (dengan pengali pilihan siswa) dan perbandingan dengan prediksi.
  const outcome = useMemo(() => (elim && derived && Number.isInteger(m1) && Number.isInteger(m2) ? eliminationOutcome(e1, e2, elim, m1, m2) : null), [e1, e2, elim, derived, m1, m2]);
  const predResult: PredictionResult | "dilewati" | null = useMemo(() => {
    if (predState === "dilewati") return "dilewati";
    if (predState !== "dikirim" || !outcome) return null;
    return comparePrediction({ coef: Number(pred.coef), konst: Number(pred.konst) }, { coef: outcome.coef, konst: outcome.konst });
  }, [predState, pred, outcome]);

  const solution = useMemo(() => {
    const s = solveSystem(e1, e2);
    return s.kind === "unique" ? { x: s.x, y: s.y, xn: s.x.n / s.x.d, yn: s.y.n / s.y.d } : null;
  }, [e1, e2]);

  const resetFrom = (s: number) => {
    if (s <= 0) {
      setAnalysis(null);
      setShowAnalysis(false);
      setChanges(0);
      setHintCount(0);
      setOpTries(0);
      setMarked(false);
      setReflState(null);
      setRuns(0);
      setGuess("");
    }
    if (s <= 1) {
      setElim(null);
      setReason("");
    }
    if (s <= 4) {
      setPred({ coef: "", konst: "" });
      setPredState("belum");
    }
    if (s <= 2) {
      setM1s("");
      setM2s("");
      setMFeedback(null);
      setMWrong(0);
    }
    if (s <= 4) {
      setOp(null);
      setOpFeedback(null);
    }
    if (s <= 5) {
      setKeepS("");
      setKeepFeedback(null);
    }
    if (s <= 6) {
      setOtherS("");
      setOtherFeedback(null);
      setSubInto(1);
    }
    setStep(s);
  };

  const loadSystem = (a: Equation, b: Equation) => {
    setE1(a);
    setE2(b);
    resetFrom(0);
  };

  const randomSystem = (d: Difficulty) => {
    const g = generateSystem(Math.random, d);
    loadSystem(g.e1, g.e2);
  };

  const valid = isValidEquation(e1) && isValidEquation(e2);
  const canX = e1.a !== 0 && e2.a !== 0;
  const canY = e1.b !== 0 && e2.b !== 0;

  // ------------------------------------------------------------------ handlers
  const checkMultipliers = () => {
    if (!derived) return;
    if (!Number.isInteger(m1) || !Number.isInteger(m2) || m1 < 1 || m2 < 1) {
      setMFeedback({ ok: false, text: "Pengali harus bilangan bulat positif (1, 2, 3, ...)." });
      setMWrong((w) => w + 1);
      return;
    }
    const a = Math.abs(derived.c1 * m1);
    const b = Math.abs(derived.c2 * m2);
    if (a !== b) {
      setMFeedback({
        ok: false,
        text: `Setelah dikalikan, koefisien ${elim} menjadi ${a} dan ${b} — belum sama besar. Coba lagi.`,
      });
      setMWrong((w) => w + 1);
      return;
    }
    const minimal = m1 === derived.min1 && m2 === derived.min2;
    setMFeedback({
      ok: true,
      text: minimal
        ? `Tepat! Koefisien ${elim} menjadi ${a} pada kedua persamaan (KPK dari ${Math.abs(derived.c1)} dan ${Math.abs(derived.c2)}).`
        : `Benar, koefisien ${elim} sama-sama ${a}. Pengali terkecil sebenarnya ×${derived.min1} dan ×${derived.min2} (angkanya lebih kecil), tetapi pilihanmu tetap benar.`,
    });
  };

  const chooseOp = (o: "add" | "subtract") => {
    if (!scaled) return;
    setOp(o);
    setOpTries((t) => t + 1);
    const c1 = coefficientOf(scaled.s1, elim!);
    const c2 = coefficientOf(scaled.s2, elim!);
    if (o === scaled.correctOp) {
      setOpFeedback({
        ok: true,
        text:
          o === "subtract"
            ? `Benar! ${fmtTerm(c1, elim!, true)} dan ${fmtTerm(c2, elim!, true)} bertanda sama, jadi dikurangkan: ${formatNumber(c1)} − (${formatNumber(c2)}) = 0.`
            : `Benar! ${fmtTerm(c1, elim!, true)} dan ${fmtTerm(c2, elim!, true)} berlawanan tanda, jadi dijumlahkan: ${formatNumber(c1)} + (${formatNumber(c2)}) = 0.`,
      });
    } else {
      const wrongResult = o === "add" ? c1 + c2 : c1 - c2;
      setOpFeedback({
        ok: false,
        text: `Jika ${o === "add" ? "dijumlahkan" : "dikurangkan"}, koefisien ${elim} menjadi ${formatNumber(wrongResult)}${elim} — variabel ${elim} tidak hilang. Perhatikan tandanya.`,
      });
    }
  };

  const checkKeep = () => {
    if (!scaled?.keepValue) return;
    const v = parseFraction(keepS);
    if (!v) return setKeepFeedback({ ok: false, text: "Tulis jawaban berupa bilangan." });
    if (equals(v, scaled.keepValue)) {
      setKeepFeedback({ ok: true, text: `Tepat! ${keep} = ${formatNumber(scaled.rk)} : ${formatNumber(scaled.rc)} = ${formatValue(scaled.keepValue)}.` });
    } else {
      setKeepFeedback({ ok: false, text: `Belum tepat. Dari ${fmtTerm(scaled.rc, keep, true)} = ${formatNumber(scaled.rk)}, bagi kedua ruas dengan ${formatNumber(scaled.rc)}.` });
    }
  };

  const checkOther = () => {
    if (!otherInfo) return;
    const v = parseFraction(otherS);
    if (!v) return setOtherFeedback({ ok: false, text: "Tulis jawaban berupa bilangan." });
    if (equals(v, otherInfo.value)) {
      setOtherFeedback({ ok: true, text: `Tepat! ${elim} = ${formatValue(otherInfo.rhs)} : ${formatNumber(otherInfo.oc)} = ${formatValue(otherInfo.value)}.` });
    } else {
      setOtherFeedback({ ok: false, text: `Belum tepat. Pindahkan ${formatValue(otherInfo.kTerm)} ke ruas kanan, lalu bagi dengan ${formatNumber(otherInfo.oc)}.` });
    }
  };

  /**
   * Mengirim metrik proses (event lab dengan `la`). Dikirim saat menyelesaikan sistem DAN saat siswa
   * mengubah rencana setelah menyelesaikan — agar eksplorasi alternatif (yang penting untuk analisis uji
   * coba) tercatat. XP tetap hanya dari event lab pertama pada hari itu (15/alat/hari); sisanya 0 XP.
   */
  const sendLa = (selesaiKe: number, ubahRencana: number) =>
    void record({
      type: "lab",
      tool: "elimination",
      la: elimMetrics({
        analisisPercobaan: analysis?.percobaan ?? 0,
        analisisPetunjuk: analysis?.petunjuk ?? 0,
        variabelEfisien: elim ? efficientVariables(e1, e2).includes(elim) : null,
        pengaliPercobaan: mWrong + 1,
        operasiPercobaan: opTries,
        prediksi: predResult,
        ubahRencana,
        petunjukTotal: hintCount + (analysis?.petunjuk ?? 0),
        grafikDitandai: marked,
        selesaiKe,
      }),
    });

  const finish = () => {
    setStep(7);
    const n = runs + 1;
    setRuns(n);
    sendLa(n, changes);
  };

  const bothUsable = canX && canY;
  const efficientList = efficientVariables(e1, e2);
  const efficient: "x" | "y" | "sama" = efficientList.length === 2 ? "sama" : (efficientList[0] ?? "sama");

  const changePlan = () => {
    if (runs > 0) sendLa(runs, changes + 1); // simpan hasil eksplorasi sebelum rencana diubah
    setChanges((c) => c + 1);
    setShowAnalysis(false);
    setMarked(false);
    setReflState(null);
    setGuess("");
    resetFrom(1);
  };

  const submitReflection = (responses: Record<string, string | number>) => {
    setReflState("terkirim");
    void record({ type: "reflection", context: "lab_elimination", refId: "elimination", responses });
  };
  const skipReflection = () => {
    setReflState("dilewati");
    void record({ type: "reflection", context: "lab_elimination", refId: "elimination", responses: {}, skipped: true });
  };

  // ---- grafik: garis awal, garis terkali, garis hasil eliminasi, titik penyelesaian
  const plot = useMemo(() => {
    const lines: PlotLine[] = [];
    const points: PlotPoint[] = [];
    if (step >= 1) {
      lines.push({ eq: e1, color: "#2546ea", label: "(1)" }, { eq: e2, color: "#7c3aed", label: "(2)" });
    }
    if (step >= 3 && scaled) {
      lines.push({ eq: scaled.s1, color: "#2546ea", label: "(1′)", dashed: true, width: 1.5 }, { eq: scaled.s2, color: "#7c3aed", label: "(2′)", dashed: true, width: 1.5 });
    }
    if (step >= 5 && outcome) {
      const rl = resultLine(outcome);
      if (rl) lines.push({ eq: rl, color: "#059669", label: "hasil eliminasi", width: 2 });
    }
    if (step >= 7 && marked && solution) points.push({ x: solution.xn, y: solution.yn, color: "#dc2626", label: `(${formatValue(solution.x)}, ${formatValue(solution.y)})` });
    const range = niceRange(solution ? [{ x: solution.xn, y: solution.yn }] : []);
    const caption =
      step <= 2
        ? "Setiap persamaan adalah sebuah garis. Setiap titik pada garis (1) memenuhi persamaan (1); begitu pula garis (2)."
        : step <= 4
          ? "Garis putus-putus adalah persamaan setelah dikalikan. Letaknya sama dengan garis awal: mengalikan kedua ruas tidak mengubah penyelesaian."
          : step <= 6
            ? `Garis hijau adalah persamaan hasil eliminasi (hanya memuat ${keep}). Garisnya lurus sejajar sumbu dan melewati titik potong kedua garis awal.`
            : "Titik potong kedua garis adalah pasangan (x, y) yang memenuhi kedua persamaan.";
    return { lines, points, range, caption };
  }, [step, e1, e2, scaled, outcome, marked, solution, keep]);

  const xVal = elim && scaled?.keepValue && otherInfo ? (elim === "x" ? otherInfo.value : scaled.keepValue) : null;
  const yVal = elim && scaled?.keepValue && otherInfo ? (elim === "y" ? otherInfo.value : scaled.keepValue) : null;

  // ------------------------------------------------------------------ render
  return (
    <div className="space-y-5">
      {/* indikator langkah */}
      <ol tabIndex={0} className="flex gap-1 overflow-x-auto pb-1" aria-label="Langkah simulasi">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              i < step ? "bg-emerald-100 text-emerald-800" : i === step ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-soft",
            )}
          >
            <span>{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Panel sistem */}
        <Card className="h-fit">
          <h2 className="font-bold text-ink">Sistem persamaan</h2>
          {step === 0 ? (
            <>
              <p className="mt-1 text-sm text-ink-muted">Pilih contoh, buat soal acak, atau tulis sistemmu sendiri.</p>
              <label htmlFor="preset-elim" className="mt-3 block text-sm font-semibold text-ink">
                Contoh sistem
              </label>
              <select
                id="preset-elim"
                className={cn(inputClass, "mt-1.5")}
                defaultValue="1"
                onChange={(e) => {
                  const p = PRESETS[Number(e.target.value)];
                  loadSystem(p.e1, p.e2);
                }}
              >
                {PRESETS.map((p, i) => (
                  <option key={p.label} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["mudah", "sedang", "sulit"] as const).map((d) => (
                  <Button key={d} size="sm" variant="outline" onClick={() => randomSystem(d)}>
                    <Dices className="h-4 w-4" /> Acak {d}
                  </Button>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                <EquationInput label="Persamaan (1)" value={e1} onChange={(v) => loadSystem(v, e2)} />
                <EquationInput label="Persamaan (2)" value={e2} onChange={(v) => loadSystem(e1, v)} tone="grape" />
              </div>
            </>
          ) : (
            <div tabIndex={0} className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
              <EqRow eq={e1} label="(1)" highlight={step >= 1 && step <= 2 ? (elim ?? undefined) : undefined} />
              <EqRow eq={e2} label="(2)" highlight={step >= 1 && step <= 2 ? (elim ?? undefined) : undefined} />
            </div>
          )}
          {step > 0 && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => resetFrom(0)}>
              <RotateCcw className="h-4 w-4" /> Ganti sistem / mulai ulang
            </Button>
          )}
          {step >= 1 && valid && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h4 className="text-sm font-bold text-ink">Representasi grafik</h4>
              <CoordinatePlot lines={plot.lines} points={plot.points} range={plot.range} caption={plot.caption} />
            </div>
          )}
        </Card>

        {/* Panel langkah */}
        <Card aria-live="polite">
          {step >= 1 && step <= 6 && (
            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" aria-expanded={showAnalysis} onClick={() => setShowAnalysis((s) => !s)}>
                {showAnalysis ? "Tutup analisisku" : "Buka kembali analisisku"}
              </Button>
              {step >= 2 && (
                <Button size="sm" variant="ghost" onClick={changePlan}>
                  Ubah rencana
                </Button>
              )}
            </div>
          )}
          {step >= 1 && step <= 6 && showAnalysis && (
            <div data-testid="analysis-summary" className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-ink-soft">
              <p className="font-semibold text-ink">Analisismu</p>
              <p className="mt-1 font-mono">
                (1) {formatEquation(e1)} &nbsp; (2) {formatEquation(e2)}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {(["x", "y"] as const)
                  .filter((v) => (v === "x" ? canX : canY))
                  .map((v) => (
                    <li key={v}>
                      Koefisien {v}: {formatNumber(coefficientOf(e1, v))} dan {formatNumber(coefficientOf(e2, v))} — {RELATION_LABEL[relationOf(coefficientOf(e1, v), coefficientOf(e2, v))].toLowerCase()}
                    </li>
                  ))}
              </ul>
              <p className="mt-1">Tujuan: menemukan pasangan (x, y) yang memenuhi kedua persamaan.</p>
              <p className="mt-1 text-xs text-ink-muted">Setelah melihat hasilnya, kamu boleh mengubah rencana dan mencoba variabel lain.</p>
            </div>
          )}
          {step === 0 && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 1 — Analisis tugas</h3>
              <p className="mt-2 text-ink-soft">Susun kedua persamaan dalam bentuk ax + by = c, lalu pahami tugasnya sebelum memilih cara menyelesaikannya.</p>
              <Why>Dengan menyusun rapi dan membaca koefisiennya lebih dulu, kita bisa membandingkan koefisien variabel yang sama dan memilih rencana yang masuk akal, bukan sekadar mencoba-coba.</Why>
              {!valid && <Verdict ok={false}>Koefisien x dan y pada satu persamaan tidak boleh keduanya 0.</Verdict>}
              {valid && !canX && !canY && (
                <Verdict ok={false}>Setiap variabel sudah hilang di salah satu persamaan. Sistem ini bisa langsung diselesaikan dengan substitusi — pilih sistem lain untuk berlatih eliminasi.</Verdict>
              )}
              {valid && (canX || canY) && (
                <AnalysisPanel
                  key={`${formatEquation(e1)}|${formatEquation(e2)}`}
                  e1={e1}
                  e2={e2}
                  usable={[...(canX ? (["x"] as const) : []), ...(canY ? (["y"] as const) : [])]}
                  onComplete={(r) => {
                    setAnalysis(r);
                    setStep(1);
                  }}
                />
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 2 — Rencanakan: pilih variabel yang dieliminasi</h3>
              <p className="mt-2 text-sm text-ink-muted">
                <strong>Tujuan:</strong> memilih variabel yang membuat pekerjaanmu paling ringan, lalu menyatakan alasannya.
              </p>
              <p className="mt-2 text-ink-soft">Variabel mana yang ingin kamu hilangkan lebih dulu?</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(["x", "y"] as const).map((v) => {
                  const ok = v === "x" ? canX : canY;
                  const c1 = coefficientOf(e1, v);
                  const c2 = coefficientOf(e2, v);
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={!ok}
                      aria-pressed={elim === v}
                      onClick={() => setElim(v)}
                      className={cn(
                        "rounded-xl border-2 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50",
                        elim === v ? "border-brand-500 bg-brand-50" : "border-slate-200",
                      )}
                    >
                      <p className="font-mono text-2xl font-bold text-ink">{v}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        Koefisien: {formatNumber(c1)} dan {formatNumber(c2)}
                      </p>
                      {!ok && <p className="mt-1 text-xs text-rose-600">Ada koefisien 0, tidak perlu dieliminasi.</p>}
                    </button>
                  );
                })}
              </div>
              {elim && (
                <fieldset className="mt-4">
                  <legend className="text-sm font-semibold text-ink">
                    Mengapa kamu memilih {elim}?
                  </legend>
                  <div role="radiogroup" aria-label="Alasan memilih variabel" className="mt-2 flex flex-wrap gap-2">
                    {REASON_IDS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={reason === r}
                        onClick={() => setReason(r)}
                        className={cn("rounded-xl border-2 px-3 py-1.5 text-sm transition", reason === r ? "border-brand-500 bg-brand-50 font-semibold" : "border-slate-200 hover:border-brand-300")}
                      >
                        {REASON_LABEL[r]}
                      </button>
                    ))}
                  </div>
                  {reason && (() => {
                    const fb = reasonFeedback(elim, reason, e1, e2);
                    return (
                      <p role="status" data-testid="reason-feedback" className={cn("mt-2 rounded-lg px-3 py-2 text-sm", fb.tone === "baik" ? "bg-emerald-50 text-emerald-900" : fb.tone === "periksa" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-ink-soft")}>
                        {fb.text}
                      </p>
                    );
                  })()}
                </fieldset>
              )}
              <Why>Menghilangkan satu variabel mengubah dua persamaan dua variabel menjadi satu persamaan satu variabel yang bisa langsung dihitung. Pilih variabel yang koefisiennya paling mudah disamakan.</Why>
              <div className="mt-5 flex justify-end">
                <Button disabled={!elim || !reason} onClick={() => setStep(2)}>
                  Lanjut ke pengali <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && derived && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 3 — Tentukan pengali</h3>
              <p className="mt-2 text-sm text-ink-muted">
                <strong>Tujuan:</strong> membuat koefisien {elim} sama besar di kedua persamaan tanpa mengubah penyelesaiannya.
              </p>
              <p className="mt-2 text-ink-soft">
                Koefisien {elim} adalah <strong>{formatNumber(derived.c1)}</strong> dan <strong>{formatNumber(derived.c2)}</strong>. Dengan bilangan berapa setiap persamaan dikalikan agar koefisien {elim} sama besar?
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                {(
                  [
                    ["(1) ×", m1s, setM1s, "m1"],
                    ["(2) ×", m2s, setM2s, "m2"],
                  ] as const
                ).map(([label, val, set, id]) => (
                  <div key={id} className="w-28">
                    <label htmlFor={`sim-${id}`} className="mb-1.5 block text-sm font-semibold text-ink">
                      Persamaan {label}
                    </label>
                    <input
                      id={`sim-${id}`}
                      inputMode="numeric"
                      className={cn(inputClass, "text-lg font-semibold")}
                      value={val}
                      onChange={(e) => {
                        set(e.target.value.replace(/[^\d]/g, ""));
                        setMFeedback(null);
                      }}
                    />
                  </div>
                ))}
                <Button onClick={checkMultipliers} disabled={!m1s || !m2s}>
                  Periksa
                </Button>
              </div>
              {mFeedback && <Verdict ok={mFeedback.ok}>{mFeedback.text}</Verdict>}
              {!mFeedback?.ok && (
                <Hints onHint={countHint}
                  key={`h2-${elim}`}
                  hints={[
                    `Perhatikan angka di depan ${elim}: ${Math.abs(derived.c1)} dan ${Math.abs(derived.c2)}. Kita ingin keduanya menjadi bilangan yang sama.`,
                    `Cari KPK (kelipatan persekutuan terkecil) dari ${Math.abs(derived.c1)} dan ${Math.abs(derived.c2)}.`,
                    `Pengali setiap persamaan = KPK dibagi koefisien ${elim} pada persamaan itu.`,
                  ]}
                  canReveal={mWrong > 0}
                  onReveal={() => {
                    setM1s(String(derived.min1));
                    setM2s(String(derived.min2));
                    setMFeedback({ ok: true, text: `KPK dari ${Math.abs(derived.c1)} dan ${Math.abs(derived.c2)} adalah ${derived.target}, jadi pengalinya ×${derived.min1} dan ×${derived.min2}.` });
                  }}
                />
              )}
              <Why>Variabel hanya bisa hilang jika koefisiennya sama besar. Mengalikan seluruh persamaan dengan bilangan yang sama tidak mengubah penyelesaiannya — seperti menggandakan isi kedua sisi timbangan.</Why>
              <div className="mt-5 flex justify-end">
                <Button disabled={!mFeedback?.ok} onClick={() => setStep(3)}>
                  Kalikan persamaan <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && scaled && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 4 — Kalikan setiap persamaan</h3>
              <p className="mt-2 text-sm text-ink-muted">
                <strong>Tujuan:</strong> menuliskan dua persamaan baru yang setara dengan persamaan awal.
              </p>
              <p className="mt-2 text-ink-soft">Setiap suku dikalikan, termasuk konstanta di ruas kanan.</p>
              <div tabIndex={0} className="mt-4 space-y-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-semibold text-ink-muted">
                    ({formatEquation(e1)}) × {m1}
                  </p>
                  <EqRow eq={scaled.s1} label="(1')" highlight={elim!} className="animate-fade-up" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink-muted">
                    ({formatEquation(e2)}) × {m2}
                  </p>
                  <EqRow eq={scaled.s2} label="(2')" highlight={elim!} className="animate-fade-up" />
                </div>
              </div>
              <Why>Sekarang koefisien {elim} sama besar ({Math.abs(coefficientOf(scaled.s1, elim!))}). Jika ruas kanan lupa dikalikan, persamaan menjadi tidak seimbang dan jawabannya salah.</Why>
              <div className="mt-5 flex justify-end">
                <Button onClick={() => setStep(4)}>
                  Pilih operasi <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && scaled && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 5 — Jumlahkan atau kurangkan?</h3>
              <div tabIndex={0} className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
                <EqRow eq={scaled.s1} label="(1')" highlight={elim!} />
                <EqRow eq={scaled.s2} label="(2')" highlight={elim!} />
              </div>
              <p className="mt-3 text-ink-soft">Operasi apa yang membuat {elim} hilang?</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(
                  [
                    ["add", "Jumlahkan (+)"],
                    ["subtract", "Kurangkan (−)"],
                  ] as const
                ).map(([o, label]) => (
                  <Button
                    key={o}
                    variant={op === o ? (opFeedback?.ok ? "success" : "danger") : "outline"}
                    size="lg"
                    onClick={() => chooseOp(o)}
                    disabled={opFeedback?.ok}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {opFeedback && <Verdict ok={opFeedback.ok}>{opFeedback.text}</Verdict>}
              {!opFeedback?.ok && (
                <Hints onHint={countHint}
                  hints={[
                    `Lihat tanda koefisien ${elim} pada (1') dan (2').`,
                    "Jika tandanya sama, a − a = 0. Jika berlawanan, a + (−a) = 0.",
                    `Bandingkan: ${fmtTerm(coefficientOf(scaled.s1, elim!), elim!, true)} dan ${fmtTerm(coefficientOf(scaled.s2, elim!), elim!, true)}.`,
                  ]}
                />
              )}
              <Why>Tujuan kita adalah membuat koefisien {elim} menjadi 0. Tanda koefisien menentukan operasi mana yang menghasilkan 0.</Why>
              {opFeedback?.ok && (
                <div data-testid="prediction-panel" className="mt-4 rounded-2xl border border-brand-100 bg-white p-4">
                  <p className="text-sm font-bold text-ink">Prediksi dulu, baru lihat hasilnya</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    <strong>Tujuan:</strong> menguji pemahamanmu. Setelah operasi itu, persamaan yang tersisa hanya memuat {keep}. Berapa koefisien {keep} dan konstantanya?
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-2 font-mono text-lg">
                    <input
                      aria-label={`Prediksi koefisien ${keep}`}
                      inputMode="numeric"
                      disabled={predState !== "belum"}
                      value={pred.coef}
                      onChange={(e) => setPred((p) => ({ ...p, coef: e.target.value.replace(/[^\d-]/g, "") }))}
                      className={cn(inputClass, "w-20 text-center")}
                    />
                    <span className="pb-2">{keep} =</span>
                    <input
                      aria-label="Prediksi konstanta"
                      inputMode="numeric"
                      disabled={predState !== "belum"}
                      value={pred.konst}
                      onChange={(e) => setPred((p) => ({ ...p, konst: e.target.value.replace(/[^\d-]/g, "") }))}
                      className={cn(inputClass, "w-20 text-center")}
                    />
                    {predState === "belum" && (
                      <>
                        <Button size="sm" disabled={!/^-?\d+$/.test(pred.coef) || !/^-?\d+$/.test(pred.konst)} onClick={() => setPredState("dikirim")}>
                          Kunci prediksi
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPredState("dilewati")}>
                          Lewati prediksi
                        </Button>
                      </>
                    )}
                  </div>
                  {predState !== "belum" && (
                    <p role="status" className="mt-2 text-sm text-ink-soft">
                      {predState === "dikirim" ? "Prediksi terkunci. Kita bandingkan dengan hasil nyata pada langkah berikutnya." : "Prediksi dilewati. Tidak apa-apa — kamu tetap bisa melanjutkan."}
                    </p>
                  )}
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <Button disabled={!opFeedback?.ok || predState === "belum"} onClick={() => setStep(5)}>
                  Lakukan eliminasi <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && scaled && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 6 — Eliminasi &amp; hitung {keep}</h3>
              <p className="mt-2 text-sm text-ink-muted">
                <strong>Tujuan:</strong> mendapatkan persamaan satu variabel, lalu menghitung nilainya.
              </p>
              <div tabIndex={0} className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
                <EqRow eq={scaled.s1} label="(1')" />
                <EqRow eq={scaled.s2} label="(2')" />
                <div className="my-1 flex items-center gap-2">
                  <div className="h-0.5 w-72 bg-ink" />
                  <span className="font-mono text-lg font-bold">{scaled.correctOp === "add" ? "+" : "−"}</span>
                </div>
                <div className="grid grid-cols-[3.5rem_5rem_5.5rem_1rem_4.5rem] items-center gap-1 font-mono text-lg font-bold text-brand-700">
                  <span />
                  <span className="text-right">{elim === "x" ? "0" : fmtTerm(scaled.rc, "x", true)}</span>
                  <span className="text-right">{elim === "y" ? "+ 0" : fmtTerm(scaled.rc, "y", false)}</span>
                  <span className="text-center">=</span>
                  <span className="text-right">{formatNumber(scaled.rk)}</span>
                </div>
              </div>

              {predResult && predResult !== "dilewati" && outcome && (
                <p role="status" data-testid="prediction-result" className={cn("mt-3 rounded-lg px-3 py-2 text-sm", predResult === "berbeda" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900")}>
                  Prediksimu: {pred.coef}{keep} = {pred.konst}. Hasil nyata: {formatNumber(outcome.coef)}{keep} = {formatNumber(outcome.konst)}.{" "}
                  {predResult === "persis"
                    ? "Prediksimu tepat."
                    : predResult === "setara"
                      ? "Bentuknya berbeda, tetapi setara (keduanya memberi nilai yang sama)."
                      : "Berbeda dari prediksimu. Periksa kembali: tanda koefisien dan konstanta pada (1′) dan (2′), serta operasi yang kamu pilih."}
                </p>
              )}
              {scaled.keepValue === null ? (
                <>
                  <Verdict ok={false}>
                    {scaled.rk === 0
                      ? `Kedua variabel hilang dan hasilnya 0 = 0 (selalu benar). Artinya kedua persamaan sebenarnya sama (garis berimpit): penyelesaiannya tak hingga banyaknya.`
                      : `Kedua variabel hilang dan hasilnya 0 = ${formatNumber(scaled.rk)} (tidak mungkin). Artinya kedua garis sejajar: sistem ini tidak memiliki penyelesaian.`}
                  </Verdict>
                  <div className="mt-5 flex justify-end">
                    <Button onClick={finish}>Selesai</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-ink-soft">
                    Variabel {elim} sudah hilang! Sekarang tersisa <span className="font-mono font-bold">{fmtTerm(scaled.rc, keep, true)} = {formatNumber(scaled.rk)}</span>. Berapa nilai {keep}?
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="w-32">
                      <label htmlFor="sim-keep" className="mb-1.5 block text-sm font-semibold text-ink">
                        {keep} =
                      </label>
                      <input
                        id="sim-keep"
                        inputMode="decimal"
                        className={cn(inputClass, "text-lg font-semibold")}
                        value={keepS}
                        disabled={keepFeedback?.ok}
                        onChange={(e) => setKeepS(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && checkKeep()}
                      />
                    </div>
                    <Button onClick={checkKeep} disabled={!keepS || keepFeedback?.ok}>
                      Periksa
                    </Button>
                  </div>
                  {keepFeedback && <Verdict ok={keepFeedback.ok}>{keepFeedback.text}</Verdict>}
                  {!keepFeedback?.ok && <Hints onHint={countHint} hints={[`Persamaan yang tersisa hanya memuat ${keep}.`, `Bagi kedua ruas dengan koefisien ${keep}, yaitu ${formatNumber(scaled.rc)}.`, "Hasilnya boleh bilangan negatif atau pecahan."]} />}
                  <Why>Karena {elim} sudah hilang, persamaan tinggal satu variabel sehingga nilainya bisa ditentukan pasti.</Why>
                  <div className="mt-5 flex justify-end">
                    <Button disabled={!keepFeedback?.ok} onClick={() => setStep(6)}>
                      Cari {elim} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 6 && scaled?.keepValue && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 7 — Substitusi untuk mencari {elim}</h3>
              <p className="mt-2 text-sm text-ink-muted">
                <strong>Tujuan:</strong> melengkapi pasangan (x, y) dengan memakai nilai yang sudah kamu temukan.
              </p>
              <p className="mt-2 text-ink-soft">
                Masukkan {keep} = {formatValue(scaled.keepValue)} ke salah satu persamaan awal. Pilih persamaan:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {([1, 2] as const).map((n) => {
                  const eq = n === 1 ? e1 : e2;
                  const ok = coefficientOf(eq, elim!) !== 0;
                  return (
                    <Button
                      key={n}
                      size="sm"
                      variant={subInto === n ? "primary" : "outline"}
                      disabled={!ok || otherFeedback?.ok}
                      onClick={() => {
                        setSubInto(n);
                        setOtherFeedback(null);
                      }}
                    >
                      ({n}) {formatEquation(eq)}
                    </Button>
                  );
                })}
              </div>
              {otherInfo && (
                <div tabIndex={0} className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 font-mono text-[0.95rem] leading-relaxed">
                  <p>{formatEquation(otherInfo.eq)}</p>
                  <p>
                    {elim === "x" ? `${fmtTerm(otherInfo.oc, "x", true)} ${otherInfo.kc < 0 ? "−" : "+"} ${Math.abs(otherInfo.kc)}·(${formatValue(scaled.keepValue)})` : `${formatNumber(otherInfo.kc)}·(${formatValue(scaled.keepValue)}) ${otherInfo.oc < 0 ? "−" : "+"} ${Math.abs(otherInfo.oc) === 1 ? "" : Math.abs(otherInfo.oc)}y`}{" "}
                    = {formatNumber(otherInfo.eq.c)}
                  </p>
                  <p>
                    {fmtTerm(otherInfo.oc, elim!, true)} {otherInfo.kTerm.n < 0 ? "−" : "+"} {formatValue(otherInfo.kTerm.n < 0 ? frac(-otherInfo.kTerm.n, otherInfo.kTerm.d) : otherInfo.kTerm)} = {formatNumber(otherInfo.eq.c)}
                  </p>
                  <p>
                    {fmtTerm(otherInfo.oc, elim!, true)} = {formatNumber(otherInfo.eq.c)} {otherInfo.kTerm.n < 0 ? "+" : "−"} {formatValue(otherInfo.kTerm.n < 0 ? frac(-otherInfo.kTerm.n, otherInfo.kTerm.d) : otherInfo.kTerm)} = {formatValue(otherInfo.rhs)}
                  </p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="w-32">
                  <label htmlFor="sim-other" className="mb-1.5 block text-sm font-semibold text-ink">
                    {elim} =
                  </label>
                  <input
                    id="sim-other"
                    inputMode="decimal"
                    className={cn(inputClass, "text-lg font-semibold")}
                    value={otherS}
                    disabled={otherFeedback?.ok}
                    onChange={(e) => setOtherS(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && checkOther()}
                  />
                </div>
                <Button onClick={checkOther} disabled={!otherS || otherFeedback?.ok}>
                  Periksa
                </Button>
              </div>
              {otherFeedback && <Verdict ok={otherFeedback.ok}>{otherFeedback.text}</Verdict>}
              {!otherFeedback?.ok && otherInfo && <Hints onHint={countHint} hints={[`Persamaan di atas kini hanya memuat ${elim}.`, `Bagi ${formatValue(otherInfo.rhs)} dengan koefisien ${elim}, yaitu ${formatNumber(otherInfo.oc)}.`]} />}
              <Why>Nilai {keep} sudah diketahui, sehingga persamaan awal tinggal memiliki satu variabel yang belum diketahui. (Kamu juga bisa mengeliminasi {keep} untuk mencari {elim} — hasilnya pasti sama.)</Why>
              <div className="mt-5 flex justify-end">
                <Button disabled={!otherFeedback?.ok} onClick={finish}>
                  Periksa jawaban <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 8 — Periksa kebenaran solusi</h3>
              <p className="mt-2 text-sm text-ink-muted">
                <strong>Tujuan:</strong> memastikan pasangan itu benar-benar memenuhi kedua persamaan.
              </p>
              {xVal && yVal ? (
                <>
                  <p className="mt-2 text-ink-soft">Substitusikan x = {formatValue(xVal)} dan y = {formatValue(yVal)} ke kedua persamaan awal:</p>
                  {[e1, e2].map((eq, i) => (
                    <div key={i} className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 font-mono text-sm">
                      {substitutionLines(eq, xVal, yVal).map((l, j) => (
                        <p key={j}>{l}</p>
                      ))}
                      <p className="font-bold text-emerald-700">= {formatNumber(eq.c)} ✓</p>
                    </div>
                  ))}
                  <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-center text-white">
                    <p className="text-sm font-semibold uppercase tracking-wide opacity-90">Himpunan penyelesaian</p>
                    <p className="mt-1 font-mono text-3xl font-extrabold">
                      {"{"}({formatValue(xVal)}, {formatValue(yVal)}){"}"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-ink-soft">Sistem ini tidak memiliki penyelesaian tunggal. Coba buka tab Grafik untuk melihat mengapa kedua garis tidak berpotongan di satu titik.</p>
              )}
              <Why>Penyelesaian SPLDV harus memenuhi kedua persamaan. Pemeriksaan memastikan tidak ada kesalahan hitung atau tanda.</Why>
              {xVal && yVal && (
                <div className="mt-4 rounded-xl border border-brand-100 bg-white p-3">
                  <p className="text-sm text-ink-soft">
                    <strong>Hubungkan dengan grafik:</strong> pasangan yang baru kamu temukan harus menjadi titik di kedua garis sekaligus.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" disabled={marked} onClick={() => setMarked(true)}>
                    Tandai penyelesaianku pada grafik
                  </Button>
                  {marked && (
                    <p role="status" data-testid="graph-link" className="mt-2 text-sm text-emerald-900">
                      Titik ({formatValue(xVal)}, {formatValue(yVal)}) berada pada garis (1), garis (2), dan garis hasil eliminasi. Karena itu eliminasi tidak mengubah penyelesaian: ia hanya menggantikan garis-garis awal dengan garis yang lebih mudah dibaca, yang tetap melewati titik potong yang sama.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={changePlan}>
                  Coba variabel lain
                </Button>
                <Button variant="outline" onClick={() => randomSystem("sedang")}>
                  <Dices className="h-4 w-4" /> Sistem acak baru
                </Button>
                <Button variant="outline" onClick={() => resetFrom(0)}>
                  <RotateCcw className="h-4 w-4" /> Mulai ulang
                </Button>
                <Button onClick={() => setStep(8)}>
                  Lanjut ke refleksi <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 9 — Refleksi</h3>
              <p className="mt-2 text-sm text-ink-muted">
                <strong>Tujuan:</strong> melihat kembali rencanamu dan membandingkannya dengan pilihan lain, supaya kamu bisa memilih lebih baik pada soal berikutnya.
              </p>
              {bothUsable && guess === "" && (
                <div data-testid="compare-guess" className="mt-3 rounded-xl border border-brand-100 bg-white p-3">
                  <p className="text-sm font-bold text-ink">Tebak dulu, baru bandingkan</p>
                  <p className="mt-1 text-sm text-ink-soft">Menurutmu, mengeliminasi variabel mana yang memerlukan pengali lebih kecil?</p>
                  <div role="radiogroup" aria-label="Tebakan variabel dengan pengali lebih kecil" className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["x", "Variabel x"],
                        ["y", "Variabel y"],
                        ["sama", "Sama saja"],
                        ["belum_tahu", "Belum tahu"],
                      ] as const
                    ).map(([g, label]) => (
                      <button key={g} type="button" role="radio" aria-checked={false} onClick={() => setGuess(g)} className="rounded-xl border-2 border-slate-200 px-3 py-1.5 text-sm transition hover:border-brand-300">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {bothUsable && guess !== "" && (
                <p role="status" data-testid="compare-guess-result" className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-soft">
                  {guess === "belum_tahu"
                    ? "Tidak apa-apa. Perhatikan tabel di bawah untuk melihat perbedaannya."
                    : guess === efficient
                      ? "Tebakanmu sesuai dengan tabel di bawah."
                      : "Tebakanmu berbeda dengan tabel di bawah. Perhatikan kolom pengali, lalu pikirkan mengapa."}
                </p>
              )}
              {(!bothUsable || guess !== "") && (
              <div tabIndex={0} className="mt-3 overflow-x-auto" data-testid="plan-comparison">
                <table className="w-full text-left text-sm">
                  <caption className="mb-1 text-left text-xs font-semibold text-ink-muted">Perbandingan rencana: mengeliminasi x atau y</caption>
                  <thead className="text-xs text-ink-muted">
                    <tr>
                      <th className="py-1 pr-2">Variabel</th>
                      <th className="py-1 pr-2">Koefisien</th>
                      <th className="py-1 pr-2">Hubungan</th>
                      <th className="py-1 pr-2">Pengali</th>
                      <th className="py-1">Operasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["x", "y"] as const)
                      .filter((v) => (v === "x" ? canX : canY))
                      .map((v) => {
                        const c = variableCost(e1, e2, v);
                        const c1 = coefficientOf(e1, v);
                        const c2 = coefficientOf(e2, v);
                        return (
                          <tr key={v} className={cn("border-t border-slate-100", v === elim && "bg-brand-50/60 font-semibold")}>
                            <td className="py-1.5 pr-2 font-mono">
                              {v}
                              {v === elim && " (pilihanmu)"}
                            </td>
                            <td className="py-1.5 pr-2 font-mono">
                              {formatNumber(c1)}, {formatNumber(c2)}
                            </td>
                            <td className="py-1.5 pr-2">{RELATION_LABEL[relationOf(c1, c2)]}</td>
                            <td className="py-1.5 pr-2 font-mono">{c ? `×${c.m1}, ×${c.m2}` : "—"}</td>
                            <td className="py-1.5">{c ? (c.operation === "add" ? "dijumlahkan" : "dikurangkan") : "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-ink-muted">
                  Pengali di tabel adalah pengali terkecil. Rencana yang paling ringan umumnya adalah yang pengalinya paling kecil. Tidak ada pilihan yang keliru selama langkahnya benar; pilihan yang berbeda hanya membuat hitungan lebih ringan atau lebih berat.
                </p>
              </div>
              )}
              <div className="mt-4">
                {reflState === null && bothUsable && guess === "" ? (
                  <p className="text-sm text-ink-muted">Isi tebakanmu dulu untuk membuka perbandingan dan formulir refleksi.</p>
                ) : reflState === null ? (
                  <ReflectionForm
                    context="lab_elimination"
                    promptIds={["bagian_menantang", "alasan_variabel", "bandingan_alternatif", "aturan_tanda_sama", "makna_titik_potong", "keyakinan"]}
                    onSubmit={submitReflection}
                    onSkip={skipReflection}
                  />
                ) : (
                  <p role="status" data-testid="reflection-done" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    {reflState === "terkirim" ? "Terima kasih, refleksimu tersimpan." : "Refleksi dilewati. Kamu bisa mengisinya lain kali."}
                  </p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={changePlan}>
                  Coba variabel lain
                </Button>
                <Button variant="outline" onClick={() => randomSystem("sedang")}>
                  <Dices className="h-4 w-4" /> Sistem acak baru
                </Button>
                <Button onClick={() => resetFrom(0)}>
                  <RotateCcw className="h-4 w-4" /> Mulai ulang
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
