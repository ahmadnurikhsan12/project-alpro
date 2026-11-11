import { NextResponse } from "next/server";
import { rawEventSchema } from "@/lib/progress/schema";
import type { RawEvent } from "@/lib/progress/types";
import { handleError, jsonError, readJson, requireUserDb, zodMessage } from "@/server/http";
import { recordEvent } from "@/server/progress-repo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await requireUserDb();
  if (ctx instanceof NextResponse) return ctx;
  try {
    const parsed = rawEventSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    // Waktu event ditentukan server (bukan klien) untuk aktivitas langsung.
    const event = { ...parsed.data, at: new Date().toISOString() } as RawEvent;
    if (event.type === "evaluation") delete event.result; // server selalu menilai ulang
    const r = await recordEvent(ctx.db, ctx.user.id, event);
    return NextResponse.json({
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
  } catch (err) {
    return handleError(err);
  }
}
