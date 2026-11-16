import { describe, expect, it } from "vitest";
import { ALL_LESSON_QUIZ_QUESTIONS } from "@/content/lessons";
import { PRACTICE_BY_ID, PRACTICE_QUESTIONS } from "@/content/practice";
import { MEDIATION_BY_ID } from "@/content/mediation";
import { lcm } from "@/lib/math/fraction";
import { generateSystem, seededRng, type Difficulty } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";
import { diagnose } from "@/lib/tutor/diagnose";
import { matchErrorModels } from "@/lib/tutor/error-models";
import { leaksAnswer } from "@/lib/tutor/leak";
import { EVALUATION_QUESTIONS } from "@/server/evaluation-bank";

const byId = Object.fromEntries([...PRACTICE_QUESTIONS, ...ALL_LESSON_QUIZ_QUESTIONS].map((q) => [q.id, q]));
const codes = (r: ReturnType<typeof matchErrorModels>) => r.map((m) => m.code);

/**
 * ORACLE TERPISAH: jawaban keliru dihitung di sini dengan rumus sederhana yang ditulis ulang,
 * bukan dengan fungsi produksi. Diagnosis harus mengenalinya.
 */
function eliminationFacts(e1: { a: number; b: number; c: number }, e2: { a: number; b: number; c: number }, v: "x" | "y") {
  const c1 = v === "x" ? e1.a : e1.b;
  const c2 = v === "x" ? e2.a : e2.b;
  const L = lcm(Math.abs(c1), Math.abs(c2));
  const m1 = L / Math.abs(c1);
  const m2 = L / Math.abs(c2);
  const s1 = e1.c * m1;
  const s2 = e2.c * m2;
  const sameSign = Math.sign(c1 * m1) === Math.sign(c2 * m2);
  const op = sameSign ? "sub" : "add";
  const correct = sameSign ? s1 - s2 : s1 + s2;
  const wrongOp = sameSign ? s1 + s2 : s1 - s2;
  const unscaled = sameSign ? e1.c - e2.c : e1.c + e2.c;
  return { c1, c2, L, m1, m2, s1, s2, op, correct, wrongOp, unscaled };
}

const SYSTEMS = (["mudah", "sedang", "sulit"] as Difficulty[]).flatMap((d) => {
  const rng = seededRng(7000 + d.length);
  return Array.from({ length: 120 }, () => generateSystem(rng, d));
});

