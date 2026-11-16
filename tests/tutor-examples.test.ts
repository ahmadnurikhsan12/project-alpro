import { describe, expect, it } from "vitest";
import { ALL_LESSON_QUIZ_QUESTIONS } from "@/content/lessons";
import { PRACTICE_QUESTIONS } from "@/content/practice";
import { MEDIATION_BY_ID } from "@/content/mediation";
import { frac } from "@/lib/math/fraction";
import { generateSystem, satisfies, seededRng, solveSystem, type Difficulty, type GeneratedSystem } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";
import { workedExampleFor } from "@/lib/tutor/examples";
import { resolveMediation, type Resolved } from "@/lib/tutor/resolve";
import type { QuestionMediation, SkillCode, WorkedExample } from "@/lib/tutor/types";

/**
 * Contoh L4 dibangun oleh mesin; tes ini MEMBACA ULANG teks contoh, lalu memeriksa
 * kebenaran matematisnya dengan cara lain (parsing + hitung ulang). Contoh yang salah
 * secara matematis tidak boleh pernah sampai ke siswa.
 */
interface Eq {
  a: number;
  b: number;
  c: number;
}
const N = (s: string) => s.replace(/−/g, "-");

function parseEq(text: string): Eq {
  const t = N(text).replace(/\s+/g, "");
  const [lhs, rhs] = t.split("=");
  const coef = (v: string) => {
    const m = lhs.match(new RegExp(`([+-]?\\d*)${v}`));
    if (!m) return 0;
    return m[1] === "" || m[1] === "+" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
  };
  const c = rhs.match(/^-?\d+/);
  if (!c) throw new Error(`persamaan tak terbaca: ${text}`);
  return { a: coef("x"), b: coef("y"), c: Number(c[0]) };
}
/** Persamaan pada sebuah baris contoh: setelah "→", atau setelah ": ", atau setelah "(n) ". */
function eqOf(line: string): Eq {
  let t = N(line);
  const arrow = t.lastIndexOf("→");
  if (arrow >= 0) t = t.slice(arrow + 1);
  t = t.replace(/^\s*\(\d\)\s*/, "");
  const colon = t.lastIndexOf(": ");
  if (colon >= 0 && t.indexOf("=") > colon) t = t.slice(colon + 2);
  return parseEq(t);
}
const header = (ex: WorkedExample) => [eqOf(ex.lines[0]), eqOf(ex.lines[1])] as const;
const ok = (e: Eq, x: number, y: number) => satisfies(e, frac(x), frac(y));
const combine = (p: Eq, q: Eq, op: "add" | "sub"): Eq => (op === "add" ? { a: p.a + q.a, b: p.b + q.b, c: p.c + q.c } : { a: p.a - q.a, b: p.b - q.b, c: p.c - q.c });
const scale = (e: Eq, k: number): Eq => ({ a: e.a * k, b: e.b * k, c: e.c * k });

