import { frac, toNumber } from "@/lib/math/fraction";
import {
  coefficientOf,
  easiestVariable,
  evaluateLeft,
  formatEquation,
  formatNumber,
  generateSystem,
  planElimination,
  randInt,
  seededRng,
  type Difficulty,
  type Equation,
  type GeneratedSystem,
  type Variable,
} from "@/lib/math/spldv";
import { revealsPair } from "./leak";
import type { Resolved } from "./resolve";
import type { SkillCode, WorkedExample } from "./types";

const MINUS = "−";

/** Hash sederhana agar contoh deterministik untuk setiap soal. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const coefTerm = (coef: number, v: string) => (coef === 1 ? v : coef === -1 ? `${MINUS}${v}` : `${formatNumber(coef)}${v}`);

/** Persamaan dengan sebagian variabel diganti nilainya, mis. "3x + 2(4) = 17". */
function substituted(eq: Equation, known: Partial<Record<Variable, number>>): string {
  const parts: string[] = [];
  (["x", "y"] as const).forEach((v) => {
    const coef = v === "x" ? eq.a : eq.b;
    if (coef === 0) return;
    const abs = Math.abs(coef);
    const k = known[v];
    const body = k !== undefined ? `${abs === 1 ? "" : abs}(${formatNumber(k)})` : `${abs === 1 ? "" : abs}${v}`;
    parts.push(parts.length === 0 ? (coef < 0 ? `${MINUS}${body}` : body) : coef < 0 ? `${MINUS} ${body}` : `+ ${body}`);
  });
  return `${parts.join(" ")} = ${formatNumber(eq.c)}`;
}

interface Spec {
  skill: SkillCode;
  seed: number;
  difficulty: Difficulty;
  avoid?: { e1: Equation; e2: Equation; x?: number; y?: number };
  relation?: "same" | "opposite";
}

const sameSystem = (a: Equation, b: Equation, c: Equation, d: Equation) =>
  a.a === c.a && a.b === c.b && a.c === c.c && b.a === d.a && b.b === d.b && b.c === d.c;

function pickSystem(spec: Spec, attempt: number, accept: (g: GeneratedSystem) => boolean): GeneratedSystem | null {
  for (let t = 0; t < 80; t++) {
    const rng = seededRng(spec.seed + attempt * 104729 + t * 7919);
    const g = generateSystem(rng, spec.difficulty);
    const av = spec.avoid;
    if (av && sameSystem(g.e1, g.e2, av.e1, av.e2)) continue;
    if (av?.x !== undefined && (g.x === av.x || g.y === av.y)) continue;
    if (accept(g)) return g;
  }
  return null;
}

/** Bentuk eliminasi sebuah sistem: perlu pengali atau tidak, dan operasi akhirnya. */
function shapeOf(e1: Equation, e2: Equation, elim?: Variable): { scaled: boolean; op: "add" | "subtract" } | null {
  const p = planElimination(e1, e2, elim ?? easiestVariable(e1, e2));
  return p ? { scaled: p.m1 !== 1 || p.m2 !== 1, op: p.operation } : null;
}

const header = (g: GeneratedSystem) => [`(1) ${formatEquation(g.e1)}`, `(2) ${formatEquation(g.e2)}`];

function fullElimination(g: GeneratedSystem): string[] {
  const elim = easiestVariable(g.e1, g.e2);
  const p = planElimination(g.e1, g.e2, elim)!;
  const keep = p.keep;
  const lines = header(g);
  lines.push(
    p.m1 === 1 && p.m2 === 1
      ? `Hilangkan ${elim}: koefisiennya ${formatNumber(p.coef1)} dan ${formatNumber(p.coef2)} (sudah sama besar).`
      : `Hilangkan ${elim}: koefisiennya ${formatNumber(p.coef1)} dan ${formatNumber(p.coef2)}, KPK dari ${Math.abs(p.coef1)} dan ${Math.abs(p.coef2)} adalah ${p.target}.`,
  );
  if (p.m1 !== 1 || p.m2 !== 1) lines.push(`(1) × ${p.m1} → ${formatEquation(p.scaled1)}`, `(2) × ${p.m2} → ${formatEquation(p.scaled2)}`);
  const sameSign = Math.sign(coefficientOf(p.scaled1, elim)) === Math.sign(coefficientOf(p.scaled2, elim));
  lines.push(`Koefisien ${elim} bertanda ${sameSign ? "sama" : "berlawanan"}, jadi ${p.operation === "subtract" ? "kurangkan" : "jumlahkan"}: ${coefTerm(p.resultCoef, keep)} = ${formatNumber(p.resultConst)}`);
  const keepValue = keep === "x" ? g.x : g.y;
  const elimValue = keep === "x" ? g.y : g.x;
  lines.push(`${keep} = ${formatNumber(keepValue)}`);
  lines.push(`Substitusi ${keep} = ${formatNumber(keepValue)} ke (1): ${substituted(g.e1, { [keep]: keepValue })}`);
  lines.push(`${elim} = ${formatNumber(elimValue)}`);
  lines.push(`Periksa ke (2): ${substituted(g.e2, { x: g.x, y: g.y })} → ${formatNumber(g.e2.a * g.x + g.e2.b * g.y)} ✓`);
  lines.push(`Penyelesaian: (${formatNumber(g.x)}, ${formatNumber(g.y)})`);
  return lines;
}

