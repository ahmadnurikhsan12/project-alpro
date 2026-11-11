import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/progress/schema";
import { handleError, jsonError, readJson, requireUserDb, zodMessage } from "@/server/http";
import { saveProfile } from "@/server/progress-repo";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const ctx = await requireUserDb();
  if (ctx instanceof NextResponse) return ctx;
  try {
    const parsed = profileSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    await saveProfile(ctx.db, ctx.user.id, parsed.data.displayName);
    return NextResponse.json({ ok: true, displayName: parsed.data.displayName });
  } catch (err) {
    return handleError(err);
  }
}
