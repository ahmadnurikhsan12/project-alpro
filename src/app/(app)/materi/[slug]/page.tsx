import { ArrowLeft, ArrowRight, BookMarked, CheckCircle2, Clock, Flag, Lightbulb, ListChecks, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonIllustration } from "@/components/illustrations";
import { Badge, ButtonLink, Card, DifficultyBadge, MathBlock, RichText } from "@/components/ui";
import { LESSON_BY_SLUG, LESSONS, type ContentBlock } from "@/content/lessons";
import { cn } from "@/lib/utils";
import { LessonTracker, MiniQuiz } from "./lesson-client";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = LESSON_BY_SLUG[slug];
  return l ? { title: `Modul ${l.number}: ${l.title}`, description: l.summary } : {};
}

const ANATOMY_COLOR = {
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  grape: "bg-grape-50 text-grape-700 ring-grape-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="my-3 leading-relaxed text-ink-soft">
          <RichText text={block.text} />
        </p>
      );
    case "math":
      return <MathBlock lines={block.lines} caption={block.caption} />;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={cn("my-3 space-y-2 pl-5 text-ink-soft", block.ordered ? "list-decimal" : "list-disc")}>
          {block.items.map((it, i) => (
            <li key={i} className="pl-1 leading-relaxed">
              <RichText text={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case "callout": {
      const tone = {
        info: { cls: "border-brand-200 bg-brand-50 text-brand-900", Icon: BookMarked },
        tip: { cls: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: Lightbulb },
        warn: { cls: "border-amber-200 bg-amber-50 text-amber-900", Icon: TriangleAlert },
      }[block.tone];
      return (
        <div className={cn("my-4 flex gap-3 rounded-xl border p-4", tone.cls)}>
          <tone.Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">{block.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed">{block.text}</p>
          </div>
        </div>
      );
    }
    case "compare":
      return (
        <div className="my-4 grid gap-3 sm:grid-cols-2">
          {[block.left, block.right].map((side, i) => (
            <div key={i} className={cn("rounded-xl border p-4", i === 0 ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60")}>
              <p className={cn("mb-2 font-bold", i === 0 ? "text-emerald-800" : "text-rose-800")}>{side.title}</p>
              <ul className="space-y-1.5 text-sm text-ink-soft">
                {side.items.map((it) => (
                  <li key={it} className="font-mono text-[0.85rem]">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "anatomy":
      return (
        <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-center font-mono text-2xl font-bold tracking-wide text-ink">{block.equation}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {block.parts.map((p) => (
              <div key={p.label} className={cn("rounded-lg px-3 py-2 ring-1 ring-inset", ANATOMY_COLOR[p.color])}>
                <dt className="text-sm font-bold">{p.label}</dt>
                <dd className="text-sm">{p.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
  }
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = LESSON_BY_SLUG[slug];
  if (!lesson) notFound();
  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];

  return (
    <article className="mx-auto max-w-3xl">
      <LessonTracker lessonId={lesson.id} />
      <Link href="/materi" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Semua materi
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="brand">Modul {lesson.number}</Badge>
          <DifficultyBadge difficulty={lesson.difficulty} />
          <span className="flex items-center gap-1 text-xs text-ink-muted">
            <Clock className="h-3.5 w-3.5" /> ±{lesson.minutes} menit
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{lesson.title}</h1>
        <p className="mt-2 text-ink-muted">{lesson.summary}</p>
      </header>

      {/* Navigasi bagian */}
      <nav aria-label="Daftar isi modul" className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          ["tujuan", "Tujuan"],
          ["konsep", "Konsep"],
          ["istilah", "Istilah"],
          ["konteks", "Konteks"],
          ["contoh", "Contoh soal"],
          ["kesimpulan", "Kesimpulan"],
          ["quiz", "Mini quiz"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-ink-soft hover:border-brand-300 hover:text-brand-700">
            {label}
          </a>
        ))}
      </nav>

      <Card as="section" id="tujuan" className="mb-6 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Target className="h-5 w-5 text-brand-600" /> Tujuan pembelajaran
        </h2>
        <ul className="mt-3 space-y-2">
          {lesson.objectives.map((o) => (
            <li key={o} className="flex gap-2 text-ink-soft">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> {o}
            </li>
          ))}
        </ul>
      </Card>

      <section id="konsep" className="mb-6 scroll-mt-20 space-y-6">
        {lesson.sections.map((s) => (
          <Card key={s.heading} as="div">
            <h2 className="text-xl font-bold text-ink">{s.heading}</h2>
            {s.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </Card>
        ))}
      </section>

      <Card as="section" id="istilah" className="mb-6 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <BookMarked className="h-5 w-5 text-grape-600" /> Istilah penting
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {lesson.terms.map((t) => (
            <div key={t.term} className="rounded-xl bg-grape-50/60 p-3">
              <dt className="font-bold text-grape-700">{t.term}</dt>
              <dd className="mt-0.5 text-sm text-ink-soft">{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <section id="konteks" className="mb-6 scroll-mt-20 grid items-center gap-5 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-grape-50 p-5 sm:grid-cols-[1fr_200px] sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Konteks</p>
          <h2 className="mt-1 text-lg font-bold text-ink">{lesson.context.title}</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{lesson.context.text}</p>
        </div>
        <div className="mx-auto w-full max-w-[220px]">
          <LessonIllustration kind={lesson.context.illustration} />
        </div>
      </section>

      <section id="contoh" className="mb-6 scroll-mt-20 space-y-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <ListChecks className="h-5 w-5 text-emerald-600" /> Contoh soal &amp; penyelesaian
        </h2>
        {lesson.examples.map((ex) => (
          <Card key={ex.title}>
            <h3 className="font-bold text-ink">{ex.title}</h3>
            <p className="mt-2 text-ink-soft">{ex.problem}</p>
            {ex.context && <MathBlock lines={ex.context} />}
            <ol className="mt-4 space-y-4 border-l-2 border-brand-100 pl-5">
              {ex.steps.map((st, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                  <p className="font-semibold text-ink">{st.title}</p>
                  {st.detail && <p className="text-sm text-ink-soft">{st.detail}</p>}
                  {st.math && <MathBlock lines={st.math} className="my-2" />}
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              <Flag className="mr-1.5 inline h-4 w-4" />
              {ex.answer}
            </p>
          </Card>
        ))}
      </section>

      <Card as="section" id="kesimpulan" className="mb-6 scroll-mt-20 border-amber-200 bg-amber-50/50">
        <h2 className="text-lg font-bold text-ink">Kesimpulan</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-soft">
          {lesson.conclusion.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      <section id="quiz" className="mb-8 scroll-mt-20">
        <h2 className="mb-3 text-xl font-bold text-ink">Mini quiz</h2>
        <p className="mb-4 text-sm text-ink-muted">Jawab {lesson.quiz.length} soal berikut. Nilai minimal 60 untuk menyelesaikan modul ini.</p>
        <MiniQuiz lessonId={lesson.id} nextSlug={next?.slug} />
      </section>

      <nav className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row" aria-label="Modul lain">
        {prev ? (
          <ButtonLink href={`/materi/${prev.slug}`} variant="outline">
            <ArrowLeft className="h-4 w-4" /> Modul {prev.number}
          </ButtonLink>
        ) : (
          <span />
        )}
        {next ? (
          <ButtonLink href={`/materi/${next.slug}`}>
            Modul {next.number}: {next.title} <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        ) : (
          <ButtonLink href="/evaluasi" variant="success">
            Lanjut ke Evaluasi Akhir <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        )}
      </nav>
    </article>
  );
}
