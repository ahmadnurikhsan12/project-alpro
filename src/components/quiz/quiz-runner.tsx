"use client";

import { ArrowRight, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Card, ProgressBar } from "@/components/ui";
import type { EventOutcome } from "@/lib/progress/types";
import { formatCorrectAnswer, gradeAnswer, isAnswerEmpty } from "@/lib/questions/grade";
import type { Question } from "@/lib/questions/types";
import { cn } from "@/lib/utils";
import { Feedback, HintBox, QuestionView } from "./question-view";

interface Props {
  questions: Question[];
  title: string;
  passScore?: number;
  onFinish: (answers: Record<string, string>) => Promise<EventOutcome | void>;
  onRestart?: () => void;
  finishExtra?: ReactNode;
}

/**
 * Menjalankan sekumpulan soal dengan umpan balik langsung per soal,
 * petunjuk bertahap, dan ringkasan di akhir.
 */
export function QuizRunner({ questions, title, passScore, onFinish, onRestart, finishExtra }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<EventOutcome | null>(null);

  const q = questions[index];
  const isChecked = q ? checked[q.id] !== undefined : false;
  const correctCount = Object.values(checked).filter(Boolean).length;

  const check = () => {
    if (!q || isAnswerEmpty(q, answers[q.id])) return;
    setChecked((c) => ({ ...c, [q.id]: gradeAnswer(q, answers[q.id]) }));
  };

  const next = async () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    setFinished(true);
    setSaving(true);
    try {
      const o = await onFinish(answers);
      if (o) setOutcome(o);
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setAnswers({});
    setChecked({});
    setFinished(false);
    setOutcome(null);
    onRestart?.();
  };

  if (finished) {
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = passScore === undefined || score >= passScore;
    return (
      <Card className="animate-pop text-center">
        <div className={cn("mx-auto mb-3 inline-flex rounded-2xl p-4", passed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
          <Trophy className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-extrabold text-ink">{title} selesai!</h3>
        <p className="mt-1 text-ink-muted">
          Kamu menjawab benar <strong className="text-ink">{correctCount}</strong> dari {questions.length} soal.
        </p>
        <p className={cn("mt-4 text-5xl font-extrabold tabular-nums", passed ? "text-emerald-600" : "text-amber-600")}>{score}</p>
        {passScore !== undefined && (
          <p className="mt-1 text-sm text-ink-muted">{passed ? "Lulus! " : `Nilai minimal ${passScore}. `}</p>
        )}
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-grape-700">
          <Sparkles className="h-4 w-4" />
          {saving ? "Menyimpan hasil..." : outcome ? `+${outcome.xpGained} XP` : "Hasil tersimpan"}
        </p>
        {outcome?.message && <p className="mt-1 text-sm text-ink-muted">{outcome.message}</p>}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Ulangi
          </Button>
          {finishExtra}
        </div>
      </Card>
    );
  }

  if (!q) return null;

  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <span className="shrink-0 text-sm font-semibold text-ink-muted">
          {index + 1}/{questions.length}
        </span>
        <ProgressBar value={((index + (isChecked ? 1 : 0)) / questions.length) * 100} label="Progres pengerjaan" />
        <span className="shrink-0 text-sm font-semibold text-emerald-700">{correctCount} benar</span>
      </div>

      <QuestionView
        key={q.id}
        question={q}
        number={index + 1}
        value={answers[q.id]}
        onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
        disabled={isChecked}
        reveal={isChecked ? { correctAnswer: q.answer, isCorrect: checked[q.id] } : null}
      />

      {!isChecked && <HintBox key={`h-${q.id}`} hints={q.hints} />}
      {isChecked && <Feedback isCorrect={checked[q.id]} correctAnswer={formatCorrectAnswer(q)} explanation={q.explanation} />}

      <div className="mt-6 flex justify-end">
        {!isChecked ? (
          <Button onClick={check} disabled={isAnswerEmpty(q, answers[q.id])}>
            Periksa Jawaban
          </Button>
        ) : (
          <Button onClick={() => void next()}>
            {index < questions.length - 1 ? "Soal Berikutnya" : "Lihat Hasil"} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
