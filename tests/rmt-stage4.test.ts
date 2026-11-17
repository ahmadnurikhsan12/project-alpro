import { describe, expect, it } from "vitest";
import { LESSONS, type ContentBlock } from "@/content/lessons";
import { PRACTICE_QUESTIONS } from "@/content/practice";
import { RMT_PRACTICE_QUESTIONS } from "@/content/practice-rmt";
import { GAME_BY_ID } from "@/content/games";
import { copyFor } from "@/content/reflection-copy";
import { compareGuess, kilatMetrics, kilatMirror, signalOf, tebakMetrics, type GuessRecord } from "@/lib/games/rmt";
import { createRawEventSchema, rawEventSchema } from "@/lib/progress/schema";
import { frac } from "@/lib/math/fraction";
import { satisfies, type Equation } from "@/lib/math/spldv";
import { REFLECTION_PROMPTS } from "@/lib/tutor/reflection-prompts";

const blocks = (id: string) => LESSONS.find((l) => l.id === id)!.sections.flatMap((s) => s.blocks);
const of = <T extends ContentBlock["type"]>(id: string, type: T) => blocks(id).filter((b): b is Extract<ContentBlock, { type: T }> => b.type === type);
const PILOT_LESSONS = ["m4", "m5", "m6"];

describe("materi Modul 4–6: blok RMT", () => {
  it("setiap materi pilot punya prediksi (think), tabel, grafik, dan refleksi", () => {
    for (const id of PILOT_LESSONS) {
      expect(of(id, "think").length, `${id} think`).toBeGreaterThanOrEqual(1);
      expect(of(id, "table").length, `${id} table`).toBeGreaterThanOrEqual(1);
      expect(of(id, "plot").length, `${id} plot`).toBeGreaterThanOrEqual(1);
      expect(LESSONS.find((l) => l.id === id)!.reflect, id).toBe(true);
    }
    // materi di luar pilot tidak berubah perilakunya
    for (const l of LESSONS.filter((x) => !PILOT_LESSONS.includes(x.id))) expect(l.reflect, l.id).toBeUndefined();
  });

  it("blok think: ≥2 opsi berbeda, indeks benar valid, ada penjelasan beralasan", () => {
    for (const id of PILOT_LESSONS) {
      for (const b of of(id, "think")) {
        expect(b.options.length, b.question).toBeGreaterThanOrEqual(2);
        expect(new Set(b.options).size, b.question).toBe(b.options.length);
        expect(Number.isInteger(b.correct) && b.correct >= 0 && b.correct < b.options.length, b.question).toBe(true);
        expect(b.explain.length, b.question).toBeGreaterThan(40);
      }
    }
  });

  it("grafik: setiap titik berada TEPAT pada garis yang dinyatakan (dan tidak pada garis lain)", () => {
    for (const id of PILOT_LESSONS) {
      for (const p of of(id, "plot")) {
        for (const pt of p.points ?? []) {
          p.lines.forEach((l, i) => {
            const eq: Equation = { a: l.a, b: l.b, c: l.c };
            expect(satisfies(eq, frac(pt.x), frac(pt.y)), `${id} ${pt.label} pada garis ${l.label}`).toBe(pt.on.includes(i));
          });
        }
        expect(p.caption.length).toBeGreaterThan(20);
      }
    }
  });

  it("tabel persegi panjang; baris yang disorot ada", () => {
    for (const id of PILOT_LESSONS) {
      for (const t of of(id, "table")) {
        for (const r of t.rows) expect(r.length, `${id} ${t.caption}`).toBe(t.head.length);
        for (const h of t.highlightRows ?? []) expect(h).toBeLessThan(t.rows.length);
      }
    }
  });

  it("isi tabel Modul 4 dan 5 benar secara matematis", () => {
    const m4 = of("m4", "table")[0];
    for (const [x, y1, y2] of m4.rows.map((r) => r.map(Number))) {
      expect(x + y1).toBe(10); // x + y = 10
      expect(x - y2).toBe(4); // x − y = 4
    }
    const parse = (s: string) => s.replace(/−/g, "-").match(/-?\d+/g)!.map(Number);
    const m5 = of("m5", "table")[0];
    for (const [c1, c2] of m5.rows) {
      const [a, b] = parse(c1);
      const [d, e] = parse(c2);
      expect(2 * a + 3 * b).toBe(12);
      expect(3 * d + 4 * e).toBe(17);
    }
    expect(m5.rows[1][0]).toBe(m5.rows[1][1]); // pasangan yang sama: penyelesaian
  });
});

