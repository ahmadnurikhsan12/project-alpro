import { NextResponse } from "next/server";
import { z } from "zod";
import { FORMS } from "@/lib/assessment/blueprint";
import { gradeAssessment } from "@/server/assessment";
import { handleError, jsonError, readJson, zodMessage } from "@/server/http";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  form: z.enum(FORMS),
  answers: z.record(z.string().max(12), z.string().max(60)),
});

/**
 * Menilai pretest/posttest di server. Tidak ada data peserta yang dikirim atau disimpan di server:
 * hanya jawaban butir. Respons berisi skor dan benar/salah per butir (tanpa kunci atau pembahasan).
 */
export async function POST(req: Request) {
  try {
    const parsed = submitSchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    return NextResponse.json({ result: gradeAssessment(parsed.data.form, parsed.data.answers) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleError(err);
  }
}
