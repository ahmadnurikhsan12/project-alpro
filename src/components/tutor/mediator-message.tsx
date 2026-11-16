"use client";

import { MessageCircleQuestion } from "lucide-react";
import type { MediationResult } from "@/lib/tutor/types";

/**
 * Tanggapan pendamping belajar atas jawaban yang belum tepat. Berbasis aturan (bukan AI):
 * menyebut POLA yang tampak bila dikenali, atau berterus terang bahwa polanya belum
 * dikenali — dan selalu berupa pertanyaan pengarah, bukan jawaban.
 */
export function MediatorMessage({ result }: { result: MediationResult }) {
  return (
    <div role="status" className="mt-5 animate-fade-up rounded-2xl border border-amber-200 bg-amber-50/70 p-4" data-testid="mediator-message">
      <p className="flex items-start gap-2 font-bold text-amber-950">
        <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <span>{result.message}</span>
      </p>

      {result.identified ? (
        <div className="mt-3 space-y-3">
          {result.diagnoses.length > 1 && <p className="text-sm text-amber-900">Jawabanmu cocok dengan {result.diagnoses.length} kemungkinan pola. Periksa mana yang terjadi pada langkahmu:</p>}
          {result.diagnoses.map((d) => (
            <div key={d.code + d.observe} className="rounded-xl bg-white/80 p-3 text-sm">
              <p className="font-semibold text-ink">{d.title}</p>
              <p className="mt-0.5 text-ink-soft">{d.observe}</p>
              <p className="mt-1.5 font-medium text-amber-900">
                <span aria-hidden>? </span>
                {d.ask}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-amber-900">Pola kesalahan ini belum dapat dikenali. Periksa kembali langkahmu satu per satu, atau buka petunjuk di bawah.</p>
      )}

      {result.nudge && <p className="mt-3 text-sm text-amber-900">{result.nudge}</p>}
    </div>
  );
}
