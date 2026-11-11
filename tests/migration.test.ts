import { describe, expect, it } from "vitest";
import { LESSON_BY_ID } from "@/content/lessons";
import { applyEvent, createInitialState } from "@/lib/progress/engine";
import { gradeEvent } from "@/lib/progress/grading";
import { replayEvents } from "@/lib/progress/replay";
import type { RawEvent } from "@/lib/progress/types";
import { EVALUATION_BY_ID } from "@/server/evaluation-bank";

const T = (h: number) => `2026-11-11T0${h}:00:00.000Z`;
const id = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`;
const opts = { evaluationBank: EVALUATION_BY_ID };

const quizAnswers = Object.fromEntries(LESSON_BY_ID.m1.quiz.map((q) => [q.id, q.answer]));
const guestEvents: RawEvent[] = [
  { id: id(1), at: T(1), type: "lesson_open", lessonId: "m1" },
  { id: id(2), at: T(2), type: "lesson_quiz", lessonId: "m1", answers: quizAnswers },
  { id: id(3), at: T(3), type: "practice", difficulty: "mudah", questionIds: ["p-m-01"], answers: { "p-m-01": "b" } },
];

describe("guest → email migration", () => {
  it("imports all new events into an empty account", () => {
    const r = replayEvents(createInitialState(T(0)), guestEvents, new Set(), opts, T(9));
    expect(r.imported).toBe(3);
    expect(r.state.lessons.m1.status).toBe("completed");
    expect(r.delta.attempts).toHaveLength(2);
    expect(r.state.achievements["pemula-spldv"]).toBeDefined();
  });

  it("is idempotent: replaying the same events adds nothing", () => {
    const first = replayEvents(createInitialState(T(0)), guestEvents, new Set(), opts, T(9));
    const existing = new Set(first.delta.activities.map((a) => a.id));
    const again = replayEvents(first.state, guestEvents, existing, opts, T(9));
    expect(again.imported).toBe(0);
    expect(again.state.xp).toBe(first.state.xp);
  });

  it("does not double-reward questions already rewarded online", () => {
    // akun sudah menjawab p-m-01 dari perangkat lain
    const online = applyEvent(
      createInitialState(T(0)),
      gradeEvent({ id: id(50), at: T(0), type: "practice", difficulty: "mudah", questionIds: ["p-m-01"], answers: { "p-m-01": "b" } }),
    ).state;
    const r = replayEvents(online, [guestEvents[2]], new Set(), opts, T(9));
    expect(r.imported).toBe(1);
    expect(r.xpGained).toBe(5); // hanya bonus sesi, bukan +10 lagi
  });

  it("never downgrades completed lessons or best scores", () => {
    const online = replayEvents(createInitialState(T(0)), guestEvents, new Set(), opts, T(9)).state;
    const failingQuiz: RawEvent = { id: id(9), at: T(4), type: "lesson_quiz", lessonId: "m1", answers: {} };
    const r = replayEvents(online, [failingQuiz], new Set(), opts, T(9));
    expect(r.state.lessons.m1.status).toBe("completed");
    expect(r.state.lessons.m1.bestQuizScore).toBe(100);
  });

  it("re-grades evaluations on the server and ignores forged results", () => {
    const forged: RawEvent = {
      id: id(20), at: T(5), type: "evaluation", questionIds: ["e01", "e02", "e03", "e04", "e05"],
      answers: {}, durationSec: 60, result: { correct: 5, total: 5, score: 100 },
    };
    const r = replayEvents(createInitialState(T(0)), [forged], new Set(), opts, T(9));
    expect(r.state.counters.bestEvaluation).toBe(0);
  });

  it("rejects invalid events and clamps future timestamps", () => {
    const bad: RawEvent = { id: id(30), at: T(5), type: "game", gameId: "tebak-nilai", difficulty: "mudah", score: 99999, correct: 1, total: 1, durationSec: 10 };
    const future: RawEvent = { id: id(31), at: "2099-01-01T00:00:00.000Z", type: "lab", tool: "graph" };
    const r = replayEvents(createInitialState(T(0)), [bad, future], new Set(), opts, T(9));
    expect(r.rejected).toBe(1);
    expect(r.imported).toBe(1);
    expect(r.state.activity[0].createdAt).toBe(T(9));
  });
});
