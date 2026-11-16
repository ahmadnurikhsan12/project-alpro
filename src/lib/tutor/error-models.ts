import { div, equals, frac, isInteger, lcm, mul, parseFraction, sub, type Fraction } from "@/lib/math/fraction";
import { coefficientOf, planElimination, solveSystem, type Equation, type Variable } from "@/lib/math/spldv";
import { normalizeNumberInput, parsePair } from "@/lib/questions/grade";
import type { DiagnosisCode, TargetSpec } from "./types";

/**
 * MODEL KESALAHAN
 *
 * Setiap model menghitung jawaban yang akan dihasilkan seorang siswa jika ia melakukan
 * SATU jenis kekeliruan khas pada metode eliminasi. Kebenaran (jawaban benar, rencana
 * eliminasi, pengali terkecil) selalu diambil dari spldv.ts. Diagnosis hanya dinyatakan
 * jika jawaban siswa PERSIS sama dengan keluaran salah satu model; selebihnya
 * "belum teridentifikasi".
 */

export interface System {
  e1: Equation;
  e2: Equation;
}

/** Satu pola yang cocok, dengan detail bila relevan. */
export interface ErrorMatch {
  code: DiagnosisCode;
  /** Untuk "sebagian_benar": variabel yang jawabannya sudah benar. */
  correctVar?: Variable;
}

/** Urutan prioritas jika beberapa pola menghasilkan jawaban yang sama. */
export const PRIORITY: DiagnosisCode[] = [
  "tanda_hasil",
  "variabel_tertukar",
  "variabel_lain",
  "sebagian_benar",
  "pengali_tertukar",
  "kpk_bukan_pengali",
  "pengali_bukan_terkecil",
  "tambah_bukan_kali",
  "lupa_kalikan_ruas_kanan",
  "tanda_pengurangan",
  "salah_operasi",
  "tidak_samakan_koefisien",
];

interface Flags {
  forgetRhs?: "both" | 1 | 2;
  flipOp?: boolean;
  signSlip?: boolean;
  noEqualize?: boolean;
}

interface Pair {
  x: Fraction;
  y: Fraction;
}

const other = (v: Variable): Variable => (v === "x" ? "y" : "x");

/** Menjalankan eliminasi (variabel `elim` dihilangkan) dengan SATU kekeliruan yang ditentukan `flags`. */
function runElimination(e1: Equation, e2: Equation, elim: Variable, flags: Flags): Pair | null {
  const keep = other(elim);
  const c1 = coefficientOf(e1, elim);
  const c2 = coefficientOf(e2, elim);
  if (c1 === 0 || c2 === 0) return null;
  const target = lcm(Math.abs(c1), Math.abs(c2));
  const m1 = flags.noEqualize ? 1 : target / Math.abs(c1);
  const m2 = flags.noEqualize ? 1 : target / Math.abs(c2);
  const unscale1 = flags.forgetRhs === "both" || flags.forgetRhs === 1;
  const unscale2 = flags.forgetRhs === "both" || flags.forgetRhs === 2;
  const s1 = { a: e1.a * m1, b: e1.b * m1, c: unscale1 ? e1.c : e1.c * m1 };
  const s2 = { a: e2.a * m2, b: e2.b * m2, c: unscale2 ? e2.c : e2.c * m2 };

  const sameSign = Math.sign(coefficientOf(s1, elim)) === Math.sign(coefficientOf(s2, elim));
  let subtract = sameSign;
  if (flags.flipOp) subtract = !subtract;
  const combine = (p: number, q: number) => (subtract ? (flags.signSlip && q < 0 ? p + q : p - q) : p + q);

  const keepCoef = combine(coefficientOf(s1, keep), coefficientOf(s2, keep));
  const rhs = combine(s1.c, s2.c);
  if (keepCoef === 0) return null;
  const keepValue = frac(rhs, keepCoef);
  // variabel kedua dari substitusi ke persamaan (1) — langkah ini dilakukan dengan benar
  const otherValue = div(sub(frac(e1.c), mul(frac(coefficientOf(e1, keep)), keepValue)), frac(c1));
  return elim === "x" ? { x: otherValue, y: keepValue } : { x: keepValue, y: otherValue };
}

