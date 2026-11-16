"use client";

import { ArrowRight, Eye, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { HintLadder } from "@/components/tutor/hint-ladder";
import { MediatorMessage } from "@/components/tutor/mediator-message";
import { TransferCard } from "@/components/tutor/transfer-card";
import { Button, Card, ProgressBar } from "@/components/ui";
import { TRANSFER_BY_SKILL } from "@/content/mediation";
import { previewQuestionXp } from "@/lib/progress/gamification";
import type { EventOutcome, QuestionResponse } from "@/lib/progress/types";
import { formatCorrectAnswer, gradeAnswer, isAnswerEmpty } from "@/lib/questions/grade";
import type { Question } from "@/lib/questions/types";
import { buildLadder } from "@/lib/tutor/ladder";
import { mediate } from "@/lib/tutor/mediate";
import { resolveMediation } from "@/lib/tutor/resolve";
import { cn } from "@/lib/utils";
import { Feedback, QuestionView } from "./question-view";

interface Props {
  questions: Question[];
  title: string;
  passScore?: number;
  /** Awalan kunci statistik soal: "lesson:" untuk Mini Quiz, kosong untuk Latihan. */
  statKeyPrefix?: string;
  onFinish: (answers: Record<string, string>, responses: Record<string, QuestionResponse>) => Promise<EventOutcome | void>;
  onRestart?: () => void;
  finishExtra?: ReactNode;
}

interface QState {
  /** Jawaban yang sudah diperiksa, berurutan. */
  attempts: string[];
  /** Petunjuk bertingkat yang sudah dibuka (0–4). */
  hints: number;
  /** Pilihan ganda: alasan yang dipilih sebelum percobaan ulang. */
  reason?: string;
  gaveUp?: boolean;
  /** Benar/Salah: pembahasan dibuka lewat tombol. */
  revealed?: boolean;
}
const EMPTY: QState = { attempts: [], hints: 0 };

const REASONS = [
  { id: "konsep", label: "Saya belum yakin dengan konsepnya", nudge: "Buka Petunjuk 1 dan 2 untuk memikirkan kembali konsepnya, lalu pilih ulang." },
  { id: "teliti", label: "Saya kurang teliti membaca atau menghitung", nudge: "Baca soal sekali lagi dan uji tiap pilihan dengan menghitung, bukan menebak." },
  { id: "menebak", label: "Saya menebak", nudge: "Sebelum memilih lagi, singkirkan satu pilihan dengan alasan matematis." },
] as const;

function xpNote(percent: number, alreadyRewarded: boolean): string {
  if (alreadyRewarded) return "Soal ini sudah pernah memberi XP, jadi tidak ada XP tambahan. Progres belajarmu tetap tercatat.";
  if (percent >= 100) return "XP soal ini: 100%.";
  if (percent > 0) return `XP soal ini: ${percent}% (benar pada percobaan ke-2).`;
  return "Tidak ada XP tambahan untuk percobaan ke-3 atau lebih, tetapi soal ini tercatat benar.";
}

/**
 * Menjalankan sekumpulan soal Latihan/Mini Quiz dengan pendampingan bertahap:
 * jawaban salah tidak langsung membuka jawaban — siswa mendapat tanggapan, tangga petunjuk
 * (L1–L4), dan kesempatan memperbaiki sesuai batas percobaan tipe soalnya.
 */
export function QuizRunner({ questions, title, passScore, statKeyPrefix = "", onFinish, onRestart, finishExtra }: Props) {
  const { state: progress } = useProgress();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({});
  const [qs, setQs] = useState<Record<string, QState>>({});
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<EventOutcome | null>(null);

  const q = questions[index];
  const st = (q && qs[q.id]) || EMPTY;
  const ladder = useMemo(() => (q ? buildLadder(q) : []), [q]);
  const resolved = useMemo(() => (q ? resolveMediation(q) : null), [q]);
  const result = useMemo(() => (q && st.attempts.length ? mediate(q, { attempts: st.attempts, hints: st.hints }) : null), [q, st.attempts, st.hints]);

  const solved = result?.status === "correct";
  const exhausted = result?.status === "exhausted";
  const done = solved || exhausted || !!st.gaveUp;
  const revealed = solved || st.gaveUp || (exhausted && (result?.revealExplanation || st.revealed));
  const gatePending = !!result?.gate && !st.reason;
  const wrongPicks = q && (q.type === "mcq" || q.type === "tf") ? st.attempts.filter((a) => !gradeAnswer(q, a)) : [];

  const solvedFor = (qq: Question) => {
    const s = qs[qq.id];
    const last = s?.attempts[s.attempts.length - 1];
    return last !== undefined && gradeAnswer(qq, last);
  };
  const solvedCount = questions.filter(solvedFor).length;
  const independentCount = questions.filter((qq) => {
    const s = qs[qq.id];
    return !!s && s.hints === 0 && s.attempts.length > 0 && gradeAnswer(qq, s.attempts[0]);
  }).length;

  const patch = (id: string, change: Partial<QState>) => setQs((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), ...change } }));

  const check = () => {
    if (!q || done || gatePending) return;
    const a = answers[q.id];
    if (a === undefined || isAnswerEmpty(q, a)) return;
    const nextAttempts = [...st.attempts, a];
    patch(q.id, { attempts: nextAttempts, reason: undefined });
    // pilihan ganda: pilihan yang salah tidak boleh dipakai lagi, jadi kosongkan pilihan
    if (q.type === "mcq" && !gradeAnswer(q, a)) setAnswers((prev) => ({ ...prev, [q.id]: undefined }));
  };

  const openHint = (level: number) => q && patch(q.id, { hints: Math.max(st.hints, level) });

  const next = async () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    const responses: Record<string, QuestionResponse> = {};
    const finalAnswers: Record<string, string> = {};
    for (const qq of questions) {
      const s = qs[qq.id];
      if (!s || (s.attempts.length === 0 && s.hints === 0)) continue;
      responses[qq.id] = { attempts: s.attempts, hints: s.hints };
      if (s.attempts.length) finalAnswers[qq.id] = s.attempts[s.attempts.length - 1];
    }
    setFinished(true);
    setSaving(true);
    try {
      const o = await onFinish(finalAnswers, responses);
      if (o) setOutcome(o);
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setAnswers({});
    setQs({});
    setFinished(false);
    setOutcome(null);
    onRestart?.();
  };

  if (finished) {
    const score = Math.round((solvedCount / questions.length) * 100);
    const passed = passScore === undefined || score >= passScore;
    return (
      <Card className="animate-pop text-center">
        <div className={cn("mx-auto mb-3 inline-flex rounded-2xl p-4", passed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
          <Trophy className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-extrabold text-ink">{title} selesai!</h3>
        <p className="mt-1 text-ink-muted">
          Kamu menjawab benar <strong className="text-ink">{solvedCount}</strong> dari {questions.length} soal.
        </p>
        <p className={cn("mt-4 text-5xl font-extrabold tabular-nums", passed ? "text-emerald-600" : "text-amber-600")}>{score}</p>
        {passScore !== undefined && <p className="mt-1 text-sm text-ink-muted">{passed ? "Lulus! " : `Nilai minimal ${passScore}. `}</p>}
        <p className="mt-1 text-sm text-ink-muted">
          Mandiri: <strong className="text-ink">{independentCount}</strong> dari {questions.length} soal (benar pada percobaan pertama tanpa petunjuk).
        </p>
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

  if (!q || !resolved) return null;

  const key = `${statKeyPrefix}${q.id}`;
  const preview = solved ? previewQuestionXp(progress.counters.questionStats[key], progress.counters.rewardedQuestions.includes(key), st.attempts.length) : null;
  const transfer = solved && resolved.authored ? (resolved.authored.transfer ?? TRANSFER_BY_SKILL[resolved.skill]) : undefined;
  const lastWrong = !done && st.attempts.length > 0;
  const canCheck = answers[q.id] !== undefined && !isAnswerEmpty(q, answers[q.id]) && !gatePending;
  const reason = REASONS.find((r) => r.id === st.reason);

  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <span className="shrink-0 text-sm font-semibold text-ink-muted">
          {index + 1}/{questions.length}
        </span>
        <ProgressBar value={((index + (done ? 1 : 0)) / questions.length) * 100} label="Progres pengerjaan" />
        <span className="shrink-0 text-sm font-semibold text-emerald-700">{solvedCount} benar</span>
      </div>

      {lastWrong && result && (
        <p className="mb-2 text-xs font-semibold text-ink-muted" data-testid="attempt-indicator">
          Percobaan {Math.min(result.attemptNo + 1, result.limit)} dari {result.limit}
        </p>
      )}

      <QuestionView
        key={`soal-${q.id}`}
        question={q}
        number={index + 1}
        value={answers[q.id]}
        onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
        disabled={done || gatePending}
        reveal={revealed ? { correctAnswer: q.answer, isCorrect: !!solved } : null}
        wrongPicks={wrongPicks}
        wrong={lastWrong}
      />

      {/* Tanggapan pendamping atas jawaban yang belum tepat */}
      {result && result.status !== "correct" && <MediatorMessage result={result} />}

      {/* Pilihan ganda: alasan dulu sebelum mencoba lagi */}
      {gatePending && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" data-testid="reason-gate">
          <p id="gate-label" className="text-sm font-bold text-ink">
            Sebelum mencoba lagi: mengapa menurutmu pilihanmu belum tepat?
          </p>
          <div role="radiogroup" aria-labelledby="gate-label" className="mt-2 grid gap-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={false}
                onClick={() => patch(q.id, { reason: r.id })}
                className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium hover:border-brand-300"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {reason && !done && <p className="mt-3 text-sm text-ink-soft">{reason.nudge}</p>}

      {/* Tangga petunjuk: tersedia sebelum dan sesudah menjawab, selama soal belum selesai */}
      {!done && <HintLadder key={`petunjuk-${q.id}`} steps={ladder} opened={st.hints} onOpen={openHint} />}

      {/* Soal selesai: pembahasan (setelah benar / kesempatan habis / menyerah) */}
      {revealed && <Feedback solved={!!solved} correctAnswer={formatCorrectAnswer(q)} explanation={q.explanation} message={result?.status === "correct" ? result.message : undefined} />}
      {preview && (
        <p className="mt-2 text-xs font-medium text-grape-700" data-testid="xp-note">
          {xpNote(preview.percent, preview.alreadyRewarded)}
        </p>
      )}
      {transfer && <TransferCard key={`transfer-${q.id}`} prompt={transfer} />}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {!done && result?.giveUpAllowed && (
            <Button variant="ghost" size="sm" onClick={() => patch(q.id, { gaveUp: true })}>
              <Eye className="h-4 w-4" /> Lewati dan lihat pembahasan
            </Button>
          )}
          {exhausted && !revealed && (
            <Button variant="outline" size="sm" onClick={() => patch(q.id, { revealed: true })}>
              <Eye className="h-4 w-4" /> Lihat pembahasan
            </Button>
          )}
        </div>
        {!done ? (
          <Button onClick={check} disabled={!canCheck}>
            {st.attempts.length === 0 ? "Periksa Jawaban" : "Periksa Lagi"}
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
