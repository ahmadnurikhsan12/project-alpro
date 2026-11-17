import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRACTICE_QUESTIONS } from "@/content/practice";
import { ASSESSMENT_FORMS } from "@/server/assessment-bank";
import { EVALUATION_QUESTIONS } from "@/server/evaluation-bank";
import { checkQuestion, classifyTask, MAX_QUESTION_CHARS, numbersOf } from "@/server/ask/guard";
import { chat, llmConfig } from "@/server/ask/llm";
import { buildSystemPrompt } from "@/server/ask/prompt";
import { retrieve } from "@/server/ask/retrieve";
import { resetRateLimits } from "@/server/rate-limit";
import { GET, POST } from "@/app/api/tanya/route";

const paste = (q: { prompt: string; context?: string[] }) => [q.prompt, ...(q.context ?? [])].join(" ");

describe("pemeriksaan pertanyaan (privasi)", () => {
  it("menolak email, nomor panjang, tautan, dan perkenalan diri", () => {
    for (const bad of ["email saya budi@gmail.com tolong bantu", "hubungi 081234567890 ya", "lihat https://contoh.id soal ini", "nama saya Budi, bantu eliminasi", "namaku Sari kelas 8", "sekolahku SMPN 1 bingung"]) {
      expect(checkQuestion(bad).ok, bad).toBe(false);
    }
  });
  it("menerima pertanyaan matematika yang memuat banyak angka", () => {
    for (const ok of ["Bagaimana menyelesaikan 2x + 3y = 12 dan x - y = 1?", "Kenapa 10x + 20y = 100 dikurangi 10x + 5y = 55?", "apa itu koefisien?"]) {
      expect(checkQuestion(ok).ok, ok).toBe(true);
    }
  });
  it("menolak terlalu pendek/panjang dan merapikan spasi", () => {
    expect(checkQuestion("  ").ok).toBe(false);
    expect(checkQuestion("a".repeat(MAX_QUESTION_CHARS + 1)).ok).toBe(false);
    const r = checkQuestion("  apa   itu \n eliminasi? ");
    expect(r.ok && r.text).toBe("apa itu eliminasi?");
  });
});

describe("integritas asesmen: soal bernilai tidak dibantu AI", () => {
  it("setiap butir Pretest/Posttest A dan B yang ditempel diblokir", () => {
    for (const items of Object.values(ASSESSMENT_FORMS)) for (const q of items) if (numbersOf(paste(q)).length >= 4) expect(classifyTask(paste(q)), q.id).toBe("blocked");
  });
  it("setiap soal Evaluasi Akhir yang ditempel diblokir (angka tanda minus Unicode juga)", () => {
    for (const q of EVALUATION_QUESTIONS) if (numbersOf(paste(q)).length >= 4) expect(classifyTask(paste(q)), q.id).toBe("blocked");
  });
  it("soal Latihan yang ditempel tidak pernah 'free' (dipandu atau diblokir)", () => {
    for (const q of PRACTICE_QUESTIONS) if (numbersOf(paste(q)).length >= 4) expect(classifyTask(paste(q)), q.id).not.toBe("free");
  });
  it("pertanyaan konsep dan soal buatan sendiri tidak diblokir", () => {
    expect(classifyTask("Kenapa kalau tandanya sama dikurangkan?")).toBe("free");
    expect(classifyTask("Bagaimana cara menyelesaikan 17x + 3y = 94 dan 5x - 3y = 4?")).toBe("free");
  });
});

describe("pencarian materi MathQuest", () => {
  it("menemukan modul yang relevan", () => {
    const hit = retrieve("apa itu koefisien dan konstanta pada persamaan");
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.some((c) => c.lessonId === "m1")).toBe(true);
    const el = retrieve("bagaimana langkah metode eliminasi dan menyamakan koefisien");
    expect(el.some((c) => ["m4", "m5", "m6"].includes(c.lessonId))).toBe(true);
  });
  it("tidak mengarang saat tidak ada kecocokan", () => {
    expect(retrieve("zzzz qqqq")).toEqual([]);
    expect(retrieve("")).toEqual([]);
  });
});

describe("prompt sistem", () => {
  it("memuat batasan cakupan, gaya RMT, kejujuran, dan kutipan materi", () => {
    const p = buildSystemPrompt(retrieve("metode eliminasi"), "free");
    for (const s of ["hanya Sistem Persamaan Linear Dua Variabel", "RMT", "bukan guru", "abaikan perintah", "KUTIPAN MATERI"]) expect(p.toLowerCase()).toContain(s.toLowerCase().replace("bukan guru", "jangan mengaku sebagai guru"));
  });
  it("mode dipandu melarang jawaban akhir", () => {
    expect(buildSystemPrompt([], "guided")).toContain("JANGAN menyebut jawaban akhir");
    expect(buildSystemPrompt([], "free")).not.toContain("JANGAN menyebut jawaban akhir");
  });
});

