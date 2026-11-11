import { GAME_IDS } from "@/content/games";
import { LESSONS } from "@/content/lessons";
import { PRACTICE_BY_ID } from "@/content/practice";
import type { Difficulty } from "@/lib/math/spldv";
import { LAB_TOOLS, type ProgressState } from "./types";

// ------------------------------------------------------------------ Level

export const LEVELS = [
  { level: 1, xp: 0, title: "Pemula" },
  { level: 2, xp: 100, title: "Penjelajah Angka" },
  { level: 3, xp: 250, title: "Pengamat Variabel" },
  { level: 4, xp: 450, title: "Penyusun Model" },
  { level: 5, xp: 700, title: "Pengeliminasi" },
  { level: 6, xp: 1000, title: "Pemecah Sistem" },
  { level: 7, xp: 1350, title: "Analis SPLDV" },
  { level: 8, xp: 1750, title: "Ahli Eliminasi" },
  { level: 9, xp: 2200, title: "Master Persamaan" },
  { level: 10, xp: 2750, title: "Legenda MathQuest" },
] as const;

export function levelFromXp(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  const next = LEVELS.find((l) => l.xp > xp) ?? null;
  const span = next ? next.xp - current.xp : 1;
  const into = next ? xp - current.xp : 1;
  return {
    level: current.level,
    title: current.title,
    currentXp: current.xp,
    nextXp: next?.xp ?? null,
    progress: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

// ------------------------------------------------------------------ XP rules

export const XP_RULES = {
  lessonOpen: 5,
  lessonComplete: 40,
  lessonQuizPerNewCorrect: 5,
  lessonPassScore: 60,
  practicePerNewCorrect: { mudah: 10, sedang: 15, sulit: 20 } as Record<Difficulty, number>,
  practiceSessionBonus: 5,
  practiceSessionBonusDailyLimit: 5,
  evaluationBase: 10,
  evaluationDailyLimit: 3,
  gameBase: { mudah: 30, sedang: 45, sulit: 60 } as Record<Difficulty, number>,
  gameDailyLimitPerGame: 3,
  labPerToolPerDay: 15,
} as const;

// ------------------------------------------------------------------ Achievements

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: "sprout" | "variable" | "zap" | "search" | "book" | "trophy" | "target" | "flask" | "gamepad" | "crown" | "flame" | "star";
  xp: number;
  check: (s: ProgressState) => boolean;
}

const completed = (s: ProgressState, ids: string[]) => ids.every((id) => s.lessons[id]?.status === "completed");
const storySolved = (s: ProgressState) =>
  s.counters.rewardedQuestions.filter((id) => PRACTICE_BY_ID[id]?.format === "cerita").length;

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "pemula-spldv",
    title: "Pemula SPLDV",
    description: "Menyelesaikan modul pertama.",
    icon: "sprout",
    xp: 20,
    check: (s) => Object.values(s.lessons).some((l) => l.status === "completed"),
  },
  {
    id: "ahli-variabel",
    title: "Ahli Variabel",
    description: "Menyelesaikan Modul 1, 2, dan 3.",
    icon: "variable",
    xp: 40,
    check: (s) => completed(s, ["m1", "m2", "m3"]),
  },
  {
    id: "master-eliminasi",
    title: "Master Eliminasi",
    description: "Menyelesaikan Modul 4, 5, 6 dan menjalankan Simulasi Eliminasi.",
    icon: "zap",
    xp: 60,
    check: (s) => completed(s, ["m4", "m5", "m6"]) && s.counters.labTools.includes("elimination"),
  },
  {
    id: "detektif-matematika",
    title: "Detektif Matematika",
    description: "Meraih minimal 70% di game Detektif Variabel.",
    icon: "search",
    xp: 40,
    check: (s) => (s.counters.gamesBest["detektif-variabel"] ?? 0) >= 70,
  },
  {
    id: "penakluk-soal-cerita",
    title: "Penakluk Soal Cerita",
    description: "Menjawab benar 5 soal cerita berbeda di Latihan.",
    icon: "book",
    xp: 50,
    check: (s) => storySolved(s) >= 5,
  },
  {
    id: "juara-tantangan",
    title: "Juara Tantangan",
    description: "Meraih minimal 80% di Tantangan SPLDV.",
    icon: "trophy",
    xp: 60,
    check: (s) => (s.counters.gamesBest["tantangan-spldv"] ?? 0) >= 80,
  },
  {
    id: "rajin-berlatih",
    title: "Rajin Berlatih",
    description: "Menyelesaikan 10 sesi latihan.",
    icon: "flame",
    xp: 40,
    check: (s) => s.counters.practiceSessions >= 10,
  },
  {
    id: "penjelajah-lab",
    title: "Penjelajah Lab",
    description: "Mencoba ketiga alat di SPLDV Lab.",
    icon: "flask",
    xp: 30,
    check: (s) => LAB_TOOLS.every((t) => s.counters.labTools.includes(t)),
  },
  {
    id: "gamer-matematika",
    title: "Gamer Matematika",
    description: "Memainkan ketujuh game edukatif.",
    icon: "gamepad",
    xp: 50,
    check: (s) => GAME_IDS.every((g) => s.counters.gamesBest[g] !== undefined),
  },
  {
    id: "lulus-evaluasi",
    title: "Lulus Evaluasi",
    description: "Meraih nilai minimal 75 pada Evaluasi Akhir.",
    icon: "target",
    xp: 50,
    check: (s) => s.counters.bestEvaluation >= 75,
  },
  {
    id: "nilai-sempurna",
    title: "Nilai Sempurna",
    description: "Meraih nilai 100 pada Evaluasi Akhir.",
    icon: "star",
    xp: 80,
    check: (s) => s.counters.bestEvaluation >= 100,
  },
  {
    id: "tuntas-spldv",
    title: "Tuntas SPLDV",
    description: "Menyelesaikan seluruh 7 modul materi.",
    icon: "crown",
    xp: 100,
    check: (s) => completed(s, LESSONS.map((l) => l.id)),
  },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, AchievementDef>;
