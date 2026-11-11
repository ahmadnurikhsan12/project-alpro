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
import { cn } from "@/lib/utils";
import { EquationInput, PRESETS } from "./equation-input";
import { substitutionLines } from "./pair-checker";

const STEPS = ["Susun", "Pilih variabel", "Pengali", "Kalikan", "Operasi", "Eliminasi", "Substitusi", "Periksa"];

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

function Hints({ hints, onReveal, canReveal }: { hints: string[]; onReveal?: () => void; canReveal?: boolean }) {
  const [shown, setShown] = useState(0);
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
  const [recorded, setRecorded] = useState(false);

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

  const resetFrom = (s: number) => {
    if (s <= 1) setElim(null);
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

  const finish = () => {
    setStep(7);
    if (!recorded) {
      setRecorded(true);
      void record({ type: "lab", tool: "elimination" });
    }
  };

  const xVal = elim && scaled?.keepValue && otherInfo ? (elim === "x" ? otherInfo.value : scaled.keepValue) : null;
  const yVal = elim && scaled?.keepValue && otherInfo ? (elim === "y" ? otherInfo.value : scaled.keepValue) : null;

  // ------------------------------------------------------------------ render
  return (
    <div className="space-y-5">
      {/* indikator langkah */}
      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Langkah simulasi">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              i < step ? "bg-emerald-100 text-emerald-800" : i === step ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-muted",
            )}
          >
            <span>{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Panel sistem */}
        <Card className="h-fit">
          <h3 className="font-bold text-ink">Sistem persamaan</h3>
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
            <div className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
              <EqRow eq={e1} label="(1)" highlight={step >= 1 && step <= 2 ? (elim ?? undefined) : undefined} />
              <EqRow eq={e2} label="(2)" highlight={step >= 1 && step <= 2 ? (elim ?? undefined) : undefined} />
            </div>
          )}
          {step > 0 && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => resetFrom(0)}>
              <RotateCcw className="h-4 w-4" /> Ganti sistem / mulai ulang
            </Button>
          )}
        </Card>

        {/* Panel langkah */}
        <Card aria-live="polite">
          {step === 0 && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 1 — Susun kedua persamaan</h3>
              <p className="mt-2 text-ink-soft">Pastikan kedua persamaan berbentuk ax + by = c: suku x di bawah suku x, suku y di bawah suku y, dan konstanta di ruas kanan.</p>
              <Why>Dengan menyusun rapi, kita bisa membandingkan koefisien variabel yang sama dan menjumlahkan/mengurangkan suku sejenis.</Why>
              {!valid && <Verdict ok={false}>Koefisien x dan y pada satu persamaan tidak boleh keduanya 0.</Verdict>}
              {valid && !canX && !canY && (
                <Verdict ok={false}>Setiap variabel sudah hilang di salah satu persamaan. Sistem ini bisa langsung diselesaikan dengan substitusi — pilih sistem lain untuk berlatih eliminasi.</Verdict>
              )}
              <div className="mt-5 flex justify-end">
                <Button disabled={!valid || (!canX && !canY)} onClick={() => setStep(1)}>
                  Sudah tersusun, lanjut <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 2 — Pilih variabel yang dieliminasi</h3>
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
                      onClick={() => {
                        setElim(v);
                        setStep(2);
                      }}
                      className="rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              <Why>Menghilangkan satu variabel mengubah dua persamaan dua variabel menjadi satu persamaan satu variabel yang bisa langsung dihitung. Pilih variabel yang koefisiennya paling mudah disamakan.</Why>
            </div>
          )}

          {step === 2 && derived && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 3 — Tentukan pengali</h3>
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
                <Hints
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
              <p className="mt-2 text-ink-soft">Setiap suku dikalikan, termasuk konstanta di ruas kanan.</p>
              <div className="mt-4 space-y-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
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
              <div className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
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
                <Hints
                  hints={[
                    `Lihat tanda koefisien ${elim} pada (1') dan (2').`,
                    "Jika tandanya sama, a − a = 0. Jika berlawanan, a + (−a) = 0.",
                    `Bandingkan: ${fmtTerm(coefficientOf(scaled.s1, elim!), elim!, true)} dan ${fmtTerm(coefficientOf(scaled.s2, elim!), elim!, true)}.`,
                  ]}
                />
              )}
              <Why>Tujuan kita adalah membuat koefisien {elim} menjadi 0. Tanda koefisien menentukan operasi mana yang menghasilkan 0.</Why>
              <div className="mt-5 flex justify-end">
                <Button disabled={!opFeedback?.ok} onClick={() => setStep(5)}>
                  Lakukan eliminasi <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && scaled && (
            <div>
              <h3 className="text-lg font-bold text-ink">Langkah 6 — Eliminasi &amp; hitung {keep}</h3>
              <div className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3">
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
                  {!keepFeedback?.ok && <Hints hints={[`Persamaan yang tersisa hanya memuat ${keep}.`, `Bagi kedua ruas dengan koefisien ${keep}, yaitu ${formatNumber(scaled.rc)}.`, "Hasilnya boleh bilangan negatif atau pecahan."]} />}
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
                <div className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 font-mono text-[0.95rem] leading-relaxed">
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
              {!otherFeedback?.ok && otherInfo && <Hints hints={[`Persamaan di atas kini hanya memuat ${elim}.`, `Bagi ${formatValue(otherInfo.rhs)} dengan koefisien ${elim}, yaitu ${formatNumber(otherInfo.oc)}.`]} />}
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
              <div className="mt-5 flex flex-wrap justify-end gap-2">
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
