import { describe, expect, it } from "vitest";
import { frac, parseFraction } from "@/lib/math/fraction";
import { formatEquation, generateSystem, planElimination, satisfies, seededRng, solveSystem } from "@/lib/math/spldv";

describe("fraction", () => {
  it("parses integers, decimals, fractions", () => {
    expect(parseFraction("3")).toEqual(frac(3));
    expect(parseFraction("-2")).toEqual(frac(-2));
    expect(parseFraction("1/2")).toEqual(frac(1, 2));
    expect(parseFraction("2,5")).toEqual(frac(5, 2));
    expect(parseFraction("abc")).toBeNull();
    expect(parseFraction("1/0")).toBeNull();
  });
});

describe("spldv", () => {
  it("solves a unique system exactly", () => {
    const s = solveSystem({ a: 2, b: 3, c: 12 }, { a: 3, b: 4, c: 17 });
    expect(s).toEqual({ kind: "unique", x: frac(3), y: frac(2) });
  });
  it("detects parallel and coincident lines", () => {
    expect(solveSystem({ a: 1, b: 2, c: 6 }, { a: 2, b: 4, c: 8 }).kind).toBe("none");
    expect(solveSystem({ a: 1, b: 2, c: 5 }, { a: 2, b: 4, c: 10 }).kind).toBe("infinite");
  });
  it("handles fractional solutions", () => {
    const s = solveSystem({ a: 2, b: 3, c: 8 }, { a: 4, b: -3, c: 10 });
    expect(s).toEqual({ kind: "unique", x: frac(3), y: frac(2, 3) });
  });
  it("formats equations with signs", () => {
    expect(formatEquation({ a: 2, b: -1, c: 5 })).toBe("2x − y = 5");
    expect(formatEquation({ a: -1, b: 1, c: -3 })).toBe("−x + y = −3");
    expect(formatEquation({ a: 0, b: 4, c: 8 })).toBe("4y = 8");
  });
  it("plans elimination like the textbook", () => {
    const p = planElimination({ a: 2, b: 3, c: 12 }, { a: 3, b: 4, c: 17 }, "x")!;
    expect([p.m1, p.m2, p.target, p.operation]).toEqual([3, 2, 6, "subtract"]);
    expect(p.scaled1).toEqual({ a: 6, b: 9, c: 36 });
    expect(p.outcome).toEqual({ kind: "unique", keepValue: frac(2), otherValue: frac(3), substituteInto: 1 });
    const q = planElimination({ a: 3, b: -2, c: 4 }, { a: 2, b: 5, c: 9 }, "y")!;
    expect([q.m1, q.m2, q.operation, q.resultCoef, q.resultConst]).toEqual([5, 2, "add", 19, 38]);
  });
  it("returns null when coefficient is zero", () => {
    expect(planElimination({ a: 0, b: 3, c: 6 }, { a: 1, b: 1, c: 4 }, "x")).toBeNull();
  });
  it("generator always produces valid integer-solution systems", () => {
    const rng = seededRng(42);
    for (const d of ["mudah", "sedang", "sulit"] as const) {
      for (let i = 0; i < 300; i++) {
        const g = generateSystem(rng, d);
        expect(solveSystem(g.e1, g.e2).kind).toBe("unique");
        expect(satisfies(g.e1, frac(g.x), frac(g.y))).toBe(true);
        expect(satisfies(g.e2, frac(g.x), frac(g.y))).toBe(true);
        for (const v of ["x", "y"] as const) {
          const p = planElimination(g.e1, g.e2, v);
          if (p && p.outcome.kind === "unique") {
            expect(p.outcome[p.keep === "x" ? "keepValue" : "otherValue"]).toEqual(frac(g.x));
          }
        }
      }
    }
  });
});
