import type { GameId } from "@/content/games";
import type { Difficulty } from "@/lib/math/spldv";

export type LessonStatus = "in_progress" | "completed";
export type LabTool = "checker" | "elimination" | "graph";
export const LAB_TOOLS: LabTool[] = ["checker", "elimination", "graph"];

export interface LessonProgress {
  lessonId: string;
  status: LessonStatus;
  openedAt: string;
  completedAt: string | null;
  bestQuizScore: number;
}

export type AttemptKind = "lesson_quiz" | "practice" | "evaluation" | "game";

export interface AttemptRecord {
  id: string;
  kind: AttemptKind;
  refId: string;
  title: string;
  score: number; // 0..100 (persentase)
  rawScore?: number; // poin game
  correct: number;
  total: number;
  xp: number;
  difficulty?: Difficulty;
  createdAt: string;
}

export type ActivityType =
  | "lesson_open"
  | "lesson_quiz"
  | "lesson_complete"
  | "practice"
  | "evaluation"
  | "game"
  | "lab"
  | "achievement"
  | "level_up";

export interface ActivityRecord {
  id: string;
  type: ActivityType;
  refId: string;
  title: string;
  detail: string;
  xp: number;
  createdAt: string;
}

export interface Counters {
  /** Soal yang sudah pernah memberi XP (anti-farming) */
  rewardedQuestions: string[];
  labTools: LabTool[];
  /** Persentase terbaik per game */
  gamesBest: Partial<Record<GameId, number>>;
  practiceSessions: number;
  evaluations: number;
  bestEvaluation: number;
  lastEvaluation: number | null;
  answered: number;
  correctAnswers: number;
  /** Penghitung harian, kunci "YYYY-MM-DD:sumber" */
  daily: Record<string, number>;
}

export interface ProgressState {
  version: 1;
  xp: number;
  lessons: Record<string, LessonProgress>;
  achievements: Record<string, string>; // id -> earnedAt
  counters: Counters;
  attempts: AttemptRecord[]; // terbaru di depan
  activity: ActivityRecord[]; // terbaru di depan
  updatedAt: string;
}

// ---------------------------------------------------------------- Events

interface BaseEvent {
  id: string; // UUID dibuat klien; dipakai untuk mencegah duplikasi
  at: string; // ISO timestamp
}

export type RawEvent =
  | (BaseEvent & { type: "lesson_open"; lessonId: string })
  | (BaseEvent & { type: "lesson_quiz"; lessonId: string; answers: Record<string, string> })
  | (BaseEvent & { type: "practice"; difficulty: Difficulty; questionIds: string[]; answers: Record<string, string> })
  | (BaseEvent & {
      type: "evaluation";
      questionIds: string[];
      answers: Record<string, string>;
      durationSec: number;
      /** Hasil yang dinilai server — hanya dipercaya di Guest Mode (lokal) */
      result?: { correct: number; total: number; score: number };
    })
  | (BaseEvent & {
      type: "game";
      gameId: GameId;
      difficulty: Difficulty;
      score: number;
      correct: number;
      total: number;
      durationSec: number;
    })
  | (BaseEvent & { type: "lab"; tool: LabTool });

export type GradedEvent =
  | (Extract<RawEvent, { type: "lesson_open" }> & { kind: "lesson_open" })
  | (Extract<RawEvent, { type: "lesson_quiz" }> & { kind: "graded"; correct: number; total: number; score: number; correctIds: string[] })
  | (Extract<RawEvent, { type: "practice" }> & { kind: "graded"; correct: number; total: number; score: number; correctIds: string[] })
  | (Extract<RawEvent, { type: "evaluation" }> & { kind: "graded"; correct: number; total: number; score: number; correctIds: string[] })
  | (Extract<RawEvent, { type: "game" }> & { kind: "game"; percent: number })
  | (Extract<RawEvent, { type: "lab" }> & { kind: "lab" });

export interface ApplyResult {
  state: ProgressState;
  accepted: boolean;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  newAchievements: string[];
  /** Perubahan untuk disimpan ke database (Email Mode) */
  delta: {
    lessons: LessonProgress[];
    attempt: AttemptRecord | null;
    activities: ActivityRecord[];
    achievements: { id: string; earnedAt: string }[];
  };
  message?: string;
}

export interface EventOutcome {
  accepted: boolean;
  xpGained: number;
  levelUp: boolean;
  levelAfter: number;
  newAchievements: string[];
  message?: string;
}
