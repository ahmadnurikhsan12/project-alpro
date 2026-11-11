import { GAME_BY_ID } from "@/content/games";
import { LESSON_BY_ID } from "@/content/lessons";
import { PRACTICE_BY_ID } from "@/content/practice";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, levelFromXp, XP_RULES } from "./gamification";
import type { ActivityRecord, ApplyResult, AttemptRecord, GradedEvent, LessonProgress, ProgressState } from "./types";

export const MAX_ATTEMPTS = 200;
export const MAX_ACTIVITY = 300;

const LAB_TITLE = { checker: "Uji Pasangan Nilai", elimination: "Simulasi Eliminasi", graph: "Grafik SPLDV" } as const;
const DIFF_LABEL = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" } as const;

export function createInitialState(now = new Date().toISOString()): ProgressState {
  return {
    version: 1,
    xp: 0,
    lessons: {},
    achievements: {},
    counters: {
      rewardedQuestions: [],
      labTools: [],
      gamesBest: {},
      practiceSessions: 0,
      evaluations: 0,
      bestEvaluation: 0,
      lastEvaluation: null,
      answered: 0,
      correctAnswers: 0,
      daily: {},
    },
    attempts: [],
    activity: [],
    updatedAt: now,
  };
}

const dayKey = (iso: string) => iso.slice(0, 10);

