"use client";

import { AlarmClock, ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Flag, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { QuestionView } from "@/components/quiz/question-view";
import { Badge, Button, Card, MathBlock, PageHeader, ProgressBar, Segmented, Spinner, StatCard } from "@/components/ui";
import { LESSON_BY_ID } from "@/content/lessons";
import type { EventOutcome, ProgressState } from "@/lib/progress/types";
import { isAnswerEmpty } from "@/lib/questions/grade";
import type { PublicQuestion } from "@/lib/questions/types";
import { newId } from "@/lib/storage/local";
import { cn, formatDuration } from "@/lib/utils";

interface ReviewItem {
  id: string;
  prompt: string;
  context?: string[];
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string[];
  topic: string;
}
interface EvalResult {
  correct: number;
  total: number;
  wrong: number;
  unanswered: number;
  score: number;
  review: ReviewItem[];
}

type Phase = "setup" | "loading" | "running" | "submitting" | "result";

export default function EvaluasiPage() {
  const { record, applyServerResult, state } = useProgress();
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState<"10" | "15" | "20" | "30">("15");
  const [timer, setTimer] = useState<"0" | "10" | "20" | "30">("20");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const startedAt = useRef(0);
  const eventId = useRef("");
  const submittedRef = useRef(false);

  const start = async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/evaluation/questions?count=${count}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { questions: PublicQuestion[] };
      setQuestions(data.questions);
      setAnswers({});
      setFlags({});
      setIndex(0);
      setResult(null);
      setXp(null);
      setConfirm(false);
      submittedRef.current = false;
      eventId.current = newId();
      startedAt.current = Date.now();
      setRemaining(Number(timer) * 60);
      setPhase("running");
    } catch {
      setError("Gagal memuat soal evaluasi. Periksa koneksi lalu coba lagi.");
      setPhase("setup");
    }
  };

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    const durationSec = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
    const questionIds = questions.map((q) => q.id);
    try {
      const res = await fetch("/api/evaluation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eventId.current, questionIds, answers, durationSec }),
      });
      const data = (await res.json()) as { result?: EvalResult; recorded?: boolean; state?: ProgressState; outcome?: EventOutcome; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Gagal menilai evaluasi.");
      setResult(data.result);
      setPhase("result");
      if (data.recorded && data.state && data.outcome) {
        applyServerResult(data.state, data.outcome);
        setXp(data.outcome.xpGained);
      } else {
        const o = await record({
          type: "evaluation",
          questionIds,
          answers,
          durationSec,
          result: { correct: data.result.correct, total: data.result.total, score: data.result.score },
        });
        setXp(o.xpGained);
      }
    } catch (err) {
      submittedRef.current = false;
      setError(err instanceof Error ? err.message : "Gagal mengirim jawaban.");
      setPhase("running");
    }
  }, [answers, questions, record, applyServerResult]);

  // Timer
  useEffect(() => {
    if (phase !== "running" || timer === "0") return;
    const t = setInterval(() => {
      const left = Number(timer) * 60 - Math.floor((Date.now() - startedAt.current) / 1000);
      setRemaining(Math.max(0, left));
    }, 500);
    return () => clearInterval(t);
  }, [phase, timer]);

  useEffect(() => {
    if (phase === "running" && timer !== "0" && remaining === 0 && startedAt.current) void submit();
  }, [remaining, phase, timer, submit]);

  // Peringatan saat meninggalkan halaman di tengah evaluasi
  useEffect(() => {
    if (phase !== "running") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  const answeredCount = questions.filter((q) => !isAnswerEmpty(q, answers[q.id])).length;

  // ------------------------------------------------------------------ SETUP
  if (phase === "setup" || phase === "loading") {
    return (
      <>
        <PageHeader eyebrow="Penilaian" title="Evaluasi Akhir" icon={<ClipboardCheck className="h-6 w-6" />} description="Uji pemahamanmu tentang seluruh materi SPLDV. Soal diacak dan mencakup semua modul." />
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <h2 className="font-bold text-ink">Atur evaluasi</h2>
            <p className="mt-4 text-sm font-semibold text-ink">Jumlah soal</p>
            <div className="mt-2">
              <Segmented
                label="Jumlah soal"
                value={count}
                onChange={setCount}
                options={[
                  { value: "10", label: "10" },
                  { value: "15", label: "15" },
                  { value: "20", label: "20" },
                  { value: "30", label: "30" },
                ]}
              />
            </div>
            <p className="mt-5 text-sm font-semibold text-ink">Batas waktu</p>
            <div className="mt-2">
              <Segmented
                label="Batas waktu"
                value={timer}
                onChange={setTimer}
                options={[
                  { value: "0", label: "Tanpa timer" },
                  { value: "10", label: "10 menit" },
                  { value: "20", label: "20 menit" },
                  { value: "30", label: "30 menit" },
                ]}
              />
            </div>
            <ul className="mt-6 space-y-2 text-sm text-ink-soft">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Kamu dapat berpindah soal dan menandai soal yang ingin diperiksa ulang.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Kunci jawaban tidak dikirim ke browser selama evaluasi; penilaian dilakukan server.
              </li>
              <li className="flex gap-2">
                <AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Jika waktu habis, jawaban dikirim otomatis.
              </li>
            </ul>
            {error && (
              <p className="mt-4 text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            )}
            <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={() => void start()} disabled={phase === "loading"}>
              {phase === "loading" ? <Spinner /> : <ClipboardCheck className="h-5 w-5" />} Mulai Evaluasi
            </Button>
          </Card>
          <Card className="h-fit">
            <h2 className="font-bold text-ink">Riwayat nilaimu</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard label="Terbaik" value={state.counters.evaluations ? state.counters.bestEvaluation : "—"} icon={<Flag className="h-4 w-4" />} tone="emerald" />
              <StatCard label="Terakhir" value={state.counters.lastEvaluation ?? "—"} icon={<ClipboardCheck className="h-4 w-4" />} />
            </div>
            <p className="mt-3 text-sm text-ink-muted">Kamu sudah mengerjakan evaluasi {state.counters.evaluations} kali. Nilai ≥ 75 membuka pencapaian &quot;Lulus Evaluasi&quot;.</p>
          </Card>
        </div>
      </>
    );
  }

  // ------------------------------------------------------------------ RESULT
  if (phase === "result" && result) {
    const pass = result.score >= 75;
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="animate-pop text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-muted">Hasil Evaluasi Akhir</p>
          <p className={cn("mt-2 text-6xl font-extrabold tabular-nums", pass ? "text-emerald-600" : "text-amber-600")}>{result.score}</p>
          <p className="mt-1 text-ink-muted">{pass ? "Luar biasa! Kamu sudah menguasai SPLDV." : "Terus berlatih — pelajari pembahasan di bawah."}</p>
          {xp !== null && <Badge color="grape" className="mt-3">+{xp} XP</Badge>}
          <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
            <StatCard label="Benar" value={result.correct} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
            <StatCard label="Salah" value={result.wrong} icon={<XCircle className="h-4 w-4" />} tone="rose" />
            <StatCard label="Kosong" value={result.unanswered} icon={<Flag className="h-4 w-4" />} tone="amber" />
          </div>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setPhase("setup")}>
              <RotateCcw className="h-4 w-4" /> Evaluasi lagi
            </Button>
          </div>
        </Card>

        <h2 className="mb-3 mt-8 text-xl font-bold text-ink">Pembahasan</h2>
        <ol className="space-y-4">
          {result.review.map((r, i) => (
            <li key={r.id}>
              <Card className={cn("border-l-4", r.isCorrect ? "border-l-emerald-500" : "border-l-rose-500")}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={r.isCorrect ? "emerald" : "rose"}>
                    {r.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} Soal {i + 1}
                  </Badge>
                  <Badge color="slate">Modul {LESSON_BY_ID[r.topic]?.number}</Badge>
                </div>
                <p className="mt-3 font-semibold text-ink">{r.prompt}</p>
                {r.context && <MathBlock lines={r.context} />}
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p className={cn("rounded-lg px-3 py-2", r.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900")}>
                    Jawabanmu: <strong>{r.userAnswer}</strong>
                  </p>
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
                    Jawaban benar: <strong>{r.correctAnswer}</strong>
                  </p>
                </div>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                  {r.explanation.map((e, j) => (
                    <li key={j}>{e}</li>
                  ))}
                </ol>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // ------------------------------------------------------------------ RUNNING
  const q = questions[index];
  const lowTime = timer !== "0" && remaining <= 60;
  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-ink">Evaluasi Akhir</h1>
          {timer !== "0" && (
            <span role="timer" aria-live="off" className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-lg font-bold", lowTime ? "animate-pulse bg-rose-100 text-rose-700" : "bg-brand-50 text-brand-700")}>
              <AlarmClock className="h-5 w-5" /> {formatDuration(remaining)}
            </span>
          )}
        </div>
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-sm text-ink-muted">
            <span>
              {answeredCount} dari {questions.length} soal terjawab
            </span>
            <span>Soal {index + 1}</span>
          </div>
          <ProgressBar value={(answeredCount / questions.length) * 100} label="Soal terjawab" />
        </div>
        {q && (
          <Card>
            <QuestionView key={q.id} question={q} number={index + 1} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} disabled={phase === "submitting"} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))} aria-pressed={!!flags[q.id]}>
                <Flag className={cn("h-4 w-4", flags[q.id] && "fill-amber-400 text-amber-500")} /> {flags[q.id] ? "Ditandai" : "Tandai"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIndex(index - 1)} disabled={index === 0}>
                  <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Sebelumnya</span>
                </Button>
                {index < questions.length - 1 ? (
                  <Button onClick={() => setIndex(index + 1)}>
                    <span className="hidden sm:inline">Berikutnya</span> <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => setConfirm(true)}>
                    <Send className="h-4 w-4" /> Kumpulkan
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
        {error && (
          <p className="mt-3 text-sm font-medium text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <aside>
        <Card className="lg:sticky lg:top-6">
          <h2 className="text-sm font-bold text-ink">Navigasi soal</h2>
          <div className="mt-3 grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {questions.map((qq, i) => {
              const answered = !isAnswerEmpty(qq, answers[qq.id]);
              return (
                <button
                  key={qq.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Soal ${i + 1}${answered ? ", sudah dijawab" : ""}${flags[qq.id] ? ", ditandai" : ""}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "relative h-9 rounded-lg text-sm font-bold transition",
                    i === index ? "ring-2 ring-brand-500 ring-offset-1" : "",
                    answered ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-soft hover:bg-slate-200",
                  )}
                >
                  {i + 1}
                  {flags[qq.id] && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-xs text-ink-muted">
            <p className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-brand-600" /> Sudah dijawab
            </p>
            <p className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" /> Ditandai
            </p>
          </div>
          <Button variant="success" className="mt-4 w-full" onClick={() => setConfirm(true)} disabled={phase === "submitting"}>
            {phase === "submitting" ? <Spinner /> : <Send className="h-4 w-4" />} Kumpulkan Jawaban
          </Button>
        </Card>
      </aside>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <Card className="w-full max-w-md animate-pop">
            <h2 id="confirm-title" className="text-lg font-bold text-ink">
              Kumpulkan jawaban?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {answeredCount < questions.length ? (
                <>
                  Masih ada <strong>{questions.length - answeredCount} soal</strong> yang belum dijawab. Soal kosong dihitung salah.
                </>
              ) : (
                "Semua soal sudah dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah."
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)} autoFocus>
                Periksa lagi
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  setConfirm(false);
                  void submit();
                }}
              >
                Ya, kumpulkan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
