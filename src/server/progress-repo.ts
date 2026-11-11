import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyEvent, createInitialState, MAX_ACTIVITY, MAX_ATTEMPTS } from "@/lib/progress/engine";
import { levelFromXp } from "@/lib/progress/gamification";
import { gradeEvent } from "@/lib/progress/grading";
import { replayEvents, toPersistDelta, type PersistDelta } from "@/lib/progress/replay";
import type { ActivityRecord, ApplyResult, AttemptRecord, Counters, ProgressState, RawEvent } from "@/lib/progress/types";
import { EVALUATION_BY_ID } from "./evaluation-bank";

export class RepoError extends Error {}

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) {
    console.error(`[progress-repo] ${what}:`, res.error.message);
    throw new RepoError(`Gagal ${what}.`);
  }
  return res.data;
}

export interface Profile {
  displayName: string | null;
}

export async function loadProfile(db: SupabaseClient, userId: string): Promise<Profile> {
  const data = check(await db.from("profiles").select("display_name").eq("id", userId).maybeSingle(), "memuat profil");
  return { displayName: (data as { display_name: string | null } | null)?.display_name ?? null };
}

export async function saveProfile(db: SupabaseClient, userId: string, displayName: string) {
  check(
    await db.from("profiles").upsert({ id: userId, display_name: displayName, updated_at: new Date().toISOString() }),
    "menyimpan profil",
  );
}

