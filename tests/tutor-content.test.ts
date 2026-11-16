import { describe, expect, it } from "vitest";
import { MEDIATION_BY_ID, TRANSFER_BY_SKILL } from "@/content/mediation";
import { ALL_LESSON_QUIZ_QUESTIONS, LESSONS } from "@/content/lessons";
import { PRACTICE_BY_ID, PRACTICE_QUESTIONS } from "@/content/practice";
import { frac } from "@/lib/math/fraction";
import { planElimination, satisfies, solveSystem } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";
import { DIAGNOSIS_CATALOG } from "@/lib/tutor/diagnoses";
import { expectedForTarget } from "@/lib/tutor/error-models";
import { DEFAULT_L2, DEFAULT_L3, buildLadder } from "@/lib/tutor/ladder";
import { leaksAnswer, revealsPair } from "@/lib/tutor/leak";
import { isTutorable, resolveMediation } from "@/lib/tutor/resolve";
import { EVALUATION_QUESTIONS } from "@/server/evaluation-bank";

const PILOT_TOPICS = ["m4", "m5", "m6"];
const ALL_TUTOR_QUESTIONS: Question[] = [...PRACTICE_QUESTIONS, ...ALL_LESSON_QUIZ_QUESTIONS];
const PILOT = ALL_TUTOR_QUESTIONS.filter((q) => PILOT_TOPICS.includes(q.topic));
const byId = Object.fromEntries(ALL_TUTOR_QUESTIONS.map((q) => [q.id, q]));

describe("cakupan metadata tutor", () => {
  it("seluruh 37 soal pilot Modul 4–6 memiliki metadata, dan hanya soal itu", () => {
    expect(PILOT).toHaveLength(37);
    for (const q of PILOT) expect(MEDIATION_BY_ID[q.id], q.id).toBeDefined();
    for (const id of Object.keys(MEDIATION_BY_ID)) expect(PILOT.some((q) => q.id === id), `${id} bukan soal pilot`).toBe(true);
  });

  it("Evaluasi Akhir tidak tersentuh tutor: tidak ada metadata, tidak tutorable, tidak ada petunjuk", () => {
    expect(EVALUATION_QUESTIONS.length).toBeGreaterThan(0);
    for (const q of EVALUATION_QUESTIONS) {
      expect(MEDIATION_BY_ID[q.id], q.id).toBeUndefined();
      expect(isTutorable(q.id), q.id).toBe(false);
      expect(buildLadder(q), q.id).toEqual([]);
    }
    expect(isTutorable("p-m-01")).toBe(true);
    expect(isTutorable("q-m4-1")).toBe(true);
    expect(isTutorable("e01")).toBe(false);
  });

  it("target sesuai tipe soal, dan jawaban target dihitung spldv.ts SAMA dengan kunci soal", () => {
    for (const q of PILOT) {
      const med = MEDIATION_BY_ID[q.id];
      if (!med.target) continue;
      const r = resolveMediation(q);
      if (med.target.kind === "pair") expect(q.type, q.id).toBe("pair");
      else expect(q.type, q.id).toBe("number");
      expect(expectedForTarget(med.target, r.system), `${q.id} (${med.target.kind})`).toBe(q.answer);
    }
  });

  it("pilihan ganda: setiap opsi SALAH memiliki pola, dan opsi benar tidak pernah dipetakan", () => {
    for (const q of PILOT.filter((x) => x.type === "mcq")) {
      const opts = MEDIATION_BY_ID[q.id].options ?? {};
      const wrongIds = q.options!.filter((o) => o.id !== q.answer).map((o) => o.id);
      expect(Object.keys(opts).sort(), q.id).toEqual(wrongIds.sort());
    }
  });

  it("pemetaan pilihan operasi konsisten dengan matematika (operasi yang dipilih memang kebalikan)", () => {
    for (const q of PILOT.filter((x) => x.type === "mcq")) {
      const med = MEDIATION_BY_ID[q.id];
      const r = resolveMediation(q);
      for (const [optId, spec] of Object.entries(med.options ?? {})) {
        const text = q.options!.find((o) => o.id === optId)!.text.toLowerCase();
        if (spec === "salah_operasi" && r.system && med.eliminate) {
          const plan = planElimination(r.system.e1, r.system.e2, med.eliminate)!;
          const chosen = /dijumlahkan/.test(text) ? "add" : /dikurangkan/.test(text) ? "subtract" : null;
          expect(chosen, `${q.id}/${optId} harus menyebut operasi`).not.toBeNull();
          expect(chosen, `${q.id}/${optId} harus kebalikan dari ${plan.operation}`).not.toBe(plan.operation);
        }
        if (spec === "kalikan_tidak_perlu") expect(text, `${q.id}/${optId}`).toMatch(/dikali/);
        if (spec === "operasi_bukan_eliminasi") expect(text, `${q.id}/${optId}`).toMatch(/dibagi/);
        if (spec === "kira_tidak_bisa_dieliminasi") expect(text, `${q.id}/${optId}`).toMatch(/tidak (dapat|bisa)/);
      }
    }
  });

  it("p-h-04: opsi 'pengali bukan terkecil' dan 'pengali tertukar' benar secara matematis", () => {
    const q = PRACTICE_BY_ID["p-h-04"];
    const r = resolveMediation(q);
    const plan = planElimination(r.system!.e1, r.system!.e2, "y")!;
    expect([plan.m1, plan.m2]).toEqual([3, 2]); // pengali terkecil
    // opsi c: (1)×6 dan (2)×4 — koefisien y menjadi 24 dan −24 (sama besar) tetapi bukan yang terkecil
    expect(Math.abs(r.system!.e1.b * 6)).toBe(Math.abs(r.system!.e2.b * 4));
    expect(6).not.toBe(plan.m1);
    // opsi d: (1)×2 dan (2)×3 — tertukar dari yang benar
    expect([2, 3]).toEqual([plan.m2, plan.m1]);
  });

  it("p-s-08: opsi salah dipetakan dengan benar (bukan kelipatan / FPB / kelipatan bukan terkecil)", () => {
    const q = PRACTICE_BY_ID["p-s-08"];
    const val = (id: string) => Number(q.options!.find((o) => o.id === id)!.text);
    const isMultiple = (n: number) => n % 3 === 0 && n % 4 === 0;
    expect(val("a") % 3 === 0 || val("a") % 4 === 0).toBe(false); // 7
    expect(3 % val("c") === 0 && 4 % val("c") === 0).toBe(true); // 1 = faktor persekutuan
    expect(isMultiple(val("d")) && val("d") > val(q.answer)).toBe(true); // 24
    expect(isMultiple(val(q.answer))).toBe(true);
  });
});

