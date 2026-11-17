import { describe, expect, it } from "vitest";
import { ASSESSMENT_SKILLS, FORMS, ITEMS_PER_FORM, SKILL_ITEM_COUNT, formsFor, scoreOf } from "@/lib/assessment/blueprint";
import { checkChar, generateParticipantCode, normalizeCode, normalizeCohort, validateParticipantCode } from "@/lib/assessment/participant";
import { frac } from "@/lib/math/fraction";
import { easiestVariable, planElimination, satisfies, solveSystem, seededRng } from "@/lib/math/spldv";
import { LESSONS } from "@/content/lessons";
import { PRACTICE_QUESTIONS } from "@/content/practice";
import { gradeAnswer } from "@/lib/questions/grade";
import { EVALUATION_QUESTIONS } from "@/server/evaluation-bank";
import { ASSESSMENT_FORMS } from "@/server/assessment-bank";
import { gradeAssessment, publicAssessmentItems } from "@/server/assessment";

const A = ASSESSMENT_FORMS.A;
const B = ASSESSMENT_FORMS.B;

describe("kesetaraan formulir A dan B", () => {
  it("masing-masing 12 butir, 2 butir per kompetensi", () => {
    for (const items of [A, B]) {
      expect(items).toHaveLength(ITEMS_PER_FORM);
      for (const s of ASSESSMENT_SKILLS) expect(items.filter((q) => q.skill === s)).toHaveLength(SKILL_ITEM_COUNT);
    }
  });

  it("butir bernomor sama setara: kompetensi, tipe, tingkat, format, topik, dan posisi kunci", () => {
    A.forEach((a, i) => {
      const b = B[i];
      expect(b.slot, `slot ${i + 1}`).toBe(a.slot);
      expect(b.skill).toBe(a.skill);
      expect(b.type).toBe(a.type);
      expect(b.difficulty).toBe(a.difficulty);
      expect(b.format).toBe(a.format);
      expect(b.topic).toBe(a.topic);
      if (a.type === "mcq") expect(b.answer, `posisi kunci slot ${a.slot}`).toBe(a.answer);
      if (a.type === "tf") expect(b.answer, `kunci B/S slot ${a.slot}`).toBe(a.answer);
    });
  });

  it("komposisi tingkat kesulitan dan tipe jawaban identik", () => {
    const tally = (xs: string[]) => xs.sort().join(",");
    expect(tally(A.map((q) => q.difficulty))).toBe(tally(B.map((q) => q.difficulty)));
    expect(tally(A.map((q) => q.type))).toBe(tally(B.map((q) => q.type)));
  });

  it("struktur penyelesaian setara pada butir bersistem: operasi, perlu-mengalikan, dan beban pengali", () => {
    A.forEach((a, i) => {
      const b = B[i];
      if (a.verify?.kind !== "solution" || b.verify?.kind !== "solution") return;
      const va = a.verify;
      const vb = b.verify;
      const pa = planElimination(va.e1, va.e2, easiestVariable(va.e1, va.e2))!;
      const pb = planElimination(vb.e1, vb.e2, easiestVariable(vb.e1, vb.e2))!;
      expect(pb.operation, `slot ${a.slot}: operasi`).toBe(pa.operation);
      expect(pb.m1 !== 1 || pb.m2 !== 1, `slot ${a.slot}: perlu mengalikan`).toBe(pa.m1 !== 1 || pa.m2 !== 1);
      expect(pb.m1 * pb.m2, `slot ${a.slot}: beban pengali`).toBe(pa.m1 * pa.m2);
      // besar angka sebanding (±50%)
      const mag = (v: typeof va) => Math.max(...[v.e1.a, v.e1.b, v.e1.c, v.e2.a, v.e2.b, v.e2.c].map(Math.abs));
      expect(mag(vb) / mag(va), `slot ${a.slot}: besar angka`).toBeGreaterThan(0.5);
      expect(mag(vb) / mag(va), `slot ${a.slot}: besar angka`).toBeLessThan(2);
    });
  });

  it("bukan mengulang soal: tidak ada butir yang sama antara A dan B, maupun dengan bank lain", () => {
    const text = (q: (typeof A)[number]) => [q.prompt, ...(q.context ?? [])].join("|");
    const own = new Set([...A, ...B].map(text));
    expect(own.size).toBe(A.length + B.length);
    const others = new Set<string>();
    const add = (q: { prompt: string; context?: string[] }) => others.add([q.prompt, ...(q.context ?? [])].join("|"));
    PRACTICE_QUESTIONS.forEach(add);
    LESSONS.flatMap((l) => l.quiz).forEach(add);
    EVALUATION_QUESTIONS.forEach(add);
    for (const t of own) expect(others.has(t), t).toBe(false);
    // sistem persamaan tidak dipakai ulang pada bank latihan
    const key = (v: { e1: { a: number; b: number; c: number }; e2: { a: number; b: number; c: number } }) => JSON.stringify([v.e1, v.e2]);
    const practiceSystems = new Set(PRACTICE_QUESTIONS.flatMap((q) => (q.verify ? [key(q.verify)] : [])));
    for (const q of [...A, ...B]) if (q.verify) expect(practiceSystems.has(key(q.verify)), q.id).toBe(false);
    // A dan B tidak memakai sistem yang sama
    const aSystems = new Set(A.flatMap((q) => (q.verify ? [key(q.verify)] : [])));
    for (const q of B) if (q.verify) expect(aSystems.has(key(q.verify)), q.id).toBe(false);
  });
});