describe("model kesalahan — dikenali dari jawaban yang dihitung oracle terpisah", () => {
  it("konstanta setelah eliminasi: salah operasi, ruas kanan tak ikut dikalikan, dan salah tanda", () => {
    let scaledCases = 0;
    for (const g of SYSTEMS) {
      for (const v of ["x", "y"] as const) {
        const f = eliminationFacts(g.e1, g.e2, v);
        const t = { kind: "combined_const", eliminate: v } as const;
        const sys = { e1: g.e1, e2: g.e2 };
        // bila salah satu konstanta bernilai 0, jumlah dan selisih sama: tidak ada "jawaban salah" yang dapat dibedakan
        if (f.wrongOp !== f.correct) expect(codes(matchErrorModels(t, sys, String(f.wrongOp))), `${JSON.stringify(g)} ${v} salah_operasi`).toContain("salah_operasi");
        if ((f.m1 !== 1 || f.m2 !== 1) && f.unscaled !== f.correct && f.unscaled !== f.wrongOp) {
          scaledCases++;
          expect(codes(matchErrorModels(t, sys, String(f.unscaled))), `${JSON.stringify(g)} ${v} lupa_kalikan`).toContain("lupa_kalikan_ruas_kanan");
        }
        if (f.correct !== 0) expect(codes(matchErrorModels(t, sys, String(-f.correct)))).toContain("tanda_hasil");
        expect(matchErrorModels(t, sys, String(f.correct)), "jawaban benar tidak didiagnosis").toEqual([]);
      }
    }
    expect(scaledCases).toBeGreaterThan(50);
  });

  it("pengali: KPK bukan pengali, pengali tertukar, dan pengali yang bukan terkecil", () => {
    for (const g of SYSTEMS) {
      for (const v of ["x", "y"] as const) {
        const f = eliminationFacts(g.e1, g.e2, v);
        for (const eq of [1, 2] as const) {
          const own = eq === 1 ? f.m1 : f.m2;
          const otherM = eq === 1 ? f.m2 : f.m1;
          const ownCoef = Math.abs(eq === 1 ? f.c1 : f.c2);
          const t = { kind: "multiplier", eq, eliminate: v } as const;
          const sys = { e1: g.e1, e2: g.e2 };
          if (f.L !== own) expect(codes(matchErrorModels(t, sys, String(f.L)))).toContain("kpk_bukan_pengali");
          if (otherM !== own && otherM !== f.L) expect(codes(matchErrorModels(t, sys, String(otherM)))).toContain("pengali_tertukar");
          const twice = own * 2;
          if (twice !== f.L && twice !== otherM && (twice * ownCoef) % f.L === 0) {
            expect(codes(matchErrorModels(t, sys, String(twice)))).toContain("pengali_bukan_terkecil");
          }
          expect(matchErrorModels(t, sys, String(own)), "pengali benar tidak didiagnosis").toEqual([]);
        }
      }
    }
  });

  it("pasangan (x, y): tertukar dan sebagian benar (dengan variabel yang benar)", () => {
    for (const g of SYSTEMS) {
      const sys = { e1: g.e1, e2: g.e2 };
      const t = { kind: "pair" } as const;
      if (g.x !== g.y) expect(codes(matchErrorModels(t, sys, `${g.y},${g.x}`))).toContain("variabel_tertukar");
      const px = matchErrorModels(t, sys, `${g.x},${g.y + 1}`).find((m) => m.code === "sebagian_benar");
      expect(px?.correctVar).toBe("x");
      const py = matchErrorModels(t, sys, `${g.x + 1},${g.y}`).find((m) => m.code === "sebagian_benar");
      expect(py?.correctVar).toBe("y");
      expect(matchErrorModels(t, sys, `${g.x},${g.y}`), "pasangan benar tidak didiagnosis").toEqual([]);
    }
  });

  it("nilai satu variabel: variabel lain, salah tanda, dan jawaban benar", () => {
    for (const g of SYSTEMS) {
      const sys = { e1: g.e1, e2: g.e2 };
      const asked = { kind: "var", v: "x" } as const;
      if (g.x !== g.y) expect(codes(matchErrorModels(asked, sys, String(g.y)))).toContain("variabel_lain");
      if (g.x !== 0) expect(codes(matchErrorModels(asked, sys, String(-g.x)))).toContain("tanda_hasil");
      expect(matchErrorModels(asked, sys, String(g.x))).toEqual([]);
    }
  });

  it("konstanta setelah dikali: ruas kanan tak ikut dikali, atau ditambah", () => {
    for (const [c, k] of [[4, 3], [7, 2], [-5, 4], [10, 5]] as const) {
      const t = { kind: "scaled_const", c, factor: k } as const;
      expect(codes(matchErrorModels(t, undefined, String(c)))).toContain("lupa_kalikan_ruas_kanan");
      expect(codes(matchErrorModels(t, undefined, String(c + k)))).toContain("tambah_bukan_kali");
      expect(matchErrorModels(t, undefined, String(c * k))).toEqual([]);
    }
  });

  it("selektif dan jujur: masukan tak terbaca tidak menimbulkan diagnosis atau error; maksimal 3 kemungkinan", () => {
    const sys = { e1: SYSTEMS[0].e1, e2: SYSTEMS[0].e2 };
    for (const t of [{ kind: "pair" }, { kind: "var", v: "x" }, { kind: "multiplier", eq: 1, eliminate: "x" }, { kind: "combined_const", eliminate: "y" }] as const) {
      for (const junk of ["", "abc", "1/0", "1,2,3", "∞", "  "]) expect(matchErrorModels(t, sys, junk), `${t.kind}:${junk}`).toEqual([]);
    }
    for (const g of SYSTEMS) for (let n = -20; n <= 20; n++) expect(matchErrorModels({ kind: "var", v: "y" }, { e1: g.e1, e2: g.e2 }, String(n)).length).toBeLessThanOrEqual(3);
  });
});

