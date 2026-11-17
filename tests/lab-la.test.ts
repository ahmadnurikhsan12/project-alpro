import { describe, expect, it } from "vitest";
import { REFLECTION_COPY } from "@/content/reflection-copy";
import {
  REASON_IDS,
  checkTable,
  checkerMetrics,
  comparePairPrediction,
  comparePrediction,
  efficientVariables,
  elimMetrics,
  eliminationOutcome,
  niceRange,
  reasonFeedback,
  relationOf,
  resultLine,
  variableCost,
} from "@/lib/lab/la";
import { easiestVariable, generateSystem, planElimination, satisfies, seededRng, solveSystem, type Difficulty, type Equation, type Variable } from "@/lib/math/spldv";
import { frac } from "@/lib/math/fraction";
import { REFLECTION_PROMPTS } from "@/lib/tutor/reflection-prompts";
import { applyEvent, createInitialState } from "@/lib/progress/engine";
import { gradeEvent } from "@/lib/progress/grading";
import { clipLine } from "@/components/lab/coordinate-plot";

const systems = (n: number) => {
  const rng = seededRng(2026);
  const out: { e1: Equation; e2: Equation }[] = [];
  const levels: Difficulty[] = ["mudah", "sedang", "sulit"];
  for (let i = 0; i < n; i++) {
    const g = generateSystem(rng, levels[i % 3]);
    out.push({ e1: g.e1, e2: g.e2 });
  }
  return out;
};

describe("analisis tugas", () => {
  it("relasi koefisien", () => {
    expect(relationOf(3, 3)).toBe("sama_tanda_sama");
    expect(relationOf(-2, -2)).toBe("sama_tanda_sama");
    expect(relationOf(2, -2)).toBe("sama_berlawanan");
    expect(relationOf(2, 3)).toBe("berbeda");
    expect(relationOf(2, -3)).toBe("berbeda");
  });

  it("tabel koefisien diperiksa per sel, tanda minus dan kosong", () => {
    const e1 = { a: 2, b: -1, c: 5 };
    const e2 = { a: 3, b: 2, c: 4 };
    const good = { a1: "2", b1: "-1", c1: "5", a2: "3", b2: "2", c2: "4" };
    expect(checkTable(e1, e2, good).allOk).toBe(true);
    expect(checkTable(e1, e2, { ...good, a1: "2", b1: "1" }).ok.b1).toBe(false); // lupa tanda
    expect(checkTable(e1, e2, { ...good, b1: "−1" }).ok.b1).toBe(true); // minus Unicode
    expect(checkTable(e1, e2, { ...good, c2: "" }).allOk).toBe(false);
    expect(checkTable(e1, e2, { ...good, c2: "4,5" }).ok.c2).toBe(false);
  });
});

describe("perencanaan: biaya & variabel efisien", () => {
  it("konsisten dengan planElimination dan easiestVariable pada 300 sistem", () => {
    for (const { e1, e2 } of systems(300)) {
      for (const v of ["x", "y"] as const) {
        const p = planElimination(e1, e2, v);
        const c = variableCost(e1, e2, v);
        if (!p) {
          expect(c).toBeNull();
          continue;
        }
        expect(c!.m1).toBe(p.m1);
        expect(c!.m2).toBe(p.m2);
        expect(c!.operation).toBe(p.operation);
      }
      const eff = efficientVariables(e1, e2);
      expect(eff).toContain(easiestVariable(e1, e2));
    }
  });

  it("umpan balik alasan jujur", () => {
    const sama = { a: 2, b: 3, c: 7 }; // koefisien x sudah sama pada kedua persamaan
    const e2 = { a: 2, b: -1, c: 3 };
    expect(reasonFeedback("x", "koefisien_sudah_sama", sama, e2).tone).toBe("baik");
    expect(reasonFeedback("y", "koefisien_sudah_sama", sama, e2).tone).toBe("periksa");
    expect(reasonFeedback("x", "pengali_kecil", sama, e2).tone).toBe("baik");
    expect(reasonFeedback("y", "pengali_kecil", sama, e2).tone).toBe("periksa");
    for (const r of REASON_IDS) expect(reasonFeedback("x", r, sama, e2).text.length).toBeGreaterThan(10);
  });

  it("umpan balik tidak menyebut angka pengali (langkah pengali tetap dikerjakan siswa)", () => {
    for (const { e1, e2 } of systems(60)) {
      for (const v of ["x", "y"] as const) {
        if (!variableCost(e1, e2, v)) continue;
        for (const r of REASON_IDS) expect(reasonFeedback(v, r, e1, e2).text).not.toMatch(/×\s*\d/);
      }
    }
  });
});