function validate(skill: SkillCode, ex: WorkedExample) {
  const lines = ex.lines;
  if (skill === "hitung_eliminasi" || skill === "substitusi" || skill === "konsep") {
    const [e1, e2] = header(ex);
    const sol = N(lines.find((l) => l.startsWith("Penyelesaian"))!).match(/\((-?\d+), (-?\d+)\)/)!;
    const x = Number(sol[1]);
    const y = Number(sol[2]);
    expect(ok(e1, x, y) && ok(e2, x, y), `penyelesaian harus memenuhi kedua persamaan: ${lines.join(" | ")}`).toBe(true);
    expect(solveSystem(e1, e2)).toEqual({ kind: "unique", x: frac(x), y: frac(y) });
    // persamaan setelah dikali = pengali × persamaan awal; hasil eliminasi = jumlah/selisih dengan satu variabel hilang
    const scaled = lines.filter((l) => /^\(\d\) × \d+ →/.test(l));
    const s1 = scaled[0] ? scale(e1, Number(N(scaled[0]).match(/× (\d+)/)![1])) : e1;
    const s2 = scaled[1] ? scale(e2, Number(N(scaled[1]).match(/× (\d+)/)![1])) : e2;
    if (scaled[0]) expect(eqOf(scaled[0])).toEqual(s1);
    if (scaled[1]) expect(eqOf(scaled[1])).toEqual(s2);
    const resultLine = lines.find((l) => /jadi (kurangkan|jumlahkan):/.test(l))!;
    // hasil eliminasi = jumlah/selisih kedua persamaan, dan satu variabel benar-benar hilang
    const combined = combine(s1, s2, /kurangkan:/.test(resultLine) ? "sub" : "add");
    expect(combined.a === 0 || combined.b === 0, `satu variabel harus hilang: ${resultLine}`).toBe(true);
    expect(eqOf(resultLine)).toEqual(combined);
  } else if (skill === "pilih_operasi") {
    const [e1, e2] = header(ex);
    const coef = N(lines.find((l) => l.startsWith("Hilangkan"))!).match(/Koefisien (\w): (-?\d+) dan (-?\d+) \(bertanda (sama|berlawanan)\)/)!;
    const [v, a, b] = [coef[1] as "x" | "y", Number(coef[2]), Number(coef[3])];
    expect(Math.sign(a) === Math.sign(b)).toBe(coef[4] === "sama");
    const opLine = N(lines.find((l) => l.startsWith("Tanda"))!);
    expect(opLine).toContain(coef[4] === "sama" ? "kurangkan" : "jumlahkan");
    expect(coef[4] === "sama" ? a - b : a + b).toBe(0);
    const result = eqOf(lines.find((l) => l.startsWith("Hasil"))!);
    const combined = combine(e1, e2, coef[4] === "sama" ? "sub" : "add");
    expect(result).toEqual(combined);
    expect(v === "x" ? combined.a : combined.b).toBe(0);
  } else if (skill === "samakan_koefisien") {
    const [e1, e2] = header(ex);
    const kpk = N(lines.find((l) => l.includes("KPK dari"))!).match(/Hilangkan (\w): koefisiennya (-?\d+) dan (-?\d+)\. KPK dari (\d+) dan (\d+) adalah (\d+)/)!;
    const v = kpk[1] as "x" | "y";
    const c1 = v === "x" ? e1.a : e1.b;
    const c2 = v === "x" ? e2.a : e2.b;
    expect([Number(kpk[2]), Number(kpk[3])]).toEqual([c1, c2]);
    const L = Number(kpk[6]);
    expect(L % Math.abs(c1) === 0 && L % Math.abs(c2) === 0).toBe(true);
    const scaled = lines.filter((l) => /^\(\d\) × \d+ →/.test(l));
    const m1 = Number(N(scaled[0]).match(/× (\d+)/)![1]);
    const m2 = Number(N(scaled[1]).match(/× (\d+)/)![1]);
    expect([m1, m2]).toEqual([L / Math.abs(c1), L / Math.abs(c2)]);
    expect(eqOf(scaled[0])).toEqual(scale(e1, m1));
    expect(eqOf(scaled[1])).toEqual(scale(e2, m2));
    expect(Math.abs(c1 * m1)).toBe(Math.abs(c2 * m2));
  } else if (skill === "periksa_solusi") {
    const [e1, e2] = header(ex);
    let pair: [number, number] | null = null;
    for (const raw of lines.slice(2)) {
      const l = N(raw);
      const p = l.match(/^Uji pasangan \((-?\d+), (-?\d+)\):/);
      if (p) {
        pair = [Number(p[1]), Number(p[2])];
        continue;
      }
      const row = l.match(/^\s+\((\d)\) .* (✓|✗)$/);
      if (row && pair) {
        const truth = ok(row[1] === "1" ? e1 : e2, pair[0], pair[1]);
        expect(truth, `tanda ${row[2]} harus sesuai perhitungan: ${raw}`).toBe(row[2] === "✓");
      }
    }
    // pasangan pertama memang penyelesaian; pasangan kedua memenuhi (1) tetapi tidak (2)
    const pairs = lines.map((l) => N(l).match(/^Uji pasangan \((-?\d+), (-?\d+)\):/)).filter(Boolean) as RegExpMatchArray[];
    expect(pairs).toHaveLength(2);
    expect(ok(e1, Number(pairs[0][1]), Number(pairs[0][2])) && ok(e2, Number(pairs[0][1]), Number(pairs[0][2]))).toBe(true);
    expect(ok(e1, Number(pairs[1][1]), Number(pairs[1][2])) && !ok(e2, Number(pairs[1][1]), Number(pairs[1][2]))).toBe(true);
  } else if (skill === "ruas_kanan") {
    const orig = parseEq(N(lines[0]).replace(/^Persamaan: /, "").replace(/\s{2}\(.*$/, ""));
    const sol = N(lines[0]).match(/x = (-?\d+), y = (-?\d+)/)!;
    const [x, y] = [Number(sol[1]), Number(sol[2])];
    const scaled = parseEq(N(lines.find((l) => l.startsWith("Persamaan baru"))!).replace("Persamaan baru: ", ""));
    const k = Number(N(lines.find((l) => l.startsWith("Dikalikan"))!).match(/Dikalikan (\d+),/)![1]);
    expect(k).toBeGreaterThanOrEqual(2);
    expect(orig.c).not.toBe(0);
    expect(scaled).toEqual(scale(orig, k));
    expect(ok(orig, x, y) && ok(scaled, x, y)).toBe(true);
    // contoh kesalahan: konstanta tidak dikalikan → pasangan yang sama tidak lagi memenuhi
    expect(ok({ ...scaled, c: orig.c }, x, y)).toBe(false);
  } else if (skill === "tanda") {
    const m = N(lines[0]).match(/^(\d+)y - \(-(\d+)y\) = \d+y \+ \d+y = (\d+)y$/)!;
    expect(Number(m[1]) + Number(m[2])).toBe(Number(m[3]));
    const cmp = N(lines[1]).match(/(\d+)y - (\d+)y = (-?\d+)y/)!;
    expect(Number(cmp[1]) - Number(cmp[2])).toBe(Number(cmp[3]));
  }
}

const skillOf = (r: Resolved) => r.skill;

describe("contoh L4 — kebenaran matematis", () => {
  it("contoh pada semua soal Latihan/Mini Quiz benar secara matematis, sistemnya berbeda, dan memakai angka berbeda", () => {
    let checked = 0;
    for (const q of [...PRACTICE_QUESTIONS, ...ALL_LESSON_QUIZ_QUESTIONS]) {
      const r = resolveMediation(q);
      const ex = workedExampleFor(r);
      if (!ex) continue;
      checked++;
      validate(skillOf(r), ex);
      // bukan soalnya sendiri: sistem berbeda & tidak ada nilai penyelesaian yang sama
      if (r.system && ["hitung_eliminasi", "substitusi", "konsep", "samakan_koefisien", "pilih_operasi", "periksa_solusi"].includes(r.skill)) {
        const [e1, e2] = header(ex);
        expect(JSON.stringify([e1, e2]), q.id).not.toBe(JSON.stringify([r.system.e1, r.system.e2]));
      }
    }
    // setiap soal pilot, dan setiap soal lain yang punya sistem persamaan, harus mendapat contoh
    const expected = [...PRACTICE_QUESTIONS, ...ALL_LESSON_QUIZ_QUESTIONS].filter((x) => MEDIATION_BY_ID[x.id] || x.verify).length;
    expect(checked).toBe(expected);
  });

  it("contoh sama setiap kali (deterministik) untuk soal yang sama", () => {
    for (const q of PRACTICE_QUESTIONS.slice(0, 25)) {
      const r = resolveMediation(q);
      expect(workedExampleFor(r)).toEqual(workedExampleFor(r));
    }
  });

  it("uji tekanan: 150 sistem acak × 6 keterampilan menghasilkan contoh yang benar", () => {
    const skills: SkillCode[] = ["hitung_eliminasi", "substitusi", "pilih_operasi", "samakan_koefisien", "periksa_solusi", "ruas_kanan", "tanda", "konsep"];
    let made = 0;
    for (const difficulty of ["mudah", "sedang", "sulit"] as Difficulty[]) {
      const rng = seededRng(555 + difficulty.length);
      for (let i = 0; i < 50; i++) {
        const g: GeneratedSystem = generateSystem(rng, difficulty);
        const q: Question = {
          id: `uji-${difficulty}-${i}`, type: "pair", topic: "m5", difficulty, format: "penyelesaian", prompt: "uji", answer: `${g.x},${g.y}`, explanation: ["-"],
          verify: { kind: "solution", e1: g.e1, e2: g.e2, x: g.x, y: g.y },
        };
        for (const skill of skills) {
          const authored: QuestionMediation = { phase: "elaborasi", skill };
          const r: Resolved = { question: q, authored, skill, phase: "elaborasi", system: { e1: g.e1, e2: g.e2 }, eliminate: "x" };
          const ex = workedExampleFor(r);
          expect(ex, `${q.id} ${skill}`).not.toBeNull();
          validate(skill, ex!);
          made++;
        }
      }
    }
    expect(made).toBe(150 * skills.length);
  });

  it("contoh serupa: soal sederhana (tanpa pengali) mendapat contoh tanpa pengali dengan operasi yang sama", () => {
    const q = ALL_LESSON_QUIZ_QUESTIONS.find((x) => x.id === "q-m4-4")!; // x + y = 12 ; x − y = 2 → dijumlahkan
    const ex = workedExampleFor(resolveMediation(q))!;
    expect(ex.lines.some((l) => /× \d+ →/.test(l))).toBe(false);
    expect(ex.lines.join(" ")).toContain("jumlahkan");
    const q2 = PRACTICE_QUESTIONS.find((x) => x.id === "p-s-03")!; // memerlukan pengali
    expect(workedExampleFor(resolveMediation(q2))!.lines.some((l) => /× \d+ →/.test(l))).toBe(true);
  });
});
