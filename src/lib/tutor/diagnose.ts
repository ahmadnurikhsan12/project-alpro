import { frac } from "@/lib/math/fraction";
import { satisfies } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";
import { buildDiagnosis, customDiagnosis, type DiagnosisContext } from "./diagnoses";
import { matchErrorModels } from "./error-models";
import { isTutorable, resolveMediation } from "./resolve";
import type { DiagnoseResult, OptionDiagnosis } from "./types";

const NONE: DiagnoseResult = { identified: false, diagnoses: [] };

function fromOption(spec: OptionDiagnosis, ctx: DiagnosisContext, phase: "elaborasi" | "input" | "output") {
  return typeof spec === "string" ? buildDiagnosis(spec as Exclude<typeof spec, "opsi_khusus">, ctx) : customDiagnosis(spec.observe, spec.ask, phase);
}

/**
 * Mengenali pola kesalahan dari SATU jawaban yang salah.
 *
 * Diagnosis hanya diberikan jika jawaban siswa cocok dengan pola yang dikenal (keluaran model
 * kesalahan berbasis spldv.ts, atau pemetaan pilihan ganda yang ditulis tangan). Jika tidak
 * ada yang cocok, hasilnya "belum teridentifikasi" — tidak pernah menebak.
 */
export function diagnose(q: Question, rawAnswer: string): DiagnoseResult {
  if (!isTutorable(q.id)) return NONE;
  const r = resolveMediation(q);
  const ctx: DiagnosisContext = { e1: r.system?.e1, e2: r.system?.e2, eliminate: r.eliminate };

  if (q.type === "number" || q.type === "pair") {
    if (!r.target) return NONE;
    const matches = matchErrorModels(r.target, r.system, rawAnswer);
    if (matches.length === 0) return NONE;
    return {
      identified: true,
      diagnoses: matches.map((m) => buildDiagnosis(m.code as Exclude<typeof m.code, "opsi_khusus">, { ...ctx, correctVar: m.correctVar })),
    };
  }

  if (q.type === "mcq") {
    const spec = r.authored?.options?.[rawAnswer];
    return spec ? { identified: true, diagnoses: [fromOption(spec, ctx, r.phase)] } : NONE;
  }

  // Benar/Salah
  if (r.system && r.pair && q.verify?.kind === "pairCheck") {
    const x = frac(r.pair.x);
    const y = frac(r.pair.y);
    const ok1 = satisfies(r.system.e1, x, y);
    const ok2 = satisfies(r.system.e2, x, y);
    // Menjawab "benar" untuk pasangan yang hanya memenuhi satu persamaan adalah pola yang jelas.
    if (rawAnswer === "true" && ok1 !== ok2) {
      return { identified: true, diagnoses: [buildDiagnosis("tidak_cek_kedua_persamaan", { ...ctx, satisfiedEq: ok1 ? 1 : 2 })] };
    }
    return NONE;
  }
  const spec = r.authored?.tfWrong;
  return spec ? { identified: true, diagnoses: [fromOption(spec, ctx, r.phase)] } : NONE;
}
