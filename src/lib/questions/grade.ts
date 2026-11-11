import { equals, formatFraction, parseFraction } from "@/lib/math/fraction";
import type { Question } from "./types";

/** Menormalkan jawaban pasangan, mis. "(3, -2)" -> ["3","-2"] */
export function parsePair(raw: string): [string, string] | null {
  const cleaned = raw.replace(/[()\s]/g, "").replace(/;/g, ",");
  const parts = cleaned.split(",");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

function numbersEqual(a: string, b: string): boolean {
  const fa = parseFraction(a);
  const fb = parseFraction(b);
  return !!fa && !!fb && equals(fa, fb);
}

/** Menghapus pemisah ribuan "12.000" -> "12000" agar jawaban harga tetap diterima. */
export function normalizeNumberInput(raw: string): string {
  const s = raw.trim().replace(/^rp\.?\s*/i, "").replace(/\s+/g, "");
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) return s.replace(/\./g, "");
  return s;
}

export function isAnswerEmpty(q: Pick<Question, "type">, raw: string | undefined): boolean {
  if (raw === undefined || raw === null) return true;
  if (q.type === "pair") {
    const p = parsePair(raw);
    return !p;
  }
  return raw.trim() === "";
}

/** Memeriksa satu jawaban. Fungsi murni: dipakai di browser maupun server. */
export function gradeAnswer(q: Pick<Question, "type" | "answer">, raw: string | undefined): boolean {
  if (raw === undefined || raw === null) return false;
  switch (q.type) {
    case "mcq":
    case "tf":
      return raw === q.answer;
    case "number":
      return numbersEqual(normalizeNumberInput(raw), q.answer);
    case "pair": {
      const given = parsePair(raw);
      const expected = parsePair(q.answer);
      if (!given || !expected) return false;
      return (
        numbersEqual(normalizeNumberInput(given[0]), expected[0]) &&
        numbersEqual(normalizeNumberInput(given[1]), expected[1])
      );
    }
  }
}

/** Teks jawaban benar yang mudah dibaca siswa */
export function formatCorrectAnswer(q: Question): string {
  switch (q.type) {
    case "mcq":
      return q.options?.find((o) => o.id === q.answer)?.text ?? q.answer;
    case "tf":
      return q.answer === "true" ? "Benar" : "Salah";
    case "number": {
      const f = parseFraction(q.answer);
      return f ? formatFraction(f) : q.answer;
    }
    case "pair": {
      const [a, b] = parsePair(q.answer) ?? ["?", "?"];
      const [la, lb] = q.pairLabels ?? ["x", "y"];
      return `${la} = ${a}, ${lb} = ${b}`;
    }
  }
}

export function formatUserAnswer(q: Question, raw: string | undefined): string {
  if (isAnswerEmpty(q, raw)) return "(tidak dijawab)";
  if (q.type === "mcq") return q.options?.find((o) => o.id === raw)?.text ?? String(raw);
  if (q.type === "tf") return raw === "true" ? "Benar" : "Salah";
  if (q.type === "pair") {
    const [a, b] = parsePair(raw as string) ?? ["?", "?"];
    const [la, lb] = q.pairLabels ?? ["x", "y"];
    return `${la} = ${a}, ${lb} = ${b}`;
  }
  return String(raw);
}

export interface GradedSet {
  correct: number;
  total: number;
  score: number; // 0..100
  results: Record<string, boolean>;
}

export function gradeSet(questions: Question[], answers: Record<string, string>): GradedSet {
  const results: Record<string, boolean> = {};
  let correct = 0;
  for (const q of questions) {
    const ok = gradeAnswer(q, answers[q.id]);
    results[q.id] = ok;
    if (ok) correct++;
  }
  const total = questions.length;
  return { correct, total, score: total ? Math.round((correct / total) * 100) : 0, results };
}
