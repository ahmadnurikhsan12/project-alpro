import { describe, expect, it } from "vitest";
import { applyEvent, createInitialState } from "@/lib/progress/engine";
import { EventValidationError, gradeEvent } from "@/lib/progress/grading";
import { replayEvents } from "@/lib/progress/replay";
import { createRawEventSchema, migrateEnvelopeSchema, rawEventSchema } from "@/lib/progress/schema";
import type { RawEvent } from "@/lib/progress/types";
import { REFLECTION_PROMPTS, validateReflection, type ReflectionPrompt } from "@/lib/tutor/reflection-prompts";

let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n + 7000).padStart(12, "0")}`;
const AT = "2026-11-12T08:00:00.000Z";
const fresh = () => createInitialState("2026-11-12T07:00:00.000Z");

// registri uji (registri produksi sengaja kosong sampai Tahap 3–4)
const TEST_REGISTRY: ReflectionPrompt[] = [
  { id: "paling_sulit", context: "lab_elimination", kind: "choice", options: ["analisis", "rencana", "hitung", "periksa"] },
  { id: "keyakinan", context: "lab_elimination", kind: "scale", min: 1, max: 5 },
  { id: "strategi", context: "tebak_nilai", kind: "choice", options: ["eliminasi", "coba_coba"] },
];
const schema = createRawEventSchema(TEST_REGISTRY);
const reflection = (over: Partial<Extract<RawEvent, { type: "reflection" }>> = {}): RawEvent => ({
  id: uid(), at: AT, type: "reflection", context: "lab_elimination", refId: "elimination",
  responses: { paling_sulit: "rencana", keyakinan: 4 }, ...over,
} as RawEvent);

describe("skema event: bentuk baru bersifat opsional", () => {
  const base = { id: uid(), at: AT };
  it("menerima event lama dan event dengan field baru", () => {
    const ok = [
      { ...base, type: "practice", difficulty: "mudah", questionIds: ["p-m-01"], answers: { "p-m-01": "b" } },
      { ...base, type: "practice", difficulty: "mudah", questionIds: ["p-m-01"], answers: { "p-m-01": "b" }, responses: { "p-m-01": { attempts: ["a", "b"], hints: 2 } } },
      { ...base, type: "lesson_quiz", lessonId: "m4", answers: {}, responses: { "q-m4-1": { attempts: [] } } },
      { ...base, type: "lab", tool: "elimination", la: { analisis_salah: 1, petunjuk: 2 } },
      { ...base, type: "game", gameId: "tebak-nilai", difficulty: "mudah", score: 100, correct: 1, total: 3, durationSec: 60, la: { prediksi_benar: 5 } },
    ];
    for (const e of ok) expect(rawEventSchema.safeParse(e).success, JSON.stringify(e).slice(0, 80)).toBe(true);
  });

  it("menolak masukan berlebihan atau berbentuk salah", () => {
    const practice = (responses: unknown) => ({ ...base, type: "practice", difficulty: "mudah", questionIds: ["p-m-01"], answers: {}, responses });
    const bad = [
      practice({ "p-m-01": { attempts: ["1", "2", "3", "4", "5", "6"] } }), // > 5 jawaban
      practice({ "p-m-01": { attempts: ["x".repeat(61)] } }), // jawaban terlalu panjang
      practice({ "p-m-01": { attempts: ["a"], hints: 5 } }), // petunjuk > 4
      practice({ "p-m-01": { attempts: ["a"], hints: -1 } }),
      practice({ "p-m-01": { attempts: "a" } }), // bukan array
      { ...base, type: "lab", tool: "elimination", la: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`k${i}`, 1])) }, // > 12 metrik
      { ...base, type: "lab", tool: "elimination", la: { "nama buruk!": 1 } }, // kunci tidak valid
      { ...base, type: "lab", tool: "elimination", la: { teks: "bebas" } }, // nilai bukan angka
      { ...base, type: "lab", tool: "elimination", la: { besar: 1001 } },
      { ...base, type: "tidak_ada" },
    ];
    for (const e of bad) expect(rawEventSchema.safeParse(e).success, JSON.stringify(e).slice(0, 90)).toBe(false);
  });
});

describe("refleksi: hanya pilihan/skala sesuai registri", () => {
  it("registri produksi masih kosong: jawaban ditolak, 'dilewati' sah", () => {
    expect(REFLECTION_PROMPTS).toHaveLength(0);
    expect(rawEventSchema.safeParse(reflection()).success).toBe(false);
    expect(rawEventSchema.safeParse(reflection({ responses: {}, skipped: true })).success).toBe(true);
  });

  it("registri uji: menerima jawaban valid", () => {
    expect(schema.safeParse(reflection()).success).toBe(true);
    expect(schema.safeParse(reflection({ context: "tebak_nilai", responses: { strategi: "eliminasi" } })).success).toBe(true);
  });

  it("menolak prompt tak dikenal, opsi tak sah, skala di luar rentang, dan konteks keliru", () => {
    const bad = [
      reflection({ responses: { prompt_palsu: "x" } }),
      reflection({ responses: { paling_sulit: "mengarang" } }),
      reflection({ responses: { keyakinan: 6 } }),
      reflection({ responses: { keyakinan: 0 } }),
      reflection({ responses: { keyakinan: 2.5 } }),
      reflection({ responses: { paling_sulit: 3 } }), // tipe salah
      reflection({ context: "tebak_nilai", responses: { paling_sulit: "rencana" } }), // prompt milik konteks lain
      reflection({ responses: {} }), // tidak dilewati tetapi kosong
      reflection({ responses: { keyakinan: 3 }, skipped: true }), // dilewati tetapi berisi jawaban
      reflection({ responses: { paling_sulit: "teks bebas yang panjang ".repeat(5) } }), // teks bebas
    ];
    for (const e of bad) expect(schema.safeParse(e).success, JSON.stringify(e).slice(0, 100)).toBe(false);
  });

  it("validateReflection mengembalikan pesan yang bisa dibaca", () => {
    expect(validateReflection(TEST_REGISTRY, { context: "lab_elimination", responses: { keyakinan: 9 } })).toContain("tidak valid");
    expect(validateReflection(TEST_REGISTRY, { context: "lab_elimination", responses: { keyakinan: 3 } })).toBeNull();
  });

  it("gradeEvent juga menolak refleksi tidak sah (Guest Mode tidak lewat skema)", () => {
    expect(() => gradeEvent(reflection())).toThrow(EventValidationError);
    expect(() => gradeEvent(reflection(), { reflectionRegistry: TEST_REGISTRY })).not.toThrow();
  });
});

describe("event baru pada mesin progres", () => {
  it("refleksi: 0 XP, tercatat sebagai aktivitas & catatan belajar, dihitung di counters", () => {
    const r = applyEvent(fresh(), gradeEvent(reflection(), { reflectionRegistry: TEST_REGISTRY }));
    expect(r.accepted).toBe(true);
    expect(r.xpGained).toBe(0);
    expect(r.state.xp).toBe(0);
    expect(r.state.counters.reflections).toBe(1);
    expect(r.state.activity[0]).toMatchObject({ type: "reflection", xp: 0 });
    expect(r.delta.learning).toHaveLength(1);
    expect(r.delta.learning[0]).toMatchObject({ kind: "reflection", refId: "elimination" });
    expect(r.delta.learning[0].payload).toMatchObject({ context: "lab_elimination", skipped: false, responses: { keyakinan: 4 } });
  });

  it("refleksi yang dilewati dicatat terpisah", () => {
    const skipped = reflection({ responses: {}, skipped: true });
    const r = applyEvent(fresh(), gradeEvent(skipped));
    expect(r.state.counters).toMatchObject({ reflections: 0, reflectionsSkipped: 1 });
    expect(r.state.activity[0].detail).toBe("Dilewati");
  });

  it("lab dengan `la`: pengulangan di hari yang sama tetap dicatat (tanpa XP); tanpa `la` tetap ditolak seperti dulu", () => {
    const lab = (la?: Record<string, number>): RawEvent => ({ id: uid(), at: AT, type: "lab", tool: "elimination", ...(la ? { la } : {}) });
    let s = applyEvent(fresh(), gradeEvent(lab({ rencana_benar: 1 })));
    expect(s.xpGained).toBe(15);
    expect(s.delta.learning[0]).toMatchObject({ kind: "lab_la", refId: "elimination" });
    const repeat = applyEvent(s.state, gradeEvent(lab({ rencana_benar: 0 })));
    expect(repeat.accepted).toBe(true);
    expect(repeat.xpGained).toBe(0);
    expect(repeat.delta.learning).toHaveLength(1);
    expect(repeat.state.activity[0].detail).toBe("Mengulang eksplorasi");
    s = repeat;
    expect(applyEvent(s.state, gradeEvent(lab())).accepted).toBe(false); // perilaku lama
  });

  it("game dengan `la` menghasilkan catatan belajar; skor & XP game tidak berubah", () => {
    const game = (la?: Record<string, number>): RawEvent => ({
      id: uid(), at: AT, type: "game", gameId: "tebak-nilai", difficulty: "sedang", score: 200, correct: 2, total: 3, durationSec: 90, ...(la ? { la } : {}),
    });
    const withLa = applyEvent(fresh(), gradeEvent(game({ prediksi_benar: 4, coba_coba: 1 })));
    const without = applyEvent(fresh(), gradeEvent(game()));
    expect(withLa.xpGained).toBe(without.xpGained);
    expect(withLa.delta.learning[0]).toMatchObject({ kind: "game_la", refId: "tebak-nilai" });
    expect(without.delta.learning).toHaveLength(0);
  });

  it("migrasi/replay: event baru tidak diduplikasi dan catatan belajar ikut terkumpul", () => {
    const events = [
      reflection(),
      { id: uid(), at: AT, type: "lab", tool: "graph", la: { misi: 3 } } as RawEvent,
    ];
    const first = replayEvents(fresh(), events, new Set(), { reflectionRegistry: TEST_REGISTRY }, "2026-11-12T10:00:00.000Z");
    expect(first.imported).toBe(2);
    expect(first.delta.learning).toHaveLength(2);
    const existing = new Set(first.delta.activities.map((a) => a.id));
    const again = replayEvents(first.state, events, existing, { reflectionRegistry: TEST_REGISTRY }, "2026-11-12T10:00:00.000Z");
    expect(again.imported).toBe(0);
    expect(again.delta.learning).toHaveLength(0);
  });
});

describe("migrasi: validasi per event", () => {
  it("amplop menerima event apa pun; satu event tak dikenal tidak menggagalkan yang lain", () => {
    const envelope = migrateEnvelopeSchema.safeParse({
      events: [
        { id: uid(), at: AT, type: "lesson_open", lessonId: "m1" },
        { id: uid(), at: AT, type: "jenis_dari_versi_lain", apa: "saja" },
        "bukan objek",
        { id: uid(), at: AT, type: "lab", tool: "graph" },
      ],
    });
    expect(envelope.success).toBe(true);
    if (!envelope.success) return;
    const results = envelope.data.events.map((e) => rawEventSchema.safeParse(e).success);
    expect(results).toEqual([true, false, false, true]);
  });

  it("amplop tetap membatasi jumlah event", () => {
    const tooMany = { events: Array.from({ length: 1001 }, () => ({})) };
    expect(migrateEnvelopeSchema.safeParse(tooMany).success).toBe(false);
  });
});
