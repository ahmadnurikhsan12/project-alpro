"use client";

import { Lock, Sparkles, Trophy } from "lucide-react";
import { AchievementIcon } from "@/components/achievement-icon";
import { useProgress } from "@/components/providers/progress-provider";
import { Badge, Card, PageHeader, ProgressBar } from "@/components/ui";
import { ACHIEVEMENTS, LEVELS, levelFromXp, XP_RULES } from "@/lib/progress/gamification";
import { cn, formatDate } from "@/lib/utils";

const XP_TABLE = [
  ["Membuka modul pertama kali", `+${XP_RULES.lessonOpen}`],
  ["Menyelesaikan modul (mini quiz ≥ 60)", `+${XP_RULES.lessonComplete}`],
  ["Soal mini quiz benar (pertama kali)", `+${XP_RULES.lessonQuizPerNewCorrect}`],
  ["Soal latihan benar (pertama kali)", `+${XP_RULES.practicePerNewCorrect.mudah}/${XP_RULES.practicePerNewCorrect.sedang}/${XP_RULES.practicePerNewCorrect.sulit}`],
  ["Evaluasi akhir (maks. 3×/hari)", `+${XP_RULES.evaluationBase} + nilai/2`],
  ["Game (maks. 3×/game/hari)", `hingga +${XP_RULES.gameBase.sulit}`],
  ["Alat SPLDV Lab (1×/alat/hari)", `+${XP_RULES.labPerToolPerDay}`],
];

export default function PencapaianPage() {
  const { state } = useProgress();
  const lvl = levelFromXp(state.xp);
  const earned = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;

  return (
    <>
      <PageHeader eyebrow="Gamifikasi" title="Pencapaian" icon={<Trophy className="h-6 w-6" />} description="XP, level, dan badge yang kamu peroleh dari aktivitas belajar yang benar-benar dilakukan." />

      <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card className="bg-gradient-to-br from-grape-50 to-brand-50">
          <p className="text-sm font-semibold text-grape-700">Level {lvl.level}</p>
          <p className="text-2xl font-extrabold text-ink">{lvl.title}</p>
          <p className="mt-1 text-sm text-ink-muted">{state.xp} XP total</p>
          <ProgressBar value={lvl.progress} className="mt-4" label="Progres ke level berikutnya" />
          <p className="mt-1 text-xs text-ink-muted">{lvl.nextXp ? `${lvl.nextXp - state.xp} XP lagi menuju Level ${lvl.level + 1}` : "Kamu sudah mencapai level tertinggi!"}</p>
          <ol className="mt-5 grid grid-cols-5 gap-1.5">
            {LEVELS.map((l) => (
              <li key={l.level} title={`${l.title} (${l.xp} XP)`} className={cn("rounded-lg py-1.5 text-center text-xs font-bold", l.level <= lvl.level ? "bg-grape-600 text-white" : "bg-white text-ink-muted")}>
                {l.level}
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <Sparkles className="h-5 w-5 text-grape-600" /> Cara mendapatkan XP
          </h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {XP_TABLE.map(([k, v]) => (
                <tr key={k} className="border-t border-slate-100">
                  <td className="py-2 pr-3 text-ink-soft">{k}</td>
                  <td className="py-2 text-right font-semibold text-grape-700">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-muted">Mengulang soal yang sama tidak memberi XP lagi, dan setiap aktivitas punya batas harian agar XP mencerminkan belajar yang sesungguhnya.</p>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Badge</h2>
        <Badge color="amber">
          {earned}/{ACHIEVEMENTS.length} diperoleh
        </Badge>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = state.achievements[a.id];
          return (
            <li key={a.id} className={cn("flex gap-4 rounded-2xl border p-4", at ? "border-amber-200 bg-white shadow-card" : "border-slate-200 bg-slate-50")}>
              <AchievementIcon icon={a.icon} locked={!at} className="h-12 w-12 shrink-0 p-2.5" />
              <div className="min-w-0">
                <p className={cn("font-bold", at ? "text-ink" : "text-ink-muted")}>
                  {a.title} {!at && <Lock className="inline h-3.5 w-3.5" aria-label="terkunci" />}
                </p>
                <p className="text-sm text-ink-muted">{a.description}</p>
                <p className="mt-1 text-xs font-semibold text-grape-700">{at ? `Diperoleh ${formatDate(at)} · +${a.xp} XP` : `Hadiah +${a.xp} XP`}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
