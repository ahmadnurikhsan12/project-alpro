import { NextResponse } from "next/server";
import { z } from "zod";
import { BLOCKED_REPLY, checkQuestion, classifyTask } from "@/server/ask/guard";
import { chat, llmConfig } from "@/server/ask/llm";
import { buildSystemPrompt } from "@/server/ask/prompt";
import { retrieve } from "@/server/ask/retrieve";
import { handleError, jsonError, readJson, zodMessage } from "@/server/http";
import { checkRateLimit, clientKey } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const IP_LIMIT = 20; // per 10 menit per alamat: cukup untuk belajar, menahan penyalahgunaan
const IP_WINDOW = 10 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const dailyCap = () => Number(process.env.LLM_DAILY_CAP) || 800; // melindungi kuota gratis (per instance)

const bodySchema = z.object({
  question: z.string().max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1200) })).max(4).optional(),
});

/** Status fitur (tanpa membuka rahasia apa pun). */
export async function GET() {
  return NextResponse.json({ enabled: llmConfig() !== null }, { headers: NO_STORE });
}

export async function POST(req: Request) {
  try {
    const cfg = llmConfig();
    if (!cfg) return NextResponse.json({ error: "Fitur Tanya Tutor AI belum diaktifkan di server ini.", code: "disabled" }, { status: 503, headers: NO_STORE });

    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));

    const rl = checkRateLimit(`tanya:${clientKey(req)}`, IP_LIMIT, IP_WINDOW);
    if (!rl.allowed) {
      const res = NextResponse.json({ error: "Kamu sudah banyak bertanya. Istirahat sebentar, lalu coba lagi beberapa menit lagi.", code: "rate" }, { status: 429, headers: NO_STORE });
      res.headers.set("Retry-After", String(rl.retryAfterSec));
      return res;
    }

    const check = checkQuestion(parsed.data.question);
    if (!check.ok) return NextResponse.json({ error: check.message, code: "invalid" }, { status: 422, headers: NO_STORE });

    const task = classifyTask(check.text);
    if (task === "blocked") return NextResponse.json({ answer: BLOCKED_REPLY, sources: [], blocked: true }, { headers: NO_STORE });

    if (!checkRateLimit("tanya:global", dailyCap(), DAY).allowed) {
      return NextResponse.json({ error: "Kuota tutor AI hari ini habis. Coba lagi besok, atau pelajari Materi dan gunakan petunjuk di Latihan.", code: "quota" }, { status: 503, headers: NO_STORE });
    }

    const chunks = retrieve(check.text);
    const history = (parsed.data.history ?? []).map((m) => ({ role: m.role, content: m.text.replace(/\s+/g, " ").trim() }));
    const result = await chat(cfg, [
      { role: "system", content: buildSystemPrompt(chunks, task === "guided" ? "guided" : "free") },
      ...history,
      { role: "user", content: check.text },
    ]);
    if (!result.ok) {
      const quota = result.kind === "quota";
      return NextResponse.json(
        { error: quota ? "Layanan AI gratis sedang penuh. Coba lagi beberapa saat lagi." : "Tutor AI sedang tidak dapat dihubungi. Coba lagi nanti.", code: quota ? "quota" : "upstream" },
        { status: 503, headers: NO_STORE },
      );
    }
    const seen = new Set<string>();
    const sources = chunks.filter((c) => !seen.has(c.slug) && seen.add(c.slug)).map((c) => ({ title: c.title, href: `/materi/${c.slug}` }));
    return NextResponse.json({ answer: result.text, sources, guided: task === "guided" }, { headers: NO_STORE });
  } catch (err) {
    return handleError(err);
  }
}
