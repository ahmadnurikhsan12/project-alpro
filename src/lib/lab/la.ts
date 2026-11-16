import { frac, type Fraction } from "@/lib/math/fraction";
import { coefficientOf, planElimination, scaleEquation, type Equation, type Variable } from "@/lib/math/spldv";

/**
 * LOGIKA LEARNING ACTIVITY (Analisis Tugas, Perencanaan Tindakan, Refleksi) untuk SPLDV Lab.
 *
 * Seluruh klaim yang disampaikan pendamping kepada siswa (relasi koefisien, efisiensi pilihan
 * variabel, hasil prediksi, garis hasil eliminasi) dihitung di sini dari spldv.ts sehingga dapat
 * diuji. Berkas ini bebas UI.
 *
 * Catatan desain RMT: elemen-elemen aktivitas ini TIDAK dimaksudkan sebagai urutan yang kaku.
 * Siswa dapat membuka kembali analisisnya, mengubah rencana setelah melihat hasil, dan
 * membandingkan rencananya dengan alternatif — sehingga ketiganya saling memengaruhi.
 */
export const other = (v: Variable): Variable => (v === "x" ? "y" : "x");

// ------------------------------------------------------------------ Analisis tugas

export type Relation = "sama_tanda_sama" | "sama_berlawanan" | "berbeda";

export const RELATION_LABEL: Record<Relation, string> = {
  sama_tanda_sama: "Sama besar, tanda sama",
  sama_berlawanan: "Sama besar, tanda berlawanan",
  berbeda: "Besarnya berbeda",
};

/** Hubungan dua koefisien: sama besar & tanda sama, sama besar & berlawanan, atau berbeda besar. */
export function relationOf(c1: number, c2: number): Relation {
  if (Math.abs(c1) !== Math.abs(c2)) return "berbeda";
  return Math.sign(c1) === Math.sign(c2) ? "sama_tanda_sama" : "sama_berlawanan";
}

export type CellId = "a1" | "b1" | "c1" | "a2" | "b2" | "c2";
export const CELL_IDS: CellId[] = ["a1", "b1", "c1", "a2", "b2", "c2"];

export function tableOf(e1: Equation, e2: Equation): Record<CellId, number> {
  return { a1: e1.a, b1: e1.b, c1: e1.c, a2: e2.a, b2: e2.b, c2: e2.c };
}

function parseInteger(raw: string): number | null {
  const s = raw.trim().replace(/−/g, "-").replace(",", ".");
  if (!/^-?\d+(\.0+)?$/.test(s)) return null;
  return Number(s);
}

/** Memeriksa tabel koefisien yang diisi siswa terhadap sistem persamaan. */
export function checkTable(e1: Equation, e2: Equation, input: Record<CellId, string>): { ok: Record<CellId, boolean>; allOk: boolean } {
  const truth = tableOf(e1, e2);
  const ok = Object.fromEntries(CELL_IDS.map((id) => [id, parseInteger(input[id] ?? "") === truth[id]])) as Record<CellId, boolean>;
  return { ok, allOk: CELL_IDS.every((id) => ok[id]) };
}

export const GOAL_OPTIONS = ["pasangan", "x_saja", "persamaan_mudah"] as const;
export type GoalId = (typeof GOAL_OPTIONS)[number];
export const GOAL_CORRECT: GoalId = "pasangan";

// ------------------------------------------------------------------ Perencanaan

export interface VariableCost {
  eliminate: Variable;
  m1: number;
  m2: number;
  /** Ukuran "berat ringan" rencana: hasil kali pengali (sama dengan easiestVariable di spldv.ts). */
  product: number;
  scaled: boolean;
  operation: "add" | "subtract";
}

export function variableCost(e1: Equation, e2: Equation, v: Variable): VariableCost | null {
  const p = planElimination(e1, e2, v);
  if (!p) return null;
  return { eliminate: v, m1: p.m1, m2: p.m2, product: p.m1 * p.m2, scaled: p.m1 !== 1 || p.m2 !== 1, operation: p.operation };
}

/** Variabel dengan rencana paling ringan (bisa dua jika seimbang). */
export function efficientVariables(e1: Equation, e2: Equation): Variable[] {
  const costs = (["x", "y"] as const).map((v) => variableCost(e1, e2, v)).filter((c): c is VariableCost => c !== null);
  if (costs.length === 0) return [];
  const min = Math.min(...costs.map((c) => c.product));
  return costs.filter((c) => c.product === min).map((c) => c.eliminate);
}