/** Membuang penghitung harian lebih dari 7 hari agar data tetap kecil. */
function pruneDaily(daily: Record<string, number>, nowIso: string): Record<string, number> {
  const cutoff = new Date(new Date(nowIso).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  return Object.fromEntries(Object.entries(daily).filter(([k]) => k.slice(0, 10) >= cutoff));
}

function clone(s: ProgressState): ProgressState {
  return {
    ...s,
    lessons: { ...s.lessons },
    achievements: { ...s.achievements },
    counters: {
      ...s.counters,
      rewardedQuestions: [...s.counters.rewardedQuestions],
      labTools: [...s.counters.labTools],
      gamesBest: { ...s.counters.gamesBest },
      daily: { ...s.counters.daily },
    },
    attempts: [...s.attempts],
    activity: [...s.activity],
  };
}

/**
 * Menerapkan satu event yang sudah dinilai ke state.
 * Fungsi murni & deterministik: dipakai di browser (Guest Mode) dan di server
 * (Email Mode & migrasi), sehingga aturan XP selalu sama.
 */
export function applyEvent(prev: ProgressState, ev: GradedEvent): ApplyResult {
  const s = clone(prev);
  const at = ev.at;
  const day = dayKey(at);
  const levelBefore = levelFromXp(prev.xp).level;
  const activities: ActivityRecord[] = [];
  const lessonsChanged: LessonProgress[] = [];
  let attempt: AttemptRecord | null = null;
  let xp = 0;
  let message: string | undefined;

  const bump = (key: string) => {
    const k = `${day}:${key}`;
    s.counters.daily[k] = (s.counters.daily[k] ?? 0) + 1;
    return s.counters.daily[k];
  };
  const dailyCount = (key: string) => s.counters.daily[`${day}:${key}`] ?? 0;
  const reward = (ids: string[], per: (id: string) => number) => {
    let gained = 0;
    for (const id of ids) {
      if (!s.counters.rewardedQuestions.includes(id)) {
        s.counters.rewardedQuestions.push(id);
        gained += per(id);
      }
    }
    return gained;
  };
  const countAnswers = (correct: number, total: number) => {
    s.counters.answered += total;
    s.counters.correctAnswers += correct;
  };

  switch (ev.type) {
    case "lesson_open": {
      if (s.lessons[ev.lessonId]) {
        return { state: prev, accepted: false, xpGained: 0, levelBefore, levelAfter: levelBefore, newAchievements: [], delta: emptyDelta() };
      }
      const lp: LessonProgress = { lessonId: ev.lessonId, status: "in_progress", openedAt: at, completedAt: null, bestQuizScore: 0 };
      s.lessons[ev.lessonId] = lp;
      lessonsChanged.push(lp);
      xp = XP_RULES.lessonOpen;
      activities.push({
        id: ev.id,
        type: "lesson_open",
        refId: ev.lessonId,
        title: `Membuka ${LESSON_BY_ID[ev.lessonId].title}`,
        detail: "Mulai mempelajari modul",
        xp,
        createdAt: at,
      });
      break;
    }

    case "lesson_quiz": {
      const lesson = LESSON_BY_ID[ev.lessonId];
      const existing = s.lessons[ev.lessonId];
      const lp: LessonProgress = existing
        ? { ...existing }
        : { lessonId: ev.lessonId, status: "in_progress", openedAt: at, completedAt: null, bestQuizScore: 0 };
      xp = reward(ev.correctIds.map((id) => `lesson:${id}`), () => XP_RULES.lessonQuizPerNewCorrect);
      lp.bestQuizScore = Math.max(lp.bestQuizScore, ev.score);
      const passed = ev.score >= XP_RULES.lessonPassScore;
      const newlyCompleted = passed && lp.status !== "completed";
      if (newlyCompleted) {
        lp.status = "completed";
        lp.completedAt = at;
        xp += XP_RULES.lessonComplete;
      }
      s.lessons[ev.lessonId] = lp;
      lessonsChanged.push(lp);
      countAnswers(ev.correct, ev.total);
      attempt = {
        id: ev.id,
        kind: "lesson_quiz",
        refId: ev.lessonId,
        title: `Mini Quiz: ${lesson.title}`,
        score: ev.score,
        correct: ev.correct,
        total: ev.total,
        xp,
        createdAt: at,
      };
      activities.push({
        id: ev.id,
        type: newlyCompleted ? "lesson_complete" : "lesson_quiz",
        refId: ev.lessonId,
        title: newlyCompleted ? `Menyelesaikan ${lesson.title}` : `Mini Quiz ${lesson.title}`,
        detail: `${ev.correct}/${ev.total} benar (nilai ${ev.score})${passed ? "" : " — belum lulus, minimal 60"}`,
        xp,
        createdAt: at,
      });
      message = passed ? (newlyCompleted ? "Modul selesai!" : "Mini quiz lulus.") : "Nilai minimal untuk menyelesaikan modul adalah 60. Coba lagi!";
      break;
    }

    case "practice": {
      xp = reward(ev.correctIds, (id) => XP_RULES.practicePerNewCorrect[PRACTICE_BY_ID[id]?.difficulty ?? "mudah"]);
      if (ev.correct > 0 && dailyCount("practice") < XP_RULES.practiceSessionBonusDailyLimit) {
        xp += XP_RULES.practiceSessionBonus;
      }
      bump("practice");
      s.counters.practiceSessions += 1;
      countAnswers(ev.correct, ev.total);
      attempt = {
        id: ev.id,
        kind: "practice",
        refId: `latihan-${ev.difficulty}`,
        title: `Latihan ${DIFF_LABEL[ev.difficulty]}`,
        score: ev.score,
        correct: ev.correct,
        total: ev.total,
        xp,
        difficulty: ev.difficulty,
        createdAt: at,
      };
      activities.push({
        id: ev.id,
        type: "practice",
        refId: attempt.refId,
        title: attempt.title,
        detail: `${ev.correct}/${ev.total} benar (nilai ${ev.score})`,
        xp,
        createdAt: at,
      });
      if (xp === 0 && ev.correct > 0) message = "Soal ini sudah pernah memberi XP. Coba soal lain untuk XP baru!";
      break;
    }

    case "evaluation": {
      const count = dailyCount("evaluation");
      xp = count < XP_RULES.evaluationDailyLimit ? XP_RULES.evaluationBase + Math.round(ev.score / 2) : 0;
      bump("evaluation");
      s.counters.evaluations += 1;
      s.counters.lastEvaluation = ev.score;
      s.counters.bestEvaluation = Math.max(s.counters.bestEvaluation, ev.score);
      countAnswers(ev.correct, ev.total);
      attempt = {
        id: ev.id,
        kind: "evaluation",
        refId: "evaluasi-akhir",
        title: "Evaluasi Akhir SPLDV",
        score: ev.score,
        correct: ev.correct,
        total: ev.total,
        xp,
        createdAt: at,
      };
      activities.push({
        id: ev.id,
        type: "evaluation",
        refId: "evaluasi-akhir",
        title: "Evaluasi Akhir SPLDV",
        detail: `Nilai ${ev.score} (${ev.correct}/${ev.total} benar)`,
        xp,
        createdAt: at,
      });
      if (xp === 0) message = "Batas XP evaluasi hari ini sudah tercapai; nilai tetap tercatat.";
      break;
    }

    case "game": {
      const meta = GAME_BY_ID[ev.gameId];
      const plays = dailyCount(`game:${ev.gameId}`);
      xp = plays < XP_RULES.gameDailyLimitPerGame ? Math.round((XP_RULES.gameBase[ev.difficulty] * ev.percent) / 100) : 0;
      bump(`game:${ev.gameId}`);
      s.counters.gamesBest[ev.gameId] = Math.max(s.counters.gamesBest[ev.gameId] ?? 0, ev.percent);
      attempt = {
        id: ev.id,
        kind: "game",
        refId: ev.gameId,
        title: meta.title,
        score: ev.percent,
        rawScore: ev.score,
        correct: ev.correct,
        total: ev.total,
        xp,
        difficulty: ev.difficulty,
        createdAt: at,
      };
      activities.push({
        id: ev.id,
        type: "game",
        refId: ev.gameId,
        title: `Bermain ${meta.title}`,
        detail: `${ev.score} poin (${DIFF_LABEL[ev.difficulty]})`,
        xp,
        createdAt: at,
      });
      if (xp === 0 && plays >= XP_RULES.gameDailyLimitPerGame) {
        message = `XP untuk ${meta.title} hari ini sudah maksimal (${XP_RULES.gameDailyLimitPerGame} permainan). Skor tetap tercatat.`;
      }
      break;
    }

    case "lab": {
      const key = `lab:${ev.tool}`;
      if (dailyCount(key) > 0) {
        if (s.counters.labTools.includes(ev.tool)) {
          return { state: prev, accepted: false, xpGained: 0, levelBefore, levelAfter: levelBefore, newAchievements: [], delta: emptyDelta() };
        }
      }
      bump(key);
      if (!s.counters.labTools.includes(ev.tool)) s.counters.labTools.push(ev.tool);
      xp = XP_RULES.labPerToolPerDay;
      activities.push({
        id: ev.id,
        type: "lab",
        refId: ev.tool,
        title: `SPLDV Lab: ${LAB_TITLE[ev.tool]}`,
        detail: "Menyelesaikan eksplorasi",
        xp,
        createdAt: at,
      });
      break;
    }
  }

  s.xp += xp;

  // Pencapaian baru
  const newAchievements: string[] = [];
  const achievementRows: { id: string; earnedAt: string }[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.check(s)) {
      s.achievements[a.id] = at;
      s.xp += a.xp;
      xp += a.xp;
      newAchievements.push(a.id);
      achievementRows.push({ id: a.id, earnedAt: at });
      activities.push({
        id: `${ev.id}:ach:${a.id}`,
        type: "achievement",
        refId: a.id,
        title: `Pencapaian: ${ACHIEVEMENT_BY_ID[a.id].title}`,
        detail: a.description,
        xp: a.xp,
        createdAt: at,
      });
    }
  }

  const levelAfter = levelFromXp(s.xp).level;
  if (levelAfter > levelBefore) {
    activities.push({
      id: `${ev.id}:level:${levelAfter}`,
      type: "level_up",
      refId: String(levelAfter),
      title: `Naik ke Level ${levelAfter}`,
      detail: levelFromXp(s.xp).title,
      xp: 0,
      createdAt: at,
    });
  }

  if (attempt) s.attempts = [attempt, ...s.attempts].slice(0, MAX_ATTEMPTS);
  s.activity = [...[...activities].reverse(), ...s.activity].slice(0, MAX_ACTIVITY);
  s.counters.daily = pruneDaily(s.counters.daily, at);
  s.updatedAt = at > prev.updatedAt ? at : prev.updatedAt;

  return {
    state: s,
    accepted: true,
    xpGained: xp,
    levelBefore,
    levelAfter,
    newAchievements,
    delta: { lessons: lessonsChanged, attempt, activities, achievements: achievementRows },
    message,
  };
}

