import { describe, expect, it } from "vitest";
import { ALL_LESSON_QUIZ_QUESTIONS } from "@/content/lessons";
import { PRACTICE_BY_ID, PRACTICE_QUESTIONS } from "@/content/practice";
import { applyEvent, createInitialState } from "@/lib/progress/engine";
import { ATTEMPT_RULES, attemptMultiplier, previewQuestionXp, questionXp, XP_RULES } from "@/lib/progress/gamification";
import { gradeEvent } from "@/lib/progress/grading";
import type { ProgressState, RawEvent } from "@/lib/progress/types";
import type { Question } from "@/lib/questions/types";
import { mediate } from "@/lib/tutor/mediate";
import { EVALUATION_QUESTIONS } from "@/server/evaluation-bank";

const ALL = [...PRACTICE_QUESTIONS, ...ALL_LESSON_QUIZ_QUESTIONS];
const wrongFor = (q: Question, n = 0): string => {
  if (q.type === "mcq") return q.options!.filter((o) => o.id !== q.answer)[n % (q.options!.length - 1)].id;
  if (q.type === "tf") return q.answer === "true" ? "false" : "true";
  if (q.type === "pair") return `${900 + n},${901 + n}`;
  return String(900 + n);
};

describe("alur mediasi per tipe soal", () => {
  const num = PRACTICE_BY_ID["p-m-03"]; // isian angka, jawaban 6
  const mcq = PRACTICE_BY_ID["p-m-06"]; // pilihan ganda, jawaban a
  const tf = PRACTICE_BY_ID["p-s-07"]; // benar/salah, jawaban false

  it("isian angka: 3 kesempatan; menyerah baru boleh setelah percobaan ke-2; pembahasan terbuka setelah habis", () => {
    const r1 = mediate(num, { attempts: ["0"], hints: 0 });
    expect(r1).toMatchObject({ status: "retry", attemptNo: 1, limit: 3, remaining: 2, gate: false, revealExplanation: false, giveUpAllowed: false });
    const r2 = mediate(num, { attempts: ["0", "1"], hints: 0 });
    expect(r2).toMatchObject({ status: "retry", remaining: 1, giveUpAllowed: true, revealExplanation: false });
    const r3 = mediate(num, { attempts: ["0", "1", "2"], hints: 1 });
    expect(r3).toMatchObject({ status: "exhausted", remaining: 0, revealExplanation: true });
    expect(mediate(num, { attempts: ["0", "6"], hints: 0 })).toMatchObject({ status: "correct", revealExplanation: true });
    expect(mediate(num, { attempts: ["0", "6"], hints: 0 }).message).toContain("percobaan ke-2");
    expect(mediate(num, { attempts: ["6"], hints: 0 }).message).toBe("Benar! Kerja bagus.");
  });

  it("pilihan ganda: 2 kesempatan, wajib memilih alasan sebelum mencoba lagi", () => {
    const r1 = mediate(mcq, { attempts: ["b"], hints: 0 });
    expect(r1).toMatchObject({ status: "retry", gate: true, remaining: 1, revealExplanation: false });
    expect(r1.diagnoses[0].code).toBe("salah_operasi");
    expect(mediate(mcq, { attempts: ["b", "c"], hints: 0 })).toMatchObject({ status: "exhausted", gate: false, revealExplanation: true });
    expect(mediate(mcq, { attempts: ["b", "a"], hints: 0 })).toMatchObject({ status: "correct" });
  });

  it("Benar/Salah: satu kesempatan, tetapi pembahasan lengkap ditahan di balik tombol", () => {
    const r = mediate(tf, { attempts: ["true"], hints: 0 });
    expect(r).toMatchObject({ status: "exhausted", revealExplanation: false, giveUpAllowed: false, gate: false });
    expect(r.diagnoses[0].code).toBe("tidak_cek_kedua_persamaan");
    expect(mediate(tf, { attempts: ["false"], hints: 0 }).status).toBe("correct");
  });

  it("batas percobaan mengikuti ATTEMPT_RULES (sumber yang sama dengan penilaian dan XP)", () => {
    for (const q of [num, mcq, tf, PRACTICE_BY_ID["p-m-10"]]) {
      const limit = ATTEMPT_RULES.limitsPerSession[q.type];
      const wrongs = Array.from({ length: limit }, (_, i) => wrongFor(q, i));
      expect(mediate(q, { attempts: wrongs, hints: 0 }).status, q.id).toBe("exhausted");
      if (limit > 1) expect(mediate(q, { attempts: wrongs.slice(0, limit - 1), hints: 0 }).status, q.id).toBe("retry");
    }
  });

  it("tanggapan menyesuaikan penggunaan petunjuk (resiprositas)", () => {
    expect(mediate(num, { attempts: ["0", "1"], hints: 0 }).nudge).toContain("belum membuka petunjuk");
    expect(mediate(num, { attempts: ["0"], hints: 2 }).nudge).toContain("petunjuk strategi");
    expect(mediate(num, { attempts: ["0"], hints: 1 }).nudge).toBeUndefined();
  });

  it("jawaban yang tidak dikenali polanya dinyatakan apa adanya", () => {
    const r = mediate(num, { attempts: ["987654"], hints: 0 });
    expect(r.identified).toBe(false);
    expect(r.diagnoses).toEqual([]);
  });
});