function chooseOperation(g: GeneratedSystem): string[] {
  const elim = easiestVariable(g.e1, g.e2);
  const p = planElimination(g.e1, g.e2, elim)!;
  const c1 = p.coef1;
  const c2 = p.coef2;
  const sameSign = Math.sign(c1) === Math.sign(c2);
  const wrap = (n: number) => (n < 0 ? `(${formatNumber(n)})` : formatNumber(n));
  return [
    ...header(g),
    `Hilangkan ${elim}. Koefisien ${elim}: ${formatNumber(c1)} dan ${formatNumber(c2)} (bertanda ${sameSign ? "sama" : "berlawanan"}).`,
    sameSign ? `Tanda sama → kurangkan: ${formatNumber(c1)} − ${wrap(c2)} = 0` : `Tanda berlawanan → jumlahkan: ${formatNumber(c1)} + ${wrap(c2)} = 0`,
    `Hasil: ${coefTerm(p.resultCoef, p.keep)} = ${formatNumber(p.resultConst)}`,
  ];
}

function equalizeCoefficients(g: GeneratedSystem, elim: Variable): string[] {
  const p = planElimination(g.e1, g.e2, elim)!;
  return [
    ...header(g),
    `Hilangkan ${elim}: koefisiennya ${formatNumber(p.coef1)} dan ${formatNumber(p.coef2)}. KPK dari ${Math.abs(p.coef1)} dan ${Math.abs(p.coef2)} adalah ${p.target}.`,
    `Pengali (1) = ${p.target} ÷ ${Math.abs(p.coef1)} = ${p.m1}; pengali (2) = ${p.target} ÷ ${Math.abs(p.coef2)} = ${p.m2}.`,
    `(1) × ${p.m1} → ${formatEquation(p.scaled1)}`,
    `(2) × ${p.m2} → ${formatEquation(p.scaled2)}`,
    `Sekarang koefisien ${elim} sama besar (${Math.abs(coefficientOf(p.scaled1, elim))}).`,
  ];
}

function checkPair(g: GeneratedSystem): string[] {
  const left = (eq: Equation, x: number, y: number) => toNumber(evaluateLeft(eq, frac(x), frac(y)));
  const wx = g.x + g.e1.b;
  const wy = g.y - g.e1.a; // memenuhi (1) tetapi tidak memenuhi (2)
  return [
    ...header(g),
    `Uji pasangan (${formatNumber(g.x)}, ${formatNumber(g.y)}):`,
    `  (1) ${substituted(g.e1, { x: g.x, y: g.y })} → ${formatNumber(left(g.e1, g.x, g.y))} ✓`,
    `  (2) ${substituted(g.e2, { x: g.x, y: g.y })} → ${formatNumber(left(g.e2, g.x, g.y))} ✓`,
    `  Kedua persamaan terpenuhi → penyelesaian.`,
    `Uji pasangan (${formatNumber(wx)}, ${formatNumber(wy)}):`,
    `  (1) ${substituted(g.e1, { x: wx, y: wy })} → ${formatNumber(left(g.e1, wx, wy))} ✓`,
    `  (2) ${substituted(g.e2, { x: wx, y: wy })} → ${formatNumber(left(g.e2, wx, wy))} ≠ ${formatNumber(g.e2.c)} ✗`,
    `  Hanya satu persamaan terpenuhi → bukan penyelesaian.`,
  ];
}

function multiplyWholeEquation(g: GeneratedSystem, k: number): string[] {
  const e = g.e1;
  const scaled = { a: e.a * k, b: e.b * k, c: e.c * k };
  const part = (coef: number, v: string) => `${coefTerm(coef, v)}`;
  return [
    `Persamaan: ${formatEquation(e)}  (salah satu penyelesaiannya: x = ${formatNumber(g.x)}, y = ${formatNumber(g.y)})`,
    `Dikalikan ${k}, SEMUA suku ikut dikalikan:`,
    `  ${part(e.a, "x")} × ${k} = ${part(scaled.a, "x")};  ${part(e.b, "y")} × ${k} = ${part(scaled.b, "y")};  ${formatNumber(e.c)} × ${k} = ${formatNumber(scaled.c)}`,
    `Persamaan baru: ${formatEquation(scaled)}`,
    `Uji pasangan yang sama: ${substituted(scaled, { x: g.x, y: g.y })} → ${formatNumber(scaled.a * g.x + scaled.b * g.y)} ✓ (tetap terpenuhi)`,
    `Jika konstanta lupa dikalikan (${formatEquation({ ...scaled, c: e.c })}): ruas kiri tetap ${formatNumber(scaled.a * g.x + scaled.b * g.y)}, bukan ${formatNumber(e.c)} ✗`,
  ];
}

