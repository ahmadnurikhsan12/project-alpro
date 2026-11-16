"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useId } from "react";
import { Badge, DifficultyBadge, inputClass, MathBlock, RichText } from "@/components/ui";
import { FORMAT_LABEL, type PublicQuestion } from "@/lib/questions/types";
import { cn } from "@/lib/utils";

interface Props {
  question: PublicQuestion;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Setelah selesai: tandai pilihan benar/salah (hanya untuk soal yang jawabannya boleh dibuka). */
  reveal?: { correctAnswer: string; isCorrect: boolean } | null;
  /** Pilihan (ganda/B-S) yang sudah dicoba dan salah: dinonaktifkan tanpa membuka jawaban benar. */
  wrongPicks?: string[];
  /** Jawaban isian terakhir salah dan masih boleh diperbaiki. */
  wrong?: boolean;
  number?: number;
  showMeta?: boolean;
}

const LETTERS = ["A", "B", "C", "D", "E"];

export function QuestionView({ question: q, value, onChange, disabled, reveal, wrongPicks, wrong, number, showMeta = true }: Props) {
  const uid = useId();
  const promptId = `${uid}-prompt`;

  return (
    <div>
      {showMeta && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {number !== undefined && <Badge color="brand">Soal {number}</Badge>}
          <DifficultyBadge difficulty={q.difficulty} />
          <Badge color="slate">{FORMAT_LABEL[q.format]}</Badge>
        </div>
      )}
      <p id={promptId} className="text-lg font-semibold leading-relaxed text-ink">
        <RichText text={q.prompt} />
      </p>
      {q.context && <MathBlock lines={q.context} />}

      <div className="mt-4">
        {(q.type === "mcq" || q.type === "tf") && (
          <div role="radiogroup" aria-labelledby={promptId} className={cn("grid gap-2.5", q.type === "tf" ? "grid-cols-2" : "sm:grid-cols-2")}>
            {(q.type === "tf"
              ? [
                  { id: "true", text: "Benar" },
                  { id: "false", text: "Salah" },
                ]
              : (q.options ?? [])
            ).map((o, i) => {
              const selected = value === o.id;
              const isAnswer = reveal && reveal.correctAnswer === o.id;
              const isWrongPick = (reveal && selected && !reveal.isCorrect) || (!reveal && !!wrongPicks?.includes(o.id));
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled || (!reveal && !!wrongPicks?.includes(o.id))}
                  onClick={() => onChange(o.id)}
                  className={cn(
                    "flex min-h-[3rem] items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left text-[0.95rem] font-medium transition-colors disabled:cursor-default",
                    isAnswer
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : isWrongPick
                        ? "border-rose-300 bg-rose-50 text-rose-900"
                        : selected
                          ? "border-brand-500 bg-brand-50 text-brand-900"
                          : "border-slate-200 bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40",
                  )}
                >
                  {q.type === "mcq" && (
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold", selected ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-soft")}>
                      {LETTERS[i]}
                    </span>
                  )}
                  <span className="flex-1">{o.text}</span>
                  {isAnswer && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="jawaban benar" />}
                  {isWrongPick && <XCircle className="h-5 w-5 text-rose-500" aria-label="pilihanmu belum tepat" />}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "number" && (
          <div className="max-w-xs">
            <label htmlFor={`${uid}-num`} className="mb-1.5 block text-sm font-semibold text-ink">
              Jawaban
            </label>
            <input
              id={`${uid}-num`}
              inputMode="decimal"
              autoComplete="off"
              className={cn(inputClass, "text-lg font-semibold", reveal ? (reveal.isCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-400 bg-rose-50") : wrong && "border-amber-400 bg-amber-50")}
              value={value ?? ""}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Tulis angka, mis. 12 atau -3"
              aria-describedby={`${uid}-numhint`}
            />
            <p id={`${uid}-numhint`} className="mt-1 text-xs text-ink-muted">
              Boleh bilangan negatif, desimal (2,5), atau pecahan (1/2).
            </p>
          </div>
        )}

        {q.type === "pair" && <PairInput labels={q.pairLabels ?? ["x", "y"]} value={value} onChange={onChange} disabled={disabled} reveal={reveal} wrong={wrong} />}
      </div>
    </div>
  );
}

function PairInput({ labels, value, onChange, disabled, reveal, wrong }: { labels: [string, string]; value?: string; onChange: (v: string) => void; disabled?: boolean; reveal?: Props["reveal"]; wrong?: boolean }) {
  const uid = useId();
  const [a = "", b = ""] = (value ?? ",").split(",");
  const tone = reveal ? (reveal.isCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-400 bg-rose-50") : wrong ? "border-amber-400 bg-amber-50" : "";
  return (
    <div className="flex flex-wrap items-end gap-3">
      {[a, b].map((v, i) => (
        <div key={i} className="w-32">
          <label htmlFor={`${uid}-${i}`} className="mb-1.5 block text-sm font-semibold capitalize text-ink">
            {labels[i]} =
          </label>
          <input
            id={`${uid}-${i}`}
            inputMode="decimal"
            autoComplete="off"
            className={cn(inputClass, "text-lg font-semibold", tone)}
            value={v}
            disabled={disabled}
            onChange={(e) => {
              const clean = e.target.value.replace(/,/g, ".");
              onChange(i === 0 ? `${clean},${b}` : `${a},${clean}`);
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Ringkasan setelah soal selesai: tandai benar/belum, tampilkan jawaban (jika boleh) dan pembahasan. */
export function Feedback({ solved, correctAnswer, explanation, message }: { solved: boolean; correctAnswer: string; explanation: string[]; message?: string }) {
  return (
    <div role="status" className={cn("mt-5 animate-fade-up rounded-2xl border p-4", solved ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
      <p className={cn("flex items-center gap-2 font-bold", solved ? "text-emerald-800" : "text-rose-800")}>
        {solved ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        {message ?? (solved ? "Benar! Kerja bagus." : "Belum tepat.")}
      </p>
      {!solved && (
        <p className="mt-1 text-sm text-rose-900">
          Jawaban yang benar: <strong>{correctAnswer}</strong>
        </p>
      )}
      <div className="mt-3 rounded-xl bg-white/70 p-3">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Pembahasan</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
          {explanation.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
