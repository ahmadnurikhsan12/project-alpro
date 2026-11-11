import { describe, expect, it } from "vitest";
import { LESSONS } from "@/content/lessons";
import { PRACTICE_QUESTIONS } from "@/content/practice";
import { EVALUATION_QUESTIONS } from "@/server/evaluation-bank";
import { frac, parseFraction } from "@/lib/math/fraction";
import { satisfies, solveSystem } from "@/lib/math/spldv";
import { gradeAnswer, parsePair } from "@/lib/questions/grade";
import type { Question } from "@/lib/questions/types";

const lessonQs = LESSONS.flatMap((l) => l.quiz);
const all: [string, Question[]][] = [
  ["lesson", lessonQs],
  ["practice", PRACTICE_QUESTIONS],
  ["evaluation", EVALUATION_QUESTIONS],
];

describe("question banks", () => {
  it("ids are unique across all banks", () => {
    const ids = all.flatMap(([, qs]) => qs.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("covers every module and difficulty", () => {
    for (const bank of [PRACTICE_QUESTIONS, EVALUATION_QUESTIONS]) {
      for (const l of LESSONS) expect(bank.some((q) => q.topic === l.id)).toBe(true);
    }
    for (const d of ["mudah", "sedang", "sulit"]) {
      expect(PRACTICE_QUESTIONS.filter((q) => q.difficulty === d).length).toBeGreaterThanOrEqual(10);
    }
  });
  for (const [name, qs] of all) {
    describe(name, () => {
      for (const q of qs) {
        it(`${q.id} is well-formed and mathematically correct`, () => {
          expect(q.explanation.length).toBeGreaterThan(0);
          if (q.type === "mcq") {
            expect(q.options?.length).toBe(4);
            expect(q.options!.some((o) => o.id === q.answer)).toBe(true);
            expect(new Set(q.options!.map((o) => o.text)).size).toBe(4);
          }
          if (q.type === "tf") expect(["true", "false"]).toContain(q.answer);
          if (q.type === "number") expect(parseFraction(q.answer)).not.toBeNull();
          if (q.type === "pair") expect(parsePair(q.answer)).not.toBeNull();
          expect(gradeAnswer(q, q.answer)).toBe(true);
          const v = q.verify;
          if (v?.kind === "solution") {
            expect(solveSystem(v.e1, v.e2)).toEqual({ kind: "unique", x: frac(v.x), y: frac(v.y) });
            if (q.type === "pair") expect(q.answer).toBe(`${v.x},${v.y}`);
          }
          if (v?.kind === "pairCheck") {
            const ok = satisfies(v.e1, frac(v.x), frac(v.y)) && satisfies(v.e2, frac(v.x), frac(v.y));
            expect(String(ok)).toBe(q.answer);
          }
        });
      }
    });
  }
  it("every lesson has the required parts", () => {
    expect(LESSONS).toHaveLength(7);
    for (const l of LESSONS) {
      expect(l.objectives.length).toBeGreaterThan(0);
      expect(l.sections.length).toBeGreaterThan(0);
      expect(l.terms.length).toBeGreaterThan(0);
      expect(l.examples.length).toBeGreaterThan(0);
      expect(l.conclusion.length).toBeGreaterThan(0);
      expect(l.quiz.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("grader", () => {
  const num = { type: "number" as const, answer: "14000" };
  it("accepts thousand separators and Rp prefix", () => {
    expect(gradeAnswer(num, "14.000")).toBe(true);
    expect(gradeAnswer(num, "Rp14.000")).toBe(true);
    expect(gradeAnswer(num, "14000")).toBe(true);
    expect(gradeAnswer(num, "1400")).toBe(false);
  });
  it("accepts pair formats", () => {
    const p = { type: "pair" as const, answer: "-3,2" };
    expect(gradeAnswer(p, "(-3, 2)")).toBe(true);
    expect(gradeAnswer(p, "-3;2")).toBe(true);
    expect(gradeAnswer(p, "2,-3")).toBe(false);
  });
});
