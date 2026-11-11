import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { EventValidationError } from "@/lib/progress/grading";
import { getAdminSupabase, getSessionUser, type SessionUser } from "./supabase";
import { RepoError } from "./progress-repo";
import type { SupabaseClient } from "@supabase/supabase-js";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function zodMessage(err: ZodError) {
  const first = err.issues[0];
  return first ? `${first.path.join(".") || "data"}: ${first.message}` : "Data tidak valid.";
}

/** Memastikan pengguna login dan server memiliki akses database. */
export async function requireUserDb(): Promise<{ user: SessionUser; db: SupabaseClient } | NextResponse> {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Silakan masuk dengan email terlebih dahulu.");
  const db = getAdminSupabase();
  if (!db) return jsonError(503, "Penyimpanan online belum dikonfigurasi di server (SUPABASE_SERVICE_ROLE_KEY).");
  return { user, db };
}

/** Penanganan error yang aman: detail teknis hanya ke log server. */
export function handleError(err: unknown) {
  if (err instanceof EventValidationError) return jsonError(422, err.message);
  if (err instanceof RepoError) return jsonError(500, err.message);
  console.error("[api] unexpected:", err);
  return jsonError(500, "Terjadi kesalahan pada server. Coba lagi nanti.");
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 200_000) throw new EventValidationError("Data terlalu besar.");
  try {
    return JSON.parse(text);
  } catch {
    throw new EventValidationError("Format JSON tidak valid.");
  }
}
