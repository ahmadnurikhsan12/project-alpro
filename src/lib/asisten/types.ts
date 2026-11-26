/**
 * ASISTEN BELAJAR: tipe bersama (aman untuk browser; tidak memuat jawaban).
 *
 * Tahapan menggabungkan Learning Activity RMT (analisis tugas, perencanaan tindakan, refleksi) dengan proses
 * literasi matematika (merumuskan, menggunakan, menafsirkan). Penggabungan ini INTERPRETASI pengembang.
 */
export const STAGES = ["pahami", "model", "rencana", "selesaikan", "tafsirkan", "refleksi"] as const;
export type Stage = (typeof STAGES)[number];
export const CHECKED_STAGES = ["pahami", "model", "rencana", "selesaikan", "tafsirkan"] as const;
export type CheckedStage = (typeof CHECKED_STAGES)[number];

export type SupportLevel = 1 | 2 | 3;

export const STAGE_INFO: Record<Stage, { title: string; rmt: string; literacy: string; goal: string }> = {
  pahami: { title: "Pahami masalah", rmt: "Analisis tugas (fase Input)", literacy: "Merumuskan: mengenali informasi", goal: "Menentukan apa yang diketahui dan apa yang ditanyakan." },
  model: { title: "Buat model matematika", rmt: "Alat psikologis: simbol dan persamaan", literacy: "Merumuskan: dari cerita ke persamaan", goal: "Mengubah cerita menjadi dua persamaan." },
  rencana: { title: "Rencanakan", rmt: "Perencanaan tindakan (fase Elaborasi)", literacy: "Menggunakan: memilih strategi", goal: "Memilih variabel yang dieliminasi, operasinya, dan alasannya." },
  selesaikan: { title: "Selesaikan", rmt: "Manipulasi (fase Elaborasi)", literacy: "Menggunakan: menghitung", goal: "Menentukan nilai x dan y." },
  tafsirkan: { title: "Periksa dan tafsirkan", rmt: "Validasi (fase Output)", literacy: "Menafsirkan: kembali ke cerita", goal: "Menjawab pertanyaan cerita dengan satuan yang benar." },
  refleksi: { title: "Refleksi", rmt: "Refleksi (Learning Activity)", literacy: "Mengevaluasi cara berpikir", goal: "Meninjau strategi dan memaknai yang dipelajari." },
};

export const SUPPORT_LABEL: Record<SupportLevel, string> = { 1: "Pertanyaan pemandu", 2: "Petunjuk lebih rinci", 3: "Contoh serupa" };

/** Bantuan naik bertahap mengikuti kesulitan: percobaan salah ke-1 → tingkat 1, ke-2 → 2, ke-3 dst. → 3. */
export function supportLevel(wrongAttempts: number): SupportLevel {
  return wrongAttempts <= 1 ? 1 : wrongAttempts === 2 ? 2 : 3;
}

export type Level = "mudah" | "sedang" | "sulit";

export interface PublicProblem {
  id: string;
  level: Level;
  title: string;
  story: string;
  question: string;
  unit: string;
  options: { x: string[]; y: string[]; ask: string[] };
}

export type StageInput =
  | { stage: "pahami"; x: number; y: number; ask: number }
  | { stage: "model"; eq: [string, string, string, string, string, string] }
  | { stage: "rencana"; variable: "x" | "y"; operation: "tambah" | "kurang"; reason: "sama" | "kecil" | "urutan" }
  | { stage: "selesaikan"; x: string; y: string }
  | { stage: "tafsirkan"; value: string };

export interface CheckResponse {
  correct: boolean;
  feedback: string;
  /** Tingkat bantuan yang diberikan (hanya bila salah atau meminta bantuan). */
  level?: SupportLevel;
  hint?: string;
  /** Bimbingan dari AI (bila aktif dan tidak membocorkan jawaban). */
  ai?: string;
  /** Ringkasan hasil tahap yang benar, untuk "Catatan kerja". */
  note?: string;
}
