"use client";

import { ArrowLeft, PencilLine, Play, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Badge, Button, Card, DIFFICULTY_LABEL, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import { LESSONS } from "@/content/lessons";
import { PRACTICE_QUESTIONS } from "@/content/practice";
import type { Difficulty } from "@/lib/math/spldv";
import { shuffle } from "@/lib/math/spldv";
import { XP_RULES } from "@/lib/progress/gamification";
import { FORMAT_LABEL, TYPE_LABEL, type Question } from "@/lib/questions/types";
import { cn } from "@/lib/utils";

const DIFFS: Difficulty[] = ["mudah", "sedang", "sulit"];
const DIFF_STYLE: Record<Difficulty, string> = {
  mudah: "border-emerald-200 hover:border-emerald-400 data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-50",
  sedang: "border-amber-200 hover:border-amber-400 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-50",
  sulit: "border-rose-200 hover:border-rose-400 data-[active=true]:border-rose-500 data-[active=true]:bg-rose-50",
};

export default function LatihanPage() {
  const { state, record } = useProgress();
  const [difficulty, setDifficulty] = useState<Difficulty>("mudah");
  const [topic, setTopic] = useState<string>("semua");
  const [count, setCount] = useState<"5" | "10">("5");
  const [session, setSession] = useState<{ questions: Question[]; difficulty: Difficulty; key: number } | null>(null);

  const rewarded = useMemo(() => new Set(state.counters.rewardedQuestions), [state.counters.rewardedQuestions]);
  const pool = PRACTICE_QUESTIONS.filter((q) => q.difficulty === difficulty && (topic === "semua" || q.topic === topic));

  const start = () => {
    // utamakan soal yang belum pernah dijawab benar, agar latihan bervariasi
    const fresh = shuffle(Math.random, pool.filter((q) => !rewarded.has(q.id)));
    const old = shuffle(Math.random, pool.filter((q) => rewarded.has(q.id)));
    const questions = [...fresh, ...old].slice(0, Number(count));
    if (questions.length) setSession({ questions, difficulty, key: Date.now() });
  };

  if (session) {
    return (
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSession(null)}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke pilihan latihan
        </Button>
        <h1 className="mb-4 text-2xl font-extrabold text-ink">Latihan {DIFFICULTY_LABEL[session.difficulty]}</h1>
        <QuizRunner
          key={session.key}
          title={`Latihan ${DIFFICULTY_LABEL[session.difficulty]}`}
          questions={session.questions}
          onFinish={(answers) => record({ type: "practice", difficulty: session.difficulty, questionIds: session.questions.map((q) => q.id), answers })}
          onRestart={start}
          finishExtra={
            <Button onClick={() => setSession(null)}>
              <Play className="h-4 w-4" /> Latihan lain
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Latihan" title="Latihan Soal" icon={<PencilLine className="h-6 w-6" />} description="Pilih tingkat kesulitan dan modul. Setiap soal dilengkapi petunjuk bertahap, umpan balik, dan pembahasan." />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-bold text-ink">1. Tingkat kesulitan</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {DIFFS.map((d) => {
              const total = PRACTICE_QUESTIONS.filter((q) => q.difficulty === d).length;
              const solved = PRACTICE_QUESTIONS.filter((q) => q.difficulty === d && rewarded.has(q.id)).length;
              return (
                <button
                  key={d}
                  type="button"
                  data-active={difficulty === d}
                  aria-pressed={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  className={cn("rounded-xl border-2 bg-white p-4 text-left transition", DIFF_STYLE[d])}
                >
                  <p className="font-bold text-ink">{DIFFICULTY_LABEL[d]}</p>
                  <p className="text-xs text-ink-muted">+{XP_RULES.practicePerNewCorrect[d]} XP per soal baru</p>
                  <ProgressBar value={(solved / total) * 100} className="mt-3 h-1.5" color="emerald" label={`Soal ${d} yang sudah dikuasai`} />
                  <p className="mt-1 text-xs text-ink-muted">
                    {solved}/{total} dikuasai
                  </p>
                </button>
              );
            })}
          </div>

          <h2 className="mt-6 font-bold text-ink">2. Modul</h2>
          <label htmlFor="topic" className="sr-only">
            Pilih modul
          </label>
          <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200">
            <option value="semua">Semua modul</option>
            {LESSONS.map((l) => (
              <option key={l.id} value={l.id}>
                Modul {l.number}: {l.title}
              </option>
            ))}
          </select>

          <h2 className="mt-6 font-bold text-ink">3. Jumlah soal</h2>
          <div className="mt-2">
            <Segmented
              label="Jumlah soal"
              value={count}
              onChange={setCount}
              options={[
                { value: "5", label: "5 soal" },
                { value: "10", label: "10 soal" },
              ]}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">{pool.length === 0 ? "Belum ada soal untuk kombinasi ini. Pilih modul lain." : `${Math.min(pool.length, Number(count))} soal akan disajikan dari ${pool.length} soal tersedia.`}</p>
            <Button size="lg" onClick={start} disabled={pool.length === 0}>
              <Play className="h-5 w-5" /> Mulai Latihan
            </Button>
          </div>
        </Card>

        <Card className="h-fit">
          <h2 className="font-bold text-ink">Jenis soal</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.values(TYPE_LABEL).map((t) => (
              <Badge key={t} color="brand">
                {t}
              </Badge>
            ))}
            {(["langkah", "operasi", "penyelesaian", "cerita"] as const).map((f) => (
              <Badge key={f} color="grape">
                {FORMAT_LABEL[f]}
              </Badge>
            ))}
          </div>
          <h2 className="mt-6 font-bold text-ink">Aturan XP</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-grape-500" /> XP diberikan untuk soal yang <strong>pertama kali</strong> dijawab benar.
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-grape-500" /> Bonus +{XP_RULES.practiceSessionBonus} XP per sesi (maks. {XP_RULES.practiceSessionBonusDailyLimit} sesi per hari).
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-grape-500" /> Mengulang soal tetap bermanfaat untuk berlatih, meski tanpa XP tambahan.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
