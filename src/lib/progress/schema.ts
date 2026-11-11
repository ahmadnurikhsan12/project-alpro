import { z } from "zod";
import { GAME_IDS } from "@/content/games";
import type { GameId } from "@/content/games";

const id = z.string().uuid();
const at = z.string().datetime({ offset: true });
const difficulty = z.enum(["mudah", "sedang", "sulit"]);
const answers = z
  .record(z.string().max(40), z.string().max(60))
  .refine((r) => Object.keys(r).length <= 40, "Terlalu banyak jawaban");
const qids = z.array(z.string().max(40)).min(1).max(30);
const int = (max: number) => z.number().int().min(0).max(max);

export const rawEventSchema = z.discriminatedUnion("type", [
  z.object({ id, at, type: z.literal("lesson_open"), lessonId: z.string().max(10) }),
  z.object({ id, at, type: z.literal("lesson_quiz"), lessonId: z.string().max(10), answers }),
  z.object({ id, at, type: z.literal("practice"), difficulty, questionIds: qids, answers }),
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
  }),
  z.object({ id, at, type: z.literal("lab"), tool: z.enum(["checker", "elimination", "graph"]) }),
]);

export const migrateSchema = z.object({
  events: z.array(rawEventSchema).max(1000),
  displayName: z.string().trim().max(40).optional(),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Nama tidak boleh kosong").max(40, "Maksimal 40 karakter"),
});