describe("aturan utama: SATU kesalahan tidak langsung membuka jawaban", () => {
  it("untuk semua soal Latihan/Mini Quiz, pembahasan tidak terbuka setelah satu jawaban salah", () => {
    for (const q of ALL) {
      const r = mediate(q, { attempts: [wrongFor(q)], hints: 0 });
      expect(r.status, q.id).not.toBe("correct");
      expect(r.revealExplanation, `${q.id}: pembahasan tidak boleh terbuka setelah satu kesalahan`).toBe(false);
      // siswa masih punya kesempatan berpikir (kecuali Benar/Salah, yang pembahasannya ditahan)
      if (q.type !== "tf") expect(r.status, q.id).toBe("retry");
      expect(r.message, q.id).not.toMatch(/jawaban(nya)? (yang benar|adalah)/i);
    }
  });

  it("tanggapan tidak pernah memuat jawaban benar (isian) pada tahap mana pun sebelum kesempatan habis", () => {
    for (const q of ALL.filter((x) => x.type === "number" || x.type === "pair")) {
      const limit = ATTEMPT_RULES.limitsPerSession[q.type];
      for (let n = 1; n < limit; n++) {
        const r = mediate(q, { attempts: Array.from({ length: n }, (_, i) => wrongFor(q, i)), hints: 2 });
        const text = [r.message, r.nudge ?? "", ...r.diagnoses.flatMap((d) => [d.observe, d.ask])].join(" ");
        expect(text, q.id).not.toContain(`jawaban yang benar`);
      }
    }
  });

  it("Evaluasi Akhir tidak mendapat diagnosis", () => {
    for (const q of EVALUATION_QUESTIONS.slice(0, 10)) {
      expect(mediate(q, { attempts: [wrongFor(q as Question)], hints: 0 }).diagnoses, q.id).toEqual([]);
    }
  });
});

describe("pratinjau XP konsisten dengan mesin XP (Tahap 1)", () => {
  const q = PRACTICE_BY_ID["p-m-03"]; // basis 10 XP
  const base = XP_RULES.practicePerNewCorrect.mudah;
  let n = 0;
  const run = (s: ProgressState, attempts: string[]) =>
    applyEvent(s, gradeEvent({
      id: `00000000-0000-4000-8000-${String(++n + 3000).padStart(12, "0")}`, at: "2026-11-13T08:00:00.000Z", type: "practice",
      difficulty: "mudah", questionIds: [q.id], answers: { [q.id]: attempts[attempts.length - 1] }, responses: { [q.id]: { attempts } },
    } as RawEvent)).state;

  it("persen pratinjau = pengali mesin untuk berbagai riwayat percobaan sebelumnya", () => {
    for (let before = 0; before <= 3; before++) {
      for (let session = 1; session <= 3; session++) {
        let s = createInitialState("2026-11-13T07:00:00.000Z");
        for (let i = 0; i < before; i++) s = run(s, ["0"]); // percobaan salah di sesi-sesi sebelumnya
        const stat = s.counters.questionStats[q.id];
        const preview = previewQuestionXp(stat, s.counters.rewardedQuestions.includes(q.id), session);
        const after = run(s, [...Array.from({ length: session - 1 }, () => "0"), q.answer]);
        const awarded = after.counters.questionStats[q.id].xp;
        expect(preview.alreadyRewarded).toBe(false);
        expect(preview.percent / 100, `sebelum=${before} sesi=${session}`).toBe(attemptMultiplier(before + session));
        expect(awarded, `sebelum=${before} sesi=${session}`).toBe(questionXp(base, before + session));
      }
    }
  });

  it("soal yang sudah memberi XP (termasuk data lama) → tidak ada XP tambahan", () => {
    const s = run(createInitialState("2026-11-13T07:00:00.000Z"), [q.answer]);
    expect(previewQuestionXp(s.counters.questionStats[q.id], true, 1)).toEqual({ percent: 0, alreadyRewarded: true });
    expect(previewQuestionXp(undefined, true, 1)).toEqual({ percent: 0, alreadyRewarded: true }); // legacy
    expect(previewQuestionXp(undefined, false, 1)).toEqual({ percent: 100, alreadyRewarded: false });
  });
});
