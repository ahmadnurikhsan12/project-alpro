"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { copyFor } from "@/content/reflection-copy";
import { REFLECTION_PROMPTS, type ReflectionContext, type ReflectionValue } from "@/lib/tutor/reflection-prompts";
import { cn } from "@/lib/utils";

/**
 * Formulir refleksi: hanya pilihan/skala (tanpa teks bebas), selalu dapat dilewati, 0 XP.
 * Prompt diambil dari registri sehingga jawaban pasti lolos validasi.
 */
export function ReflectionForm({
  context,
  promptIds,
  onSubmit,
  onSkip,
}: {
  context: ReflectionContext;
  promptIds: string[];
  onSubmit: (responses: Record<string, ReflectionValue>) => void;
  onSkip: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, ReflectionValue>>({});
  const prompts = promptIds
    .map((id) => REFLECTION_PROMPTS.find((p) => p.id === id && p.context === context))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div data-testid="reflection-form" className="space-y-5">
      {prompts.map((p) => {
        const copy = copyFor(context, p.id);
        if (!copy) return null;
        return (
          <fieldset key={p.id}>
            <legend className="text-sm font-semibold text-ink">{copy.question}</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={copy.question}>
              {p.kind === "choice"
                ? p.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={answers[p.id] === o}
                      onClick={() => setAnswers((a) => ({ ...a, [p.id]: o }))}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 text-left text-sm transition",
                        answers[p.id] === o ? "border-brand-500 bg-brand-50 font-semibold text-brand-900" : "border-slate-200 hover:border-brand-300",
                      )}
                    >
                      {copy.options?.[o] ?? o}
                    </button>
                  ))
                : Array.from({ length: p.max - p.min + 1 }, (_, i) => p.min + i).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={answers[p.id] === n}
                      aria-label={`${n} dari ${p.max}`}
                      onClick={() => setAnswers((a) => ({ ...a, [p.id]: n }))}
                      className={cn(
                        "h-10 w-10 rounded-xl border-2 text-sm font-bold transition",
                        answers[p.id] === n ? "border-brand-500 bg-brand-50 text-brand-900" : "border-slate-200 hover:border-brand-300",
                      )}
                    >
                      {n}
                    </button>
                  ))}
            </div>
            {p.kind === "scale" && copy.scaleLabels && (
              <p className="mt-1 flex justify-between text-xs text-ink-muted">
                <span>1 = {copy.scaleLabels[0]}</span>
                <span>{p.max} = {copy.scaleLabels[1]}</span>
              </p>
            )}
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-xs text-ink-muted">Refleksi tidak dinilai dan tidak menambah XP. Boleh dilewati.</p>
        <Button variant="ghost" onClick={onSkip}>
          Lewati refleksi
        </Button>
        <Button disabled={Object.keys(answers).length === 0} onClick={() => onSubmit(answers)}>
          Kirim refleksi
        </Button>
      </div>
    </div>
  );
}
