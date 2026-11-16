import type { GameId } from "@/content/games";
import type { Difficulty } from "@/lib/math/spldv";
import type { ReflectionContext, ReflectionValue } from "@/lib/tutor/reflection-prompts";

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

/** Rincian per soal pada satu sesi Latihan/Mini Quiz. */
export interface AttemptQuestionDetail {
  attempts: number; // jawaban yang diproses pada sesi ini
  solvedAt: number | null; // percobaan ke-berapa (kumulatif) soal ini pertama kali benar pada sesi ini, atau null
  hints: number; // petunjuk yang dibuka pada sesi ini
  xp: number; // XP yang diberikan untuk soal ini pada sesi ini
}

export interface AttemptDetail {
  /** Nilai "mandiri": % soal benar pada jawaban pertama tanpa petunjuk. */
  firstTry: number;
  questions: Record<string, AttemptQuestionDetail>;
}

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
  /** Nilai mandiri (% benar pada percobaan pertama tanpa petunjuk). Hanya ada untuk Latihan/Mini Quiz. */
  firstTry?: number;
  detail?: AttemptDetail;
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
  | "reflection"
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

/** Statistik kumulatif per soal (kunci: id soal; mini quiz memakai awalan "lesson:"). */
export interface QuestionStat {
  /** Jumlah jawaban yang pernah diproses untuk soal ini (kumulatif). */
  attempts: number;
  /** Percobaan (kumulatif) ke-berapa soal ini pertama kali benar; null jika belum pernah benar. */
  solvedAt: number | null;
  /** XP yang sudah diberikan untuk soal ini (maksimal sekali). */
  xp: number;
  /** Jumlah petunjuk yang dibuka (kumulatif). */
  hints: number;
  /** Benar pada percobaan ke-1 tanpa petunjuk. */
  independent: boolean;
  /** Data hasil pemulihan dari progres lama (sebelum percobaan dicatat). */
  legacy?: true;
}

export interface Counters {
  /**
   * Soal yang pernah dijawab benar (kunci: id soal; mini quiz memakai awalan "lesson:").
   * Nama dipertahankan agar progres lama tetap terbaca. Soal yang benar pada
   * percobaan ke-3 dst. (0 XP) tetap masuk daftar ini.
   */
  rewardedQuestions: string[];
  /** Statistik percobaan & petunjuk per soal (pilot RMT). */
  questionStats: Record<string, QuestionStat>;
  /** Jumlah refleksi terisi / dilewati. */
  reflections: number;
  reflectionsSkipped: number;
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

/** Semua percobaan siswa pada satu soal dalam satu sesi, berurutan. */
export interface QuestionResponse {
  attempts: string[];
  /** Banyak petunjuk bertingkat yang dibuka (0–4). */
  hints?: number;
}

/** Metrik ringkas Learning Activity (nama kunci ditentukan per aktivitas pada Tahap 3–4). */
export type LearningMetrics = Record<string, number>;

export type RawEvent =
  | (BaseEvent & { type: "lesson_open"; lessonId: string })
  | (BaseEvent & {
      type: "lesson_quiz";
      lessonId: string;
      /** Jawaban akhir per soal (dipertahankan agar event lama tetap sah). */
      answers: Record<string, string>;
      /** Jika ada, dipakai sebagai sumber percobaan; jika tidak, tiap soal dianggap satu percobaan. */
      responses?: Record<string, QuestionResponse>;
    })
  | (BaseEvent & {
      type: "practice";
      difficulty: Difficulty;
      questionIds: string[];
      answers: Record<string, string>;
      responses?: Record<string, QuestionResponse>;
    })
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
      la?: LearningMetrics;
    })
  | (BaseEvent & { type: "lab"; tool: LabTool; la?: LearningMetrics })
  | (BaseEvent & {
      type: "reflection";
      context: ReflectionContext;
      refId: string;
      /** Hanya pilihan/skala, tanpa teks bebas. */
      responses: Record<string, ReflectionValue>;
      skipped?: boolean;
    });

/** Hasil penilaian ulang satu soal (dilakukan oleh mesin, bukan dipercaya dari klien). */
export interface GradedQuestion {
  id: string;
  /** Hasil tiap jawaban yang diproses; berhenti pada jawaban benar pertama. */
  attempts: boolean[];
  /** Nomor jawaban (pada sesi ini, mulai 1) yang pertama benar, atau null. */
  solvedAt: number | null;
  hints: number;
  difficulty: Difficulty;
}

interface GradedSetFields {
  kind: "graded";
  correct: number;
  total: number;
  score: number;
  correctIds: string[];
  perQuestion: GradedQuestion[];
}

export type GradedEvent =
  | (Extract<RawEvent, { type: "lesson_open" }> & { kind: "lesson_open" })
  | (Extract<RawEvent, { type: "lesson_quiz" }> & GradedSetFields)
  | (Extract<RawEvent, { type: "practice" }> & GradedSetFields)
  | (Extract<RawEvent, { type: "evaluation" }> & GradedSetFields)
  | (Extract<RawEvent, { type: "game" }> & { kind: "game"; percent: number })
  | (Extract<RawEvent, { type: "lab" }> & { kind: "lab" })
  | (Extract<RawEvent, { type: "reflection" }> & { kind: "reflection" });

/** Catatan pembelajaran terperinci (refleksi, metrik Learning Activity) untuk disimpan terpisah. */
export interface LearningRecord {
  id: string; // sama dengan id event
  kind: "reflection" | "lab_la" | "game_la";
  refId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

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
    learning: LearningRecord[];
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
