import { NextResponse } from "next/server";
import { EVALUATION_COUNTS, pickEvaluationQuestions } from "@/server/evaluation";

export const dynamic = "force-dynamic";

/** Mengirim soal evaluasi TANPA kunci jawaban dan pembahasan. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = Number(url.searchParams.get("count") ?? 10);
  const count = (EVALUATION_COUNTS as readonly number[]).includes(requested) ? requested : 10;
  return NextResponse.json({ questions: pickEvaluationQuestions(count) }, { headers: { "Cache-Control": "no-store" } });
}
