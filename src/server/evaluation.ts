import "server-only";
import { randomInt } from "node:crypto";
import { formatCorrectAnswer, formatUserAnswer, gradeSet } from "@/lib/questions/grade";
import { toPublicQuestion, type PublicQuestion, type Question, type Topic } from "@/lib/questions/types";
import { EVALUATION_BY_ID, EVALUATION_QUESTIONS } from "./evaluation-bank";

export const EVALUATION_COUNTS = [10, 15, 20, 30] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Memilih soal acak yang merata di semua modul, lalu diurutkan dari mudah ke sulit. */
export function pickEvaluationQuestions(count: number): PublicQuestion[] {
  const n = Math.min(Math.max(count, 5), EVALUATION_QUESTIONS.length);
  const byTopic = new Map<Topic, Question[]>();
  for (const q of shuffle(EVALUATION_QUESTIONS)) {
    byTopic.set(q.topic, [...(byTopic.get(q.topic) ?? []), q]);
  }
  const chosen: Question[] = [];
  const topics = shuffle([...byTopic.keys()]);
  while (chosen.length < n) {
    for (const t of topics) {
      const pool = byTopic.get(t)!;
      if (pool.length && chosen.length < n) chosen.push(pool.shift()!);
    }
  }
  const rank = { mudah: 0, sedang: 1, sulit: 2 };
  return chosen.sort((a, b) => rank[a.difficulty] - rank[b.difficulty]).map(toPublicQuestion);
}

export interface EvaluationReviewItem {
  id: string;
  prompt: string;
  context?: string[];
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string[];
  topic: Topic;
}

export function gradeEvaluation(questionIds: string[], answers: Record<string, string>) {
  const questions = questionIds.map((id) => EVALUATION_BY_ID[id]).filter(Boolean);
  const g = gradeSet(questions, answers);
  const review: EvaluationReviewItem[] = questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    context: q.context,
    isCorrect: g.results[q.id],
    userAnswer: formatUserAnswer(q, answers[q.id]),
    correctAnswer: formatCorrectAnswer(q),
    explanation: q.explanation,
    topic: q.topic,
  }));
  const unanswered = questions.filter((q) => !answers[q.id] || !answers[q.id].trim()).length;
  return { correct: g.correct, total: g.total, wrong: g.total - g.correct - unanswered, unanswered, score: g.score, review };
}
