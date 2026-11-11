/**
 * Membuat supabase/seed.sql dari konten aplikasi (materi, soal, game, pencapaian).
 * Jalankan: npm run seed:generate
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GAMES } from "../src/content/games";
import { LESSONS } from "../src/content/lessons";
import { PRACTICE_QUESTIONS } from "../src/content/practice";
import { ACHIEVEMENTS } from "../src/lib/progress/gamification";
import type { Question } from "../src/lib/questions/types";
import { EVALUATION_QUESTIONS } from "../src/server/evaluation-bank";

const q = (v: string | number | null) => (v === null ? "null" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const lines: string[] = [
  "-- Dibuat otomatis oleh scripts/generate-seed.ts — jangan diedit manual.",
  "begin;",
  "",
  "-- Materi",
];

for (const l of LESSONS) {
  lines.push(
    `insert into public.lessons (id, slug, number, title, summary, difficulty, minutes) values (${[l.id, l.slug, l.number, l.title, l.summary, l.difficulty, l.minutes].map(q).join(", ")}) on conflict (id) do update set slug = excluded.slug, number = excluded.number, title = excluded.title, summary = excluded.summary, difficulty = excluded.difficulty, minutes = excluded.minutes;`,
  );
}

lines.push("", "-- Kuis");
const quizzes: [string, string, string | null, string][] = [
  ...LESSONS.map((l) => [`lesson:${l.id}`, "lesson_quiz", l.id, `Mini Quiz ${l.title}`] as [string, string, string, string]),
  ["practice:mudah", "practice", null, "Latihan Mudah"],
  ["practice:sedang", "practice", null, "Latihan Sedang"],
  ["practice:sulit", "practice", null, "Latihan Sulit"],
  ["evaluation", "evaluation", null, "Evaluasi Akhir SPLDV"],
];
for (const [id, kind, lessonId, title] of quizzes) {
  lines.push(`insert into public.quizzes (id, kind, lesson_id, title) values (${[id, kind, lessonId, title].map(q).join(", ")}) on conflict (id) do update set title = excluded.title;`);
}

lines.push("", "-- Soal (termasuk kunci; tabel ini tertutup oleh RLS)");
const addQuestions = (quizId: (qq: Question) => string, qs: Question[]) => {
  for (const x of qs) {
    const payload = { options: x.options ?? null, context: x.context ?? null, pairLabels: x.pairLabels ?? null, hints: x.hints ?? null };
    lines.push(
      `insert into public.quiz_questions (id, quiz_id, topic, difficulty, type, format, prompt, payload, answer, explanation) values (${[x.id, quizId(x), x.topic, x.difficulty, x.type, x.format, x.prompt].map(q).join(", ")}, ${j(payload)}, ${q(x.answer)}, ${j(x.explanation)}) on conflict (id) do update set prompt = excluded.prompt, payload = excluded.payload, answer = excluded.answer, explanation = excluded.explanation;`,
    );
  }
};
addQuestions((x) => `lesson:${x.topic}`, LESSONS.flatMap((l) => l.quiz));
addQuestions((x) => `practice:${x.difficulty}`, PRACTICE_QUESTIONS);
addQuestions(() => "evaluation", EVALUATION_QUESTIONS);

lines.push("", "-- Game");
for (const g of GAMES) {
  lines.push(`insert into public.games (id, title, max_score, target_score) values (${[g.id, g.title, g.maxScore, g.targetScore].map(q).join(", ")}) on conflict (id) do update set title = excluded.title, max_score = excluded.max_score, target_score = excluded.target_score;`);
}

lines.push("", "-- Pencapaian");
for (const a of ACHIEVEMENTS) {
  lines.push(`insert into public.achievements (id, title, description, xp) values (${[a.id, a.title, a.description, a.xp].map(q).join(", ")}) on conflict (id) do update set title = excluded.title, description = excluded.description, xp = excluded.xp;`);
}

lines.push("", "commit;", "");
const out = resolve(__dirname, "../supabase/seed.sql");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`seed.sql ditulis: ${lines.length} baris`);