function emptyDelta(): ApplyResult["delta"] {
  return { lessons: [], attempt: null, activities: [], achievements: [] };
}

// ------------------------------------------------------------------ Statistik turunan

export function deriveStats(s: ProgressState) {
  const lessonsCompleted = Object.values(s.lessons).filter((l) => l.status === "completed").length;
  const practiceAttempts = s.attempts.filter((a) => a.kind === "practice").length;
  const accuracy = s.counters.answered ? Math.round((s.counters.correctAnswers / s.counters.answered) * 100) : 0;
  const lvl = levelFromXp(s.xp);
  const totalLessons = Object.keys(LESSON_BY_ID).length;
  // Progres belajar: 70% materi, 15% evaluasi lulus, 15% lab
  const progress = Math.round(
    (lessonsCompleted / totalLessons) * 70 +
      (s.counters.bestEvaluation >= 75 ? 15 : (s.counters.bestEvaluation / 75) * 15) +
      (s.counters.labTools.length / 3) * 15,
  );
  return {
    lessonsCompleted,
    totalLessons,
    practiceSessions: s.counters.practiceSessions,
    practiceAttempts,
    accuracy,
    lastEvaluation: s.counters.lastEvaluation,
    bestEvaluation: s.counters.bestEvaluation,
    progress: Math.min(100, progress),
    level: lvl,
    achievements: Object.keys(s.achievements).length,
  };
}
