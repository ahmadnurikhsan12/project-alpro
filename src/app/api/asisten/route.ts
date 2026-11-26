import { NextResponse } from "next/server";
import { z } from "zod";
import { supportLevel, type CheckResponse, type StageInput } from "@/lib/asisten/types";
import { checkQuestion } from "@/server/ask/guard";
import { chat, llmConfig } from "@/server/ask/llm";
import { checkStage, HINTS, leaksAnswer } from "@/server/asisten/check";
import { PROBLEM_BY_ID, PROBLEMS, toPublicProblem } from "@/server/asisten/problems";
import { buildGuidePrompt } from "@/server/asisten/prompt";
import { handleError, jsonError, readJson, zodMessage } from "@/server/http";
import { checkRateLimit, clientKey } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const num = z.string().max(12);
const idx = z.number().int().min(0).max(2);
const inputSchema = z.discriminatedUnion("stage", [
  z.object({ stage: z.literal("pahami"), x: idx, y: idx, ask: idx }),
  z.object({ stage: z.literal("model"), eq: z.tuple([num, num, num, num, num, num]) }),
  z.object({ stage: z.literal("rencana"), variable: z.enum(["x", "y"]), operation: z.enum(["tambah", "kurang"]), reason: z.enum(["sama", "kecil", "urutan"]) }),
  z.object({ stage: z.literal("selesaikan"), x: num, y: num }),
  z.object({ stage: z.literal("tafsirkan"), value: num }),
]);
const bodySchema = z.object({
  problemId: z.string().max(20),
  input: inputSchema,
  /** Banyaknya percobaan salah SEBELUM kiriman ini pada tahap ini. */
  wrong: z.number().int().min(0).max(50),
  /** true bila siswa menekan "Minta bantuan" tanpa mengirim jawaban untuk dinilai. */
  help: z.boolean().optional(),
  /** Kesulitan yang diceritakan siswa (opsional, disaring dari data pribadi). */
  message: z.string().max(200).optional(),
});

export async function GET() {
  return NextResponse.json({ problems: PROBLEMS.map(toPublicProblem), ai: llmConfig() !== null }, { headers: NO_STORE });
}

function describe(input: StageInput): string {
  switch (input.stage) {
    case "pahami":
      return "Siswa memilih arti x, arti y, dan hal yang ditanyakan.";
    case "model":
      return `Siswa menulis: (${input.eq[0] || "?"})x + (${input.eq[1] || "?"})y = ${input.eq[2] || "?"} dan (${input.eq[3] || "?"})x + (${input.eq[4] || "?"})y = ${input.eq[5] || "?"}.`;
    case "rencana":
      return `Siswa memilih mengeliminasi ${input.variable} dengan operasi ${input.operation}; alasan: ${input.reason}.`;
    case "selesaikan":
      return `Siswa mengisi x = ${input.x || "?"} dan y = ${input.y || "?"}.`;
    case "tafsirkan":
      return `Siswa menjawab ${input.value || "?"}.`;
  }
}

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    const { problemId, input, wrong, help, message } = parsed.data;
    const p = PROBLEM_BY_ID[problemId];
    if (!p) return jsonError(404, "Soal tidak dikenal.");

    const verdict = help ? { correct: false, feedback: "Ini bantuan untuk tahap yang sedang kamu kerjakan." } : checkStage(p, input as StageInput);
    if (verdict.correct) return NextResponse.json(verdict satisfies CheckResponse, { headers: NO_STORE });

    // bantuan disesuaikan dengan kesulitan: makin banyak percobaan salah, makin rinci
    const level = supportLevel(help ? Math.max(1, wrong) : wrong + 1);
    const out: CheckResponse = { correct: false, feedback: verdict.feedback, level, hint: HINTS[input.stage][level] };

    let note: string | undefined;
    if (message?.trim()) {
      const checked = checkQuestion(message);
      if (checked.ok) note = checked.text;
      else out.feedback = `${out.feedback} Catatanmu tidak dikirim ke AI karena tampak memuat data pribadi atau terlalu pendek.`;
    }

    const cfg = llmConfig();
    if (cfg && checkRateLimit(`asisten:${clientKey(req)}`, 30, 10 * 60 * 1000).allowed) {
      const result = await chat(cfg, [
        { role: "system", content: buildGuidePrompt(p, input.stage, level) },
        { role: "user", content: `${describe(input as StageInput)} Hasil pemeriksaan: ${verdict.feedback}${note ? ` Kesulitanku: ${note}` : ""}` },
      ]);
      if (result.ok && !leaksAnswer(p, input.stage, result.text)) out.ai = result.text;
    }
    return NextResponse.json(out, { headers: NO_STORE });
  } catch (err) {
    return handleError(err);
  }
}
