import { NextResponse } from "next/server";
import { z } from "zod";
import { EVALUATION_BY_ID } from "@/server/evaluation-bank";
import { gradeEvaluation } from "@/server/evaluation";
import { handleError, jsonError, readJson, zodMessage } from "@/server/http";
import { recordEvent } from "@/server/progress-repo";
import { getAdminSupabase, getSessionUser } from "@/server/supabase";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  eventId: z.string().uuid(),
  questionIds: z.array(z.string().max(10)).min(5).max(30),
  answers: z.record(z.string().max(10), z.string().max(60)),
  durationSec: z.number().int().min(0).max(60 * 60 * 3),
});

/**
 * Menilai evaluasi di server. Pembahasan baru dikirim SETELAH jawaban dikumpulkan.
 * Jika pengguna login (Email Mode), hasil langsung dicatat ke database.
 */
export async function POST(req: Request) {
  try {
    const parsed = submitSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    const { eventId, questionIds, answers, durationSec } = parsed.data;
    if (new Set(questionIds).size !== questionIds.length || questionIds.some((id) => !EVALUATION_BY_ID[id])) {
      return jsonError(400, "Daftar soal evaluasi tidak valid.");
    }
    const result = gradeEvaluation(questionIds, answers);

    const user = await getSessionUser();
    const db = getAdminSupabase();
    if (user && db) {
      const r = await recordEvent(db, user.id, {
        id: eventId,
        at: new Date().toISOString(),
        type: "evaluation",
        questionIds,
        answers,
        durationSec,
      });
      return NextResponse.json({
        result,
        recorded: true,
        state: r.state,
        outcome: {
          accepted: r.accepted,
          xpGained: r.xpGained,
          levelUp: r.levelAfter > r.levelBefore,
          levelAfter: r.levelAfter,
          newAchievements: r.newAchievements,
          message: r.message,
        },
      });
    }
    return NextResponse.json({ result, recorded: false });
  } catch (err) {
    return handleError(err);
  }
}