const PROCEDURE_ERRORS: { code: DiagnosisCode; flags: Flags[] }[] = [
  { code: "lupa_kalikan_ruas_kanan", flags: [{ forgetRhs: "both" }, { forgetRhs: 1 }, { forgetRhs: 2 }] },
  { code: "tanda_pengurangan", flags: [{ signSlip: true }] },
  { code: "salah_operasi", flags: [{ flipOp: true }] },
  { code: "tidak_samakan_koefisien", flags: [{ noEqualize: true }] },
];

function ordered(found: Set<DiagnosisCode>): DiagnosisCode[] {
  return PRIORITY.filter((c) => found.has(c));
}

const toFraction = (raw: string): Fraction | null => parseFraction(normalizeNumberInput(raw));

/** Pasangan penyelesaian yang benar menurut spldv.ts, atau null jika sistem tidak punya penyelesaian tunggal. */
function truth(sys: System): Pair | null {
  const s = solveSystem(sys.e1, sys.e2);
  return s.kind === "unique" ? { x: s.x, y: s.y } : null;
}

function matchVar(v: Variable, sys: System, ans: Fraction): DiagnosisCode[] {
  const t = truth(sys);
  if (!t) return [];
  const correct = t[v];
  if (equals(ans, correct)) return [];
  const found = new Set<DiagnosisCode>();
  if (correct.n !== 0 && equals(ans, frac(-correct.n, correct.d))) found.add("tanda_hasil");
  if (equals(ans, t[other(v)])) found.add("variabel_lain");
  for (const elim of ["x", "y"] as const) {
    for (const { code, flags } of PROCEDURE_ERRORS) {
      for (const f of flags) {
        const r = runElimination(sys.e1, sys.e2, elim, f);
        if (r && equals(r[v], ans)) found.add(code);
      }
    }
  }
  return ordered(found);
}

function matchPair(sys: System, a: Fraction, b: Fraction): ErrorMatch[] {
  const t = truth(sys);
  if (!t) return [];
  if (equals(a, t.x) && equals(b, t.y)) return [];
  const found = new Set<DiagnosisCode>();
  if (equals(a, t.y) && equals(b, t.x) && !equals(t.x, t.y)) found.add("variabel_tertukar");
  const xRight = equals(a, t.x);
  const partial = xRight !== equals(b, t.y);
  if (partial) found.add("sebagian_benar");
  for (const elim of ["x", "y"] as const) {
    for (const { code, flags } of PROCEDURE_ERRORS) {
      for (const f of flags) {
        const r = runElimination(sys.e1, sys.e2, elim, f);
        if (r && equals(r.x, a) && equals(r.y, b)) found.add(code);
      }
    }
  }
  return ordered(found).map((code) => (code === "sebagian_benar" && partial ? { code, correctVar: (xRight ? "x" : "y") as Variable } : { code }));
}

function matchMultiplier(sys: System, eq: 1 | 2, elim: Variable, ans: Fraction): DiagnosisCode[] {
  const plan = planElimination(sys.e1, sys.e2, elim);
  if (!plan || !isInteger(ans) || ans.n < 1) return [];
  const k = ans.n;
  const minimal = eq === 1 ? plan.m1 : plan.m2;
  const otherMin = eq === 1 ? plan.m2 : plan.m1;
  const own = Math.abs(eq === 1 ? plan.coef1 : plan.coef2);
  if (k === minimal) return [];
  const found = new Set<DiagnosisCode>();
  if (k === plan.target) found.add("kpk_bukan_pengali");
  else if (k === otherMin) found.add("pengali_tertukar");
  else if ((k * own) % plan.target === 0) found.add("pengali_bukan_terkecil"); // membuat koefisien sama, tetapi bukan yang terkecil
  return ordered(found);
}