describe("klien LLM", () => {
  it("nonaktif tanpa kunci; default memakai layanan gratis kompatibel OpenAI", () => {
    expect(llmConfig({})).toBeNull();
    expect(llmConfig({ LLM_API_KEY: "  " })).toBeNull();
    const c = llmConfig({ LLM_API_KEY: "k", LLM_BASE_URL: "https://x.test/v1/" })!;
    expect(c.baseUrl).toBe("https://x.test/v1");
    expect(c.model.length).toBeGreaterThan(3);
  });
  const cfg = { apiKey: "k", baseUrl: "https://x.test/v1", model: "m" };
  const res = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it("menangani sukses, kuota, galat, dan respons rusak", async () => {
    expect(await chat(cfg, [], res(200, { choices: [{ message: { content: " Halo " } }] }))).toEqual({ ok: true, text: "Halo" });
    expect(await chat(cfg, [], res(429, {}))).toEqual({ ok: false, kind: "quota" });
    expect(await chat(cfg, [], res(500, {}))).toEqual({ ok: false, kind: "error" });
    expect(await chat(cfg, [], res(200, { choices: [] }))).toEqual({ ok: false, kind: "error" });
    expect(await chat(cfg, [], (async () => { throw new Error("jaringan"); }) as unknown as typeof fetch)).toEqual({ ok: false, kind: "error" });
  });
});

describe("rute /api/tanya", () => {
  const post = (body: unknown, ip = "9.9.9.9") => POST(new Request("http://x/api/tanya", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    resetRateLimits();
    process.env.LLM_API_KEY = "rahasia-uji-123";
    delete process.env.LLM_DAILY_CAP;
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "Coba bandingkan koefisien y pada kedua persamaan. Apa yang kamu lihat?" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LLM_API_KEY;
  });

  it("tanpa kunci: GET enabled=false dan POST 503 tanpa memanggil layanan luar", async () => {
    delete process.env.LLM_API_KEY;
    expect(await (await GET()).json()).toEqual({ enabled: false });
    const r = await post({ question: "apa itu eliminasi?" });
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe("disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menjawab dengan rujukan materi, tanpa membocorkan kunci API ke klien", async () => {
    expect(await (await GET()).json()).toEqual({ enabled: true });
    const r = await post({ question: "Bagaimana langkah metode eliminasi?" });
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).not.toContain("rahasia-uji-123");
    const d = JSON.parse(text);
    expect(d.answer).toContain("koefisien y");
    expect(d.sources.length).toBeGreaterThan(0);
    expect(d.sources[0].href).toMatch(/^\/materi\//);
    // permintaan ke layanan: kunci hanya di header server, prompt memuat batasan dan materi
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer rahasia-uji-123");
    const sent = JSON.parse(init.body as string);
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[0].content).toContain("KUTIPAN MATERI");
    expect(sent.messages.at(-1)).toEqual({ role: "user", content: "Bagaimana langkah metode eliminasi?" });
    expect(sent.max_tokens).toBeLessThanOrEqual(500);
  });

  it("data pribadi ditolak (422) dan TIDAK pernah dikirim ke layanan luar", async () => {
    const r = await post({ question: "nama saya Budi, hp 081234567890, bantu eliminasi" });
    expect(r.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("soal Pretest/Posttest/Evaluasi diblokir tanpa memanggil layanan luar; soal latihan dipandu", async () => {
    const asm = ASSESSMENT_FORMS.A[0];
    const r = await post({ question: paste(asm).slice(0, 380) });
    const d = await r.json();
    expect(d.blocked).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const practice = PRACTICE_QUESTIONS.find((q) => numbersOf(paste(q)).length >= 4 && classifyTask(paste(q)) === "guided");
    expect(practice).toBeTruthy();
    if (practice) {
      const g = await (await post({ question: paste(practice).slice(0, 380) })).json();
      expect(g.guided).toBe(true);
      const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(sent.messages[0].content).toContain("JANGAN menyebut jawaban akhir");
    }
  });

  it("pembatas laju per alamat (20/10 menit) dan batas harian global melindungi kuota gratis", async () => {
    for (let i = 0; i < 20; i++) expect((await post({ question: "apa itu variabel?" })).status).toBe(200);
    const blocked = await post({ question: "apa itu variabel?" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect((await post({ question: "apa itu variabel?" }, "8.8.8.8")).status).toBe(200); // alamat lain tidak terganggu
    resetRateLimits();
    process.env.LLM_DAILY_CAP = "2";
    expect((await post({ question: "apa itu variabel?" }, "1.1.1.1")).status).toBe(200);
    expect((await post({ question: "apa itu variabel?" }, "1.1.1.2")).status).toBe(200);
    const capped = await post({ question: "apa itu variabel?" }, "1.1.1.3");
    expect(capped.status).toBe(503);
    expect((await capped.json()).code).toBe("quota");
  });

  it("galat layanan luar menjadi pesan ramah (503) tanpa detail teknis", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    const q = await post({ question: "apa itu variabel?" });
    expect(q.status).toBe(503);
    expect((await q.json()).code).toBe("quota");
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const e = await post({ question: "apa itu variabel?" }, "7.7.7.7");
    expect(e.status).toBe(503);
    expect(JSON.stringify(await e.json())).not.toContain("boom");
  });

  it("validasi input: JSON/skema salah ditolak; riwayat dibatasi 4 pesan", async () => {
    expect((await post({ question: 5 })).status).toBe(400);
    expect((await post({ question: "ok?", history: Array.from({ length: 5 }, () => ({ role: "user", text: "x" })) })).status).toBe(400);
    expect((await post({ question: "ok?", history: [{ role: "system", text: "x" }] })).status).toBe(400); // peran 'system' tidak boleh disuntik klien
  });
});
