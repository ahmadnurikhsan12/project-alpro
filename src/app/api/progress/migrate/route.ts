import { NextResponse } from "next/server";
import { migrateEnvelopeSchema, rawEventSchema } from "@/lib/progress/schema";
import type { RawEvent } from "@/lib/progress/types";
import { handleError, jsonError, readJson, requireUserDb, zodMessage } from "@/server/http";
import { loadProfile, migrateEvents, saveProfile } from "@/server/progress-repo";

export const dynamic = "force-dynamic";

/** Menggabungkan progres Guest Mode (event lokal) ke akun email. */
export async function POST(req: Request) {
  const ctx = await requireUserDb();
  if (ctx instanceof NextResponse) return ctx;
  try {
    const parsed = migrateEnvelopeSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    // Validasi per event: satu event tak dikenal tidak menggagalkan seluruh batch.
    const events: RawEvent[] = [];
    let invalid = 0;
    for (const raw of parsed.data.events) {
      const ev = rawEventSchema.safeParse(raw);
      if (!ev.success) {
        invalid += 1;
        continue;
      }
      const copy = { ...ev.data } as RawEvent;
      if (copy.type === "evaluation") delete copy.result; // dinilai ulang di server
      events.push(copy);
    }
    const result = await migrateEvents(ctx.db, ctx.user.id, events);

    let profile = await loadProfile(ctx.db, ctx.user.id);
    if (!profile.displayName && parsed.data.displayName) {
      await saveProfile(ctx.db, ctx.user.id, parsed.data.displayName);
      profile = { displayName: parsed.data.displayName };
    }
    return NextResponse.json({
      state: result.state,
      profile: { displayName: profile.displayName, email: ctx.user.email },
      summary: {
        imported: result.imported,
        skipped: result.skipped,
        rejected: result.rejected + invalid,
        xpGained: result.xpGained,
        newAchievements: result.newAchievements,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
