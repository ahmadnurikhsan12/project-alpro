"use client";

import { ArrowLeft, Gamepad2, Play, RotateCcw, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { Badge, Button, ButtonLink, Card, DIFFICULTY_LABEL, ProgressBar, Segmented } from "@/components/ui";
import type { GameMeta } from "@/content/games";
import type { Difficulty } from "@/lib/math/spldv";
import type { EventOutcome } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

export interface GameResult {
  score: number;
  correct: number;
  total: number;
  summary?: string;
}

export interface GameProps {
  difficulty: Difficulty;
  onFinish: (r: GameResult) => void;
}

function feedbackText(p: number) {
  if (p >= 90) return "Luar biasa! Kamu benar-benar menguasainya.";
  if (p >= 70) return "Hebat! Sedikit lagi menuju sempurna.";
  if (p >= 40) return "Lumayan! Terus berlatih untuk skor lebih tinggi.";
  return "Jangan menyerah! Coba pelajari lagi materinya lalu main kembali.";
}

export function GameShell({ meta, render }: { meta: GameMeta; render: (p: GameProps) => ReactNode }) {
  const { record, state } = useProgress();
  const [phase, setPhase] = useState<"intro" | "play" | "result">("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("mudah");
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<EventOutcome | null>(null);
  const startedAt = useRef(0);

  const start = () => {
    setRound((r) => r + 1);
    setResult(null);
    setOutcome(null);
    startedAt.current = Date.now();
    setPhase("play");
  };

  const finish = async (r: GameResult) => {
    const score = Math.max(0, Math.min(meta.maxScore, Math.round(r.score)));
    const res = { ...r, score };
    setResult(res);
    setPhase("result");
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    const o = await record({ type: "game", gameId: meta.id, difficulty, score, correct: r.correct, total: r.total, durationSec });
    setOutcome(o);
  };

  const best = state.counters.gamesBest[meta.id];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/games" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Semua game
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-grape-600">{meta.mechanic}</p>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{meta.title}</h1>
        </div>
        {phase === "play" && (
          <div className="flex items-center gap-2">
            <Badge color="grape">{DIFFICULTY_LABEL[difficulty]}</Badge>
            <Button size="sm" variant="ghost" onClick={() => setPhase("intro")}>
              Keluar
            </Button>
          </div>
        )}
      </div>

      {phase === "intro" && (
        <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <Card>
            <h2 className="font-bold text-ink">Petunjuk permainan</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
              {meta.howTo.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
            <h2 className="mt-5 font-bold text-ink">Aturan &amp; skor</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              {meta.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
              <li>{meta.scoring}</li>
            </ul>
          </Card>
          <Card className="h-fit">
            <h2 className="font-bold text-ink">Tingkat kesulitan</h2>
            <div className="mt-3">
              <Segmented
                label="Tingkat kesulitan"
                value={difficulty}
                onChange={setDifficulty}
                options={[
                  { value: "mudah", label: "Mudah" },
                  { value: "sedang", label: "Sedang" },
                  { value: "sulit", label: "Sulit" },
                ]}
              />
            </div>
            <p className="mt-2 text-sm text-ink-muted">{meta.difficultyNote[difficulty]}</p>
            {best !== undefined && (
              <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-soft">
                <Trophy className="h-4 w-4 text-amber-500" /> Skor terbaikmu: <strong>{best}%</strong>
              </p>
            )}
            <Button size="lg" className="mt-5 w-full" onClick={start}>
              <Play className="h-5 w-5" /> Mulai Main
            </Button>
          </Card>
        </div>
      )}

      {phase === "play" && <div key={round}>{render({ difficulty, onFinish: (r) => void finish(r) })}</div>}

      {phase === "result" && result && (
        <Card className="animate-pop text-center">
          <div className="mx-auto mb-3 inline-flex rounded-2xl bg-amber-50 p-4 text-amber-500">
            <Trophy className="h-9 w-9" />
          </div>
          <h2 className="text-xl font-extrabold text-ink">Permainan selesai!</h2>
          <p className="mt-4 text-5xl font-extrabold tabular-nums text-brand-700">{result.score}</p>
          <p className="text-sm text-ink-muted">poin (target {meta.targetScore})</p>
          <ProgressBar value={(result.score / meta.targetScore) * 100} className="mx-auto mt-4 max-w-xs" label="Persentase skor" />
          <p className="mt-4 text-ink-soft">{feedbackText((result.score / meta.targetScore) * 100)}</p>
          {result.summary && <p className="mt-1 text-sm text-ink-muted">{result.summary}</p>}
          <p className={cn("mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-grape-700")}>
            <Sparkles className="h-4 w-4" /> {outcome ? `+${outcome.xpGained} XP` : "Menyimpan hasil..."}
          </p>
          {outcome?.message && <p className="mt-1 text-xs text-ink-muted">{outcome.message}</p>}
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" /> Main lagi
            </Button>
            <Button variant="outline" onClick={() => setPhase("intro")}>
              Ganti tingkat kesulitan
            </Button>
            <ButtonLink href="/games" variant="ghost">
              <Gamepad2 className="h-4 w-4" /> Game lain
            </ButtonLink>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Kepala ronde: info ronde & skor berjalan */
export function GameHud({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm">
          <span className="text-ink-muted">{i.label}: </span>
          <strong className="tabular-nums text-ink">{i.value}</strong>
        </div>
      ))}
    </div>
  );
}
