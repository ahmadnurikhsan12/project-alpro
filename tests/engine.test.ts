import { describe, expect, it } from "vitest";
import { applyEvent, createInitialState } from "@/lib/progress/engine";
import { EventValidationError, gradeEvent } from "@/lib/progress/grading";
import { LESSON_BY_ID } from "@/content/lessons";
import { EVALUATION_BY_ID } from "@/server/evaluation-bank";
import type { ProgressState, RawEvent } from "@/lib/progress/types";

let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const T = "2026-11-11T08:00:00.000Z";
const run = (s: ProgressState, e: RawEvent) => applyEvent(s, gradeEvent(e));

describe("engine", () => {
  it("awards lesson open XP only once", () => {
    const r1 = run(createInitialState(T), { id: uid(), at: T, type: "lesson_open", lessonId: "m1" });
    expect(r1.xpGained).toBe(5);
    const r2 = run(r1.state, { id: uid(), at: T, type: "lesson_open", lessonId: "m1" });
    expect(r2.accepted).toBe(false);
    expect(r2.state.xp).toBe(5);
  });

  it("completes a lesson with passing quiz and grants achievement", () => {
    const answers = Object.fromEntries(LESSON_BY_ID.m1.quiz.map((q) => [q.id, q.answer]));
    const r = run(createInitialState(T), { id: uid(), at: T, type: "lesson_quiz", lessonId: "m1", answers });
    expect(r.state.lessons.m1.status).toBe("completed");
    expect(r.newAchievements).toContain("pemula-spldv");
    expect(r.xpGained).toBe(4 * 5 + 40 + 20);
    const again = run(r.state, { id: uid(), at: T, type: "lesson_quiz", lessonId: "m1", answers });
    expect(again.xpGained).toBe(0);
  });

  it("does not complete lesson below 60", () => {
    const r = run(createInitialState(T), { id: uid(), at: T, type: "lesson_quiz", lessonId: "m2", answers: {} });
    expect(r.state.lessons.m2.status).toBe("in_progress");
  });

  it("prevents practice XP farming on repeated questions", () => {
    const e = (): RawEvent => ({
      id: uid(), at: T, type: "practice", difficulty: "mudah",
      questionIds: ["p-m-01", "p-m-02"], answers: { "p-m-01": "b", "p-m-02": "true" },
    });
    const r1 = run(createInitialState(T), e());
    expect(r1.xpGained).toBe(10 + 10 + 5);
    const r2 = run(r1.state, e());
    expect(r2.xpGained).toBe(5);
  });

  it("caps game XP per day and rejects impossible scores", () => {
    let s = createInitialState(T);
    const game = (score: number): RawEvent => ({
      id: uid(), at: T, type: "game", gameId: "tebak-nilai", difficulty: "sulit", score, correct: 3, total: 3, durationSec: 60,
    });
    const xps: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = run(s, game(300));
      xps.push(r.xpGained);
      s = r.state;
    }
    expect(xps.slice(0, 3).every((x) => x >= 60)).toBe(true);
    expect(xps[3]).toBe(0);
    expect(() => gradeEvent(game(9999))).toThrow(EventValidationError);
    expect(() => gradeEvent({ ...game(100), durationSec: 1 } as RawEvent)).toThrow(EventValidationError);
  });

  it("grades evaluation from server bank, ignoring client result", () => {
    const ev: RawEvent = {
      id: uid(), at: T, type: "evaluation", questionIds: ["e01", "e02"],
      answers: { e01: "a", e02: "0" }, durationSec: 30, result: { correct: 2, total: 2, score: 100 },
    };
    const g = gradeEvent(ev, { evaluationBank: EVALUATION_BY_ID });
    expect(g.kind === "graded" && g.score).toBe(50);
  });

  it("lab XP once per tool per day", () => {
    const r1 = run(createInitialState(T), { id: uid(), at: T, type: "lab", tool: "graph" });
    expect(r1.xpGained).toBe(15);
    expect(run(r1.state, { id: uid(), at: T, type: "lab", tool: "graph" }).accepted).toBe(false);
    expect(run(r1.state, { id: uid(), at: "2026-11-12T08:00:00.000Z", type: "lab", tool: "graph" }).xpGained).toBe(15);
  });
});
