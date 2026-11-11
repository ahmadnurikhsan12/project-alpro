import { add, div, equals, frac, formatFraction, lcm, mul, sub, type Fraction } from "./fraction";

/** Persamaan linear dua variabel dalam bentuk ax + by = c */
export interface Equation {
  a: number;
  b: number;
  c: number;
}

export type Variable = "x" | "y";
export type Difficulty = "mudah" | "sedang" | "sulit";

export type SystemSolution =
  | { kind: "unique"; x: Fraction; y: Fraction }
  | { kind: "none" }
  | { kind: "infinite" };

const MINUS = "−";

/** Format satu suku, mis. (3,"x",true) -> "3x", (-1,"y",false) -> "− y" */
function term(coef: number, v: string, first: boolean): string {
  if (coef === 0) return "";
  const abs = Math.abs(coef);
  const body = abs === 1 ? v : `${abs}${v}`;
  if (first) return coef < 0 ? `${MINUS}${body}` : body;
  return coef < 0 ? ` ${MINUS} ${body}` : ` + ${body}`;
}

export function formatNumber(n: number): string {
  return n < 0 ? `${MINUS}${Math.abs(n)}` : String(n);
}

export function formatValue(f: Fraction): string {
  return formatFraction(f).replace("-", MINUS);
}

/** Menampilkan persamaan, mis. {a:2,b:-1,c:5} -> "2x − y = 5" */
export function formatEquation(eq: Equation, vars: [string, string] = ["x", "y"]): string {
  const left = term(eq.a, vars[0], true) + term(eq.b, vars[1], eq.a === 0);
  return `${left || "0"} = ${formatNumber(eq.c)}`;
}

/** Menampilkan ruas kiri dengan nilai disubstitusikan, mis. "2(3) + 4(−1)" */
export function formatSubstitution(eq: Equation, x: string, y: string): string {
  const wrap = (s: string) => (s.startsWith(MINUS) || s.startsWith("-") ? `(${s})` : `(${s})`);
  const parts: string[] = [];
  if (eq.a !== 0) parts.push(`${eq.a === 1 ? "" : eq.a === -1 ? MINUS : formatNumber(eq.a)}${wrap(x)}`);
  if (eq.b !== 0) {
    const coef = eq.b === 1 ? "" : eq.b === -1 ? "" : String(Math.abs(eq.b));
    const sign = eq.b < 0 ? ` ${MINUS} ` : " + ";
    parts.push(parts.length ? `${sign}${coef}${wrap(y)}` : `${eq.b < 0 ? MINUS : ""}${coef}${wrap(y)}`);
  }
  return parts.join("") || "0";
}

export function coefficientOf(eq: Equation, v: Variable): number {
  return v === "x" ? eq.a : eq.b;
}

export function evaluateLeft(eq: Equation, x: Fraction, y: Fraction): Fraction {
  return add(mul(frac(eq.a), x), mul(frac(eq.b), y));
}

export function satisfies(eq: Equation, x: Fraction, y: Fraction): boolean {
  return equals(evaluateLeft(eq, x, y), frac(eq.c));
}

export function isValidEquation(eq: Equation): boolean {
  return [eq.a, eq.b, eq.c].every(Number.isFinite) && !(eq.a === 0 && eq.b === 0);
}

/** Menyelesaikan SPLDV secara eksak dengan determinan. */
export function solveSystem(e1: Equation, e2: Equation): SystemSolution {
  const det = e1.a * e2.b - e2.a * e1.b;
  if (det === 0) {
    // Garis sejajar atau berimpit
    const detX = e1.c * e2.b - e2.c * e1.b;
    const detY = e1.a * e2.c - e2.a * e1.c;
    if (detX === 0 && detY === 0) return { kind: "infinite" };
    return { kind: "none" };
  }
  const x = frac(e1.c * e2.b - e2.c * e1.b, det);
  const y = frac(e1.a * e2.c - e2.a * e1.c, det);
  return { kind: "unique", x, y };
}

export function scaleEquation(eq: Equation, k: number): Equation {
  return { a: eq.a * k, b: eq.b * k, c: eq.c * k };
}

export interface EliminationPlan {
  eliminate: Variable;
  keep: Variable;
  coef1: number;
  coef2: number;
  target: number;
  m1: number;
  m2: number;
  scaled1: Equation;
  scaled2: Equation;
  operation: "add" | "subtract";
  /** hasil: resultCoef * keep = resultConst */
  resultCoef: number;
  resultConst: number;
  outcome:
    | { kind: "unique"; keepValue: Fraction; otherValue: Fraction; substituteInto: 1 | 2 }
    | { kind: "none" }
    | { kind: "infinite" };
}

/**
 * Menyusun rencana eliminasi lengkap. Mengembalikan null jika koefisien
 * variabel yang dieliminasi bernilai 0 pada salah satu persamaan
 * (variabel itu memang sudah tidak ada di persamaan tersebut).
 */