export const REASON_IDS = ["pengali_kecil", "koefisien_sudah_sama", "koefisien_kecil", "asal_pilih"] as const;
export type ReasonId = (typeof REASON_IDS)[number];

export interface ReasonFeedback {
  tone: "baik" | "periksa" | "netral";
  text: string;
}

/**
 * Tanggapan atas alasan siswa memilih variabel. Hanya menyatakan hal yang benar menurut mesin,
 * dan sengaja tidak menyebut angka pengali (agar langkah "Tentukan pengali" tetap dikerjakan siswa).
 */
export function reasonFeedback(chosen: Variable, reason: ReasonId, e1: Equation, e2: Equation): ReasonFeedback {
  const cost = variableCost(e1, e2, chosen);
  const efficient = efficientVariables(e1, e2).includes(chosen);
  const mag = (v: Variable) => Math.max(Math.abs(coefficientOf(e1, v)), Math.abs(coefficientOf(e2, v)));

  switch (reason) {
    case "koefisien_sudah_sama":
      return cost && !cost.scaled
        ? { tone: "baik", text: `Betul: koefisien ${chosen} pada kedua persamaan sudah sama besar, jadi tidak perlu dikalikan lebih dulu.` }
        : { tone: "periksa", text: `Periksa lagi: koefisien ${chosen} pada kedua persamaan belum sama besar, sehingga persamaan akan perlu dikalikan. Alasan ini lebih cocok untuk variabel yang koefisiennya sudah sama besar.` };
    case "pengali_kecil":
      return efficient
        ? { tone: "baik", text: "Pilihan yang efisien: variabel lain tidak memerlukan pengali yang lebih kecil. Perbandingan lengkapnya akan kamu lihat pada refleksi." }
        : { tone: "periksa", text: "Variabel lain memerlukan pengali yang lebih kecil. Rencanamu tetap bisa menghasilkan jawaban yang benar, hanya angkanya lebih besar. Perbandingan lengkapnya akan kamu lihat pada refleksi." };
    case "koefisien_kecil":
      return mag(chosen) < mag(other(chosen))
        ? { tone: "netral", text: "Koefisien variabel itu memang lebih kecil. Namun yang menentukan ringannya pekerjaan adalah seberapa mudah koefisiennya disamakan (pengali yang diperlukan), bukan besar koefisiennya." }
        : { tone: "netral", text: "Koefisien variabel itu tidak lebih kecil daripada variabel lain. Pertimbangan yang lebih tepat adalah pengali yang diperlukan agar koefisiennya menjadi sama." };
    case "asal_pilih":
      return { tone: "netral", text: "Tidak apa-apa memulai dari mana saja. Lain kali, bandingkan kedua variabel dulu: variabel mana yang lebih mudah disamakan koefisiennya?" };
  }
}

// ------------------------------------------------------------------ Prediksi & hasil eliminasi

export interface EliminationOutcome {
  scaled1: Equation;
  scaled2: Equation;
  operation: "add" | "subtract";
  keep: Variable;
  /** Persamaan satu variabel yang tersisa: coef · keep = konst. */
  coef: number;
  konst: number;
  keepValue: Fraction | null;
}

/** Hasil eliminasi variabel `elim` dengan pengali (m1, m2) yang dipilih siswa. */
export function eliminationOutcome(e1: Equation, e2: Equation, elim: Variable, m1: number, m2: number): EliminationOutcome | null {
  if (coefficientOf(e1, elim) === 0 || coefficientOf(e2, elim) === 0) return null;
  const s1 = scaleEquation(e1, m1);
  const s2 = scaleEquation(e2, m2);
  // eliminasi hanya bermakna jika koefisien variabel itu sama besar setelah dikalikan
  if (Math.abs(coefficientOf(s1, elim)) !== Math.abs(coefficientOf(s2, elim))) return null;
  const sameSign = Math.sign(coefficientOf(s1, elim)) === Math.sign(coefficientOf(s2, elim));
  const keep = other(elim);
  const combine = (p: number, q: number) => (sameSign ? p - q : p + q);
  const coef = combine(coefficientOf(s1, keep), coefficientOf(s2, keep));
  const konst = combine(s1.c, s2.c);
  return { scaled1: s1, scaled2: s2, operation: sameSign ? "subtract" : "add", keep, coef, konst, keepValue: coef !== 0 ? frac(konst, coef) : null };
}

