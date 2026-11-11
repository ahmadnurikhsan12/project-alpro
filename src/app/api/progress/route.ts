import { NextResponse } from "next/server";
import { handleError, requireUserDb } from "@/server/http";
import { loadProfile, loadState } from "@/server/progress-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireUserDb();
  if (ctx instanceof NextResponse) return ctx;
  try {
    const [state, profile] = await Promise.all([loadState(ctx.db, ctx.user.id), loadProfile(ctx.db, ctx.user.id)]);
    return NextResponse.json(
      { state, profile: { displayName: profile.displayName, email: ctx.user.email } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return handleError(err);
  }
}
