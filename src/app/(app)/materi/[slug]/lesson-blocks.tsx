"use client";

import { Brain, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { ReflectionForm } from "@/components/lab/reflection-form";
import { useProgress } from "@/components/providers/progress-provider";
import { cn } from "@/lib/utils";

/**
 * "Pikirkan dulu": siswa memprediksi atau memilih alasan SEBELUM melihat penjelasan.
 * Tidak dinilai, tidak ada XP; hanya membuka penjelasan yang mengaitkan jawaban dengan alasan matematisnya.
 */
export function ThinkBlock({ question, options, correct, explain }: { question: string; options: string[]; correct: number; explain: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div data-testid="think-block" className="my-4 rounded-xl border border-brand-200 bg-white p-4">
      <p className="flex items-start gap-2 font-bold text-ink">
        <Brain className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <span>
          <span className="block text-xs font-bold uppercase tracking-wider text-brand-600">Pikirkan dulu</span>
          {question}
        </span>
      </p>
      <div role="radiogroup" aria-label={question} className="mt-3 grid gap-2">
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={picked === i}
            disabled={picked !== null}
            onClick={() => setPicked(i)}
            className={cn(
              "rounded-xl border-2 px-3 py-2 text-left text-sm transition disabled:cursor-default",
              picked === null ? "border-slate-200 hover:border-brand-300" : i === correct ? "border-emerald-400 bg-emerald-50" : picked === i ? "border-rose-300 bg-rose-50" : "border-slate-200 opacity-70",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div role="status" data-testid="think-feedback" className={cn("mt-3 flex gap-2 rounded-lg px-3 py-2 text-sm", picked === correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900")}>
          {picked === correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>
            <strong>{picked === correct ? "Prediksimu sesuai. " : "Belum sesuai, dan itu tidak apa-apa. "}</strong>
            {explain}
          </span>
        </div>
      )}
    </div>
  );
}

/** Refleksi singkat di akhir materi (pilihan/skala, 0 XP, boleh dilewati). */
export function LessonReflection({ lessonId }: { lessonId: string }) {
  const { record } = useProgress();
  const [state, setState] = useState<null | "terkirim" | "dilewati">(null);
  return state === null ? (
    <ReflectionForm
      context="lesson"
      promptIds={["penjelasan_sendiri", "representasi_membantu", "bagian_sulit", "keyakinan"]}
      onSubmit={(responses) => {
        setState("terkirim");
        void record({ type: "reflection", context: "lesson", refId: lessonId, responses });
      }}
      onSkip={() => {
        setState("dilewati");
        void record({ type: "reflection", context: "lesson", refId: lessonId, responses: {}, skipped: true });
      }}
    />
  ) : (
    <p role="status" data-testid="lesson-reflection-done" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      {state === "terkirim" ? "Terima kasih, refleksimu tersimpan." : "Refleksi dilewati. Kamu bisa mengisinya lain kali."}
    </p>
  );
}
