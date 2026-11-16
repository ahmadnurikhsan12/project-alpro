import { GAME_BY_ID } from "@/content/games";
import { LESSON_BY_ID } from "@/content/lessons";
import { REFLECTION_CONTEXT_LABEL } from "@/lib/tutor/reflection-prompts";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, levelFromXp, questionXp, XP_RULES } from "./gamification";
import type {
  ActivityRecord,
  ApplyResult,
  AttemptDetail,
  AttemptQuestionDetail,
  AttemptRecord,
  Counters,
  GradedEvent,
  GradedQuestion,
  LearningRecord,
  LessonProgress,
  ProgressState,
  QuestionStat,
} from "./types";

export const MAX_ATTEMPTS = 200;
export const MAX_ACTIVITY = 300;

const LAB_TITLE = { checker: "Uji Pasangan Nilai", elimination: "Simulasi Eliminasi", graph: "Grafik SPLDV" } as const;
const DIFF_LABEL = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" } as const;

function createInitialCounters(): Counters {
  return {
    rewardedQuestions: [],
    questionStats: {},
    reflections: 0,
    reflectionsSkipped: 0,
    labTools: [],
    gamesBest: {},
    practiceSessions: 0,
    evaluations: 0,
    bestEvaluation: 0,
    lastEvaluation: null,
    answered: 0,
    correctAnswers: 0,
    daily: {},
  };
}

export function createInitialState(now = new Date().toISOString()): ProgressState {
  return {
    version: 1,
    xp: 0,
    lessons: {},
    achievements: {},
    counters: createInitialCounters(),
    attempts: [],
    activity: [],
    updatedAt: now,
  };
}

/** Melengkapi counters yang berasal dari versi aplikasi lama (field baru diberi nilai awal). */
export function withCounterDefaults(c: Partial<Counters> | undefined): Counters {
  const base = createInitialCounters();
  const merged = { ...base, ...(c ?? {}) };
  return {
    ...merged,
    rewardedQuestions: [...(c?.rewardedQuestions ?? [])],
    questionStats: { ...(c?.questionStats ?? {}) },
    labTools: [...(c?.labTools ?? [])],
    gamesBest: { ...(c?.gamesBest ?? {}) },
    daily: { ...(c?.daily ?? {}) },
  };
}

