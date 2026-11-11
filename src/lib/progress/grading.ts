import { GAME_BY_ID } from "@/content/games";
import { LESSON_BY_ID } from "@/content/lessons";
import { PRACTICE_BY_ID } from "@/content/practice";
import { gradeSet } from "@/lib/questions/grade";
import type { Question } from "@/lib/questions/types";
import { LAB_TOOLS, type GradedEvent, type RawEvent } from "./types";

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

function graded(answers: Record<string, string>, questions: Question[]) {
  const g = gradeSet(questions, answers);
  return {
    correct: g.correct,
    total: g.total,
    score: g.score,
    correctIds: questions.filter((q) => g.results[q.id]).map((q) => q.id),
  };
}

export interface GradeOptions {
  /** Bank evaluasi (hanya tersedia di server). Jika kosong, hasil evaluasi diambil dari event.result. */
  evaluationBank?: Record<string, Question>;
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
      return { ...event, kind: "graded", ...graded(event.answers, lesson.quiz) };
    }

    case "practice": {
      const qs = collect(event.questionIds, PRACTICE_BY_ID);
      return { ...event, kind: "graded", ...graded(event.answers, qs) };
    }

    case "evaluation": {
      if (opts.evaluationBank) {
        const qs = collect(event.questionIds, opts.evaluationBank);
        return { ...event, kind: "graded", ...graded(event.answers, qs) };
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
  }
}
