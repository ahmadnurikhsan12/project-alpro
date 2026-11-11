"use client";

import { BookOpen, CheckCircle2, Circle, Clock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useProgress } from "@/components/providers/progress-provider";
import { Badge, DifficultyBadge, PageHeader, ProgressBar } from "@/components/ui";
import { LESSONS } from "@/content/lessons";
import { cn } from "@/lib/utils";

export default function MateriPage() {
  const { state } = useProgress();
  const done = LESSONS.filter((l) => state.lessons[l.id]?.status === "completed").length;

  return (
    <>
      <PageHeader
        eyebrow="Kurikulum"
        title="Materi SPLDV"
        icon={<BookOpen className="h-6 w-6" />}
        description="Pelajari secara berurutan. Setiap modul diakhiri mini quiz — raih nilai minimal 60 untuk menyelesaikannya."
      />
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold text-ink">Progres materi</span>
          <span className="text-ink-muted">
            {done}/{LESSONS.length} modul selesai
          </span>
        </div>
        <ProgressBar value={(done / LESSONS.length) * 100} label="Progres materi" color="emerald" />
      </div>

      <ol className="grid gap-4 md:grid-cols-2">
        {LESSONS.map((l) => {
          const p = state.lessons[l.id];
          const status = p?.status === "completed" ? "done" : p ? "progress" : "new";
          return (
            <li key={l.id}>
              <Link
                href={`/materi/${l.slug}`}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift",
                  status === "done" ? "border-emerald-200" : "border-slate-200",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-grape-600 text-lg font-extrabold text-white">
                    {l.number}
                  </span>
                  {status === "done" ? (
                    <Badge color="emerald">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Selesai · {p!.bestQuizScore}
                    </Badge>
                  ) : status === "progress" ? (
                    <Badge color="brand">
                      <PlayCircle className="h-3.5 w-3.5" /> Sedang dipelajari
                    </Badge>
                  ) : (
                    <Badge color="slate">
                      <Circle className="h-3.5 w-3.5" /> Belum dimulai
                    </Badge>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-bold text-ink group-hover:text-brand-700">{l.title}</h2>
                <p className="mt-1 flex-1 text-sm text-ink-muted">{l.summary}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={l.difficulty} />
                    <span className="flex items-center gap-1 text-xs text-ink-muted">
                      <Clock className="h-3.5 w-3.5" /> ±{l.minutes} menit
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-brand-600">{status === "done" ? "Ulas lagi →" : status === "progress" ? "Lanjutkan →" : "Mulai belajar →"}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
