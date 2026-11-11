"use client";

import { ArrowRight, Award, BookOpen, ChartLine, ClipboardCheck, Cloud, Crosshair, PencilLine, Smartphone, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { ActivityList } from "@/components/activity-list";
import { ScoreChart, scoreSeries, XpChart, xpSeries } from "@/components/dashboard-charts";
import { useProgress } from "@/components/providers/progress-provider";
import { AchievementIcon } from "@/components/achievement-icon";
import { Badge, ButtonLink, Card, EmptyState, LoadingBlock, ProgressBar, StatCard } from "@/components/ui";
import { deriveStats } from "@/lib/progress/engine";
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS } from "@/lib/progress/gamification";
import { recommendNext } from "@/lib/progress/recommend";

export default function DashboardPage() {
  const { ready, state, mode, displayName, user } = useProgress();
  if (!ready) return <LoadingBlock label="Memuat progres..." />;

  const st = deriveStats(state);
  const recs = recommendNext(state);
  const name = displayName || (mode === "email" ? user?.email?.split("@")[0] : "") || "Pelajar";
  const xp = xpSeries(state);
  const scores = scoreSeries(state);
  const earned = Object.entries(state.achievements).sort((a, b) => b[1].localeCompare(a[1]));

  return (
    <>
      {/* Sapaan */}
      <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-grape-600 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge color="slate" className="bg-white/90">
              {mode === "email" ? <Cloud className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
              {mode === "email" ? "Email Mode" : "Guest Mode"}
            </Badge>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Halo, {name}! 👋</h1>
            <p className="mt-1 text-white/85">
              Level {st.level.level} · {st.level.title}
            </p>
            <div className="mt-4 max-w-sm">
              <div className="mb-1 flex justify-between text-xs text-white/80">
                <span>{state.xp} XP</span>
                <span>{st.level.nextXp ? `${st.level.nextXp - state.xp} XP lagi ke Level ${st.level.level + 1}` : "Level maksimum!"}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={st.level.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progres level">
                <div className="h-full rounded-full bg-amber-300" style={{ width: `${st.level.progress}%` }} />
              </div>
            </div>
          </div>
          {recs[0] && (
            <ButtonLink href={recs[0].href} size="lg" className="bg-white !text-brand-700 hover:bg-brand-50">
              Lanjutkan belajar <ArrowRight className="h-5 w-5" />
            </ButtonLink>
          )}
        </div>
      </section>

      {mode === "guest" && (
        <p className="mb-6 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span className="flex gap-2">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            Progres Guest Mode tersimpan di browser perangkat ini. Jika data browser dihapus atau kamu berganti perangkat, progres lokal tidak dapat dipulihkan.
          </span>
          <Link href="/masuk" className="shrink-0 font-semibold text-brand-600 hover:underline">
            Simpan online →
          </Link>
        </p>
      )}

      {/* Statistik */}
      <section aria-label="Ringkasan statistik" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total XP" value={state.xp} hint={`Level ${st.level.level}`} icon={<Sparkles className="h-4 w-4" />} tone="grape" />
        <StatCard label="Progres belajar" value={`${st.progress}%`} hint={<ProgressBar value={st.progress} className="mt-1 h-1.5" label="Progres belajar" />} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Materi selesai" value={`${st.lessonsCompleted}/${st.totalLessons}`} hint="modul" icon={<BookOpen className="h-4 w-4" />} tone="emerald" />
        <StatCard label="Evaluasi terakhir" value={st.lastEvaluation ?? "—"} hint={st.bestEvaluation ? `Terbaik ${st.bestEvaluation}` : "Belum dikerjakan"} icon={<ClipboardCheck className="h-4 w-4" />} tone="sky" />
        <StatCard label="Latihan dikerjakan" value={st.practiceSessions} hint="sesi" icon={<PencilLine className="h-4 w-4" />} tone="amber" />
        <StatCard label="Ketepatan jawaban" value={state.counters.answered ? `${st.accuracy}%` : "—"} hint={`${state.counters.correctAnswers}/${state.counters.answered} benar`} icon={<Crosshair className="h-4 w-4" />} tone="rose" />
        <StatCard label="Pencapaian" value={`${st.achievements}/${ACHIEVEMENTS.length}`} hint="badge" icon={<Award className="h-4 w-4" />} tone="amber" />
        <StatCard label="Aktivitas" value={state.activity.length} hint="tercatat" icon={<ChartLine className="h-4 w-4" />} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="font-bold text-ink">Perkembangan XP</h2>
            <p className="text-xs text-ink-muted">XP kumulatif per hari aktif</p>
            {xp.length ? <XpChart data={xp} /> : <EmptyState icon={<ChartLine className="h-6 w-6" />} title="Belum ada data" description="Grafik akan muncul setelah kamu mulai belajar." />}
          </Card>
          <Card>
            <h2 className="font-bold text-ink">Nilai 10 aktivitas terakhir</h2>
            <p className="text-xs text-ink-muted">Mini quiz, latihan, evaluasi, dan game (persentase)</p>
            {scores.length ? <ScoreChart data={scores} /> : <EmptyState icon={<ChartLine className="h-6 w-6" />} title="Belum ada nilai" description="Kerjakan mini quiz, latihan, atau game untuk melihat grafiknya." />}
            {scores.length > 0 && (
              <Link href="/riwayat" className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline">
                Lihat tabel lengkap di Riwayat →
              </Link>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="font-bold text-ink">Rekomendasi untukmu</h2>
            <ul className="mt-3 space-y-2">
              {recs.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{r.title}</p>
                      <p className="text-xs text-ink-muted">{r.reason}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand-600">{r.cta} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink">Pencapaian</h2>
              <Link href="/pencapaian" className="text-sm font-semibold text-brand-600 hover:underline">
                Semua
              </Link>
            </div>
            {earned.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {earned.slice(0, 6).map(([id]) => (
                  <li key={id} className="flex items-center gap-2 rounded-full bg-amber-50 py-1 pl-1 pr-3 text-xs font-semibold text-amber-900">
                    <AchievementIcon icon={ACHIEVEMENT_BY_ID[id]?.icon ?? "star"} className="h-6 w-6 p-1" />
                    {ACHIEVEMENT_BY_ID[id]?.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">Selesaikan modul pertama untuk membuka badge &quot;Pemula SPLDV&quot;.</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink">Aktivitas terbaru</h2>
              <Link href="/riwayat" className="text-sm font-semibold text-brand-600 hover:underline">
                Riwayat
              </Link>
            </div>
            {state.activity.length ? <ActivityList items={state.activity.slice(0, 5)} /> : <p className="mt-2 text-sm text-ink-muted">Belum ada aktivitas. Ayo mulai dari Modul 1!</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
