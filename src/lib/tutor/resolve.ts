import { MEDIATION_BY_ID } from "@/content/mediation";
import { ALL_LESSON_QUIZ_QUESTIONS } from "@/content/lessons";
import { PRACTICE_BY_ID } from "@/content/practice";
import { easiestVariable, type Variable } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";
import type { System } from "./error-models";
import type { CognitivePhase, QuestionMediation, SkillCode, TargetSpec } from "./types";

const LESSON_QUIZ_IDS = new Set(ALL_LESSON_QUIZ_QUESTIONS.map((q) => q.id));

/**
 * Tutor hanya boleh bekerja untuk Latihan dan Mini Quiz. Soal Evaluasi Akhir (bank khusus server)
 * tidak pernah tutorable: tidak ada petunjuk, diagnosis, atau percobaan ulang untuknya.
 */
export function isTutorable(id: string): boolean {
  return Object.hasOwn(PRACTICE_BY_ID, id) || LESSON_QUIZ_IDS.has(id);
}

const DEFAULT_PHASE: Record<SkillCode, CognitivePhase> = {
  pilih_operasi: "elaborasi",
  samakan_koefisien: "elaborasi",
  hitung_eliminasi: "elaborasi",
  substitusi: "elaborasi",
  periksa_solusi: "output",
  ruas_kanan: "elaborasi",
  tanda: "output",
  konsep: "input",
};

export interface Resolved {
  question: Question;
  /** Metadata tulisan tangan (jika ada). */
  authored?: QuestionMediation;
  skill: SkillCode;
  phase: CognitivePhase;
  target?: TargetSpec;
  system?: System;
  /** Titik uji pasangan (soal Benar/Salah berbasis pemeriksaan). */
  pair?: { x: number; y: number };
  eliminate?: Variable;
}

/** Menggabungkan metadata tulisan tangan dengan yang dapat diturunkan dari soal (verify). */
export function resolveMediation(q: Question): Resolved {
  const authored = MEDIATION_BY_ID[q.id];
  const v = q.verify;
  const system: System | undefined = v ? { e1: v.e1, e2: v.e2 } : undefined;
  const skill: SkillCode = authored?.skill ?? (v?.kind === "pairCheck" ? "periksa_solusi" : v ? "hitung_eliminasi" : "konsep");

  // Pasangan (x, y) dapat dikenali otomatis hanya jika kuncinya memang pasangan penyelesaian sistem itu.
  let target = authored?.target;
  if (!target && q.type === "pair" && v?.kind === "solution" && q.answer === `${v.x},${v.y}`) target = { kind: "pair" };

  return {
    question: q,
    authored,
    skill,
    phase: authored?.phase ?? DEFAULT_PHASE[skill],
    target,
    system,
    pair: v?.kind === "pairCheck" ? { x: v.x, y: v.y } : undefined,
    eliminate: authored?.eliminate ?? (target && "eliminate" in target ? target.eliminate : undefined) ?? (system ? easiestVariable(system.e1, system.e2) : undefined),
  };
}
