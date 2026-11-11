import type { Difficulty, Equation } from "@/lib/math/spldv";

export type QuestionType = "mcq" | "tf" | "number" | "pair";

/** Modul/topik asal soal */
export type Topic = "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7";

/** Variasi bentuk soal (untuk label & filter) */
export type QuestionFormat = "konsep" | "langkah" | "operasi" | "penyelesaian" | "cerita" | "model";

export interface QuestionOption {
  id: string;
  text: string;
}

/** Metadata verifikasi agar seluruh soal dapat diuji otomatis kebenarannya. */
export type QuestionVerify =
  | { kind: "solution"; e1: Equation; e2: Equation; x: number; y: number }
  | { kind: "pairCheck"; e1: Equation; e2: Equation; x: number; y: number };

export interface Question {
  id: string;
  type: QuestionType;
  topic: Topic;
  difficulty: Difficulty;
  format: QuestionFormat;
  prompt: string;
  /** Baris-baris matematika yang ditampilkan di bawah pertanyaan */
  context?: string[];
  options?: QuestionOption[];
  /** mcq: id opsi; tf: "true"/"false"; number: "12"; pair: "3,4" */
  answer: string;
  explanation: string[];
  hints?: string[];
  /** label untuk input pasangan, default ["x","y"] */
  pairLabels?: [string, string];
  verify?: QuestionVerify;
}

/** Versi soal tanpa kunci & pembahasan — aman dikirim ke browser saat evaluasi. */
export type PublicQuestion = Omit<Question, "answer" | "explanation" | "verify" | "hints">;

export function toPublicQuestion(q: Question): PublicQuestion {
  const { id, type, topic, difficulty, format, prompt, context, options, pairLabels } = q;
  return { id, type, topic, difficulty, format, prompt, context, options, pairLabels };
}

export const FORMAT_LABEL: Record<QuestionFormat, string> = {
  konsep: "Konsep",
  langkah: "Melengkapi langkah",
  operasi: "Memilih operasi",
  penyelesaian: "Pasangan penyelesaian",
  cerita: "Soal cerita",
  model: "Model matematika",
};

export const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "Pilihan ganda",
  tf: "Benar / Salah",
  number: "Isian angka",
  pair: "Isian pasangan (x, y)",
};
