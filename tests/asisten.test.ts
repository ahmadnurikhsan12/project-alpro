import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKED_STAGES, supportLevel, type StageInput } from "@/lib/asisten/types";
import { checkStage, formatEq, HINTS, leaksAnswer, multiplierCost } from "@/server/asisten/check";
import { finalValue, PROBLEM_BY_ID, PROBLEMS, type Problem } from "@/server/asisten/problems";
import { buildGuidePrompt } from "@/server/asisten/prompt";
import { resetRateLimits } from "@/server/rate-limit";
import { GET, POST } from "@/app/api/asisten/route";

const model = (p: Problem, order: "12" | "21" = "12", k = 1): StageInput => {
  const [u, v] = order === "12" ? [p.eq1, p.eq2] : [p.eq2, p.eq1];
  return { stage: "model", eq: [u.a * k, u.b * k, u.c * k, v.a, v.b, v.c].map(String) as [string, string, string, string, string, string] };
};

describe("bank soal cerita", () => {
  it("setiap penyelesaian memenuhi kedua persamaan dan sistemnya tunggal", () => {
    for (const p of PROBLEMS) {
      for (const e of [p.eq1, p.eq2]) expect(e.a * p.solution.x + e.b * p.solution.y, p.id).toBe(e.c);
      expect(p.eq1.a * p.eq2.b - p.eq2.a * p.eq1.b, p.id).not.toBe(0);
    }
    expect(PROBLEMS.map(finalValue)).toEqual([19, 145, 80]);
  });
  it("angka pada cerita sama dengan model, berurutan dari mudah ke sulit", () => {
    for (const p of PROBLEMS) {
      const story = p.story.replace(/\./g, "");
      for (const e of [p.eq1, p.eq2]) {
        for (const n of [e.a, e.b]) if (n !== 1) expect(story, p.id).toContain(String(n));
        expect(story, p.id).toContain(`${e.c}000`);
      }
    }
    expect(PROBLEMS.map((p) => p.level)).toEqual(["mudah", "sedang", "sulit"]);
  });
});

describe("pemeriksaan tahap (aturan matematika)", () => {
  it("jawaban benar diterima pada semua tahap untuk semua soal", () => {
    for (const p of PROBLEMS) {
      expect(checkStage(p, { stage: "pahami", ...p.correct }).correct).toBe(true);
      expect(checkStage(p, model(p)).correct).toBe(true);
      expect(checkStage(p, model(p, "21")).correct, "urutan terbalik").toBe(true);
      expect(checkStage(p, model(p, "12", 2)).correct, "persamaan setara").toBe(true);
      for (const v of ["x", "y"] as const) {
        const [m, n] = v === "x" ? [p.eq1.a, p.eq2.a] : [p.eq1.b, p.eq2.b];
        const operation = Math.sign(m) === Math.sign(n) ? "kurang" : "tambah";
        const cheaper = multiplierCost(p, v) <= multiplierCost(p, v === "x" ? "y" : "x");
        expect(checkStage(p, { stage: "rencana", variable: v, operation, reason: "kecil" }).correct, `${p.id} ${v}`).toBe(cheaper);
      }
      expect(checkStage(p, { stage: "selesaikan", x: String(p.solution.x), y: String(p.solution.y) }).correct).toBe(true);
      expect(checkStage(p, { stage: "tafsirkan", value: String(finalValue(p)) }).correct).toBe(true);
    }
  });
  it("diagnosis menunjuk jenis kekeliruan", () => {
    const p = PROBLEM_BY_ID.kantin;
    expect(checkStage(p, { stage: "model", eq: ["1", "2", "11", "1", "1", "8"] }).feedback).toContain("tertukar");
    expect(checkStage(p, { stage: "model", eq: ["2", "1", "11", "2", "1", "11"] }).feedback).toContain("hal yang sama");
    expect(checkStage(p, { stage: "model", eq: ["2", "1", "11", "3", "1", "8"] }).feedback).toContain("Satu persamaan sudah tepat");
    expect(checkStage(p, { stage: "model", eq: ["0", "0", "0", "0", "0", "0"] }).correct).toBe(false);
    expect(checkStage(p, { stage: "selesaikan", x: "5", y: "3" }).feedback).toContain("tertukar");
    expect(checkStage(p, { stage: "selesaikan", x: "2", y: "7" }).feedback).toContain("persamaan (1) tetapi belum persamaan (2)");
    expect(checkStage(p, { stage: "selesaikan", x: "abc", y: "7" }).correct).toBe(false);
    expect(checkStage(p, { stage: "tafsirkan", value: "19000" }).feedback).toContain("satuan");
    expect(checkStage(p, { stage: "tafsirkan", value: "3" }).feedback).toContain("salah satu variabel");
    expect(checkStage(p, { stage: "rencana", variable: "x", operation: "kurang", reason: "urutan" }).correct).toBe(false);
    expect(checkStage(p, { stage: "rencana", variable: "x", operation: "kurang", reason: "sama" }).correct).toBe(false);
    expect(checkStage(p, { stage: "rencana", variable: "y", operation: "tambah", reason: "sama" }).correct).toBe(false);
  });
  it("umpan balik dan petunjuk tetap TIDAK membocorkan jawaban", () => {
    const wrong: StageInput[] = [
      { stage: "pahami", x: 2, y: 2, ask: 0 },
      { stage: "model", eq: ["9", "9", "9", "9", "9", "9"] },
      { stage: "rencana", variable: "x", operation: "tambah", reason: "urutan" },
      { stage: "selesaikan", x: "99", y: "99" },
      { stage: "tafsirkan", value: "999" },
    ];
    for (const p of PROBLEMS) {
      for (const w of wrong) expect(leaksAnswer(p, w.stage, checkStage(p, w).feedback), `${p.id} ${w.stage} umpan balik`).toBe(false);
      for (const s of CHECKED_STAGES) for (const l of [1, 2, 3] as const) expect(leaksAnswer(p, s, HINTS[s][l]), `${p.id} ${s} L${l}`).toBe(false);
    }
  });
});

