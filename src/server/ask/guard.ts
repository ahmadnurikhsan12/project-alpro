import "server-only";
import { PRACTICE_QUESTIONS } from "@/content/practice";
import { ALL_LESSON_QUIZ_QUESTIONS } from "@/content/lessons";
import type { Question } from "@/lib/questions/types";
import { ASSESSMENT_FORMS } from "../assessment-bank";
import { EVALUATION_QUESTIONS } from "../evaluation-bank";

export const MAX_QUESTION_CHARS = 400;

export type QuestionCheck = { ok: true; text: string } | { ok: false; message: string };

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LONG_DIGITS = /\d[\d\s.-]{7,}\d/; // nomor telepon / NIS / NISN
const SELF_ID = /\b(nama\s*(saya|aku|ku)|namaku|saya\s+bernama|aku\s+bernama|sekolah\s*(saya|aku|ku)|sekolahku)\b/i;
const URL_RE = /https?:\/\/|www\./i;
const LOOKS_MATH = /[a-z]\s*[=+]|[=+]\s*\d/i;

/** Membersihkan dan memeriksa pertanyaan sebelum DIKIRIM ke layanan AI pihak ketiga (privasi siswa). */
export function checkQuestion(raw: string): QuestionCheck {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < 3) return { ok: false, message: "Tulis pertanyaanmu dulu, ya." };
  if (text.length > MAX_QUESTION_CHARS) return { ok: false, message: `Pertanyaan terlalu panjang (maksimal ${MAX_QUESTION_CHARS} karakter). Ringkas dulu.` };
  if (EMAIL.test(text) || URL_RE.test(text) || SELF_ID.test(text) || (LONG_DIGITS.test(text) && !LOOKS_MATH.test(text))) {
    return {
      ok: false,
      message: "Pertanyaan tampaknya memuat data pribadi (nama, kontak, nomor, atau tautan). Hapus bagian itu dan tulis ulang hanya soal matematikanya. Pertanyaanmu dikirim ke layanan AI di luar MathQuest.",
    };
  }
  return { ok: true, text };
}

const norm = (s: string) => s.replace(/[−–—]/g, "-");
/** Semua bilangan (tanpa tanda) berurutan dari sebuah teks. */
export function numbersOf(s: string): number[] {
  return (norm(s).match(/\d+/g) ?? []).map(Number);
}
function isSubsequence(needle: number[], hay: number[]): boolean {
  let i = 0;
  for (const n of hay) if (n === needle[i] && ++i === needle.length) return true;
  return false;
}
const itemNumbers = (q: Question) => numbersOf([q.prompt, ...(q.context ?? [])].join(" "));

const PROTECTED = [...EVALUATION_QUESTIONS, ...Object.values(ASSESSMENT_FORMS).flat()].map((q) => ({ id: q.id, nums: itemNumbers(q) })).filter((x) => x.nums.length >= 4);
const GUIDED = [...PRACTICE_QUESTIONS, ...ALL_LESSON_QUIZ_QUESTIONS].map((q) => ({ id: q.id, nums: itemNumbers(q) })).filter((x) => x.nums.length >= 4);

/**
 * Mengenali apakah siswa menempelkan soal bernilai.
 * - "blocked": soal Pretest/Posttest/Evaluasi Akhir → AI tidak membantu (integritas asesmen).
 * - "guided": soal Latihan/Mini Quiz → hanya petunjuk bertahap, tanpa jawaban akhir.
 */
export function classifyTask(question: string): "blocked" | "guided" | "free" {
  const nums = numbersOf(question);
  if (nums.length >= 4) {
    if (PROTECTED.some((p) => isSubsequence(p.nums, nums))) return "blocked";
    if (GUIDED.some((p) => isSubsequence(p.nums, nums))) return "guided";
  }
  return "free";
}

export const BLOCKED_REPLY =
  "Soal ini tampak seperti soal Pretest, Posttest, atau Evaluasi Akhir. Selama asesmen, tutor AI tidak membantu supaya hasilmu menggambarkan kemampuanmu sendiri. Kamu bisa belajar konsepnya lewat Materi dan Latihan, lalu kerjakan asesmennya dengan percaya diri.";
