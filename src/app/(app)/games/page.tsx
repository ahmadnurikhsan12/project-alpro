"use client";

import { ArrowRight, Gamepad2, Trophy } from "lucide-react";
import Link from "next/link";
import { useProgress } from "@/components/providers/progress-provider";
import { Badge, PageHeader } from "@/components/ui";
import { GAMES } from "@/content/games";
import { XP_RULES } from "@/lib/progress/gamification";
import { cn } from "@/lib/utils";

const COLOR = {
  brand: "from-brand-500 to-brand-700",
  grape: "from-grape-500 to-grape-700",
  emerald: "from-emerald-500 to-emerald-700",
  amber: "from-amber-400 to-amber-600",
  rose: "from-rose-500 to-rose-700",
  sky: "from-sky-500 to-sky-700",
  orange: "from-orange-500 to-orange-700",
};

export default function GamesPage() {
  const { state } = useProgress();
  return (
    <>
      <PageHeader
        eyebrow="Bermain sambil belajar"
        title="Games Edukatif"
        icon={<Gamepad2 className="h-6 w-6" />}
        description={`Tujuh permainan dengan mekanisme berbeda. XP diberikan untuk ${XP_RULES.gameDailyLimitPerGame} permainan pertama setiap game per hari.`}
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {GAMES.map((g, i) => {
          const best = state.counters.gamesBest[g.id];
          return (
            <Link key={g.id} href={`/games/${g.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className={cn("relative flex h-28 items-end bg-gradient-to-br p-4 text-white", COLOR[g.color])}>
                <span className="absolute right-4 top-3 text-5xl font-extrabold opacity-20">{i + 1}</span>
                <Badge color="slate" className="bg-white/90">
                  {g.mechanic}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-bold text-ink group-hover:text-brand-700">{g.title}</h2>
                <p className="mt-1 flex-1 text-sm text-ink-muted">{g.tagline}</p>
                <div className="mt-4 flex items-center justify-between">
                  {best !== undefined ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-700">
                      <Trophy className="h-4 w-4" /> Terbaik {best}%
                    </span>
                  ) : (
                    <span className="text-sm text-ink-muted">Belum dimainkan</span>
                  )}
                  <span className="flex items-center gap-1 text-sm font-semibold text-brand-600">
                    Main <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