describe("pengaman bimbingan AI", () => {
  const p = PROBLEM_BY_ID.wisata;
  it("menolak teks yang menyebut nilai variabel, jawaban akhir, atau model lengkap", () => {
    for (const t of ["Jadi x = 25.", "Nilai y adalah 15", "x = Rp25.000", "Totalnya 145 ribu", "Bayarnya Rp145.000"]) expect(leaksAnswer(p, "selesaikan", t), t).toBe(true);
    expect(leaksAnswer(p, "model", `Tulis ${formatEq(p.eq1)} lalu lanjut`)).toBe(true);
  });
  it("mengizinkan pertanyaan pemandu", () => {
    for (const t of ["Apa yang diwakili x pada cerita ini?", "Koefisien mana yang bisa kamu samakan lebih dulu?", "Coba contoh 4x + 3y = 30, apa artinya?"]) expect(leaksAnswer(p, "model", t), t).toBe(false);
  });
});

describe("beban kognitif dan peran AI", () => {
  it("tingkat bantuan naik mengikuti kesulitan", () => {
    expect([0, 1, 2, 3, 9].map(supportLevel)).toEqual([1, 1, 2, 3, 3]);
  });
  it("prompt memuat tahap RMT, tiga jenis beban kognitif, tingkat bantuan, dan larangan jawaban", () => {
    const s = buildGuidePrompt(PROBLEM_BY_ID.kantin, "model", 1);
    for (const w of ["pembimbing proses berpikir", "transendensi", "intrinsik", "ekstrinsik", "germane", "TINGKAT BANTUAN 1", "DILARANG menyebut nilai x"]) expect(s).toContain(w);
    expect(buildGuidePrompt(PROBLEM_BY_ID.kantin, "model", 3)).toContain("ANGKA YANG BERBEDA");
    expect(s).not.toContain(formatEq(PROBLEM_BY_ID.kantin.eq1)); // model tidak diberi jawaban
  });
});

describe("rute /api/asisten", () => {
  const post = (body: unknown) => POST(new Request("http://x/api/asisten", { method: "POST", body: JSON.stringify(body) }));
  const salah = { stage: "selesaikan", x: "1", y: "1" };
  let fetchMock: ReturnType<typeof vi.fn>;
  const reply = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  beforeEach(() => {
    resetRateLimits();
    process.env.LLM_API_KEY = "rahasia-uji";
    fetchMock = vi.fn(async () => reply("Persamaan mana yang belum terpenuhi?"));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LLM_API_KEY;
  });

  it("daftar soal tidak memuat jawaban, persamaan, atau kunci", async () => {
    const text = await (await GET()).text();
    for (const k of ['"solution"', '"eq1"', '"eq2"', '"correct"', '"ask":{', '"names"', "rahasia-uji"]) expect(text).not.toContain(k);
    expect(JSON.parse(text).problems).toHaveLength(3);
  });
  it("jawaban benar tidak memanggil AI", async () => {
    const r = await (await post({ problemId: "kantin", input: { stage: "selesaikan", x: "3", y: "5" }, wrong: 0 })).json();
    expect(r.correct).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("jawaban salah: bantuan bertingkat + bimbingan AI sesuai tingkat", async () => {
    for (const [wrong, level] of [[0, 1], [1, 2], [2, 3], [5, 3]]) {
      fetchMock.mockClear();
      const r = await (await post({ problemId: "kantin", input: salah, wrong })).json();
      expect(r).toMatchObject({ correct: false, level, ai: "Persamaan mana yang belum terpenuhi?" });
      expect(r.hint).toBe(HINTS.selesaikan[level as 1]);
      const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(sent.messages[0].content).toContain(`TINGKAT BANTUAN ${level}`);
    }
  });
  it("jawaban AI yang membocorkan dibuang; petunjuk aturan tetap ada", async () => {
    fetchMock.mockResolvedValueOnce(reply("Gampang, x = 3 dan y = 5."));
    const r = await (await post({ problemId: "kantin", input: salah, wrong: 0 })).json();
    expect(r.ai).toBeUndefined();
    expect(r.hint).toBeTruthy();
  });
  it("tanpa AI atau AI galat: tetap membimbing", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    expect((await (await post({ problemId: "kantin", input: salah, wrong: 0 })).json()).hint).toBeTruthy();
    delete process.env.LLM_API_KEY;
    fetchMock.mockClear();
    const r = await (await post({ problemId: "kantin", input: salah, wrong: 0, help: true })).json();
    expect(r.hint).toBeTruthy();
    expect(r.ai).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("minta bantuan tidak menilai jawaban; data pribadi tidak dikirim ke AI", async () => {
    const r = await (await post({ problemId: "kantin", input: { stage: "selesaikan", x: "3", y: "5" }, wrong: 0, help: true, message: "nama saya Budi bingung" })).json();
    expect(r.correct).toBe(false);
    expect(r.feedback).toContain("tidak dikirim ke AI");
    expect((fetchMock.mock.calls[0][1] as RequestInit).body as string).not.toContain("Budi");
  });
  it("menolak masukan tidak valid", async () => {
    expect((await post({ problemId: "tidak-ada", input: salah, wrong: 0 })).status).toBe(404);
    expect((await post({ problemId: "kantin", input: { stage: "refleksi" }, wrong: 0 })).status).toBe(400);
    expect((await post({ problemId: "kantin", input: salah, wrong: -1 })).status).toBe(400);
  });
});
