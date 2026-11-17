"use client";

import { ArrowDownCircle, ArrowUpCircle, CheckCircle2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button, Card, MathBlock } from "@/components/ui";
import { compareGuess, REASON_LABEL, REASONS, SIGNAL_LABEL, SIGNALS, signalOf, tebakMetrics, type GuessRecord, type Reason, type Signal } from "@/lib/games/rmt";
import { formatEquation, formatNumber, generateSystem } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { GameHud, type GameProps } from "./game-shell";
import { NumberField, toInt } from "./shared";

const ROUNDS = 3;
const MAX_GUESSES = 8;

function SignalBadge({ s }: { s: Signal }) {
  if (s === "tepat")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> tepat
      </span>
    );
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", s === "besar" ? "bg-rose-100 text-rose-800" : "bg-sky-100 text-sky-800")}>
      {s === "besar" ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />} terlalu {s}
    </span>
  );
}

/** Pilihan tiga sinyal untuk memprediksi satu persamaan. */
function PredictionPicker({ label, value, onChange }: { label: string; value: Signal | ""; onChange: (s: Signal) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 text-sm font-semibold text-ink">{label}</span>
      <div role="radiogroup" aria-label={`Prediksi ${label}`} className="flex flex-wrap gap-1.5">
        {SIGNALS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            onClick={() => onChange(s)}
            className={cn("min-h-9 rounded-xl border-2 px-3 py-1 text-sm transition", value === s ? "border-brand-500 bg-brand-50 font-semibold" : "border-slate-200 hover:border-brand-300")}
          >
            {SIGNAL_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TebakNilai({ difficulty, onFinish }: GameProps) {
  const rounds = useMemo(() => Array.from({ length: ROUNDS }, () => generateSystem(Math.random, difficulty)), [difficulty]);
  const [r, setR] = useState(0);
  const [xs, setXs] = useState("");
  const [ys, setYs] = useState("");
  const [history, setHistory] = useState<{ x: number; y: number; s1: ReturnType<typeof signalOf>; s2: ReturnType<typeof signalOf>; p1: Signal; p2: Signal }[]>([]);
  const [status, setStatus] = useState<"play" | "won" | "lost">("play");
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [roundPts, setRoundPts] = useState(0);
  // ---- RMT: prediksi + alasan matematis SEBELUM mencoba
  const [reason, setReason] = useState<Reason | "">("");
  const [p1, setP1] = useState<Signal | "">("");
  const [p2, setP2] = useState<Signal | "">("");
  const [lastCmp, setLastCmp] = useState<string | null>(null);
  const allGuesses = useRef<GuessRecord[]>([]);
  const correctPredictions = useRef(0);

  const sys = rounds[r];
  const ready = xs !== "" && ys !== "" && reason !== "" && p1 !== "" && p2 !== "";

  const guess = () => {
    const x = toInt(xs);
    const y = toInt(ys);
    if (x === null || y === null || status !== "play" || !reason || !p1 || !p2) return;
    const s1 = signalOf(sys.e1, x, y);
    const s2 = signalOf(sys.e2, x, y);
    const cmp = compareGuess({ s1: p1, s2: p2 }, { s1: s1.s, s2: s2.s });
    allGuesses.current.push({ reason, pred: { s1: p1, s2: p2 }, actual: { s1: s1.s, s2: s2.s } });
    correctPredictions.current += cmp.correct;
    setLastCmp(
      cmp.correct === 2
        ? "Kedua prediksimu tepat."
        : `Prediksimu untuk persamaan ${[!cmp.m1 && "(1)", !cmp.m2 && "(2)"].filter(Boolean).join(" dan ")} belum tepat. Hitung ruas kirinya lagi dan bandingkan dengan ruas kanan.`,
    );
    const entry = { x, y, s1, s2, p1, p2 };
    const h = [entry, ...history];
    setHistory(h);
    setReason("");
    setP1("");
    setP2("");
    if (x === sys.x && y === sys.y) {
      const pts = Math.max(10, 100 - 10 * (h.length - 1));
      setScore((s) => s + pts);
      setSolved((s) => s + 1);
      setRoundPts(pts);
      setStatus("won");
    } else if (h.length >= MAX_GUESSES) {
      setRoundPts(0);
      setStatus("lost");
    }
  };

  const next = () => {
    if (r === ROUNDS - 1) {
      const total = allGuesses.current.length * 2;
      onFinish({
        score,
        correct: solved,
        total: ROUNDS,
        summary: `${solved} dari ${ROUNDS} pasangan rahasia ditemukan.`,
        la: tebakMetrics(allGuesses.current, ROUNDS, solved),
        reflect: `Kamu memprediksi dengan tepat ${correctPredictions.current} dari ${total} perkiraan sinyal.`,
      });
      return;
    }
    setR(r + 1);
    setXs("");
    setYs("");
    setHistory([]);
    setStatus("play");
    setLastCmp(null);
  };

  return (
    <>
      <GameHud
        items={[
          { label: "Ronde", value: `${r + 1}/${ROUNDS}` },
          { label: "Skor", value: score },
          { label: "Sisa tebakan", value: MAX_GUESSES - history.length },
        ]}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <p className="font-semibold text-ink">Pasangan (x, y) rahasia memenuhi:</p>
          <MathBlock lines={[`(1)  ${formatEquation(sys.e1)}`, `(2)  ${formatEquation(sys.e2)}`]} />
          {status === "play" ? (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <NumberField label="Tebak x" value={xs} onChange={setXs} onEnter={guess} />
                <NumberField label="Tebak y" value={ys} onChange={setYs} onEnter={guess} />
              </div>
              <div data-testid="tebak-prediction" className="mt-4 rounded-xl border border-brand-100 bg-white p-3">
                <p className="text-sm font-bold text-ink">Prediksi dulu, baru tebak</p>
                <p className="mt-1 text-sm text-ink-soft">
                  <strong>Tujuan:</strong> berpikir sebelum mencoba. Jika tebakan (x, y) di atas disubstitusikan, ruas kiri tiap persamaan akan…
                </p>
                <div className="mt-2 space-y-2">
                  <PredictionPicker label="Persamaan (1)" value={p1} onChange={setP1} />
                  <PredictionPicker label="Persamaan (2)" value={p2} onChange={setP2} />
                </div>
                <fieldset className="mt-3">
                  <legend className="text-sm font-semibold text-ink">Apa dasar tebakanmu?</legend>
                  <div role="radiogroup" aria-label="Alasan tebakan" className="mt-1.5 flex flex-wrap gap-1.5">
                    {REASONS.map((o) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={reason === o}
                        onClick={() => setReason(o)}
                        className={cn("min-h-9 rounded-xl border-2 px-3 py-1 text-left text-sm transition", reason === o ? "border-brand-500 bg-brand-50 font-semibold" : "border-slate-200 hover:border-brand-300")}
                      >
                        {REASON_LABEL[o]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Button className="mt-3" onClick={guess} disabled={!ready}>
                  Tebak
                </Button>
                {!ready && <p className="mt-2 text-xs text-ink-muted">Isi tebakan, kedua prediksi, dan dasar tebakanmu agar tombol Tebak aktif.</p>}
              </div>
              {lastCmp && (
                <p role="status" data-testid="tebak-compare" className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-soft">
                  {lastCmp}
                </p>
              )}
            </>
          ) : (
            <div className={cn("mt-3 rounded-xl p-4", status === "won" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900")} role="status">
              <p className="font-bold">{status === "won" ? `Ketemu dalam ${history.length} tebakan! +${roundPts} poin` : "Tebakan habis!"}</p>
              <p className="text-sm">
                Pasangan rahasia: ({formatNumber(sys.x)}, {formatNumber(sys.y)})
              </p>
              <Button className="mt-3" onClick={next}>
                {r === ROUNDS - 1 ? "Lihat hasil akhir" : "Ronde berikutnya"}
              </Button>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-muted">Tips: sinyal &quot;terlalu besar&quot; berarti ruas kiri melebihi ruas kanan. Atau langsung gunakan eliminasi!</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-ink">Riwayat tebakan</p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Belum ada tebakan.</p>
          ) : (
            <div tabIndex={0} className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-muted">
                    <th className="py-1 pr-2 font-semibold">(x, y)</th>
                    <th className="py-1 pr-2 font-semibold">Persamaan (1)</th>
                    <th className="py-1 font-semibold">Persamaan (2)</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, k) => (
                    <tr key={k} className="border-t border-slate-100">
                      <td className="py-2 pr-2 font-mono font-semibold">
                        ({formatNumber(h.x)}, {formatNumber(h.y)})
                      </td>
                      <td className="py-2 pr-2">
                        <span className="mr-1 font-mono text-xs text-ink-muted">
                          {formatNumber(h.s1.value)} dari {formatNumber(sys.e1.c)}
                        </span>
                        <SignalBadge s={h.s1.s} />
                        <span className="mt-0.5 block text-xs text-ink-muted">{h.p1 === h.s1.s ? "prediksi ✓" : "prediksi ✗"}</span>
                      </td>
                      <td className="py-2">
                        <span className="mr-1 font-mono text-xs text-ink-muted">
                          {formatNumber(h.s2.value)} dari {formatNumber(sys.e2.c)}
                        </span>
                        <SignalBadge s={h.s2.s} />
                        <span className="mt-0.5 block text-xs text-ink-muted">{h.p2 === h.s2.s ? "prediksi ✓" : "prediksi ✗"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