describe("hasil eliminasi & hubungan aljabar–grafik", () => {
  it("garis hasil eliminasi selalu melewati titik potong (300 sistem × 2 variabel)", () => {
    let checked = 0;
    for (const { e1, e2 } of systems(300)) {
      const sol = solveSystem(e1, e2);
      if (sol.kind !== "unique") continue;
      for (const v of ["x", "y"] as Variable[]) {
        const p = planElimination(e1, e2, v);
        if (!p) continue;
        const o = eliminationOutcome(e1, e2, v, p.m1, p.m2)!;
        expect(o).not.toBeNull();
        const line = resultLine(o)!;
        expect(line).not.toBeNull();
        expect(satisfies(line, sol.x, sol.y)).toBe(true);
        // nilai variabel tersisa sama dengan koordinat titik potong
        expect(o.keepValue).toEqual(o.keep === "x" ? sol.x : sol.y);
        // garis terkali identik: titik potong juga memenuhi persamaan terkali
        expect(satisfies(o.scaled1, sol.x, sol.y)).toBe(true);
        expect(satisfies(o.scaled2, sol.x, sol.y)).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("pengali yang tidak menyamakan koefisien tidak menghasilkan eliminasi", () => {
    expect(eliminationOutcome({ a: 2, b: 1, c: 3 }, { a: 3, b: -1, c: 1 }, "x", 1, 1)).toBeNull();
    expect(eliminationOutcome({ a: 0, b: 1, c: 3 }, { a: 3, b: -1, c: 1 }, "x", 1, 1)).toBeNull();
  });

  it("sistem tanpa penyelesaian tunggal: tidak ada garis hasil", () => {
    const o = eliminationOutcome({ a: 1, b: 1, c: 2 }, { a: 1, b: 1, c: 5 }, "x", 1, 1)!;
    expect(o.coef).toBe(0);
    expect(resultLine(o)).toBeNull();
  });

  it("membandingkan prediksi: persis, setara, berbeda", () => {
    expect(comparePrediction({ coef: -3, konst: -9 }, { coef: -3, konst: -9 })).toBe("persis");
    expect(comparePrediction({ coef: 1, konst: 3 }, { coef: -1, konst: -3 })).toBe("setara");
    expect(comparePrediction({ coef: 2, konst: 6 }, { coef: 1, konst: 3 })).toBe("setara");
    expect(comparePrediction({ coef: 3, konst: 9 }, { coef: 3, konst: 5 })).toBe("berbeda");
    expect(comparePrediction({ coef: 0, konst: 0 }, { coef: 1, konst: 3 })).toBe("berbeda");
  });

  it("rentang sumbu mencakup titik penting", () => {
    expect(niceRange([])).toBe(10);
    expect(niceRange([{ x: 3, y: -4 }])).toBe(10);
    expect(niceRange([{ x: 12, y: 1 }])).toBe(15);
    expect(niceRange([{ x: 0, y: -40 }])).toBe(50);
  });

  it("garis dipotong pada kotak sumbu, termasuk garis tegak dan mendatar", () => {
    const v = clipLine({ a: 2, b: 0, c: 6 }, 10)!; // x = 3
    expect(v[0].x).toBe(3);
    expect(v[1].x).toBe(3);
    const h = clipLine({ a: 0, b: 1, c: -4 }, 10)!; // y = -4
    expect(h[0].y).toBe(-4);
    expect(clipLine({ a: 1, b: 1, c: 100 }, 10)).toBeNull(); // di luar kotak
  });

  it("prediksi Uji Pasangan dibandingkan per persamaan", () => {
    expect(comparePairPrediction({ p1: true, p2: false }, { ok1: true, ok2: false })).toEqual({ match1: true, match2: true, correct: 2 });
    expect(comparePairPrediction({ p1: true, p2: true }, { ok1: true, ok2: false })).toEqual({ match1: true, match2: false, correct: 1 });
    // pasangan penyelesaian: tebakan benar atas titik potong
    const sol = solveSystem({ a: 1, b: 1, c: 7 }, { a: 1, b: -1, c: 1 });
    expect(sol.kind === "unique" && satisfies({ a: 1, b: 1, c: 7 }, sol.x, sol.y)).toBe(true);
    expect(frac(1).d).toBe(1);
  });
});

describe("metrik Learning Activity", () => {
  it("metrik elimination ≤12 kunci, bulat 0–1000, tanpa teks bebas", () => {
    const m = elimMetrics({
      analisisPercobaan: 3,
      analisisPetunjuk: 1,
      variabelEfisien: true,
      pengaliPercobaan: 2,
      operasiPercobaan: 1,
      prediksi: "persis",
      ubahRencana: 1,
      petunjukTotal: 4,
      grafikDitandai: true,
      selesaiKe: 2,
    });
    expect(Object.keys(m).length).toBeLessThanOrEqual(12);
    expect(m.selesai_ke).toBe(2);
    expect(m.ubah_rencana).toBe(1);
    for (const [k, v] of Object.entries(m)) {
      expect(k).toMatch(/^[a-zA-Z0-9_]{1,30}$/);
      expect(Number.isInteger(v) && v >= 0 && v <= 1000).toBe(true);
    }
    expect(elimMetrics({ ...{ analisisPercobaan: 5000, analisisPetunjuk: -2, variabelEfisien: null, pengaliPercobaan: NaN, operasiPercobaan: 0, prediksi: "dilewati", ubahRencana: 0, petunjukTotal: 0, grafikDitandai: false, selesaiKe: 1 } }).analisis_percobaan).toBe(1000);
  });

  it("metrik checker valid", () => {
    const m = checkerMetrics({ ujiTotal: 3, prediksiTotal: 3, prediksiBenar: 2, lihatSolusi: false });
    expect(m).toEqual({ uji_total: 3, prediksi_total: 3, prediksi_benar: 2, lihat_solusi: 0 });
  });
});

describe("registri refleksi Tahap 3", () => {
  it("setiap prompt punya teks tampilan, dan setiap opsi punya label", () => {
    for (const p of REFLECTION_PROMPTS) {
      const copy = REFLECTION_COPY[p.id];
      expect(copy, p.id).toBeDefined();
      expect(copy.question.length).toBeGreaterThan(10);
      if (p.kind === "choice") for (const o of p.options) expect(copy.options?.[o], `${p.id}.${o}`).toBeTruthy();
      else expect(copy.scaleLabels).toBeDefined();
    }
  });

  it("id prompt unik per konteks dan hanya konteks Lab pada tahap ini", () => {
    const keys = REFLECTION_PROMPTS.map((p) => `${p.context}/${p.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(REFLECTION_PROMPTS.map((p) => p.context))).toEqual(new Set(["lab_elimination", "lab_checker"]));
  });
});

describe("pencatatan perubahan rencana (engine)", () => {
  const AT = "2026-11-12T08:00:00.000Z";
  const lab = (n: number, la?: Record<string, number>) => gradeEvent({ id: `00000000-0000-4000-8000-0000000${String(5000 + n).padStart(5, "0")}`, at: AT, type: "lab", tool: "elimination", ...(la ? { la } : {}) });

  it("lab ulang pada hari yang sama dengan metrik tercatat (0 XP); tanpa metrik tetap ditolak", () => {
    let s = createInitialState("2026-11-12T07:00:00.000Z");
    const r1 = applyEvent(s, lab(1, elimMetrics({ analisisPercobaan: 1, analisisPetunjuk: 0, variabelEfisien: true, pengaliPercobaan: 1, operasiPercobaan: 1, prediksi: "persis", ubahRencana: 0, petunjukTotal: 0, grafikDitandai: false, selesaiKe: 1 })));
    expect(r1.xpGained).toBeGreaterThanOrEqual(15);
    s = r1.state;
    const xpAfterFirst = s.xp;
    const r2 = applyEvent(s, lab(2, elimMetrics({ analisisPercobaan: 1, analisisPetunjuk: 0, variabelEfisien: false, pengaliPercobaan: 1, operasiPercobaan: 2, prediksi: "dilewati", ubahRencana: 1, petunjukTotal: 1, grafikDitandai: true, selesaiKe: 1 })));
    expect(r2.accepted).toBe(true);
    expect(r2.state.xp).toBe(xpAfterFirst); // tidak ada XP tambahan
    expect(r2.delta.learning).toHaveLength(1);
    expect((r2.delta.learning[0].payload.metrics as Record<string, number>).ubah_rencana).toBe(1);
    expect(applyEvent(r2.state, lab(3)).accepted).toBe(false); // perilaku lama dipertahankan
  });
});
