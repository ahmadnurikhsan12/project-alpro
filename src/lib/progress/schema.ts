import { z } from "zod";
import { GAME_IDS } from "@/content/games";
import type { GameId } from "@/content/games";
import {
  MAX_REFLECTION_RESPONSES,
  REFLECTION_CONTEXTS,
  REFLECTION_PROMPTS,
  validateReflection,
  type ReflectionPrompt,
} from "@/lib/tutor/reflection-prompts";
import { ATTEMPT_RULES } from "./gamification";

const id = z.string().uuid();
const at = z.string().datetime({ offset: true });
const difficulty = z.enum(["mudah", "sedang", "sulit"]);
const answers = z
  .record(z.string().max(40), z.string().max(60))
  .refine((r) => Object.keys(r).length <= 40, "Terlalu banyak jawaban");
const qids = z.array(z.string().max(40)).min(1).max(30);
const int = (max: number) => z.number().int().min(0).max(max);

/** Semua percobaan pada satu soal (maks. 5 jawaban) + banyak petunjuk bertingkat (0–4). */
const responses = z
  .record(
    z.string().max(40),
    z.object({
      attempts: z.array(z.string().max(60)).max(5),
      hints: int(ATTEMPT_RULES.maxHints).optional(),
    }),
  )
  .refine((r) => Object.keys(r).length <= 40, "Terlalu banyak soal");

/** Metrik Learning Activity: angka ringkas dengan nama kunci pendek (tanpa teks bebas). */
const metrics = z
  .record(z.string().regex(/^[a-zA-Z0-9_]{1,30}$/), int(1000))
  .refine((r) => Object.keys(r).length <= 12, "Terlalu banyak metrik");

/**
 * Skema validasi event dari klien. `registry` menentukan prompt refleksi yang sah;
 * bawaannya REFLECTION_PROMPTS. Field baru bersifat opsional sehingga event lama tetap sah.
 */
export function createRawEventSchema(registry: readonly ReflectionPrompt[] = REFLECTION_PROMPTS) {
  return z
    .discriminatedUnion("type", [
      z.object({ id, at, type: z.literal("lesson_open"), lessonId: z.string().max(10) }),
      z.object({ id, at, type: z.literal("lesson_quiz"), lessonId: z.string().max(10), answers, responses: responses.optional() }),
      z.object({ id, at, type: z.literal("practice"), difficulty, questionIds: qids, answers, responses: responses.optional() }),
      z.object({
        id,
        at,
        type: z.literal("evaluation"),
        questionIds: qids,
        answers,
        durationSec: int(60 * 60 * 3),
        result: z.object({ correct: int(30), total: int(30), score: int(100) }).optional(),
      }),
      z.object({
        id,
        at,
        type: z.literal("game"),
        gameId: z.enum(GAME_IDS as [GameId, ...GameId[]]),
        difficulty,
        score: int(10000),
        correct: int(1000),
        total: int(1000),
        durationSec: int(60 * 60 * 3),
        la: metrics.optional(),
      }),
      z.object({ id, at, type: z.literal("lab"), tool: z.enum(["checker", "elimination", "graph"]), la: metrics.optional() }),
      z.object({
        id,
        at,
        type: z.literal("reflection"),
        context: z.enum(REFLECTION_CONTEXTS),
        refId: z.string().max(40),
        responses: z
          .record(z.string().max(40), z.union([z.string().max(40), z.number().int().min(0).max(100)]))
          .refine((r) => Object.keys(r).length <= MAX_REFLECTION_RESPONSES, "Terlalu banyak jawaban refleksi"),
        skipped: z.boolean().optional(),
      }),
    ])
    .superRefine((ev, ctx) => {
      if (ev.type !== "reflection") return;
      const problem = validateReflection(registry, ev);
      if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem, path: ["responses"] });
    });
}

export const rawEventSchema = createRawEventSchema();

/**
 * Amplop permintaan migrasi. Setiap event divalidasi SENDIRI-SENDIRI oleh route:
 * satu event yang tidak dikenal (mis. dari versi aplikasi lain) tidak boleh
 * menggagalkan seluruh batch.
 */
export const migrateEnvelopeSchema = z.object({
  events: z.array(z.unknown()).max(1000),
  displayName: z.string().trim().max(40).optional(),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Nama tidak boleh kosong").max(40, "Maksimal 40 karakter"),
});
