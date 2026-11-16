import { describe, expect, it } from "vitest";
import { LESSON_BY_ID } from "@/content/lessons";
import { PRACTICE_BY_ID, PRACTICE_QUESTIONS } from "@/content/practice";
import { applyEvent, createInitialState } from "@/lib/progress/engine";
import { attemptMultiplier, questionXp, XP_RULES } from "@/lib/progress/gamification";
import { gradeEvent, gradeQuestionAttempts } from "@/lib/progress/grading";
import type { ProgressState, RawEvent } from "@/lib/progress/types";
import { seededRng } from "@/lib/math/spldv";

let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n + 9000).padStart(12, "0")}`;
const AT = "2026-11-12T08:00:00.000Z";
const run = (s: ProgressState, e: RawEvent) => applyEvent(s, gradeEvent(e));
const fresh = () => createInitialState("2026-11-12T07:00:00.000Z");

type Diff = "mudah" | "sedang" | "sulit";
const practice = (difficulty: Diff, qid: string, attempts: string[], hints = 0): RawEvent => ({
  id: uid(),
  at: AT,
  type: "practice",
  difficulty,
  questionIds: [qid],
  answers: attempts.length ? { [qid]: attempts[attempts.length - 1] } : {},
  responses: { [qid]: { attempts, hints } },
});
/** Event gaya lama: hanya satu jawaban akhir, tanpa `responses`. */
const legacyPractice = (difficulty: Diff, qid: string, answer: string): RawEvent => ({
  id: uid(), at: AT, type: "practice", difficulty, questionIds: [qid], answers: { [qid]: answer },
});

const stat = (s: ProgressState, key: string) => s.counters.questionStats[key];

// soal acuan: [id, tingkat, jawaban benar, jawaban salah]
const NUMBER_CASES: [string, Diff, string, string][] = [
  ["p-m-03", "mudah", "6", "0"],
  ["p-s-01", "sedang", "2", "0"],
  ["p-h-03", "sulit", "-3", "0"],
];

describe("kebijakan XP percobaan", () => {
  it("pengali: 100% / 50% / 0%, dibulatkan 0,5 ke atas, tidak pernah negatif", () => {
    expect([1, 2, 3, 4, 10].map(attemptMultiplier)).toEqual([1, 0.5, 0, 0, 0]);
    expect(questionXp(5, 2)).toBe(3); // 2,5 -> 3
    expect(questionXp(15, 2)).toBe(8); // 7,5 -> 8
    expect(questionXp(20, 3)).toBe(0);
    for (let a = 0; a < 6; a++) for (const b of [5, 10, 15, 20]) expect(questionXp(b, a)).toBeGreaterThanOrEqual(0);
  });

  for (const [qid, diff, ok, bad] of NUMBER_CASES) {
    const base = XP_RULES.practicePerNewCorrect[diff];
    it(`${qid} (${diff}, basis ${base}): benar di percobaan 1/2/3 → ${base}/${Math.round(base / 2)}/0 XP`, () => {
      const first = run(fresh(), practice(diff, qid, [ok]));
      expect(stat(first.state, qid)).toMatchObject({ attempts: 1, solvedAt: 1, xp: base, independent: true });

      const second = run(fresh(), practice(diff, qid, [bad, ok]));
      expect(stat(second.state, qid)).toMatchObject({ attempts: 2, solvedAt: 2, xp: Math.round(base * 0.5), independent: false });
      expect(second.message).toContain("50%");

      const third = run(fresh(), practice(diff, qid, [bad, bad, ok]));
      expect(stat(third.state, qid)).toMatchObject({ attempts: 3, solvedAt: 3, xp: 0 });
      expect(third.state.counters.rewardedQuestions).toContain(qid); // tetap tercatat benar
      expect(third.message).toContain("percobaan ke-3");
    });
  }

  it("dihitung kumulatif lintas sesi: salah, lalu benar di sesi berikutnya = percobaan ke-2 (50%)", () => {
    let s = run(fresh(), legacyPractice("mudah", "p-m-03", "0")).state;
    expect(stat(s, "p-m-03")).toMatchObject({ attempts: 1, solvedAt: null, xp: 0 });
    s = run(s, legacyPractice("mudah", "p-m-03", "6")).state;
    expect(stat(s, "p-m-03")).toMatchObject({ attempts: 2, solvedAt: 2, xp: 5 });
  });

  it("salah dua sesi lalu benar di sesi ketiga = percobaan ke-3 → 0 XP, tetap terhitung benar", () => {
    let s = fresh();
    for (const a of ["0", "1", "6"]) s = run(s, legacyPractice("mudah", "p-m-03", a)).state;
    expect(stat(s, "p-m-03")).toMatchObject({ attempts: 3, solvedAt: 3, xp: 0 });
    expect(s.counters.rewardedQuestions).toContain("p-m-03");
  });

  it("XP soal hanya diberikan SEKALI: mengulang soal yang sudah memberi XP tidak menambah XP soal", () => {
    let s = run(fresh(), practice("mudah", "p-m-03", ["6"])).state;
    const xpAfterFirst = stat(s, "p-m-03").xp;
    for (let i = 0; i < 3; i++) s = run(s, practice("mudah", "p-m-03", ["6"])).state;
    expect(stat(s, "p-m-03").xp).toBe(xpAfterFirst);
    expect(stat(s, "p-m-03").attempts).toBe(4);
    expect(stat(s, "p-m-03").solvedAt).toBe(1);
  });

  it("jawaban salah dan petunjuk tidak mengurangi XP", () => {
    const withoutHints = run(fresh(), practice("mudah", "p-m-03", ["0", "6"], 0));
    const withHints = run(fresh(), practice("mudah", "p-m-03", ["0", "6"], 4));
    expect(stat(withHints.state, "p-m-03").xp).toBe(stat(withoutHints.state, "p-m-03").xp); // petunjuk gratis
    expect(stat(withHints.state, "p-m-03").hints).toBe(4);

    const onlyWrong = run(fresh(), practice("mudah", "p-m-03", ["0", "1", "2"], 2));
    expect(onlyWrong.state.xp).toBe(0); // salah tidak membuat XP negatif
    expect(onlyWrong.xpGained).toBe(0);
  });

  it("batas percobaan per sesi menurut tipe soal: Benar/Salah 1, pilihan ganda 2, isian 3", () => {
    // TF p-m-02 (jawaban "true"): percobaan ke-2 diabaikan
    const tf = run(fresh(), practice("mudah", "p-m-02", ["false", "true"]));
    expect(stat(tf.state, "p-m-02")).toMatchObject({ attempts: 1, solvedAt: null });
    // MCQ p-m-01 (jawaban "b"): percobaan ke-3 diabaikan
    const mcq = run(fresh(), practice("mudah", "p-m-01", ["a", "c", "b"]));
    expect(stat(mcq.state, "p-m-01")).toMatchObject({ attempts: 2, solvedAt: null });
    const mcqOk = run(fresh(), practice("mudah", "p-m-01", ["a", "b"]));
    expect(stat(mcqOk.state, "p-m-01")).toMatchObject({ attempts: 2, solvedAt: 2, xp: 5 });
    // isian angka: percobaan ke-4 diabaikan
    const num = run(fresh(), practice("mudah", "p-m-03", ["0", "1", "2", "6"]));
    expect(stat(num.state, "p-m-03")).toMatchObject({ attempts: 3, solvedAt: null });
    // pasangan p-m-10 (jawaban "8,3")
    const pair = run(fresh(), practice("mudah", "p-m-10", ["1,1", "2,2", "8,3"]));
    expect(stat(pair.state, "p-m-10")).toMatchObject({ attempts: 3, solvedAt: 3, xp: 0 });
  });

  it("jawaban kosong tidak dihitung sebagai percobaan", () => {
    const r = run(fresh(), practice("mudah", "p-m-03", ["", "   ", "6"]));
    expect(stat(r.state, "p-m-03")).toMatchObject({ attempts: 1, solvedAt: 1, xp: 10 });
    const none = run(fresh(), practice("mudah", "p-m-03", []));
    expect(stat(none.state, "p-m-03")).toMatchObject({ attempts: 0, solvedAt: null });
  });

  it("klaim klien tidak dipercaya: `responses` dinilai ulang, dan mengalahkan `answers` akhir", () => {
    const ev: RawEvent = {
      id: uid(), at: AT, type: "practice", difficulty: "mudah", questionIds: ["p-m-03"],
      answers: { "p-m-03": "6" }, // jawaban akhir tampak benar...
      responses: { "p-m-03": { attempts: ["0", "1"] } }, // ...tetapi percobaannya salah semua
    };
    const r = run(fresh(), ev);
    expect(stat(r.state, "p-m-03")).toMatchObject({ solvedAt: null, xp: 0 });
  });

  it("legacy: soal yang sudah ada di rewardedQuestions (tanpa statistik) tidak memberi XP lagi", () => {
    const legacyState = fresh();
    legacyState.counters.rewardedQuestions = ["p-m-03"];
    delete (legacyState.counters as Partial<typeof legacyState.counters>).questionStats; // seperti data versi lama
    const r = run(legacyState, legacyPractice("mudah", "p-m-03", "6"));
    expect(r.state.counters.questionStats["p-m-03"].legacy).toBe(true);
    expect(r.xpGained).toBe(XP_RULES.practiceSessionBonus); // hanya bonus sesi, bukan XP soal
  });

  it("tanpa penalti retroaktif: soal yang pernah salah di versi lama (tidak tercatat) tetap bisa 100%", () => {
    const legacyState = fresh();
    delete (legacyState.counters as Partial<typeof legacyState.counters>).questionStats;
    const r = run(legacyState, legacyPractice("mudah", "p-m-03", "6"));
    expect(stat(r.state, "p-m-03")).toMatchObject({ attempts: 1, solvedAt: 1, xp: 10 });
  });

  it("bonus sesi latihan tidak berubah (5 XP, maks. 5 sesi per hari)", () => {
    let s = fresh();
    const bonuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = run(s, practice("mudah", "p-m-03", ["6"]));
      bonuses.push(r.xpGained - (i === 0 ? 10 : 0));
      s = r.state;
    }
    expect(bonuses).toEqual([5, 5, 5, 5, 5, 0]);
  });

  it("badge 'Penakluk Soal Cerita' tetap terbuka walau soal terakhir benar pada percobaan ke-3 (0 XP)", () => {
    let s = fresh();
    s = run(s, practice("mudah", "p-m-12", ["12"])).state;
    s = run(s, practice("sedang", "p-s-10", ["1500"])).state;
    s = run(s, practice("sedang", "p-s-11", ["15"])).state;
    s = run(s, practice("sedang", "p-s-12", ["a"])).state;
    expect(s.achievements["penakluk-soal-cerita"]).toBeUndefined();
    const last = run(s, practice("sulit", "p-h-08", ["1", "2", "10000"]));
    expect(stat(last.state, "p-h-08").xp).toBe(0);
    expect(last.state.achievements["penakluk-soal-cerita"]).toBeDefined();
  });

  it("evaluasi tidak terpengaruh: satu jawaban per soal, XP lama", () => {
    const ev: RawEvent = {
      id: uid(), at: AT, type: "evaluation", questionIds: ["e01", "e02", "e03"],
      answers: {}, durationSec: 30, result: { correct: 3, total: 3, score: 100 },
    };
    const r = run(fresh(), ev);
    // XP evaluasi itu sendiri (xpGained juga memuat XP badge Lulus Evaluasi & Nilai Sempurna)
    expect(r.state.attempts[0].xp).toBe(XP_RULES.evaluationBase + 50);
    expect(r.state.counters.questionStats).toEqual({});
  });
});

describe("mini quiz: nilai akhir, nilai mandiri, dan nilai terbaik", () => {
  const quiz = LESSON_BY_ID.m1.quiz; // q-m1-1 mcq b, q-m1-2 -5, q-m1-3 true, q-m1-4 3
  const quizEvent = (responses: Record<string, { attempts: string[]; hints?: number }>): RawEvent => ({
    id: uid(), at: AT, type: "lesson_quiz", lessonId: "m1",
    answers: Object.fromEntries(Object.entries(responses).map(([k, v]) => [k, v.attempts[v.attempts.length - 1] ?? ""])),
    responses,
  });

  it("satu soal benar di percobaan ke-2: XP 3 (50% dari 5), nilai 100, mandiri 75", () => {
    const r = run(fresh(), quizEvent({
      "q-m1-1": { attempts: ["a", "b"] },
      "q-m1-2": { attempts: ["-5"] },
      "q-m1-3": { attempts: ["true"] },
      "q-m1-4": { attempts: ["3"] },
    }));
    const attempt = r.state.attempts[0];
    expect(attempt).toMatchObject({ score: 100, firstTry: 75, correct: 4, total: 4 });
    expect(attempt.detail?.questions["q-m1-1"]).toMatchObject({ attempts: 2, solvedAt: 2, xp: 3 });
    // 3 + 5 + 5 + 5 (soal) + 40 (modul selesai) + 20 (badge Pemula SPLDV)
    expect(r.xpGained).toBe(78);
    expect(r.state.lessons.m1).toMatchObject({ status: "completed", bestQuizScore: 100 });
    expect(r.state.activity.find((a) => a.type === "lesson_complete")?.detail).toContain("mandiri 75%");
  });

  it("memakai petunjuk membuat soal tidak 'mandiri' tetapi tidak mengurangi XP", () => {
    const r = run(fresh(), quizEvent({
      "q-m1-1": { attempts: ["b"], hints: 2 },
      "q-m1-2": { attempts: ["-5"] },
      "q-m1-3": { attempts: ["true"] },
      "q-m1-4": { attempts: ["3"] },
    }));
    expect(r.state.attempts[0].firstTry).toBe(75);
    expect(r.state.attempts[0].detail?.questions["q-m1-1"].xp).toBe(5); // 100% walau memakai petunjuk
  });

  it("kelulusan modul memakai nilai akhir; nilai terbaik hanya naik", () => {
    const failing = run(fresh(), quizEvent({
      "q-m1-1": { attempts: ["a", "c"] }, // gagal: batas 2 percobaan
      "q-m1-2": { attempts: ["0", "1", "2"] }, // gagal: batas 3
      "q-m1-3": { attempts: ["false"] }, // gagal
      "q-m1-4": { attempts: ["3"] },
    }));
    expect(failing.state.attempts[0].score).toBe(25);
    expect(failing.state.lessons.m1.status).toBe("in_progress");

    const good = run(failing.state, quizEvent(Object.fromEntries(quiz.map((q) => [q.id, { attempts: [q.answer] }]))));
    expect(good.state.lessons.m1).toMatchObject({ status: "completed", bestQuizScore: 100 });
    const worse = run(good.state, quizEvent({ "q-m1-1": { attempts: ["a"] } }));
    expect(worse.state.lessons.m1).toMatchObject({ status: "completed", bestQuizScore: 100 });
  });
});

describe("penilaian percobaan (grading)", () => {
  it("berhenti pada jawaban benar pertama dan membatasi hints 0–4", () => {
    const q = PRACTICE_BY_ID["p-m-03"];
    const g = gradeQuestionAttempts(q, ["0", "6", "6"], 99);
    expect(g).toMatchObject({ attempts: [false, true], solvedAt: 2, hints: 4 });
    expect(gradeQuestionAttempts(q, ["6"], -3).hints).toBe(0);
  });
});

describe("invarian (acak berseed)", () => {
  it("XP total tidak pernah turun; XP per soal tidak melebihi basis dan hanya diberikan sekali", () => {
    const rng = seededRng(20261112);
    const pool = PRACTICE_QUESTIONS.filter((q) => q.type === "number" || q.type === "pair" || q.type === "mcq" || q.type === "tf");
    const base = (d: Diff) => XP_RULES.practicePerNewCorrect[d];
    let s = fresh();
    const attemptsSeen: Record<string, number> = {};
    for (let i = 0; i < 400; i++) {
      const q = pool[Math.floor(rng() * pool.length)];
      const nAttempts = 1 + Math.floor(rng() * 4);
      const attempts: string[] = [];
      for (let k = 0; k < nAttempts; k++) attempts.push(rng() < 0.4 ? q.answer : `salah-${k}`);
      const before = s.xp;
      const ev = practice(q.difficulty, q.id, attempts, Math.floor(rng() * 5));
      const graded = gradeEvent(ev);
      s = applyEvent(s, graded).state;
      expect(s.xp).toBeGreaterThanOrEqual(before);
      const processed = graded.kind === "graded" ? graded.perQuestion[0].attempts.length : 0;
      attemptsSeen[q.id] = (attemptsSeen[q.id] ?? 0) + processed;
    }
    for (const [id, st] of Object.entries(s.counters.questionStats)) {
      expect(st.attempts).toBe(attemptsSeen[id]);
      expect(st.xp).toBeLessThanOrEqual(base(PRACTICE_BY_ID[id].difficulty));
      expect(st.xp).toBeGreaterThanOrEqual(0);
      expect(st.solvedAt !== null).toBe(s.counters.rewardedQuestions.includes(id));
      if (st.solvedAt !== null && st.solvedAt >= 3) expect(st.xp).toBe(0);
    }
  });

  it("applyEvent tidak mengubah state sebelumnya (murni)", () => {
    const deepFreeze = <T,>(o: T): T => {
      if (o && typeof o === "object") {
        Object.freeze(o);
        for (const v of Object.values(o as object)) deepFreeze(v);
      }
      return o;
    };
    const s = deepFreeze(run(fresh(), practice("mudah", "p-m-03", ["0"])).state);
    expect(() => run(s, practice("mudah", "p-m-03", ["6"]))).not.toThrow();
    expect(s.counters.questionStats["p-m-03"].attempts).toBe(1);
  });
});