/** Dipakai saat memuat state dari penyimpanan lokal/server agar field baru selalu ada. */
export function normalizeState(s: ProgressState): ProgressState {
  return { ...s, counters: withCounterDefaults(s.counters) };
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
    counters: withCounterDefaults(s.counters),
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
  const learning: LearningRecord[] = [];
  let attempt: AttemptRecord | null = null;
  let xp = 0;
  let message: string | undefined;

  const bump = (key: string) => {
    const k = `${day}:${key}`;
    s.counters.daily[k] = (s.counters.daily[k] ?? 0) + 1;
    return s.counters.daily[k];
  };
  const dailyCount = (key: string) => s.counters.daily[`${day}:${key}`] ?? 0;
  const countAnswers = (correct: number, total: number) => {
    s.counters.answered += total;
    s.counters.correctAnswers += correct;
  };

  /** Statistik soal; soal yang sudah ada di daftar lama (tanpa statistik) dianggap sudah terjawab benar. */
  const statFor = (key: string): QuestionStat => {
    const existing = s.counters.questionStats[key];
    if (existing) return existing;
    if (s.counters.rewardedQuestions.includes(key)) {
      return { attempts: 1, solvedAt: 1, xp: 0, hints: 0, independent: false, legacy: true };
    }
    return { attempts: 0, solvedAt: null, xp: 0, hints: 0, independent: false };
  };

  /**
   * Kebijakan percobaan (ATTEMPT_RULES): XP sekali per soal pada percobaan pertama kali benar
   * (100% / 50% / 0%), jawaban salah & petunjuk tidak mengurangi XP.
   */
  const rewardSession = (items: { key: string; base: number; q: GradedQuestion }[]) => {
    let gained = 0;
    let half = 0; // baru benar pada percobaan ke-2
    let zeroNew = 0; // baru benar pada percobaan ke-3 dst. (0 XP)
    let independent = 0;
    const questions: Record<string, AttemptQuestionDetail> = {};
    for (const { key, base, q } of items) {
      const stat = { ...statFor(key) };
      let sessionXp = 0;
      let solvedAtCumulative: number | null = null;
      for (const ok of q.attempts) {
        stat.attempts += 1;
        if (ok && stat.solvedAt === null) {
          stat.solvedAt = stat.attempts;
          sessionXp = questionXp(base, stat.attempts);
          stat.xp = sessionXp;
          stat.independent = stat.attempts === 1 && q.hints === 0;
          solvedAtCumulative = stat.attempts;
          if (!s.counters.rewardedQuestions.includes(key)) s.counters.rewardedQuestions.push(key);
          if (sessionXp === 0) zeroNew += 1;
          else if (stat.attempts === 2) half += 1;
        }
      }
      stat.hints += q.hints;
      s.counters.questionStats[key] = stat;
      gained += sessionXp;
      if (q.solvedAt === 1 && q.hints === 0) independent += 1;
      questions[q.id] = { attempts: q.attempts.length, solvedAt: solvedAtCumulative, hints: q.hints, xp: sessionXp };
    }
    const total = items.length;
    const detail: AttemptDetail = { firstTry: total ? Math.round((independent / total) * 100) : 0, questions };
    return { gained, half, zeroNew, detail };
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
      const rewarded = rewardSession(ev.perQuestion.map((q) => ({ key: `lesson:${q.id}`, base: XP_RULES.lessonQuizPerNewCorrect, q })));
      xp = rewarded.gained;
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
        firstTry: rewarded.detail.firstTry,
        detail: rewarded.detail,
        createdAt: at,
      };
      activities.push({
        id: ev.id,
        type: newlyCompleted ? "lesson_complete" : "lesson_quiz",
        refId: ev.lessonId,
        title: newlyCompleted ? `Menyelesaikan ${lesson.title}` : `Mini Quiz ${lesson.title}`,
        detail:
          `${ev.correct}/${ev.total} benar (nilai ${ev.score})${passed ? "" : " — belum lulus, minimal 60"}` +
          (rewarded.detail.firstTry !== ev.score ? ` · mandiri ${rewarded.detail.firstTry}%` : ""),
        xp,
        createdAt: at,
      });
      message = passed ? (newlyCompleted ? "Modul selesai!" : "Mini quiz lulus.") : "Nilai minimal untuk menyelesaikan modul adalah 60. Coba lagi!";
      break;
    }

    case "practice": {
      const rewarded = rewardSession(ev.perQuestion.map((q) => ({ key: q.id, base: XP_RULES.practicePerNewCorrect[q.difficulty], q })));
      xp = rewarded.gained;
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
        firstTry: rewarded.detail.firstTry,
        detail: rewarded.detail,
        createdAt: at,
      };
      activities.push({
        id: ev.id,
        type: "practice",
        refId: attempt.refId,
        title: attempt.title,
        detail: `${ev.correct}/${ev.total} benar (nilai ${ev.score})` + (rewarded.detail.firstTry !== ev.score ? ` · mandiri ${rewarded.detail.firstTry}%` : ""),
        xp,
        createdAt: at,
      });
      if (rewarded.zeroNew > 0) {
        message = "Soal yang baru benar pada percobaan ke-3 atau lebih tidak memberi XP tambahan, tetapi tetap tercatat benar.";
      } else if (rewarded.half > 0) {
        message = "Benar pada percobaan ke-2 memberi 50% XP.";
      } else if (xp === 0 && ev.correct > 0) {
        message = "Soal ini sudah pernah memberi XP. Coba soal lain untuk XP baru!";
      }
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
      if (ev.la) {
        learning.push({
          id: ev.id,
          kind: "game_la",
          refId: ev.gameId,
          payload: { difficulty: ev.difficulty, score: ev.score, percent: ev.percent, metrics: ev.la },
          createdAt: at,
        });
      }
      if (xp === 0 && plays >= XP_RULES.gameDailyLimitPerGame) {
        message = `XP untuk ${meta.title} hari ini sudah maksimal (${XP_RULES.gameDailyLimitPerGame} permainan). Skor tetap tercatat.`;
      }
      break;
    }

    case "lab": {
      const key = `lab:${ev.tool}`;
      const repeatToday = dailyCount(key) > 0 && s.counters.labTools.includes(ev.tool);
      // Perilaku lama: pengulangan di hari yang sama ditolak. Jika ada data Learning Activity
      // (`la`), pengulangan tetap dicatat sebagai aktivitas belajar, tetapi tanpa XP.
      if (repeatToday && !ev.la) {
        return { state: prev, accepted: false, xpGained: 0, levelBefore, levelAfter: levelBefore, newAchievements: [], delta: emptyDelta() };
      }
      if (!repeatToday) {
        bump(key);
        if (!s.counters.labTools.includes(ev.tool)) s.counters.labTools.push(ev.tool);
        xp = XP_RULES.labPerToolPerDay;
      }
      activities.push({
        id: ev.id,
        type: "lab",
        refId: ev.tool,
        title: `SPLDV Lab: ${LAB_TITLE[ev.tool]}`,
        detail: repeatToday ? "Mengulang eksplorasi" : "Menyelesaikan eksplorasi",
        xp,
        createdAt: at,
      });
      if (ev.la) learning.push({ id: ev.id, kind: "lab_la", refId: ev.tool, payload: { metrics: ev.la }, createdAt: at });
      break;
    }

    case "reflection": {
      if (ev.skipped) s.counters.reflectionsSkipped += 1;
      else s.counters.reflections += 1;
      activities.push({
        id: ev.id,
        type: "reflection",
        refId: ev.refId,
        title: `Refleksi: ${REFLECTION_CONTEXT_LABEL[ev.context]}`,
        detail: ev.skipped ? "Dilewati" : `${Object.keys(ev.responses).length} jawaban`,
        xp: 0,
        createdAt: at,
      });
      learning.push({
        id: ev.id,
        kind: "reflection",
        refId: ev.refId,
        payload: { context: ev.context, responses: ev.responses, skipped: !!ev.skipped },
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
    delta: { lessons: lessonsChanged, attempt, activities, achievements: achievementRows, learning },
    message,
  };
}

function emptyDelta(): ApplyResult["delta"] {
  return { lessons: [], attempt: null, activities: [], achievements: [], learning: [] };
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
