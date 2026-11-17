import { NextResponse } from "next/server";
import { FORMS, type FormId } from "@/lib/assessment/blueprint";
import { publicAssessmentItems } from "@/server/assessment";

export const dynamic = "force-dynamic";

/** Mengirim butir pretest/posttest TANPA kunci jawaban dan pembahasan. */
export async function GET(req: Request) {
  const form = new URL(req.url).searchParams.get("form");
  if (!form || !(FORMS as readonly string[]).includes(form)) return NextResponse.json({ error: "Formulir tidak valid." }, { status: 400 });
  return NextResponse.json({ form, questions: publicAssessmentItems(form as FormId) }, { headers: { "Cache-Control": "no-store" } });
}
