import "server-only";
import { LESSONS, type ContentBlock, type Lesson } from "@/content/lessons";

export interface Chunk {
  lessonId: string;
  title: string;
  slug: string;
  heading: string;
  text: string;
  tokens: Set<string>;
}

const STOP = new Set(["yang", "dan", "dari", "itu", "ini", "apa", "apakah", "bagaimana", "kenapa", "mengapa", "cara", "untuk", "dengan", "atau", "pada", "adalah", "saya", "aku", "kok", "sih", "dong", "bisa", "tidak", "jadi", "lalu", "kalau", "jika", "sebuah", "oleh", "mana", "ada"]);
const clean = (s: string) => s.replace(/[*_`]/g, "").replace(/[−–—]/g, "-");

export function tokenize(s: string): string[] {
  return (clean(s).toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !STOP.has(w));
}

function blockText(b: ContentBlock): string {
  switch (b.type) {
    case "p":
      return b.text;
    case "math":
      return `${b.caption ?? ""} ${b.lines.join("; ")}`;
    case "list":
      return b.items.join(" ");
    case "callout":
      return `${b.title}. ${b.text}`;
    case "compare":
      return `${b.left.title}: ${b.left.items.join(" ")} ${b.right.title}: ${b.right.items.join(" ")}`;
    case "think":
      return `${b.question} ${b.explain}`;
    case "table":
      return b.caption;
    case "anatomy":
      return `${b.equation}. ${b.parts.map((p) => `${p.label}: ${p.value}`).join(", ")}`;
    default:
      return "";
  }
}

function chunksOf(l: Lesson): Chunk[] {
  const base = { lessonId: l.id, title: l.title, slug: l.slug };
  const out: Chunk[] = [];
  const push = (heading: string, text: string) => {
    const t = clean(text).replace(/\s+/g, " ").trim();
    if (t.length > 20) out.push({ ...base, heading, text: t.slice(0, 900), tokens: new Set(tokenize(`${l.title} ${heading} ${t}`)) });
  };
  push("Tujuan", l.objectives.join(" "));
  for (const s of l.sections) push(s.heading, s.blocks.map(blockText).join(" "));
  push("Istilah penting", l.terms.map((t) => `${t.term}: ${t.meaning}`).join(" "));
  for (const e of l.examples) push(`Contoh: ${e.title}`, `${e.problem} ${e.steps.map((s) => `${s.title}: ${s.detail}`).join(" ")} Jawaban: ${e.answer}`);
  push("Kesimpulan", l.conclusion.join(" "));
  return out;
}

const CORPUS: Chunk[] = LESSONS.flatMap(chunksOf);

/** Pencarian sederhana (tumpang-tindih kata) pada materi MathQuest sendiri; tanpa layanan eksternal. */
export function retrieve(question: string, k = 3, corpus: Chunk[] = CORPUS): Chunk[] {
  const q = new Set(tokenize(question));
  if (q.size === 0) return [];
  return corpus
    .map((c) => {
      let hit = 0;
      for (const t of q) if (c.tokens.has(t)) hit++;
      return { c, score: hit / Math.sqrt(c.tokens.size + 5) };
    })
    .filter((x) => x.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.c);
}
