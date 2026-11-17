/**
 * CETAK BIRU PRETEST / POSTTEST (client-safe: tidak memuat soal atau kunci).
 *
 * Dua formulir paralel (A dan B) disusun dari cetak biru yang SAMA: 12 butir, 2 butir per kompetensi,
 * dengan jenis soal, tingkat kesulitan, dan struktur penyelesaian yang setara pada setiap nomor.
 * Butir bernomor sama pada A dan B mengukur kompetensi yang sama dengan angka/konteks berbeda.
 *
 * Pengimbangan (counterbalancing): formulir pretest ditentukan dari kode peserta (genap → A, ganjil → B),
 * posttest memakai formulir lainnya. Dengan begitu perbedaan kesulitan A–B tidak tercampur dengan
 * perbedaan pretest–posttest pada tingkat kelompok. Formulir dicatat pada setiap baris CSV.
 */
export const ASSESSMENT_KINDS = ["pretest", "posttest"] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];
export const ASSESSMENT_KIND_LABEL: Record<AssessmentKind, string> = { pretest: "Pretest (evaluasi awal)", posttest: "Posttest (evaluasi akhir)" };

export const FORMS = ["A", "B"] as const;
export type FormId = (typeof FORMS)[number];

export const ASSESSMENT_SKILLS = ["pilih_operasi", "samakan_koefisien", "hitung_eliminasi", "selesaikan_sistem", "periksa_solusi", "representasi"] as const;
export type AssessmentSkill = (typeof ASSESSMENT_SKILLS)[number];

export const SKILL_LABEL: Record<AssessmentSkill, string> = {
  pilih_operasi: "Memilih operasi eliminasi",
  samakan_koefisien: "Menyamakan koefisien dan mengalikan persamaan",
  hitung_eliminasi: "Menghitung hasil eliminasi",
  selesaikan_sistem: "Menyelesaikan SPLDV",
  periksa_solusi: "Memeriksa kebenaran solusi",
  representasi: "Menghubungkan aljabar dan grafik",
};

export const ITEMS_PER_FORM = 12;
export const SKILL_ITEM_COUNT = 2;

/** Menentukan formulir dari kode peserta. Deterministik: perangkat berbeda dengan kode sama → urutan sama. */
export function formsFor(code: string): Record<AssessmentKind, FormId> {
  let sum = 0;
  for (const ch of code.toUpperCase()) sum += ch.charCodeAt(0);
  const pre: FormId = sum % 2 === 0 ? "A" : "B";
  return { pretest: pre, posttest: pre === "A" ? "B" : "A" };
}

/** Rumus penilaian (didokumentasikan): 1 poin per butir benar; tanpa nilai parsial; skor = benar ÷ 12 × 100, dibulatkan. */
export function scoreOf(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}
