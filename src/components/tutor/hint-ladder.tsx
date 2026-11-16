"use client";

import { Lightbulb } from "lucide-react";
import { Button, MathBlock } from "@/components/ui";
import type { HintStep } from "@/lib/tutor/types";

interface Props {
  steps: HintStep[];
  /** Banyak petunjuk yang sudah dibuka (0–steps.length). */
  opened: number;
  onOpen: (level: number) => void;
}

/**
 * Tangga petunjuk bertingkat. Petunjuk dibuka satu per satu, berurutan; setiap petunjuk
 * menyebut tujuannya. Tidak ada tombol untuk melompat ke contoh atau jawaban.
 */
export function HintLadder({ steps, opened, onOpen }: Props) {
  if (steps.length === 0) return null;
  const next = steps[opened];
  return (
    <div className="mt-4" data-testid="hint-ladder">
      {opened > 0 && (
        <ol className="mb-2 space-y-2" aria-label="Petunjuk yang sudah dibuka">
          {steps.slice(0, opened).map((step) => (
            <li key={step.level} className="animate-fade-up rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="flex items-center gap-2 font-bold">
                <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                Petunjuk {step.level}: {step.title}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">{step.purpose}</p>
              <p className="mt-1.5">{step.text}</p>
              {step.example && (
                <div className="mt-2">
                  <p className="font-semibold">{step.example.title}</p>
                  <MathBlock lines={step.example.lines} className="my-1.5" />
                  <p className="text-xs text-amber-800">{step.example.note}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {next && (
        <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-50" onClick={() => onOpen(next.level)}>
          <Lightbulb className="h-4 w-4" />
          {opened === 0 ? "Butuh petunjuk?" : "Petunjuk berikutnya"} ({opened + 1}/{steps.length}: {next.title})
        </Button>
      )}
    </div>
  );
}
