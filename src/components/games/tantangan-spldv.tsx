"use client";

import { Heart, Mountain } from "lucide-react";
import { useState } from "react";
import { Button, Card, MathBlock } from "@/components/ui";
import { formatEquation, generateSystem, type Difficulty } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { GameHud, type GameProps } from "./game-shell";
import { NumberField, toInt } from "./shared";

const LEVELS = 10;
const LIVES = 3;
const LADDER: Record<Difficulty, Difficulty[]> = {
  mudah: ["mudah", "mudah", "mudah", "mudah", "sedang", "sedang", "sedang", "sulit", "sulit", "sulit"],
  sedang: ["mudah", "mudah", "sedang", "sedang", "sedang", "sedang", "sulit", "sulit", "sulit", "sulit"],
  sulit: ["sedang", "sedang", "sulit", "sulit", "sulit", "sulit", "sulit", "sulit", "sulit", "sulit"],
};

export function TantanganSpldv({ difficulty, onFinish }: GameProps) {
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [sys, setSys] = useState(() => generateSystem(Math.random, LADDER[difficulty][0]));
  const [xs, setXs] = useState("");
  const [ys, setYs] = useState("");
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [locked, setLocked] = useState(false);

  const submit = () => {
    const x = toInt(xs);
    const y = toInt(ys);
    if (x === null || y === null || locked) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setLocked(true);
    if (x === sys.x && y === sys.y) {
      const nextScore = score + level * 10;
      setScore(nextScore);
      setMsg({ ok: true, text: `Benar! +${level * 10} poin.` });
      setTimeout(() => {
        if (level === LEVELS) {
          onFinish({ score: nextScore, correct: LEVELS, total: nextAttempts, summary: `Semua ${LEVELS} tingkat ditaklukkan dengan ${lives} nyawa tersisa!` });
          return;
        }
        setLevel(level + 1);
        setSys(generateSystem(Math.random, LADDER[difficulty][level]));
        setXs("");
        setYs("");
        setMsg(null);
        setLocked(false);
      }, 800);
    } else {
      const nl = lives - 1;
      setLives(nl);
      setMsg({ ok: false, text: `Salah. Jawaban yang benar (${sys.x}, ${sys.y}). Nyawa −1.` });
      setTimeout(() => {
        if (nl <= 0) {
          onFinish({ score, correct: level - 1, total: nextAttempts, summary: `Berhenti di tingkat ${level} dari ${LEVELS}.` });
          return;
        }
        setSys(generateSystem(Math.random, LADDER[difficulty][level - 1]));
        setXs("");
        setYs("");
        setMsg(null);
        setLocked(false);
      }, 1800);
    }
  };

  return (
    <>
      <GameHud
        items={[
          { label: "Tingkat", value: `${level}/${LEVELS}` },
          { label: "Skor", value: score },
          {
            label: "Nyawa",
            value: (
              <span className="inline-flex gap-0.5" aria-label={`${lives} nyawa`}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <Heart key={i} className={cn("h-4 w-4", i < lives ? "fill-rose-500 text-rose-500" : "text-slate-300")} />
                ))}
              </span>
            ),
          },
        ]}
      />
      <div className="grid gap-5 md:grid-cols-[1fr_200px]">
        <Card>
          <p className="text-sm font-bold text-rose-600">Tingkat {level} · bernilai {level * 10} poin</p>
          <p className="mt-2 font-semibold text-ink">Tentukan penyelesaian SPLDV berikut:</p>
          <MathBlock lines={[formatEquation(sys.e1), formatEquation(sys.e2)]} />
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <NumberField label="x =" value={xs} onChange={setXs} onEnter={submit} disabled={locked} />
            <NumberField label="y =" value={ys} onChange={setYs} onEnter={submit} disabled={locked} />
            <Button onClick={submit} disabled={!xs || !ys || locked}>
              Jawab
            </Button>
          </div>
          {msg && (
            <p role="status" className={cn("mt-3 rounded-lg px-3 py-2 text-sm font-medium", msg.ok ? "bg-emerald-50 text-emerald-900" : "animate-shake bg-rose-50 text-rose-900")}>
              {msg.text}
            </p>
          )}
        </Card>
        <Card className="p-4" aria-label="Tangga tingkat">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-ink-muted">
            <Mountain className="h-4 w-4" /> Tangga
          </p>
          <ol className="flex flex-col-reverse gap-1">
            {Array.from({ length: LEVELS }, (_, i) => i + 1).map((l) => (
              <li
                key={l}
                className={cn(
                  "rounded-md px-2 py-1 text-center text-xs font-bold",
                  l < level ? "bg-emerald-100 text-emerald-800" : l === level ? "bg-rose-500 text-white" : "bg-slate-100 text-ink-muted",
                )}
              >
                {l}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
