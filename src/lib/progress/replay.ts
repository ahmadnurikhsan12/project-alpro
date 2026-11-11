import { applyEvent } from "./engine";
import { EventValidationError, gradeEvent, type GradeOptions } from "./grading";
import type { ActivityRecord, ApplyResult, AttemptRecord, LessonProgress, ProgressState, RawEvent } from "./types";

/** Semua perubahan yang perlu ditulis ke database. */
export interface PersistDelta {
  lessons: LessonProgress[];
  attempts: AttemptRecord[];
  activities: ActivityRecord[];
  achievements: { id: string; earnedAt: string }[];
}

export function toPersistDelta(r: ApplyResult): PersistDelta {
  return {
    lessons: r.delta.lessons,
    attempts: r.delta.attempt ? [r.delta.attempt] : [],
    activities: r.delta.activities,
    achievements: r.delta.achievements,
  };
}

export interface ReplayResult {
  state: ProgressState;
  imported: number;
  skipped: number; // sudah ada (duplikat) atau tidak mengubah apa pun
  rejected: number; // gagal validasi
  xpGained: number;
  newAchievements: string[];
  delta: PersistDelta;
}

/**
 * Aturan penggabungan progres Guest → Email:
 * 1. Event yang ID-nya sudah tercatat di akun dilewati (tidak ada duplikasi).
 * 2. Event baru diurutkan berdasarkan waktu; waktu di masa depan dipotong ke `now`.
 * 3. Setiap event DINILAI ULANG oleh server dan diterapkan dengan aturan XP yang
 *    sama (batas harian, soal yang sudah memberi XP tidak memberi XP lagi).
 * 4. Progres online tidak pernah dikurangi: materi "selesai" tetap selesai,
 *    nilai terbaik diambil yang tertinggi, pencapaian lama dipertahankan.
 */
export function replayEvents(
  base: ProgressState,
  events: RawEvent[],
  existingIds: Set<string>,
  opts: GradeOptions,
  now = new Date().toISOString(),
): ReplayResult {
  const seen = new Set(existingIds);
  const ordered = events
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .map((e) => ({ ...e, at: e.at > now ? now : e.at }))
    .sort((a, b) => a.at.localeCompare(b.at));

  let state = base;
  let imported = 0;
  let rejected = 0;
  let xpGained = 0;
  const newAchievements: string[] = [];
  const lessons = new Map<string, LessonProgress>();
  const delta: PersistDelta = { lessons: [], attempts: [], activities: [], achievements: [] };

  for (const ev of ordered) {
    try {
      const r = applyEvent(state, gradeEvent(ev, opts));
      if (!r.accepted) continue;
      state = r.state;
      imported++;
      xpGained += r.xpGained;
      newAchievements.push(...r.newAchievements);
      r.delta.lessons.forEach((l) => lessons.set(l.lessonId, l));
      if (r.delta.attempt) delta.attempts.push(r.delta.attempt);
      delta.activities.push(...r.delta.activities);
      delta.achievements.push(...r.delta.achievements);
    } catch (err) {
      if (err instanceof EventValidationError) rejected++;
      else throw err;
    }
  }

  delta.lessons = [...lessons.values()];
  return { state, imported, skipped: events.length - imported - rejected, rejected, xpGained, newAchievements, delta };
}
