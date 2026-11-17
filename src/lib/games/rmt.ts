import type { Equation } from "@/lib/math/spldv";

/**
 * Logika murni permainan berbasis RMT (Tahap 4): prediksi sebelum percobaan pada Tebak Nilai, dan
 * metrik kecepatan–ketelitian pada Eliminasi Kilat. Bebas UI agar dapat diuji.
 * Metrik dikirim sebagai `la` pada event `game` (≤12 kunci, bilangan bulat 0–1000, tanpa teks bebas).
 */
const clamp = (n: number) => Math.max(0, Math.min(1000, Math.trunc(Number.isFinite(n) ? n : 0)));

// ------------------------------------------------------------------ Tebak Nilai

export type Signal = "kecil" | "tepat" | "besar";
export const SIGNALS: Signal[] = ["kecil", "tepat", "besar"];
export const SIGNAL_LABEL: Record<Signal, string> = { kecil: "Terlalu kecil", tepat: "Tepat", besar: "Terlalu besar" };

/** Hasil substitusi (x, y) ke ruas kiri, dan posisinya terhadap ruas kanan. */
export function signalOf(eq: Equation, x: number, y: number): { value: number; s: Signal } {
  const value = eq.a * x + eq.b * y;
  return { value, s: value === eq.c ? "tepat" : value > eq.c ? "besar" : "kecil" };
}

/** Alasan matematis yang dipilih siswa sebelum mencoba (pilihan tertutup, tanpa teks bebas). */
export const REASONS = ["substitusi", "sinyal_lalu", "eliminasi", "menebak"] as const;
export type Reason = (typeof REASONS)[number];
export const REASON_LABEL: Record<Reason, string> = {
  substitusi: "Saya menghitung ruas kiri dengan substitusi",
  sinyal_lalu: "Saya menyesuaikan dari sinyal tebakan sebelumnya",
  eliminasi: "Saya memakai eliminasi",
  menebak: "Saya menebak dulu",
};

export interface GuessRecord {
  reason: Reason;
  pred: { s1: Signal; s2: Signal };
  actual: { s1: Signal; s2: Signal };
}

export function compareGuess(pred: { s1: Signal; s2: Signal }, actual: { s1: Signal; s2: Signal }) {
  const m1 = pred.s1 === actual.s1;
  const m2 = pred.s2 === actual.s2;
  return { m1, m2, correct: Number(m1) + Number(m2) };
}

export function tebakMetrics(guesses: GuessRecord[], roundsPlayed: number, roundsSolved: number): Record<string, number> {
  const count = (r: Reason) => guesses.filter((g) => g.reason === r).length;
  const correct = guesses.reduce((s, g) => s + compareGuess(g.pred, g.actual).correct, 0);
  return {
    tebakan_total: clamp(guesses.length),
    prediksi_total: clamp(guesses.length * 2),
    prediksi_benar: clamp(correct),
    alasan_substitusi: clamp(count("substitusi")),
    alasan_sinyal: clamp(count("sinyal_lalu")),
    alasan_eliminasi: clamp(count("eliminasi")),
    alasan_menebak: clamp(count("menebak")),
    ronde_main: clamp(roundsPlayed),
    ronde_selesai: clamp(roundsSolved),
  };
}

// ------------------------------------------------------------------ Eliminasi Kilat

export interface KilatStats {
  answered: number;
  correct: number;
  maxCombo: number;
  /** Total detik yang dipakai untuk menjawab seluruh soal (jumlah selisih waktu tampil → jawab). */
  answerSeconds: number;
}

/** Akurasi (persen) dan kecepatan; waktu rata-rata ×10 agar tetap bilangan bulat (mis. 25 = 2,5 detik). */
export function kilatMetrics(s: KilatStats): Record<string, number> {
  const answered = Math.max(0, s.answered);
  return {
    jawaban_total: clamp(answered),
    benar: clamp(s.correct),
    salah: clamp(answered - s.correct),
    akurasi: answered ? clamp(Math.round((s.correct / answered) * 100)) : 0,
    combo_maks: clamp(s.maxCombo),
    waktu_rata_x10: answered ? clamp(Math.round((s.answerSeconds / answered) * 10)) : 0,
  };
}

/** Gaya bermain yang dipantulkan kembali ke siswa; hanya mengutip angka permainannya sendiri. */
export function kilatMirror(s: KilatStats): string {
  if (s.answered === 0) return "Belum ada jawaban yang tercatat.";
  const acc = Math.round((s.correct / s.answered) * 100);
  const avg = s.answerSeconds / s.answered;
  const speed = avg.toFixed(1).replace(".", ",");
  if (acc >= 85) return `Akurasimu ${acc}% dengan rata-rata ${speed} detik per soal. Kamu cepat sekaligus teliti.`;
  if (acc >= 60) return `Akurasimu ${acc}% dengan rata-rata ${speed} detik per soal. Menurutmu, apakah sebagian kesalahan terjadi karena terburu-buru?`;
  return `Akurasimu ${acc}% dengan rata-rata ${speed} detik per soal. Kecepatan tidak berguna jika jawabannya keliru; coba pelan dulu pada permainan berikutnya.`;
}