describe("diagnosis pada soal pilot (nyata)", () => {
  const ident = (id: string, answer: string) => diagnose(byId[id], answer);

  it("mengenali pola yang khas", () => {
    expect(ident("p-s-01", "1").diagnoses[0].code).toBe("pengali_tertukar");
    expect(ident("p-s-01", "6").diagnoses[0].code).toBe("pengali_bukan_terkecil");
    expect(ident("q-m4-4", "10").diagnoses[0].code).toBe("salah_operasi");
    expect(ident("q-m4-4", "-14").diagnoses[0].code).toBe("tanda_hasil");
    expect(ident("p-m-10", "3,8").diagnoses[0].code).toBe("variabel_tertukar");
    expect(ident("p-m-10", "8,5").diagnoses[0]).toMatchObject({ code: "sebagian_benar" });
    expect(ident("p-h-03", "3").diagnoses[0].code).toBe("tanda_hasil");
    expect(ident("p-h-03", "2").diagnoses[0].code).toBe("variabel_lain");
    expect(ident("p-s-14", "4").diagnoses[0].code).toBe("lupa_kalikan_ruas_kanan");
    expect(ident("p-s-14", "7").diagnoses[0].code).toBe("tambah_bukan_kali");
    expect(ident("p-s-07", "true").diagnoses[0].code).toBe("tidak_cek_kedua_persamaan");
    expect(ident("q-m6-2", "true").diagnoses[0].code).toBe("tidak_cek_kedua_persamaan");
  });

  it("pesan diagnosis memakai variabel/koefisien YANG DIELIMINASI (bukan variabel lain)", () => {
    const d = ident("q-m4-4", "10").diagnoses[0];
    expect(d.observe).toContain("koefisien y: 1 dan −1");
    expect(ident("p-m-06", "b").diagnoses[0].observe).toContain("koefisien y: 1 dan −1");
    expect(ident("p-m-10", "8,5").diagnoses[0].observe).toContain("nilai x");
    expect(ident("p-s-07", "true").diagnoses[0].observe).toContain("persamaan (1)");
  });

  it("pilihan ganda & B/S berbasis konsep: pola dari pemetaan tulisan tangan", () => {
    expect(ident("p-m-06", "b").diagnoses[0].code).toBe("salah_operasi");
    expect(ident("p-m-06", "c").diagnoses[0].code).toBe("kalikan_tidak_perlu");
    expect(ident("p-m-07", "d").diagnoses[0].code).toBe("kira_tidak_bisa_dieliminasi");
    expect(ident("p-h-04", "d").diagnoses[0].code).toBe("pengali_tertukar");
    expect(ident("q-m6-4", "a").diagnoses[0].code).toBe("tanda_pengurangan");
    expect(ident("p-h-12", "true").diagnoses[0].code).toBe("salah_operasi");
    expect(ident("q-m4-3", "false").diagnoses[0].code).toBe("opsi_khusus");
  });

  it("BELUM TERIDENTIFIKASI bila pola tidak dikenali — tidak mengarang", () => {
    for (const [id, a] of [["p-s-01", "3"], ["q-m4-4", "999"], ["p-m-10", "5,8"], ["p-h-03", "-4"], ["p-s-07", "false"], ["p-s-14", "1000"]] as const) {
      expect(ident(id, a), `${id} "${a}"`).toEqual({ identified: false, diagnoses: [] });
    }
    // jawaban benar tidak pernah didiagnosis
    for (const q of Object.values(byId).filter((x) => MEDIATION_BY_ID[x.id] && (x.type === "number" || x.type === "pair"))) {
      expect(diagnose(q, q.answer), q.id).toEqual({ identified: false, diagnoses: [] });
    }
  });

  it("selektif: hanya sebagian kecil jawaban acak yang didiagnosis", () => {
    // Target "pengali" dikecualikan: setiap kelipatan genap/valid memang pengali sah yang bukan terkecil.
    for (const q of Object.values(byId).filter((x) => MEDIATION_BY_ID[x.id]?.target && x.type === "number" && MEDIATION_BY_ID[x.id].target!.kind !== "multiplier")) {
      let hit = 0;
      for (let n = -50; n <= 50; n++) if (String(n) !== q.answer && diagnose(q, String(n)).identified) hit++;
      expect(hit, `${q.id} mendiagnosis ${hit} dari 100 jawaban salah`).toBeLessThanOrEqual(15);
    }
  });

  it("teks diagnosis tidak membocorkan jawaban soal", () => {
    for (const q of Object.values(byId).filter((x) => MEDIATION_BY_ID[x.id])) {
      const answers: string[] = [];
      if (q.type === "mcq" || q.type === "tf") answers.push(...(q.type === "tf" ? ["true", "false"] : q.options!.map((o) => o.id)));
      else if (q.type === "number") for (let n = -40; n <= 40; n++) answers.push(String(n));
      else for (let a = -9; a <= 9; a++) for (const b of [-3, 1, 2, 3, 4, 5, 8]) answers.push(`${a},${b}`);
      for (const a of answers) {
        if (a === q.answer) continue;
        for (const d of diagnose(q, a).diagnoses) {
          expect(leaksAnswer(q, `${d.observe} ${d.ask}`), `${q.id} "${a}" ${d.code}`).toBe(false);
        }
      }
    }
  });

  it("Evaluasi Akhir: diagnosis tidak pernah diberikan", () => {
    for (const q of EVALUATION_QUESTIONS) {
      for (const a of q.type === "mcq" ? ["a", "b", "c", "d"] : q.type === "tf" ? ["true", "false"] : ["1", "2", "-3", "1,2", "4,2"]) {
        expect(diagnose(q as Question, a), `${q.id} ${a}`).toEqual({ identified: false, diagnoses: [] });
      }
    }
  });

  it("soal pasangan di luar pilot yang sistemnya diketahui tetap dapat didiagnosis; tanpa sistem tidak", () => {
    const q = PRACTICE_BY_ID["p-h-01"];
    expect(diagnose(q, "3,2").diagnoses[0].code).toBe("variabel_tertukar");
    const noSystem = ALL_LESSON_QUIZ_QUESTIONS.find((x) => x.topic === "m1" && x.type === "number")!;
    expect(diagnose(noSystem, "999")).toEqual({ identified: false, diagnoses: [] });
  });
});
