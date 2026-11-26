import "server-only";
import type { Level, PublicProblem } from "@/lib/asisten/types";

export interface Eq {
  a: number;
  b: number;
  c: number;
}

export interface Problem extends PublicProblem {
  level: Level;
  eq1: Eq;
  eq2: Eq;
  solution: { x: number; y: number };
  /** Pertanyaan akhir: nilai = x·kx + y·ky */
  ask: { kx: number; ky: number };
  correct: { x: number; y: number; ask: number };
  names: { x: string; y: string };
}

/** Soal cerita berurutan dari beban intrinsik rendah ke tinggi (koefisien makin kompleks). */
export const PROBLEMS: Problem[] = [
  {
    id: "kantin",
    level: "mudah",
    title: "Jajan di Kantin",
    story: "Rani membeli 2 roti dan 1 susu seharga Rp11.000. Dodi membeli 1 roti dan 1 susu di kantin yang sama seharga Rp8.000.",
    question: "Berapa yang harus dibayar untuk 3 roti dan 2 susu?",
    unit: "ribu rupiah",
    options: {
      x: ["Harga satu roti (dalam ribu rupiah)", "Banyak roti yang dibeli", "Uang yang dibawa Rani"],
      y: ["Banyak susu yang dibeli", "Harga satu susu (dalam ribu rupiah)", "Uang kembalian Dodi"],
      ask: ["Harga satu roti saja", "Total harga 3 roti dan 2 susu", "Banyak roti Rani dan Dodi"],
    },
    correct: { x: 0, y: 1, ask: 1 },
    names: { x: "harga 1 roti", y: "harga 1 susu" },
    eq1: { a: 2, b: 1, c: 11 },
    eq2: { a: 1, b: 1, c: 8 },
    solution: { x: 3, y: 5 },
    ask: { kx: 3, ky: 2 },
  },
  {
    id: "wisata",
    level: "sedang",
    title: "Tiket Wisata",
    story: "Keluarga Sari membayar Rp105.000 untuk 3 tiket dewasa dan 2 tiket anak. Keluarga Bima membayar Rp110.000 untuk 2 tiket dewasa dan 4 tiket anak.",
    question: "Berapa biaya untuk 4 tiket dewasa dan 3 tiket anak?",
    unit: "ribu rupiah",
    options: {
      x: ["Banyak orang dewasa", "Harga satu tiket dewasa (dalam ribu rupiah)", "Total uang keluarga Sari"],
      y: ["Harga satu tiket anak (dalam ribu rupiah)", "Banyak anak", "Selisih uang kedua keluarga"],
      ask: ["Banyak tiket yang dibeli", "Harga satu tiket anak saja", "Total biaya 4 tiket dewasa dan 3 tiket anak"],
    },
    correct: { x: 1, y: 0, ask: 2 },
    names: { x: "harga 1 tiket dewasa", y: "harga 1 tiket anak" },
    eq1: { a: 3, b: 2, c: 105 },
    eq2: { a: 2, b: 4, c: 110 },
    solution: { x: 25, y: 15 },
    ask: { kx: 4, ky: 3 },
  },
  {
    id: "parkir",
    level: "sulit",
    title: "Pendapatan Parkir",
    story: "Seorang juru parkir menerima Rp25.000 dari 5 motor dan 3 mobil. Satu jam kemudian ia menerima Rp43.000 dari 4 motor dan 7 mobil. Tarif tiap jenis kendaraan tetap.",
    question: "Jika sore hari parkir 20 motor dan 8 mobil, berapa pendapatannya?",
    unit: "ribu rupiah",
    options: {
      x: ["Tarif parkir satu motor (dalam ribu rupiah)", "Banyak motor yang parkir", "Pendapatan jam pertama"],
      y: ["Banyak mobil yang parkir", "Pendapatan jam kedua", "Tarif parkir satu mobil (dalam ribu rupiah)"],
      ask: ["Tarif satu motor saja", "Pendapatan dari 20 motor dan 8 mobil", "Banyak kendaraan sore hari"],
    },
    correct: { x: 0, y: 2, ask: 1 },
    names: { x: "tarif 1 motor", y: "tarif 1 mobil" },
    eq1: { a: 5, b: 3, c: 25 },
    eq2: { a: 4, b: 7, c: 43 },
    solution: { x: 2, y: 5 },
    ask: { kx: 20, ky: 8 },
  },
];

export const PROBLEM_BY_ID = Object.fromEntries(PROBLEMS.map((p) => [p.id, p])) as Record<string, Problem>;
export const finalValue = (p: Problem) => p.ask.kx * p.solution.x + p.ask.ky * p.solution.y;

export function toPublicProblem(p: Problem): PublicProblem {
  const { id, level, title, story, question, unit, options } = p;
  return { id, level, title, story, question, unit, options };
}