function matchCombinedConst(sys: System, elim: Variable, ans: Fraction): DiagnosisCode[] {
  const plan = planElimination(sys.e1, sys.e2, elim);
  if (!plan) return [];
  const correct = frac(plan.resultConst);
  if (equals(ans, correct)) return [];
  const s1 = sys.e1.c * plan.m1;
  const s2 = sys.e2.c * plan.m2;
  const found = new Set<DiagnosisCode>();
  const eq = (n: number) => equals(ans, frac(n));
  if (plan.resultConst !== 0 && eq(-plan.resultConst)) found.add("tanda_hasil");
  // operasi kebalikan dari yang seharusnya
  if (eq(plan.operation === "add" ? s1 - s2 : s1 + s2)) found.add("salah_operasi");
  // ruas kanan tidak ikut dikalikan
  const unscaled = (c1: number, c2: number) => (plan.operation === "add" ? c1 + c2 : c1 - c2);
  const variants = [unscaled(sys.e1.c, sys.e2.c), unscaled(sys.e1.c, s2), unscaled(s1, sys.e2.c)];
  if ((plan.m1 !== 1 || plan.m2 !== 1) && variants.some(eq)) found.add("lupa_kalikan_ruas_kanan");
  // tanda suku negatif saat mengurangkan tidak dibalik
  if (plan.operation === "subtract" && eq(s2 < 0 ? s1 + s2 : s1 - s2) && s2 < 0) found.add("tanda_pengurangan");
  return ordered(found);
}

function matchScaledConst(c: number, factor: number, ans: Fraction): DiagnosisCode[] {
  if (equals(ans, frac(c * factor))) return [];
  const found = new Set<DiagnosisCode>();
  if (equals(ans, frac(c)) && factor !== 1) found.add("lupa_kalikan_ruas_kanan");
  if (equals(ans, frac(c + factor)) && c * factor !== c + factor) found.add("tambah_bukan_kali");
  return ordered(found);
}

/**
 * Mengenali pola kesalahan dari jawaban siswa. Mengembalikan daftar kode (maks. 3, terurut
 * menurut prioritas), atau [] jika polanya tidak dikenali. Tidak pernah menebak.
 */
export function matchErrorModels(target: TargetSpec, sys: System | undefined, rawAnswer: string): ErrorMatch[] {
  let codes: ErrorMatch[] = [];
  const plain = (cs: DiagnosisCode[]): ErrorMatch[] => cs.map((code) => ({ code }));
  if (target.kind === "scaled_const") {
    const a = toFraction(rawAnswer);
    codes = a ? plain(matchScaledConst(target.c, target.factor, a)) : [];
  } else if (sys) {
    if (target.kind === "pair") {
      const p = parsePair(rawAnswer);
      const a = p && toFraction(p[0]);
      const b = p && toFraction(p[1]);
      codes = a && b ? matchPair(sys, a, b) : [];
    } else {
      const a = toFraction(rawAnswer);
      if (a) {
        if (target.kind === "var") codes = plain(matchVar(target.v, sys, a));
        else if (target.kind === "multiplier") codes = plain(matchMultiplier(sys, target.eq, target.eliminate, a));
        else codes = plain(matchCombinedConst(sys, target.eliminate, a));
      }
    }
  }
  // Beberapa kekeliruan dapat menghasilkan angka yang sama (mis. salah tanda saat mengurangkan dan salah
  // operasi). Semua yang cocok ditampilkan sebagai "kemungkinan" — dibatasi 3 agar tidak menjadi noise.
  return codes.slice(0, 3);
}

/** Jawaban benar untuk sebuah target, dihitung dari spldv.ts (dipakai untuk memverifikasi data soal). */
export function expectedForTarget(target: TargetSpec, sys: System | undefined): string | null {
  if (target.kind === "scaled_const") return String(target.c * target.factor);
  if (!sys) return null;
  const t = truth(sys);
  if (target.kind === "pair") return t ? `${t.x.n / t.x.d},${t.y.n / t.y.d}` : null;
  if (target.kind === "var") return t ? String(t[target.v].n / t[target.v].d) : null;
  const plan = planElimination(sys.e1, sys.e2, target.eliminate);
  if (!plan) return null;
  if (target.kind === "multiplier") return String(target.eq === 1 ? plan.m1 : plan.m2);
  return String(plan.resultConst);
}

