"use client";

import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { Badge, Button, DifficultyBadge, inputClass, MathBlock, RichText } from "@/components/ui";
import { FORMAT_LABEL, type PublicQuestion } from "@/lib/questions/types";
import { cn } from "@/lib/utils";

interface Props {
  question: PublicQuestion;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Setelah diperiksa: tandai pilihan benar/salah */
  reveal?: { correctAnswer: string; isCorrect: boolean } | null;
  number?: number;
  showMeta?: boolean;
}

const LETTERS = ["A", "B", "C", "D", "E"];

export function QuestionView({ question: q, value, onChange, disabled, reveal, number, showMeta = true }: Props) {
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
              const isWrongPick = reveal && selected && !reveal.isCorrect;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange(o.id)}
                  className={cn(
                    "flex min-h-[3rem] items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left text-[0.95rem] font-medium transition-colors disabled:cursor-default",
                    isAnswer
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : isWrongPick
                        ? "border-rose-400 bg-rose-50 text-rose-900"
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
                  {isWrongPick && <XCircle className="h-5 w-5 text-rose-500" aria-label="pilihanmu salah" />}
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
              className={cn(inputClass, "text-lg font-semibold", reveal && (reveal.isCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-400 bg-rose-50"))}
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

        {q.type === "pair" && <PairInput labels={q.pairLabels ?? ["x", "y"]} value={value} onChange={onChange} disabled={disabled} reveal={reveal} />}
      </div>
    </div>
  );
}

function PairInput({ labels, value, onChange, disabled, reveal }: { labels: [string, string]; value?: string; onChange: (v: string) => void; disabled?: boolean; reveal?: Props["reveal"] }) {
  const uid = useId();
  const [a = "", b = ""] = (value ?? ",").split(",");
  const tone = reveal ? (reveal.isCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-400 bg-rose-50") : "";
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

/** Petunjuk bertahap: dibuka satu per satu, tidak langsung memberi jawaban. */
export function HintBox({ hints, onUse }: { hints?: string[]; onUse?: (count: number) => void }) {
  const [shown, setShown] = useState(0);
  if (!hints || hints.length === 0) return null;
  return (
    <div className="mt-4">
      {shown > 0 && (
        <ol className="mb-2 space-y-1.5">
          {hints.slice(0, shown).map((h, i) => (
            <li key={i} className="flex animate-fade-up gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>Petunjuk {i + 1}:</strong> {h}
              </span>
            </li>
          ))}
        </ol>
      )}
      {shown < hints.length && (
        <Button
          size="sm"
          variant="ghost"
          className="text-amber-700 hover:bg-amber-50"
          onClick={() => {
            setShown(shown + 1);
            onUse?.(shown + 1);
          }}
        >
          <Lightbulb className="h-4 w-4" /> {shown === 0 ? "Butuh petunjuk?" : "Petunjuk berikutnya"} ({shown + 1}/{hints.length})
        </Button>
      )}
    </div>
  );
}

export function Feedback({ isCorrect, correctAnswer, explanation }: { isCorrect: boolean; correctAnswer: string; explanation: string[] }) {
  return (
    <div
      role="status"
      className={cn("mt-5 animate-fade-up rounded-2xl border p-4", isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50", !isCorrect && "animate-shake")}
    >
      <p className={cn("flex items-center gap-2 font-bold", isCorrect ? "text-emerald-800" : "text-rose-800")}>
        {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        {isCorrect ? "Benar! Kerja bagus." : "Belum tepat."}
      </p>
      {!isCorrect && (
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
