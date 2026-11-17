import "server-only";
import { ASSESSMENT_SKILLS, ITEMS_PER_FORM, scoreOf, type AssessmentSkill, type FormId } from "@/lib/assessment/blueprint";
import { gradeAnswer, isAnswerEmpty } from "@/lib/questions/grade";
import { toPublicQuestion, type PublicQuestion } from "@/lib/questions/types";
import { ASSESSMENT_FORMS } from "./assessment-bank";

/** Butir TANPA kunci, pembahasan, atau metadata kompetensi. Urutan tetap agar sebanding antarpeserta. */
export function publicAssessmentItems(form: FormId): PublicQuestion[] {
  return ASSESSMENT_FORMS[form].map((q) => toPublicQuestion(q));
}

export interface AssessmentResult {
  form: FormId;
  correct: number;
  total: number;
  score: number;
  /** Per butir: hanya benar/salah (0/1); kunci tidak dikirim. */
  items: { id: string; slot: number; skill: AssessmentSkill; correct: 0 | 1; answered: 0 | 1 }[];
  bySkill: Record<AssessmentSkill, { correct: number; total: number }>;
}

/**
 * Penilaian yang konsisten dan dapat dipertanggungjawabkan:
 * - 1 poin per butir benar, tanpa nilai parsial, tanpa pengurangan untuk jawaban salah/kosong;
 * - setiap jawaban dinilai oleh `gradeAnswer` yang sama dengan Latihan dan Evaluasi Akhir
 *   (bilangan pecahan dinormalisasi; pasangan (x, y) harus tepat);
 * - jawaban kosong dihitung salah dan dicatat terpisah (`answered`);
 * - skor = benar ÷ jumlah butir × 100, dibulatkan (`scoreOf`).
 */
export function gradeAssessment(form: FormId, answers: Record<string, string>): AssessmentResult {
  const items = ASSESSMENT_FORMS[form];
  const bySkill = Object.fromEntries(ASSESSMENT_SKILLS.map((s) => [s, { correct: 0, total: 0 }])) as AssessmentResult["bySkill"];
  const rows = items.map((q) => {
    const raw = answers[q.id];
    const answered = !isAnswerEmpty(q, raw);
    const ok = answered && gradeAnswer(q, raw);
    bySkill[q.skill].total += 1;
    if (ok) bySkill[q.skill].correct += 1;
    return { id: q.id, slot: q.slot, skill: q.skill, correct: (ok ? 1 : 0) as 0 | 1, answered: (answered ? 1 : 0) as 0 | 1 };
  });
  const correct = rows.reduce((s, r) => s + r.correct, 0);
  return { form, correct, total: ITEMS_PER_FORM, score: scoreOf(correct, ITEMS_PER_FORM), items: rows, bySkill };
}