describe("16 soal latihan RMT", () => {
  it("8 soal Modul 4 + 8 soal Modul 6, id unik, sudah termasuk dalam bank latihan", () => {
    expect(RMT_PRACTICE_QUESTIONS).toHaveLength(16);
    expect(RMT_PRACTICE_QUESTIONS.filter((q) => q.topic === "m4")).toHaveLength(8);
    expect(RMT_PRACTICE_QUESTIONS.filter((q) => q.topic === "m6")).toHaveLength(8);
    expect(new Set(RMT_PRACTICE_QUESTIONS.map((q) => q.id)).size).toBe(16);
    for (const q of RMT_PRACTICE_QUESTIONS) expect(PRACTICE_QUESTIONS.some((x) => x.id === q.id)).toBe(true);
  });

  it("menekankan pemahaman konsep: mayoritas soal konsep/representasi dan memuat soal alasan", () => {
    const concept = RMT_PRACTICE_QUESTIONS.filter((q) => q.format === "konsep" || q.format === "penyelesaian");
    expect(concept.length).toBeGreaterThanOrEqual(12);
    const reasoning = RMT_PRACTICE_QUESTIONS.filter((q) => q.type === "mcq" && /^(Mengapa|Apa|Seorang|Dua garis|Garis|Setelah)/.test(q.prompt));
    expect(reasoning.length).toBeGreaterThanOrEqual(6);
  });

  it("memakai berbagai representasi: tabel, grafik/titik potong, dan aljabar", () => {
    const text = RMT_PRACTICE_QUESTIONS.map((q) => [q.prompt, ...(q.context ?? [])].join(" ")).join(" ");
    expect(text).toMatch(/[Tt]abel/);
    expect(text).toMatch(/[Gg]aris|[Gg]rafik|titik potong/);
    expect(text).toMatch(/eliminasi|dikalikan|dijumlahkan|dikurangkan/);
  });
});