/** Menyusun ProgressState dari tabel-tabel relasional. */
export async function loadState(db: SupabaseClient, userId: string): Promise<ProgressState> {
  const [stats, lessons, achievements, quizzes, games, activity] = await Promise.all([
    db.from("user_stats").select("xp, counters, updated_at").eq("user_id", userId).maybeSingle(),
    db.from("lesson_progress").select("lesson_id, status, opened_at, completed_at, best_quiz_score").eq("user_id", userId),
    db.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
    db
      .from("quiz_attempts")
      .select("id, kind, quiz_id, title, score, correct, total, xp, difficulty, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_ATTEMPTS),
    db
      .from("game_attempts")
      .select("id, game_id, title, score_percent, raw_score, correct, total, xp, difficulty, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_ATTEMPTS),
    db
      .from("activity_logs")
      .select("id, type, ref_id, title, detail, xp, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_ACTIVITY),
  ]);

  const state = createInitialState();
  const st = check(stats, "memuat statistik") as { xp: number; counters: Partial<Counters>; updated_at: string } | null;
  if (st) {
    state.xp = st.xp;
    state.counters = { ...state.counters, ...(st.counters ?? {}) };
    state.updatedAt = st.updated_at;
  }
  for (const l of check(lessons, "memuat materi") ?? []) {
    state.lessons[l.lesson_id] = {
      lessonId: l.lesson_id,
      status: l.status,
      openedAt: l.opened_at,
      completedAt: l.completed_at,
      bestQuizScore: l.best_quiz_score,
    };
  }
  for (const a of check(achievements, "memuat pencapaian") ?? []) state.achievements[a.achievement_id] = a.earned_at;

  const attempts: AttemptRecord[] = [
    ...(check(quizzes, "memuat riwayat kuis") ?? []).map((q) => ({
      id: q.id,
      kind: q.kind,
      refId: q.quiz_id,
      title: q.title,
      score: q.score,
      correct: q.correct,
      total: q.total,
      xp: q.xp,
      difficulty: q.difficulty ?? undefined,
      createdAt: q.created_at,
    })),
    ...(check(games, "memuat riwayat game") ?? []).map((g) => ({
      id: g.id,
      kind: "game" as const,
      refId: g.game_id,
      title: g.title,
      score: g.score_percent,
      rawScore: g.raw_score,
      correct: g.correct,
      total: g.total,
      xp: g.xp,
      difficulty: g.difficulty,
      createdAt: g.created_at,
    })),
  ];
  state.attempts = attempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ATTEMPTS);
  state.activity = (check(activity, "memuat aktivitas") ?? []).map(
    (a): ActivityRecord => ({ id: a.id, type: a.type, refId: a.ref_id, title: a.title, detail: a.detail, xp: a.xp, createdAt: a.created_at }),
  );
  return state;
}

/** Menulis perubahan ke database. Semua tulisan idempoten (upsert / ignore duplicates). */
export async function persist(db: SupabaseClient, userId: string, state: ProgressState, delta: PersistDelta) {
  const ops: PromiseLike<{ error: { message: string } | null }>[] = [];

  if (delta.lessons.length) {
    ops.push(
      db.from("lesson_progress").upsert(
        delta.lessons.map((l) => ({
          user_id: userId,
          lesson_id: l.lessonId,
          status: l.status,
          opened_at: l.openedAt,
          completed_at: l.completedAt,
          best_quiz_score: l.bestQuizScore,
        })),
      ),
    );
  }
  const quizRows = delta.attempts.filter((a) => a.kind !== "game");
  const gameRows = delta.attempts.filter((a) => a.kind === "game");
  if (quizRows.length) {
    ops.push(
      db.from("quiz_attempts").upsert(
        quizRows.map((a) => ({
          id: a.id,
          user_id: userId,
          kind: a.kind,
          quiz_id: a.refId,
          title: a.title,
          score: a.score,
          correct: a.correct,
          total: a.total,
          xp: a.xp,
          difficulty: a.difficulty ?? null,
          created_at: a.createdAt,
        })),
        { onConflict: "user_id,id", ignoreDuplicates: true },
      ),
    );
  }
  if (gameRows.length) {
    ops.push(
      db.from("game_attempts").upsert(
        gameRows.map((a) => ({
          id: a.id,
          user_id: userId,
          game_id: a.refId,
          title: a.title,
          difficulty: a.difficulty,
          score_percent: a.score,
          raw_score: a.rawScore ?? 0,
          correct: a.correct,
          total: a.total,
          xp: a.xp,
          created_at: a.createdAt,
        })),
        { onConflict: "user_id,id", ignoreDuplicates: true },
      ),
    );
  }
  if (delta.activities.length) {
    ops.push(
      db.from("activity_logs").upsert(
        delta.activities.map((a) => ({
          id: a.id,
          user_id: userId,
          type: a.type,
          ref_id: a.refId,
          title: a.title,
          detail: a.detail,
          xp: a.xp,
          created_at: a.createdAt,
        })),
        { onConflict: "user_id,id", ignoreDuplicates: true },
      ),
    );
  }
  if (delta.achievements.length) {
    ops.push(
      db.from("user_achievements").upsert(
        delta.achievements.map((a) => ({ user_id: userId, achievement_id: a.id, earned_at: a.earnedAt })),
        { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
      ),
    );
  }
  ops.push(
    db.from("user_stats").upsert({
      user_id: userId,
      xp: state.xp,
      level: levelFromXp(state.xp).level,
      counters: state.counters,
      updated_at: new Date().toISOString(),
    }),
  );

  const results = await Promise.all(ops);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[progress-repo] persist:", failed.error.message);
    throw new RepoError("Gagal menyimpan progres.");
  }
}

async function existingEventIds(db: SupabaseClient, userId: string, ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const data = check(await db.from("activity_logs").select("id").eq("user_id", userId).in("id", chunk), "memeriksa duplikasi");
    (data ?? []).forEach((r: { id: string }) => found.add(r.id));
  }
  return found;
}

/** Mencatat satu event secara langsung (Email Mode). */
export async function recordEvent(db: SupabaseClient, userId: string, raw: RawEvent): Promise<ApplyResult> {
  const state = await loadState(db, userId);
  const dup = await existingEventIds(db, userId, [raw.id]);
  if (dup.size) {
    const lvl = levelFromXp(state.xp).level;
    return { state, accepted: false, xpGained: 0, levelBefore: lvl, levelAfter: lvl, newAchievements: [], delta: { lessons: [], attempt: null, activities: [], achievements: [] } };
  }
  const result = applyEvent(state, gradeEvent(raw, { evaluationBank: EVALUATION_BY_ID }));
  if (result.accepted) await persist(db, userId, result.state, toPersistDelta(result));
  return result;
}

/** Migrasi/sinkronisasi event lokal ke akun. */
export async function migrateEvents(db: SupabaseClient, userId: string, events: RawEvent[]) {
  const state = await loadState(db, userId);
  const existing = await existingEventIds(db, userId, events.map((e) => e.id));
  const result = replayEvents(state, events, existing, { evaluationBank: EVALUATION_BY_ID });
  if (result.imported > 0) await persist(db, userId, result.state, result.delta);
  return result;
}
