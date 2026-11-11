import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabase } from "@/server/supabase";

export const dynamic = "force-dynamic";

/** Tujuan tautan magic link dari email. Mendukung alur PKCE (code) dan token_hash. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/masuk?error=not-configured", url.origin));

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }
  return NextResponse.redirect(new URL(ok ? `${next}?login=ok` : "/masuk?error=link", url.origin));
}