describe("permainan RMT: logika", () => {
  it("signalOf membandingkan ruas kiri dengan ruas kanan", () => {
    expect(signalOf({ a: 1, b: 1, c: 7 }, 3, 4)).toEqual({ value: 7, s: "tepat" });
    expect(signalOf({ a: 1, b: 1, c: 7 }, 5, 4).s).toBe("besar");
    expect(signalOf({ a: 1, b: -1, c: 1 }, 1, 4).s).toBe("kecil");
  });

  it("compareGuess dan metrik Tebak Nilai valid sebagai metrik event", () => {
    const g = (reason: GuessRecord["reason"], pred: [string, string], actual: [string, string]): GuessRecord => ({
      reason,
      pred: { s1: pred[0] as never, s2: pred[1] as never },
      actual: { s1: actual[0] as never, s2: actual[1] as never },
    });
    expect(compareGuess({ s1: "kecil", s2: "tepat" }, { s1: "kecil", s2: "besar" })).toEqual({ m1: true, m2: false, correct: 1 });
    const m = tebakMetrics([g("substitusi", ["kecil", "kecil"], ["kecil", "kecil"]), g("menebak", ["besar", "besar"], ["kecil", "besar"])], 3, 2);
    expect(m).toMatchObject({ tebakan_total: 2, prediksi_total: 4, prediksi_benar: 3, alasan_substitusi: 1, alasan_menebak: 1, ronde_main: 3, ronde_selesai: 2 });
    expect(Object.keys(m).length).toBeLessThanOrEqual(12);
    for (const [k, v] of Object.entries(m)) {
      expect(k).toMatch(/^[a-zA-Z0-9_]{1,30}$/);
      expect(Number.isInteger(v) && v >= 0 && v <= 1000).toBe(true);
    }
  });

  it("metrik Eliminasi Kilat: akurasi, kecepatan, dan cermin yang jujur", () => {
    const stats = { answered: 20, correct: 15, maxCombo: 6, answerSeconds: 50 };
    expect(kilatMetrics(stats)).toEqual({ jawaban_total: 20, benar: 15, salah: 5, akurasi: 75, combo_maks: 6, waktu_rata_x10: 25 });
    expect(kilatMetrics({ answered: 0, correct: 0, maxCombo: 0, answerSeconds: 0 }).akurasi).toBe(0);
    expect(kilatMirror(stats)).toContain("75%");
    expect(kilatMirror(stats)).toContain("2,5 detik");
    expect(kilatMirror({ answered: 10, correct: 3, maxCombo: 1, answerSeconds: 20 })).toContain("pelan");
    expect(kilatMirror({ answered: 10, correct: 10, maxCombo: 10, answerSeconds: 20 })).toContain("teliti");
    expect(kilatMirror({ answered: 0, correct: 0, maxCombo: 0, answerSeconds: 0 })).toContain("Belum");
  });
});

describe("skema & registri Tahap 4", () => {
  it("game dengan metrik `la` diterima skema produksi; metrik palsu ditolak", () => {
    const base = { id: "00000000-0000-4000-8000-000000030001", at: "2026-11-12T08:00:00.000Z", type: "game", gameId: "tebak-nilai", difficulty: "mudah", score: 100, correct: 2, total: 3, durationSec: 60 };
    const ok = tebakMetrics([], 3, 2);
    expect(rawEventSchema.safeParse({ ...base, la: ok }).success).toBe(true);
    expect(rawEventSchema.safeParse({ ...base, la: { ...ok, teks: "bebas" } }).success).toBe(false);
  });

  it("refleksi pada konteks tebak_nilai, eliminasi_kilat, dan lesson lolos registri produksi", () => {
    const ev = (context: string, responses: Record<string, string | number>) => ({ id: "00000000-0000-4000-8000-000000030002", at: "2026-11-12T08:00:00.000Z", type: "reflection", context, refId: "x", responses });
    expect(rawEventSchema.safeParse(ev("tebak_nilai", { strategi: "eliminasi", keyakinan: 4 })).success).toBe(true);
    expect(rawEventSchema.safeParse(ev("eliminasi_kilat", { prioritas: "seimbang", penyebab_salah: "terburu" })).success).toBe(true);
    expect(rawEventSchema.safeParse(ev("lesson", { penjelasan_sendiri: "sebagian", representasi_membantu: "grafik" })).success).toBe(true);
    // prompt milik konteks lain ditolak
    expect(rawEventSchema.safeParse(ev("lesson", { strategi: "eliminasi" })).success).toBe(false);
    expect(createRawEventSchema().safeParse(ev("tebak_nilai", { prioritas: "cepat" })).success).toBe(false);
  });

  it("game yang berreflesi punya prompt sah, dan teks tampilan lengkap", () => {
    for (const id of ["tebak-nilai", "eliminasi-kilat"] as const) {
      const r = GAME_BY_ID[id].reflection!;
      expect(r).toBeDefined();
      for (const pid of r.promptIds) {
        expect(REFLECTION_PROMPTS.some((p) => p.id === pid && p.context === r.context), `${r.context}/${pid}`).toBe(true);
        expect(copyFor(r.context, pid)).toBeDefined();
      }
    }
    // game lain tidak berubah
    expect(GAME_BY_ID["detektif-variabel"].reflection).toBeUndefined();
  });
});