describe("tangga petunjuk L1–L4", () => {
  it("setiap soal pilot punya empat tingkat berurutan dengan teks berbeda dan tujuan yang jelas", () => {
    for (const q of PILOT) {
      const steps = buildLadder(q);
      expect(steps.map((s) => s.level), q.id).toEqual([1, 2, 3, 4]);
      expect(new Set(steps.map((s) => s.text)).size, q.id).toBe(4);
      for (const s of steps) {
        expect(s.purpose, q.id).toMatch(/^Tujuan:/);
        expect(s.text.length, q.id).toBeGreaterThan(8);
      }
      expect(steps[3].example?.lines.length, q.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("TIDAK ADA petunjuk (L1–L4) pada seluruh soal Latihan/Mini Quiz yang membocorkan jawaban akhir", () => {
    for (const q of ALL_TUTOR_QUESTIONS) {
      for (const s of buildLadder(q)) {
        expect(leaksAnswer(q, s.text), `${q.id} L${s.level}: ${s.text.slice(0, 120)}`).toBe(false);
        if (s.example) {
          const text = [s.example.title, ...s.example.lines, s.example.note].join(" ");
          // contoh L4 adalah soal lain: tidak boleh memuat pasangan jawaban yang persis sama
          expect(revealsPair(q, text), `${q.id} L4`).toBe(false);
        }
      }
    }
  });

  it("soal pilot tidak jatuh ke teks umum: L2/L3 memakai petunjuk yang ditulis khusus", () => {
    for (const q of PILOT) {
      const steps = buildLadder(q);
      const r = resolveMediation(q);
      expect(steps[1].text, `${q.id} L2`).not.toBe(DEFAULT_L2[r.skill]);
      expect(steps[2].text, `${q.id} L3`).not.toBe(DEFAULT_L3[r.skill]);
    }
  });

  it("teks petunjuk tulisan tangan di mediation.ts tidak membocorkan jawaban", () => {
    for (const [id, med] of Object.entries(MEDIATION_BY_ID)) {
      for (const [lvl, text] of Object.entries(med.ladder ?? {})) expect(leaksAnswer(byId[id], text!), `${id} L${lvl}`).toBe(false);
    }
  });

  it("soal di luar pilot: L1–L3 selalu ada; L4 hanya jika ada sistem persamaan yang relevan", () => {
    const m1 = LESSONS.find((l) => l.id === "m1")!.quiz.find((q) => q.type === "mcq")!;
    expect(buildLadder(m1).map((s) => s.level)).toEqual([1, 2, 3]); // PLDV: tanpa contoh eliminasi
    const withSystem = ALL_TUTOR_QUESTIONS.find((q) => !PILOT_TOPICS.includes(q.topic) && q.verify?.kind === "solution")!;
    expect(buildLadder(withSystem).map((s) => s.level)).toEqual([1, 2, 3, 4]);
  });
});

describe("pertanyaan transfer (aturan umum)", () => {
  it("setiap pertanyaan transfer punya tepat satu jawaban benar yang valid dan penjelasan", () => {
    for (const [skill, t] of Object.entries(TRANSFER_BY_SKILL)) {
      expect(t!.options.length, skill).toBe(4);
      expect(t!.correct, skill).toBeGreaterThanOrEqual(0);
      expect(t!.correct, skill).toBeLessThan(t!.options.length);
      expect(new Set(t!.options).size, skill).toBe(4);
      expect(t!.feedback.length, skill).toBeGreaterThan(20);
    }
  });
});

describe("katalog diagnosis", () => {
  it("setiap pola punya fase, judul, pengamatan, dan pertanyaan pengarah (bukan jawaban)", () => {
    for (const [code, def] of Object.entries(DIAGNOSIS_CATALOG)) {
      expect(["input", "elaborasi", "output"], code).toContain(def.phase);
      const ctx = { e1: { a: 2, b: 3, c: 12 }, e2: { a: 3, b: 4, c: 17 }, eliminate: "x" as const, correctVar: "y" as const, satisfiedEq: 1 as const };
      expect(def.observe(ctx).length, code).toBeGreaterThan(20);
      expect(def.ask(ctx).trim().endsWith("?") || def.ask(ctx).includes("?"), `${code} harus berupa pertanyaan`).toBe(true);
    }
  });

  it("sistem uji pilot memang memiliki penyelesaian tunggal yang cocok dengan kunci", () => {
    for (const q of PILOT.filter((x) => x.verify?.kind === "solution")) {
      const v = q.verify!;
      const s = solveSystem(v.e1, v.e2);
      expect(s, q.id).toEqual({ kind: "unique", x: frac(v.x), y: frac(v.y) });
      expect(satisfies(v.e1, frac(v.x), frac(v.y))).toBe(true);
    }
  });
});
