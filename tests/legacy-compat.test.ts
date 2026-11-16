import { describe, expect, it } from "vitest";
import fixture from "./fixtures/legacy-session.json";
import { applyEvent, createInitialState, normalizeState } from "@/lib/progress/engine";
import { gradeEvent } from "@/lib/progress/grading";
import { rawEventSchema } from "@/lib/progress/schema";
import type { ProgressState, RawEvent } from "@/lib/progress/types";

/**
 * Fixture ini direkam dari mesin progres VERSI LAMA (commit 747fbf9), sebelum kebijakan
 * percobaan RMT. Tes memastikan progres, XP, badge, dan level lama tidak berubah.
 */
const events = fixture.events as RawEvent[];
const oldFinal = fixture.finalState as unknown as ProgressState;

const OLD_COUNTER_KEYS = [
  "rewardedQuestions", "labTools", "gamesBest", "practiceSessions", "evaluations",
  "bestEvaluation", "lastEvaluation", "answered", "correctAnswers", "daily",
] as const;

function replayAll() {
  let state = createInitialState(fixture.initialAt);
  const steps: { id: string; accepted: boolean; xpGained: number; newAchievements: string[]; xpAfter: number }[] = [];
  for (const e of events) {
    const r = applyEvent(state, gradeEvent(e));
    state = r.state;
    steps.push({ id: e.id, accepted: r.accepted, xpGained: r.xpGained, newAchievements: r.newAchievements, xpAfter: state.xp });
  }
  return { state, steps };
}

describe("kompatibilitas progres lama", () => {
  it("event lama tetap lolos validasi skema", () => {
    for (const e of events) expect(rawEventSchema.safeParse(e).success, e.type).toBe(true);
  });

  it("memutar ulang event lama menghasilkan XP, badge, dan langkah yang IDENTIK dengan mesin lama", () => {
    const { steps } = replayAll();
    expect(steps).toEqual(fixture.expectedSteps);
  });

  it("state akhir identik pada semua field lama (xp, level-basis, materi, badge, counter, riwayat, aktivitas)", () => {
    const { state } = replayAll();
    expect(state.xp).toBe(oldFinal.xp);
    expect(state.lessons).toEqual(oldFinal.lessons);
    expect(state.achievements).toEqual(oldFinal.achievements);
    for (const k of OLD_COUNTER_KEYS) expect(state.counters[k], `counters.${k}`).toEqual(oldFinal.counters[k]);
    expect(state.updatedAt).toBe(oldFinal.updatedAt);
    expect(state.activity).toEqual(oldFinal.activity); // teks aktivitas tidak berubah untuk event lama
    // riwayat: field lama identik; field baru (firstTry/detail) hanya tambahan
    const stripNew = (a: ProgressState["attempts"][number]) => {
      const rest = { ...a } as Record<string, unknown>;
      delete rest.firstTry;
      delete rest.detail;
      return rest;
    };
    expect(state.attempts.map(stripNew)).toEqual(oldFinal.attempts.map(stripNew));
  });

  it("state versi lama (tanpa field baru) dapat dimuat, dilengkapi, lalu dipakai tanpa error", () => {
    const stored = JSON.parse(JSON.stringify(oldFinal)) as ProgressState; // seperti dibaca dari localStorage
    expect("questionStats" in stored.counters).toBe(false);

    const frozen = JSON.stringify(stored);
    const loaded = normalizeState(stored);
    expect(JSON.stringify(stored)).toBe(frozen); // normalizeState tidak mengubah masukan
    expect(loaded.counters.questionStats).toEqual({});
    expect(loaded.counters.reflections).toBe(0);
    expect(loaded.xp).toBe(oldFinal.xp);

    // soal yang sudah memberi XP di versi lama tidak memberi XP lagi
    const again: RawEvent = {
      id: "00000000-0000-4000-8000-00000000f001", at: "2026-11-12T09:00:00.000Z", type: "practice",
      difficulty: "mudah", questionIds: ["p-m-01"], answers: { "p-m-01": "b" },
    };
    const r = applyEvent(loaded, gradeEvent(again));
    expect(r.state.counters.questionStats["p-m-01"].legacy).toBe(true);
    expect(r.xpGained).toBe(5); // hanya bonus sesi
    // badge, level, dan materi lama tetap
    expect(r.state.achievements).toEqual(oldFinal.achievements);
    expect(r.state.lessons).toEqual(oldFinal.lessons);
    expect(r.state.xp).toBe(oldFinal.xp + 5);
  });

  it("soal yang belum pernah dijawab benar pada progres lama tetap memberi 100% XP (tanpa penalti retroaktif)", () => {
    const loaded = normalizeState(JSON.parse(JSON.stringify(oldFinal)) as ProgressState);
    expect(loaded.counters.rewardedQuestions).not.toContain("p-m-07");
    const ev: RawEvent = {
      id: "00000000-0000-4000-8000-00000000f002", at: "2026-11-12T09:05:00.000Z", type: "practice",
      difficulty: "mudah", questionIds: ["p-m-07"], answers: { "p-m-07": "b" },
    };
    const r = applyEvent(loaded, gradeEvent(ev));
    expect(r.state.counters.questionStats["p-m-07"]).toMatchObject({ attempts: 1, solvedAt: 1, xp: 10 });
  });
});