describe("kebenaran kunci", () => {
  for (const q of [...A, ...B]) {
    it(`${q.id}: kunci benar secara matematis dan bentuk soal valid`, () => {
      expect(gradeAnswer(q, q.answer)).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(0);
      if (q.type === "mcq") {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options!.map((o) => o.text)).size).toBe(4);
        expect(q.options!.some((o) => o.id === q.answer)).toBe(true);
      }
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

  it("kunci hitungan: pengali (slot 3), konstanta (slot 5), dan nilai variabel (slot 6) sesuai spldv.ts", () => {
    for (const items of [A, B]) {
      const s3 = items[2];
      const v3 = s3.verify as { e1: { a: number; b: number; c: number }; e2: { a: number; b: number; c: number } };
      expect(String(planElimination(v3.e1, v3.e2, "x")!.m1)).toBe(s3.answer);
      const s5 = items[4];
      const v5 = s5.verify as typeof v3;
      expect(String(planElimination(v5.e1, v5.e2, "y")!.scaled1.c + planElimination(v5.e1, v5.e2, "y")!.scaled2.c)).toBe(s5.answer);
      const s6 = items[5];
      const ask = /nilai (x|y) dari/.exec(s6.prompt)![1] as "x" | "y";
      expect(s6.answer).toBe(String((s6.verify as { x: number; y: number })[ask]));
    }
  });
});

describe("penilaian", () => {
  const perfect = (form: "A" | "B") => Object.fromEntries(ASSESSMENT_FORMS[form].map((q) => [q.id, q.answer]));

  it("semua benar = 100; semua kosong = 0 dan dicatat tidak dijawab", () => {
    for (const f of FORMS) {
      const r = gradeAssessment(f, perfect(f));
      expect(r).toMatchObject({ correct: 12, total: 12, score: 100 });
      expect(r.items.every((i) => i.correct === 1 && i.answered === 1)).toBe(true);
      const empty = gradeAssessment(f, {});
      expect(empty).toMatchObject({ correct: 0, total: 12, score: 0 });
      expect(empty.items.every((i) => i.answered === 0)).toBe(true);
    }
  });

  it("per kompetensi dan tanpa nilai parsial/pengurangan", () => {
    const answers = perfect("A");
    answers["as-A-01"] = "a"; // salah
    answers["as-A-02"] = "a"; // salah
    delete answers["as-A-12"]; // kosong
    const r = gradeAssessment("A", answers);
    expect(r.correct).toBe(9);
    expect(r.score).toBe(75);
    expect(r.bySkill.pilih_operasi).toEqual({ correct: 0, total: 2 });
    expect(r.bySkill.representasi).toEqual({ correct: 1, total: 2 });
    expect(r.items.find((i) => i.id === "as-A-12")).toMatchObject({ correct: 0, answered: 0 });
  });

  it("pecahan setara diterima pada isian; pasangan harus tepat", () => {
    const r = gradeAssessment("A", { ...perfect("A"), "as-A-06": "4/2", "as-A-07": "2,4" });
    expect(r.items.find((i) => i.id === "as-A-06")!.correct).toBe(1);
    expect(r.items.find((i) => i.id === "as-A-07")!.correct).toBe(0);
  });

  it("skor dibulatkan konsisten; id butir dari formulir lain diabaikan", () => {
    expect(scoreOf(7, 12)).toBe(58);
    expect(scoreOf(5, 12)).toBe(42);
    expect(gradeAssessment("A", perfect("B")).correct).toBe(0);
  });

  it("butir publik tidak memuat kunci, pembahasan, verifikasi, atau metadata kompetensi", () => {
    for (const f of FORMS) {
      const pub = publicAssessmentItems(f);
      expect(pub).toHaveLength(12);
      for (const q of pub) {
        const json = JSON.stringify(q);
        for (const field of ["answer", "explanation", "verify", "hints", "skill", "slot"]) expect(json, `${q.id}.${field}`).not.toContain(`"${field}"`);
      }
    }
  });

  it("konsisten pada 200 pengisian acak: nilai selalu 0–100 dan sama jika diulang", () => {
    const rng = seededRng(42);
    for (let i = 0; i < 200; i++) {
      const f = rng() < 0.5 ? "A" : "B";
      const ans: Record<string, string> = {};
      for (const q of ASSESSMENT_FORMS[f]) if (rng() < 0.6) ans[q.id] = rng() < 0.5 ? q.answer : "999";
      const r1 = gradeAssessment(f, ans);
      expect(r1).toEqual(gradeAssessment(f, ans));
      expect(r1.score).toBeGreaterThanOrEqual(0);
      expect(r1.score).toBeLessThanOrEqual(100);
      expect(Object.values(r1.bySkill).reduce((s, v) => s + v.correct, 0)).toBe(r1.correct);
    }
  });
});

describe("pengimbangan formulir & kode peserta", () => {
  it("posttest selalu memakai formulir lain dari pretest, dan deterministik", () => {
    for (const code of ["MQ-ABC234", "KLS1-07", "X1Y", "MQ-ZZZZZ9"]) {
      const f = formsFor(code);
      expect(f.pretest).not.toBe(f.posttest);
      expect(formsFor(code)).toEqual(f);
      expect(formsFor(code.toLowerCase())).toEqual(f);
    }
  });

  it("kedua formulir terbagi kira-kira seimbang pada banyak kode otomatis", () => {
    const rng = seededRng(7);
    let a = 0;
    for (let i = 0; i < 400; i++) if (formsFor(generateParticipantCode(rng)).pretest === "A") a++;
    expect(a).toBeGreaterThan(140);
    expect(a).toBeLessThan(260);
  });

  it("kode otomatis valid, unik hampir pasti, dan tanpa karakter ambigu", () => {
    const rng = seededRng(11);
    const codes = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const c = generateParticipantCode(rng);
      expect(c).toMatch(/^MQ-[A-HJ-KM-NP-Z2-9]{6}$/);
      expect(validateParticipantCode(c)).toEqual({ ok: true, code: c, auto: true });
      codes.add(c);
    }
    expect(codes.size).toBeGreaterThan(495);
  });

  it("salah ketik satu karakter pada kode otomatis terdeteksi", () => {
    const c = generateParticipantCode(seededRng(5));
    const swapped = c.slice(0, 4) + (c[4] === "A" ? "B" : "A") + c.slice(5);
    expect(validateParticipantCode(swapped).ok).toBe(false);
    expect(checkChar("ABCDE")).toHaveLength(1);
  });

  it("kode dari guru: dinormalisasi; yang tidak valid ditolak", () => {
    expect(validateParticipantCode(" kls1 - 07 ")).toEqual({ ok: true, code: "KLS1-07", auto: false });
    expect(validateParticipantCode("ab").ok).toBe(false);
    expect(validateParticipantCode("a".repeat(20)).ok).toBe(false);
    expect(validateParticipantCode("budi!!").ok).toBe(true); // simbol dibuang; aplikasi tidak menilai isi
    expect(normalizeCode("budi!!")).toBe("BUDI");
    expect(normalizeCohort("viii-a-super-panjang")).toBe("VIII-A-S");
  });
});
