"use client";

import { Compass } from "lucide-react";
import { useState } from "react";
import type { TransferPrompt } from "@/lib/tutor/types";
import { cn } from "@/lib/utils";

/**
 * Pertanyaan transfer: setelah soal terjawab benar, siswa diajak merumuskan ATURAN UMUM
 * di balik soal itu (melampaui satu soal). Tidak dinilai, tidak memberi XP, dan tidak
 * menghalangi lanjut ke soal berikutnya.
 */
export function TransferCard({ prompt }: { prompt: TransferPrompt }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === prompt.correct;
  return (
    <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4" data-testid="transfer-card">
      <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
        <Compass className="h-4 w-4" aria-hidden /> Aturan umum <span className="font-normal text-brand-700">(opsional, tidak dinilai)</span>
      </p>
      <p id="transfer-prompt" className="mt-1.5 text-sm font-semibold text-ink">
        {prompt.prompt}
      </p>
      <div role="radiogroup" aria-labelledby="transfer-prompt" className="mt-2 grid gap-2">
        {prompt.options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={picked === i}
            disabled={picked !== null}
            onClick={() => setPicked(i)}
            className={cn(
              "rounded-xl border-2 px-3 py-2 text-left text-sm transition disabled:cursor-default",
              picked === null ? "border-slate-200 bg-white hover:border-brand-300" : i === prompt.correct ? "border-emerald-400 bg-emerald-50" : picked === i ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white opacity-70",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p role="status" className={cn("mt-2 text-sm", correct ? "text-emerald-800" : "text-ink-soft")}>
          {correct ? "Tepat. " : "Belum tepat; perhatikan penjelasannya. "}
          {prompt.feedback}
        </p>
      )}
    </div>
  );
}