function signExample(rng: () => number): string[] {
  const a = randInt(rng, 3, 9);
  const b = randInt(rng, 2, 8);
  return [
    `${a}y − (${MINUS}${b}y) = ${a}y + ${b}y = ${a + b}y`,
    `Bandingkan: ${a}y − ${b}y = ${a - b}y (hasil berbeda).`,
    `Tanda minus di depan suku yang dikurangkan membalik tanda suku itu.`,
  ];
}

const TITLE = "Contoh serupa (angka berbeda)";
const NOTE = "Ini contoh soal lain dengan angka berbeda — bukan jawaban soalmu. Kerjakan soalmu dengan langkah yang sama.";

function build(r: Resolved, attempt: number): WorkedExample | null {
  const q = r.question;
  const seed = hashString(q.id);
  const base: Spec = {
    skill: r.skill,
    seed,
    difficulty: q.difficulty,
    avoid: r.system ? { e1: r.system.e1, e2: r.system.e2, x: q.verify?.x, y: q.verify?.y } : undefined,
  };

  switch (r.skill) {
    case "pilih_operasi": {
      const rel: "same" | "opposite" | undefined = r.system && r.eliminate ? (Math.sign(coefficientOf(r.system.e1, r.eliminate)) === Math.sign(coefficientOf(r.system.e2, r.eliminate)) ? "same" : "opposite") : undefined;
      const spec = { ...base, difficulty: "mudah" as Difficulty, relation: rel };
      const g = pickSystem(spec, attempt, (s) => {
        const v = easiestVariable(s.e1, s.e2);
        const p = planElimination(s.e1, s.e2, v);
        if (!p || p.m1 !== 1 || p.m2 !== 1) return false;
        const same = Math.sign(p.coef1) === Math.sign(p.coef2);
        return rel === undefined || (rel === "same") === same;
      });
      return g ? { title: TITLE, lines: chooseOperation(g), note: NOTE } : null;
    }
    case "samakan_koefisien": {
      const spec = { ...base, difficulty: (q.difficulty === "sulit" ? "sulit" : "sedang") as Difficulty };
      const pickVar = (s: GeneratedSystem): Variable | null => {
        for (const v of ["x", "y"] as const) {
          const p = planElimination(s.e1, s.e2, v);
          if (p && (p.m1 !== 1 || p.m2 !== 1)) return v;
        }
        return null;
      };
      const g = pickSystem(spec, attempt, (s) => pickVar(s) !== null);
      return g ? { title: TITLE, lines: equalizeCoefficients(g, pickVar(g)!), note: NOTE } : null;
    }
    case "periksa_solusi": {
      const g = pickSystem({ ...base, difficulty: "mudah" }, attempt, () => true);
      return g ? { title: TITLE, lines: checkPair(g), note: NOTE } : null;
    }
    case "ruas_kanan": {
      // konstanta tidak boleh 0: kalau 0, contoh "lupa mengalikan konstanta" tidak menunjukkan perbedaan apa pun
      const g = pickSystem({ ...base, difficulty: "sedang" }, attempt, (s) => s.e1.c !== 0);
      if (!g) return null;
      const k = 2 + ((seed + attempt) % 3);
      return { title: TITLE, lines: multiplyWholeEquation(g, k), note: NOTE };
    }
    case "tanda":
      return { title: TITLE, lines: signExample(seededRng(seed + attempt * 31)), note: NOTE };
    default: {
      // hitung_eliminasi, substitusi, dan konsep (urutan langkah eliminasi secara utuh).
      // Contoh dibuat SERUPA: perlu/tidaknya pengali dan operasi akhirnya sama dengan soal.
      const elim = r.target && "eliminate" in r.target ? r.target.eliminate : undefined;
      const orig = r.system ? shapeOf(r.system.e1, r.system.e2, elim) : null;
      const difficulty: Difficulty = orig ? (orig.scaled ? (q.difficulty === "sulit" ? "sulit" : "sedang") : "mudah") : q.difficulty;
      const g =
        pickSystem({ ...base, difficulty }, attempt, (s) => {
          if (s.x === s.y) return false;
          const sh = shapeOf(s.e1, s.e2);
          return !orig || (!!sh && sh.scaled === orig.scaled && sh.op === orig.op);
        }) ?? pickSystem({ ...base, difficulty }, attempt, (s) => s.x !== s.y);
      return g ? { title: TITLE, lines: fullElimination(g), note: NOTE } : null;
    }
  }
}

/**
 * Contoh penyelesaian pada sistem SERUPA dengan angka berbeda (L4). Dihitung oleh spldv.ts.
 * Mengembalikan null bila tidak ada contoh yang sesuai atau tidak ada yang bebas dari kebocoran jawaban.
 */
export function workedExampleFor(r: Resolved): WorkedExample | null {
  // Soal di luar pilot tanpa sistem persamaan: contoh eliminasi tidak relevan.
  if (!r.authored && !r.system) return null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const ex = build(r, attempt);
    if (ex && !revealsPair(r.question, [ex.title, ...ex.lines].join(" "))) return ex;
  }
  return null;
}