export function planElimination(e1: Equation, e2: Equation, eliminate: Variable): EliminationPlan | null {
  const keep: Variable = eliminate === "x" ? "y" : "x";
  const coef1 = coefficientOf(e1, eliminate);
  const coef2 = coefficientOf(e2, eliminate);
  if (coef1 === 0 || coef2 === 0) return null;

  const target = lcm(coef1, coef2);
  const m1 = target / Math.abs(coef1);
  const m2 = target / Math.abs(coef2);
  const scaled1 = scaleEquation(e1, m1);
  const scaled2 = scaleEquation(e2, m2);
  const sameSign = Math.sign(coef1) === Math.sign(coef2);
  const operation = sameSign ? "subtract" : "add";
  const combine = (p: number, q: number) => (sameSign ? p - q : p + q);
  const resultCoef = combine(coefficientOf(scaled1, keep), coefficientOf(scaled2, keep));
  const resultConst = combine(scaled1.c, scaled2.c);

  let outcome: EliminationPlan["outcome"];
  if (resultCoef === 0) {
    outcome = resultConst === 0 ? { kind: "infinite" } : { kind: "none" };
  } else {
    const keepValue = frac(resultConst, resultCoef);
    // substitusi ke persamaan pertama (koefisien variabel tereliminasi pasti ≠ 0)
    const keepCoef = coefficientOf(e1, keep);
    const otherValue = div(sub(frac(e1.c), mul(frac(keepCoef), keepValue)), frac(coef1));
    outcome = { kind: "unique", keepValue, otherValue, substituteInto: 1 };
  }

  return { eliminate, keep, coef1, coef2, target, m1, m2, scaled1, scaled2, operation, resultCoef, resultConst, outcome };
}

// ---------------------------------------------------------------------------
// Generator soal acak dengan solusi bilangan bulat
// ---------------------------------------------------------------------------

export type Rng = () => number;

/** PRNG deterministik (mulberry32) agar soal bisa direproduksi dari seed. */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface GeneratedSystem {
  e1: Equation;
  e2: Equation;
  x: number;
  y: number;
}

/**
 * Membuat SPLDV acak dengan solusi bulat tunggal.
 * - mudah : satu variabel koefisiennya sudah sama → langsung dikurangkan/dijumlahkan
 * - sedang: salah satu persamaan perlu dikalikan
 * - sulit : kedua persamaan perlu dikalikan, boleh ada koefisien/solusi negatif
 */
export function generateSystem(rng: Rng, difficulty: Difficulty): GeneratedSystem {
  for (let attempt = 0; attempt < 200; attempt++) {
    let a1: number, b1: number, a2: number, b2: number, x: number, y: number;
    if (difficulty === "mudah") {
      x = randInt(rng, 1, 9);
      y = randInt(rng, 1, 9);
      const shared = randInt(rng, 1, 3);
      b1 = shared;
      b2 = rng() < 0.5 ? shared : -shared;
      a1 = randInt(rng, 1, 4);
      a2 = randInt(rng, 1, 4);
      if (rng() < 0.5) {
        [a1, b1] = [b1, a1];
        [a2, b2] = [b2, a2];
      }
    } else if (difficulty === "sedang") {
      x = randInt(rng, -3, 10);
      y = randInt(rng, -3, 10);
      a1 = randInt(rng, 1, 3);
      const k = randInt(rng, 2, 3);
      a2 = a1 * k;
      b1 = randInt(rng, 1, 5) * (rng() < 0.3 ? -1 : 1);
      b2 = randInt(rng, 1, 6) * (rng() < 0.3 ? -1 : 1);
      if (rng() < 0.5) {
        [a1, b1] = [b1, a1];
        [a2, b2] = [b2, a2];
      }
    } else {
      x = randInt(rng, -8, 12);
      y = randInt(rng, -8, 12);
      const coefs = [2, 3, 4, 5, 6, 7];
      a1 = pick(rng, coefs);
      a2 = pick(rng, coefs.filter((c) => c !== a1 && lcm(c, a1) !== Math.max(c, a1)));
      b1 = pick(rng, coefs) * (rng() < 0.4 ? -1 : 1);
      b2 = pick(rng, coefs) * (rng() < 0.4 ? -1 : 1);
      if (!a2) continue;
    }
    if (a1 * b2 - a2 * b1 === 0) continue;
    if (a1 === a2 && b1 === b2) continue;
    if (difficulty !== "sulit" && (x === 0 || y === 0)) continue;
    const e1 = { a: a1, b: b1, c: a1 * x + b1 * y };
    const e2 = { a: a2, b: b2, c: a2 * x + b2 * y };
    return { e1, e2, x, y };
  }
  // fallback yang pasti valid
  return { e1: { a: 1, b: 1, c: 7 }, e2: { a: 1, b: -1, c: 1 }, x: 4, y: 3 };
}

/** Variabel yang paling mudah dieliminasi (pengali terkecil). */
export function easiestVariable(e1: Equation, e2: Equation): Variable {
  const cost = (v: Variable) => {
    const p = planElimination(e1, e2, v);
    return p ? p.m1 * p.m2 : Infinity;
  };
  return cost("x") <= cost("y") ? "x" : "y";
}