export interface Prediction {
  coef: number;
  konst: number;
}
export type PredictionResult = "persis" | "setara" | "berbeda";

/** Membandingkan prediksi siswa dengan hasil nyata; "setara" jika kelipatan (mis. −y = −3 dan y = 3). */
export function comparePrediction(p: Prediction, actual: Prediction): PredictionResult {
  if (p.coef === actual.coef && p.konst === actual.konst) return "persis";
  const pZero = p.coef === 0 && p.konst === 0;
  const aZero = actual.coef === 0 && actual.konst === 0;
  if (!pZero && !aZero && p.coef * actual.konst === p.konst * actual.coef) return "setara";
  return "berbeda";
}

/**
 * Garis yang diwakili persamaan hasil eliminasi (coef · keep = konst): tegak lurus sumbu variabel
 * yang tersisa. Garis ini SELALU melewati titik potong kedua garis awal.
 */
export function resultLine(o: EliminationOutcome): Equation | null {
  if (o.coef === 0) return null;
  return { a: o.keep === "x" ? o.coef : 0, b: o.keep === "y" ? o.coef : 0, c: o.konst };
}

// ------------------------------------------------------------------ Representasi grafik

/** Rentang sumbu yang cukup untuk menampilkan titik-titik penting (minimal ±10). */
export function niceRange(points: { x: number; y: number }[], min = 10): number {
  const biggest = Math.max(0, ...points.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]));
  const needed = Math.ceil(biggest + 2);
  for (const r of [10, 15, 20, 30, 50]) if (r >= needed && r >= min) return r;
  return 50;
}

// ------------------------------------------------------------------ Uji Pasangan: prediksi

export interface PairPrediction {
  p1: boolean;
  p2: boolean;
}

export function comparePairPrediction(pred: PairPrediction, actual: { ok1: boolean; ok2: boolean }) {
  const match1 = pred.p1 === actual.ok1;
  const match2 = pred.p2 === actual.ok2;
  return { match1, match2, correct: Number(match1) + Number(match2) };
}

// ------------------------------------------------------------------ Metrik untuk event `lab`

const clamp = (n: number) => Math.max(0, Math.min(1000, Math.trunc(Number.isFinite(n) ? n : 0)));

export interface ElimProcess {
  analisisPercobaan: number;
  analisisPetunjuk: number;
  variabelEfisien: boolean | null;
  pengaliPercobaan: number;
  operasiPercobaan: number;
  prediksi: PredictionResult | "dilewati" | null;
  ubahRencana: number;
  petunjukTotal: number;
  grafikDitandai: boolean;
}

/** Metrik proses simulasi eliminasi (maks. 12 kunci, nilai bulat 0–1000; tanpa teks bebas). */
export function elimMetrics(p: ElimProcess): Record<string, number> {
  return {
    analisis_percobaan: clamp(p.analisisPercobaan),
    analisis_petunjuk: clamp(p.analisisPetunjuk),
    variabel_efisien: p.variabelEfisien ? 1 : 0,
    pengali_percobaan: clamp(p.pengaliPercobaan),
    operasi_percobaan: clamp(p.operasiPercobaan),
    prediksi_persis: p.prediksi === "persis" ? 1 : 0,
    prediksi_setara: p.prediksi === "setara" ? 1 : 0,
    prediksi_dilewati: p.prediksi === "dilewati" ? 1 : 0,
    ubah_rencana: clamp(p.ubahRencana),
    petunjuk_total: clamp(p.petunjukTotal),
    grafik_ditandai: p.grafikDitandai ? 1 : 0,
  };
}

export interface CheckerProcess {
  ujiTotal: number;
  prediksiTotal: number;
  /** Jumlah uji yang kedua prediksinya (persamaan 1 dan 2) tepat. */
  prediksiBenar: number;
  lihatSolusi: boolean;
}

export function checkerMetrics(p: CheckerProcess): Record<string, number> {
  return {
    uji_total: clamp(p.ujiTotal),
    prediksi_total: clamp(p.prediksiTotal),
    prediksi_benar: clamp(p.prediksiBenar),
    lihat_solusi: p.lihatSolusi ? 1 : 0,
  };
}
