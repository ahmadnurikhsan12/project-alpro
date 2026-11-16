/**
 * Registri prompt refleksi.
 *
 * Refleksi hanya berupa PILIHAN atau SKALA — tidak ada teks bebas — supaya:
 *  - tidak ada data pribadi yang ikut tersimpan/terkirim,
 *  - jawaban dapat divalidasi (server maupun Guest Mode) dan dianalisis tanpa AI.
 *
 * Isi registri ditambahkan pada Tahap 3–4 (Lab, Tebak Nilai, Eliminasi Kilat, materi).
 * Selama registri kosong, event refleksi yang berisi jawaban akan ditolak;
 * event refleksi yang "dilewati" (skipped) tetap sah.
 */
export const REFLECTION_CONTEXTS = [
  "lab_elimination",
  "lab_checker",
  "tebak_nilai",
  "eliminasi_kilat",
  "practice_session",
  "lesson",
  "diagnostic",
] as const;

export type ReflectionContext = (typeof REFLECTION_CONTEXTS)[number];

export const REFLECTION_CONTEXT_LABEL: Record<ReflectionContext, string> = {
  lab_elimination: "Simulasi Eliminasi",
  lab_checker: "Uji Pasangan",
  tebak_nilai: "Tebak Nilai Variabel",
  eliminasi_kilat: "Eliminasi Kilat",
  practice_session: "Sesi Latihan",
  lesson: "Materi",
  diagnostic: "Diagnostik",
};

export type ReflectionPrompt =
  | { id: string; context: ReflectionContext; kind: "choice"; options: readonly string[] }
  | { id: string; context: ReflectionContext; kind: "scale"; min: number; max: number };

export type ReflectionValue = string | number;

export const MAX_REFLECTION_RESPONSES = 12;

/** Diisi pada Tahap 3–4. */
export const REFLECTION_PROMPTS: readonly ReflectionPrompt[] = [];

export interface ReflectionPayload {
  context: ReflectionContext;
  responses: Record<string, ReflectionValue>;
  skipped?: boolean;
}

/** Mengembalikan pesan kesalahan, atau null jika refleksi valid terhadap registri. */
export function validateReflection(registry: readonly ReflectionPrompt[], payload: ReflectionPayload): string | null {
  const entries = Object.entries(payload.responses);
  if (payload.skipped) return entries.length ? "Refleksi yang dilewati tidak boleh memuat jawaban." : null;
  if (entries.length === 0) return "Refleksi tidak memuat jawaban.";
  if (entries.length > MAX_REFLECTION_RESPONSES) return "Terlalu banyak jawaban refleksi.";
  for (const [promptId, value] of entries) {
    const prompt = registry.find((p) => p.id === promptId && p.context === payload.context);
    if (!prompt) return `Prompt refleksi tidak dikenal: ${promptId}`;
    if (prompt.kind === "choice") {
      if (typeof value !== "string" || !prompt.options.includes(value)) return `Jawaban tidak valid untuk ${promptId}`;
    } else if (typeof value !== "number" || !Number.isInteger(value) || value < prompt.min || value > prompt.max) {
      return `Jawaban tidak valid untuk ${promptId}`;
    }
  }
  return null;
}
