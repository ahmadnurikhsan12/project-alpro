import { GAME_BY_ID } from "@/content/games";
import { LESSON_BY_ID } from "@/content/lessons";
import { PRACTICE_BY_ID } from "@/content/practice";
import { gradeAnswer, isAnswerEmpty } from "@/lib/questions/grade";
import type { Question } from "@/lib/questions/types";
import { REFLECTION_PROMPTS, validateReflection, type ReflectionPrompt } from "@/lib/tutor/reflection-prompts";
import { ATTEMPT_RULES } from "./gamification";
import { LAB_TOOLS, type GradedEvent, type GradedQuestion, type QuestionResponse, type RawEvent } from "./types";

export class EventValidationError extends Error {}

const MAX_SET = 30;

function collect(ids: string[], bank: Record<string, Question>): Question[] {
  if (ids.length === 0 || ids.length > MAX_SET) throw new EventValidationError("Jumlah soal tidak valid.");
  if (new Set(ids).size !== ids.length) throw new EventValidationError("Soal duplikat.");
  return ids.map((id) => {
    const q = bank[id];
    if (!q) throw new EventValidationError(`Soal tidak dikenal: ${id}`);
    return q;
  });
}

/**
 * Menilai satu soal dari daftar percobaannya. Setiap jawaban dinilai ulang di sini
 * (klaim "benar pada percobaan ke-n" dari klien tidak dipercaya).
 * - Jawaban kosong tidak dihitung sebagai percobaan.
 * - Jumlah jawaban dibatasi menurut tipe soal (ATTEMPT_RULES.limitsPerSession).
 * - Pemrosesan berhenti pada jawaban benar pertama.
 */
export function gradeQuestionAttempts(q: Question, submitted: readonly (string | undefined)[], hints = 0): GradedQuestion {
  const limit = ATTEMPT_RULES.limitsPerSession[q.type];
  const answers = submitted.filter((a): a is string => typeof a === "string" && !isAnswerEmpty(q, a)).slice(0, limit);
  const results: boolean[] = [];
  let solvedAt: number | null = null;
  for (const a of answers) {
    const ok = gradeAnswer(q, a);
    results.push(ok);
    if (ok) {
      solvedAt = results.length;
      break;
    }
  }
  return {
    id: q.id,
    attempts: results,
    solvedAt,
    hints: Math.max(0, Math.min(ATTEMPT_RULES.maxHints, Math.trunc(Number.isFinite(hints) ? hints : 0))),
    difficulty: q.difficulty,
  };
}

/**
 * Menilai satu sesi soal. Jika klien mengirim `responses`, itulah sumber percobaan;
 * jika tidak (event lama), jawaban akhir tiap soal dianggap satu percobaan.
 */
function gradeSession(questions: Question[], answers: Record<string, string>, responses?: Record<string, QuestionResponse>) {
  const perQuestion = questions.map((q) => {
    const r = responses?.[q.id];
    return gradeQuestionAttempts(q, r?.attempts?.length ? r.attempts : [answers[q.id]], r?.hints ?? 0);
  });
  const solved = perQuestion.filter((g) => g.solvedAt !== null);
  const total = questions.length;
  return {
    kind: "graded" as const,
    correct: solved.length,
    total,
    score: total ? Math.round((solved.length / total) * 100) : 0,
    correctIds: solved.map((g) => g.id),
    perQuestion,
  };
}

export interface GradeOptions {
  /** Bank evaluasi (hanya tersedia di server). Jika kosong, hasil evaluasi diambil dari event.result. */
  evaluationBank?: Record<string, Question>;
  /** Registri prompt refleksi; bawaan: REFLECTION_PROMPTS. */
  reflectionRegistry?: readonly ReflectionPrompt[];
}

/**
 * Menilai event mentah. Di server, fungsi ini menjamin skor/XP berasal dari
 * jawaban yang benar-benar diperiksa, bukan dari angka kiriman frontend.
 */
export function gradeEvent(event: RawEvent, opts: GradeOptions = {}): GradedEvent {
  switch (event.type) {
    case "lesson_open":
      if (!LESSON_BY_ID[event.lessonId]) throw new EventValidationError("Materi tidak dikenal.");
      return { ...event, kind: "lesson_open" };

    case "lesson_quiz": {
      const lesson = LESSON_BY_ID[event.lessonId];
      if (!lesson) throw new EventValidationError("Materi tidak dikenal.");
      return { ...event, ...gradeSession(lesson.quiz, event.answers, event.responses) };
    }

    case "practice": {
      const qs = collect(event.questionIds, PRACTICE_BY_ID);
      return { ...event, ...gradeSession(qs, event.answers, event.responses) };
    }

    case "evaluation": {
      if (opts.evaluationBank) {
        // Evaluasi tidak memiliki percobaan ulang atau petunjuk: satu jawaban per soal.
        const qs = collect(event.questionIds, opts.evaluationBank);
        return { ...event, ...gradeSession(qs, event.answers) };
      }
      const r = event.result;
      if (!r || r.total !== event.questionIds.length || r.correct < 0 || r.correct > r.total) {
        throw new EventValidationError("Hasil evaluasi tidak valid.");
      }
      return {
        ...event,
        kind: "graded",
        correct: r.correct,
        total: r.total,
        score: r.total ? Math.round((r.correct / r.total) * 100) : 0,
        correctIds: [],
        perQuestion: [],
      };
    }

    case "game": {
      const meta = GAME_BY_ID[event.gameId];
      if (!meta) throw new EventValidationError("Game tidak dikenal.");
      const { score, correct, total, durationSec } = event;
      const ints = [score, correct, total, durationSec].every((n) => Number.isFinite(n) && n >= 0);
      if (!ints) throw new EventValidationError("Data permainan tidak valid.");
      if (score > meta.maxScore) throw new EventValidationError("Skor melebihi batas maksimum permainan.");
      if (correct > total || total > meta.maxTotal) throw new EventValidationError("Jumlah soal permainan tidak wajar.");
      if (total > 0 && durationSec < total * meta.minSecondsPerItem) {
        throw new EventValidationError("Waktu permainan terlalu singkat untuk dianggap wajar.");
      }
      const percent = Math.min(100, Math.round((score / meta.targetScore) * 100));
      return { ...event, kind: "game", percent };
    }

    case "lab":
      if (!LAB_TOOLS.includes(event.tool)) throw new EventValidationError("Alat lab tidak dikenal.");
      return { ...event, kind: "lab" };

    case "reflection": {
      const problem = validateReflection(opts.reflectionRegistry ?? REFLECTION_PROMPTS, event);
      if (problem) throw new EventValidationError(problem);
      return { ...event, kind: "reflection" };
    }
  }
}
