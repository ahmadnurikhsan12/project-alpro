"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Download, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ResultsCard } from "@/components/research/results-card";
import { ParticipantCard } from "@/components/research/participant-card";
import { QuestionView } from "@/components/quiz/question-view";
import { Badge, Button, ButtonLink, Card, PageHeader, ProgressBar, Spinner } from "@/components/ui";
import { ASSESSMENT_KIND_LABEL, formsFor, type AssessmentKind, type AssessmentSkill, type FormId } from "@/lib/assessment/blueprint";
import { isAnswerEmpty } from "@/lib/questions/grade";
import type { PublicQuestion } from "@/lib/questions/types";
import { addAssessment, loadResearch, newRecordId, type AssessmentRecord, type ResearchData } from "@/lib/research/store";
import { formatDuration } from "@/lib/utils";

interface ServerResult {
  form: FormId;
  correct: number;
  total: number;
  score: number;
  items: { id: string; slot: number; skill: AssessmentSkill; correct: 0 | 1; answered: 0 | 1 }[];
  bySkill: Record<AssessmentSkill, { correct: number; total: number }>;
}

type Phase = "menu" | "loading" | "running" | "submitting" | "done";

const draftKey = (kind: AssessmentKind) => `mathquest.assess.draft.${kind}`;

export default function AsesmenPage() {
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [kind, setKind] = useState<AssessmentKind>("pretest");
  const [form, setForm] = useState<FormId>("A");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<AssessmentRecord | null>(null);
  const startedAt = useRef(0);
  const submitting = useRef(false);

  const refresh = useCallback(() => setResearch(loadResearch()), []);
  const code = research?.participant?.code;
  const forms = code ? formsFor(code) : null;

  // pulihkan jawaban sementara bila halaman dimuat ulang saat sedang mengerjakan
  const saveDraft = useCallback((k: AssessmentKind, f: FormId, a: Record<string, string>, started: number) => {
    try {
      sessionStorage.setItem(draftKey(k), JSON.stringify({ form: f, answers: a, startedAt: started }));
    } catch {
      /* abaikan */
    }
  }, []);

  const start = async (k: AssessmentKind) => {
    if (!forms || !research) return;
    const f = forms[k];
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/assessment/questions?form=${f}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { questions: PublicQuestion[] };
      let restored: { answers: Record<string, string>; startedAt: number } | null = null;
      try {
        const raw = sessionStorage.getItem(draftKey(k));
        const d = raw ? (JSON.parse(raw) as { form: FormId; answers: Record<string, string>; startedAt: number }) : null;
        if (d && d.form === f) restored = d;
      } catch {
        /* abaikan */
      }
      setKind(k);
      setForm(f);
      setQuestions(data.questions);
      setAnswers(restored?.answers ?? {});
      setIndex(0);
      setConfirm(false);
      submitting.current = false;
      startedAt.current = restored?.startedAt ?? Date.now();
      saveDraft(k, f, restored?.answers ?? {}, startedAt.current);
      setPhase("running");
    } catch {
      setError("Gagal memuat soal. Periksa koneksi internet lalu coba lagi. Soal asesmen hanya dapat dimuat saat online.");
      setPhase("menu");
    }
  };

  const setAnswer = (id: string, v: string) => {
    setAnswers((a) => {
      const next = { ...a, [id]: v };
      saveDraft(kind, form, next, startedAt.current);
      return next;
    });
    setConfirm(false);
  };

  const unanswered = questions.filter((q) => isAnswerEmpty(q, answers[q.id])).length;

  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setPhase("submitting");
    setError(null);
    try {
      const payload: Record<string, string> = {};
      for (const q of questions) if (!isAnswerEmpty(q, answers[q.id])) payload[q.id] = answers[q.id];
      const res = await fetch("/api/assessment/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ form, answers: payload }) });
      if (!res.ok) throw new Error();
      const { result } = (await res.json()) as { result: ServerResult };
      const meta = Object.fromEntries(questions.map((q) => [q.id, q]));
      const rec: AssessmentRecord = {
        id: newRecordId(),
        kind,
        form,
        completedAt: new Date().toISOString(),
        durationSec: Math.max(1, Math.min(60 * 60 * 3, Math.round((Date.now() - startedAt.current) / 1000))),
        correct: result.correct,
        total: result.total,
        score: result.score,
        bySkill: result.bySkill,
        items: result.items.map((it) => ({
          id: it.id,
          slot: it.slot,
          skill: it.skill,
          difficulty: meta[it.id]?.difficulty ?? "",
          type: meta[it.id]?.type ?? "",
          answer: payload[it.id] ?? "",
          correct: it.correct,
          answered: it.answered,
        })),
      };
      const saved = addAssessment(rec);
      if (!saved.ok) {
        setError(saved.message ?? "Hasil belum tersimpan.");
        submitting.current = false;
        setPhase("running");
        return;
      }
      try {
        sessionStorage.removeItem(draftKey(kind));
      } catch {
        /* abaikan */
      }
      setDone(rec);
      refresh();
      setPhase("done");
    } catch {
      submitting.current = false;
      setError("Jawaban belum terkirim. Periksa koneksi internet lalu tekan Kirim lagi. Jawabanmu masih tersimpan di halaman ini.");
      setPhase("running");
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  const q = questions[index];
  const pre = research?.assessments.find((a) => a.kind === "pretest");

  return (
    <>
      <PageHeader eyebrow="Uji coba" title="Asesmen: Pretest & Posttest" description="Mengukur pemahaman SPLDV sebelum dan sesudah memakai MathQuest." icon={<ClipboardList className="h-6 w-6" />} />

      {phase === "menu" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <ParticipantCard onChange={setResearch} />
          <div className="space-y-4">
            <Card>
              <h2 className="font-bold text-ink">Sebelum mulai</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
                <li>12 soal, sekitar 20 menit. Kerjakan sendiri, tanpa bantuan.</li>
                <li>Tidak ada petunjuk dan tidak ada kunci jawaban setelahnya. Hasil tidak mengubah XP.</li>
                <li>Hanya dapat dikerjakan satu kali per jenis. Pretest sebelum belajar, posttest setelah belajar.</li>
                <li>Soal dimuat dari internet. Jawabanmu dinilai di server; tidak ada data pribadi yang dikirim.</li>
              </ul>
            </Card>
            {(["pretest", "posttest"] as const).map((k) => {
              const rec = research?.assessments.find((a) => a.kind === k);
              return (
                <Card key={k} data-testid={`asesmen-${k}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-ink">{ASSESSMENT_KIND_LABEL[k]}</h3>
                      <p className="text-sm text-ink-muted">{rec ? `Selesai · ${new Date(rec.completedAt).toLocaleDateString("id-ID")}` : "Belum dikerjakan"}</p>
                    </div>
                    {rec ? (
                      <Badge color="emerald">
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Selesai
                      </Badge>
                    ) : (
                      <Button disabled={!code} onClick={() => void start(k)}>
                        Mulai {k === "pretest" ? "Pretest" : "Posttest"}
                      </Button>
                    )}
                  </div>
                  {!code && !rec && <p className="mt-2 text-xs text-ink-muted">Buat atau isi kode peserta dulu.</p>}
                  {k === "posttest" && !rec && !pre && code && <p className="mt-2 text-xs text-amber-700">Pretest belum dikerjakan. Posttest tetap bisa dikerjakan, tetapi perbandingan tidak tersedia.</p>}
                </Card>
              );
            })}
            {research && research.assessments.length > 0 && <ResultsCard assessments={research.assessments} />}
            {research && research.assessments.length > 0 && (
              <ButtonLink href="/ekspor" variant="outline">
                <Download className="h-4 w-4" /> Ekspor data (CSV)
              </ButtonLink>
            )}
            {error && (
              <p role="alert" className="text-sm font-medium text-rose-700">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {(phase === "loading" || phase === "submitting") && (
        <Card className="flex items-center justify-center gap-3 py-12 text-ink-soft" role="status">
          <Spinner /> {phase === "loading" ? "Memuat soal..." : "Menilai jawaban..."}
        </Card>
      )}

      {phase === "running" && q && (
        <div className="mx-auto max-w-3xl space-y-4" data-testid="asesmen-running">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge color="brand">{ASSESSMENT_KIND_LABEL[kind]}</Badge>
            <span className="text-sm text-ink-muted" aria-live="polite">
              {questions.length - unanswered} dari {questions.length} soal terjawab
            </span>
          </div>
          <ProgressBar value={((index + 1) / questions.length) * 100} label="Kemajuan" />
          <Card>
            <p className="mb-3 text-sm font-semibold text-brand-700">
              Soal {index + 1} dari {questions.length}
            </p>
            <QuestionView key={q.id} question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} showMeta={false} />
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              <ArrowLeft className="h-4 w-4" /> Sebelumnya
            </Button>
            {index < questions.length - 1 ? (
              <Button onClick={() => setIndex(index + 1)}>
                Berikutnya <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <Card className="border-brand-200 bg-brand-50/40">
            {confirm && unanswered > 0 ? (
              <p role="alert" className="mb-3 text-sm font-medium text-amber-900">
                Masih ada {unanswered} soal belum terjawab. Soal kosong dinilai salah. Tekan &quot;Kirim jawaban&quot; sekali lagi jika yakin.
              </p>
            ) : null}
            <Button
              onClick={() => {
                if (unanswered > 0 && !confirm) return setConfirm(true);
                void submit();
              }}
            >
              <Send className="h-4 w-4" /> Kirim jawaban
            </Button>
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
                {error}
              </p>
            )}
          </Card>
        </div>
      )}

      {phase === "done" && done && (
        <Card className="mx-auto max-w-2xl text-center" data-testid="asesmen-done">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-xl font-extrabold text-ink">{done.kind === "pretest" ? "Pretest selesai" : "Posttest selesai"}</h2>
          <p className="mt-1 text-sm text-ink-muted">Hasil tersimpan di perangkat ini. Lama mengerjakan: {formatDuration(done.durationSec)}.</p>
          <p className="mt-4 text-5xl font-extrabold tabular-nums text-brand-700" data-testid={`${done.kind}-score`}>
            {done.score}
          </p>
          <p className="text-sm text-ink-muted">
            {done.correct} dari {done.total} soal benar
            {done.kind === "posttest" && pre ? ` · pretest ${pre.score} → posttest ${done.score}` : ""}
          </p>
          {done.kind === "pretest" && <p className="mt-2 text-sm text-ink-soft">Ini gambaran awalmu, bukan nilai. Selamat belajar di MathQuest, lalu kerjakan posttest setelah selesai belajar.</p>}
          <div className="mt-4 text-left">
            <ResultsCard assessments={[...(research?.assessments.filter((x) => x.id !== done.id) ?? []), done]} title="Hasil per kompetensi" />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => setPhase("menu")}>
              Kembali ke menu asesmen
            </Button>
            <ButtonLink href="/ekspor" variant="ghost">
              <Download className="h-4 w-4" /> Ekspor data
            </ButtonLink>
          </div>
        </Card>
      )}
    </>
  );
}
