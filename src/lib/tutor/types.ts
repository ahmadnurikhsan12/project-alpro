import type { Variable } from "@/lib/math/spldv";

/**
 * Fase pemrosesan informasi (Input, Elaborasi, Output) menurut kerangka RMT/Feuerstein.
 *
 * CATATAN: pemetaan jenis kesalahan ke fase di berkas ini adalah INTERPRETASI penerapan
 * pada SPLDV, bukan klaim dari buku. Pemetaan ini perlu ditinjau guru/dosen sebelum
 * dipakai untuk menarik kesimpulan.
 */
export type CognitivePhase = "input" | "elaborasi" | "output";

export const PHASE_LABEL: Record<CognitivePhase, string> = {
  input: "Input (mengumpulkan informasi)",
  elaborasi: "Elaborasi (mengolah informasi)",
  output: "Output (menyatakan hasil)",
};

/** Keterampilan eliminasi yang dilatih sebuah soal. */
export type SkillCode =
  | "pilih_operasi" // menentukan jumlah atau kurang
  | "samakan_koefisien" // pengali / KPK
  | "hitung_eliminasi" // menghitung hasil eliminasi
  | "substitusi" // mencari variabel kedua
  | "periksa_solusi" // memeriksa pasangan pada kedua persamaan
  | "ruas_kanan" // kesepadanan kedua ruas saat mengalikan
  | "tanda" // operasi dengan tanda negatif
  | "konsep"; // lainnya

/** Pola kesalahan yang dapat dikenali. Selain ini, kesalahan dinyatakan "belum teridentifikasi". */
export type DiagnosisCode =
  | "lupa_kalikan_ruas_kanan"
  | "tanda_pengurangan"
  | "salah_operasi"
  | "tidak_samakan_koefisien"
  | "variabel_tertukar"
  | "variabel_lain"
  | "tanda_hasil"
  | "sebagian_benar"
  | "pengali_bukan_terkecil"
  | "kpk_bukan_pengali"
  | "pengali_tertukar"
  | "tambah_bukan_kali"
  | "tidak_cek_kedua_persamaan"
  | "kalikan_tidak_perlu"
  | "operasi_bukan_eliminasi"
  | "kira_tidak_bisa_dieliminasi"
  | "opsi_khusus"; // pilihan ganda dengan catatan tertulis

/** Apa yang ditanyakan sebuah soal isian — dipakai untuk menghitung jawaban keliru yang khas. */
export type TargetSpec =
  | { kind: "pair" } // jawaban = pasangan (x, y)
  | { kind: "var"; v: Variable } // nilai satu variabel
  | { kind: "multiplier"; eq: 1 | 2; eliminate: Variable } // pengali terkecil persamaan ke-eq
  | { kind: "combined_const"; eliminate: Variable } // konstanta ruas kanan setelah eliminasi
  | { kind: "scaled_const"; c: number; factor: number }; // konstanta setelah dikali factor

export type OptionDiagnosis = DiagnosisCode | { code: "opsi_khusus"; observe: string; ask: string };

export interface TransferPrompt {
  prompt: string;
  options: string[];
  correct: number; // indeks opsi yang benar
  feedback: string;
}

/** Metadata tutor untuk satu soal. Hanya berisi data yang tidak dapat diturunkan dari soal itu sendiri. */
export interface QuestionMediation {
  phase: CognitivePhase;
  skill: SkillCode;
  target?: TargetSpec;
  /** Variabel yang dieliminasi (untuk soal pilihan operasi / pengali). */
  eliminate?: Variable;
  /** Pilihan ganda: opsi salah → pola kesalahan. */
  options?: Record<string, OptionDiagnosis>;
  /** Benar/Salah berbasis konsep: pola jika siswa menjawab salah. */
  tfWrong?: OptionDiagnosis;
  /** Teks tulisan tangan untuk L1–L3 bila hasil otomatis tidak cukup. L4 selalu dari mesin. */
  ladder?: Partial<Record<1 | 2 | 3, string>>;
  /** Mengganti pertanyaan transfer bawaan keterampilan. */
  transfer?: TransferPrompt;
}

export interface Diagnosis {
  code: DiagnosisCode;
  phase: CognitivePhase;
  title: string;
  /** Apa yang tampak dari jawaban siswa (diungkapkan sebagai pola, bukan vonis). */
  observe: string;
  /** Pertanyaan pengarah — bukan jawaban. */
  ask: string;
}

export interface DiagnoseResult {
  identified: boolean;
  /** Maksimal 3 kemungkinan. Kosong jika polanya belum dapat dikenali. */
  diagnoses: Diagnosis[];
}

export interface WorkedExample {
  title: string;
  lines: string[];
  note: string;
}

export type HintLevel = 1 | 2 | 3 | 4;

export interface HintStep {
  level: HintLevel;
  title: string;
  /** Tujuan petunjuk ini (intensionalitas): mengapa siswa diberi petunjuk ini. */
  purpose: string;
  text: string;
  example?: WorkedExample;
}

export interface MediationResult {
  status: "correct" | "retry" | "exhausted";
  attemptNo: number;
  limit: number;
  remaining: number;
  identified: boolean;
  diagnoses: Diagnosis[];
  /** Kalimat tanggapan atas jawaban terakhir. */
  message: string;
  /** Anjuran menyesuaikan dengan penggunaan petunjuk (resiprositas). */
  nudge?: string;
  /** Pilihan ganda: siswa harus memilih alasan sebelum mencoba lagi. */
  gate: boolean;
  /** Boleh menampilkan pembahasan lengkap sekarang. */
  revealExplanation: boolean;
  /** Boleh memilih "lewati dan lihat pembahasan" (setelah ≥ 2 percobaan). */
  giveUpAllowed: boolean;
}
