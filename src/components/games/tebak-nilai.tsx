"use client";

import { ArrowDownCircle, ArrowUpCircle, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, MathBlock } from "@/components/ui";
import { formatEquation, formatNumber, generateSystem, type Equation } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { GameHud, type GameProps } from "./game-shell";
import { NumberField, toInt } from "./shared";

const ROUNDS = 3;
const MAX_GUESSES = 8;

type Signal = "besar" | "kecil" | "tepat";
const signal = (eq: Equation, x: number, y: number): { value: number; s: Signal } => {
  const v = eq.a * x + eq.b * y;
  return { value: v, s: v === eq.c ? "tepat" : v > eq.c ? "besar" : "kecil" };
};

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

export function TebakNilai({ difficulty, onFinish }: GameProps) {
  const rounds = useMemo(() => Array.from({ length: ROUNDS }, () => generateSystem(Math.random, difficulty)), [difficulty]);
  const [r, setR] = useState(0);
  const [xs, setXs] = useState("");
  const [ys, setYs] = useState("");
  const [history, setHistory] = useState<{ x: number; y: number; s1: ReturnType<typeof signal>; s2: ReturnType<typeof signal> }[]>([]);
  const [status, setStatus] = useState<"play" | "won" | "lost">("play");
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [roundPts, setRoundPts] = useState(0);

  const sys = rounds[r];

  const guess = () => {
    const x = toInt(xs);
    const y = toInt(ys);
    if (x === null || y === null || status !== "play") return;
    const entry = { x, y, s1: signal(sys.e1, x, y), s2: signal(sys.e2, x, y) };
    const h = [entry, ...history];
    setHistory(h);
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
      onFinish({ score, correct: solved, total: ROUNDS, summary: `${solved} dari ${ROUNDS} pasangan rahasia ditemukan.` });
      return;
    }
    setR(r + 1);
    setXs("");
    setYs("");
    setHistory([]);
    setStatus("play");
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
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <NumberField label="Tebak x" value={xs} onChange={setXs} onEnter={guess} />
              <NumberField label="Tebak y" value={ys} onChange={setYs} onEnter={guess} />
              <Button onClick={guess} disabled={!xs || !ys}>
                Tebak
              </Button>
            </div>
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
            <div className="mt-3 overflow-x-auto">
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
                        <span className="mr-1 font-mono text-xs text-ink-muted">{formatNumber(h.s1.value)}</span>
                        <SignalBadge s={h.s1.s} />
                      </td>
                      <td className="py-2">
                        <span className="mr-1 font-mono text-xs text-ink-muted">{formatNumber(h.s2.value)}</span>
                        <SignalBadge s={h.s2.s} />
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
