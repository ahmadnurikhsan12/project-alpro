import { parsePair } from "@/lib/questions/grade";
import type { Question } from "@/lib/questions/types";

/**
 * PENGAMAN KEBOCORAN JAWABAN
 *
 * Petunjuk L1–L3 dan contoh L4 tidak boleh memuat jawaban akhir soal. Pemeriksaan ini
 * dijalankan pada SEMUA teks petunjuk (otomatis maupun tulisan tangan). Angka yang sudah
 * tertulis di soal itu sendiri (koefisien, konstanta) boleh dikutip; yang dilarang adalah
 * angka BARU yang sama dengan jawaban.
 */
const MINUS = /−/g;
const NUMBER = /-?\d+(?:[.,]\d+)?/g;

function canon(raw: string): string | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? String(n) : null;
}

/** Himpunan nilai angka yang muncul dalam teks ("14.000" dibaca 14000; tanda minus Unicode dinormalkan). */
export function numbersIn(text: string): Set<string> {
  const t = text.replace(MINUS, "-").replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2");
  const out = new Set<string>();
  for (const m of t.matchAll(NUMBER)) {
    const c = canon(m[0]);
    if (c !== null) out.add(c);
  }
  return out;
}

function questionText(q: Question): string {
  return [q.prompt, ...(q.context ?? []), ...(q.options?.map((o) => o.text) ?? [])].join(" ");
}

/** Angka jawaban untuk soal isian: satu angka, atau dua angka untuk pasangan. */
function answerNumbers(q: Question): string[] {
  if (q.type === "number") {
    const c = canon(q.answer.replace(MINUS, "-"));
    return c === null ? [] : [c];
  }
  if (q.type === "pair") {
    const p = parsePair(q.answer);
    return p ? p.map((v) => canon(v)).filter((v): v is string => v !== null) : [];
  }
  return [];
}

const TF_REVEAL = /(jawaban(nya)?|pernyataan (ini|itu))\s+(adalah\s+|yang benar\s+)?(benar|salah)\b/i;

/** True jika `text` membocorkan jawaban soal `q`. */
export function leaksAnswer(q: Question, text: string): boolean {
  if (q.type === "number" || q.type === "pair") {
    const allowed = numbersIn(questionText(q));
    const used = numbersIn(text);
    for (const a of answerNumbers(q)) {
      const magnitude = String(Math.abs(Number(a)));
      if (used.has(a) && !allowed.has(a)) return true;
      if (Number(a) < 0 && (used.has(magnitude) || used.has(`-${magnitude}`)) && !allowed.has(magnitude) && !allowed.has(`-${magnitude}`)) return true;
    }
    return false;
  }
  if (q.type === "mcq") {
    const correct = q.options?.find((o) => o.id === q.answer)?.text.toLowerCase().trim();
    return !!correct && correct.length >= 4 && text.toLowerCase().includes(correct);
  }
  return TF_REVEAL.test(text);
}

/**
 * Pemeriksaan untuk CONTOH L4 (soal lain dengan angka berbeda). Angka tunggal yang kebetulan sama
 * dengan jawaban bukan kebocoran; yang dilarang adalah memuat PASANGAN jawaban yang persis sama
 * (contoh yang sistemnya sama dengan soal dicegah terpisah lewat `avoid` di examples.ts).
 */
export function revealsPair(q: Question, text: string): boolean {
  if (q.type !== "pair") return false;
  const p = parsePair(q.answer);
  if (!p) return false;
  const t = text.replace(MINUS, "-");
  return t.includes(`(${p[0]}, ${p[1]})`);
}
