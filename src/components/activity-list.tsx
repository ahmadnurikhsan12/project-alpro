import { Award, BookOpen, ClipboardCheck, FlaskConical, Gamepad2, PencilLine, TrendingUp } from "lucide-react";
import type { ActivityRecord, ActivityType } from "@/lib/progress/types";
import { cn, relativeTime } from "@/lib/utils";

const META: Record<ActivityType, { icon: typeof BookOpen; cls: string; label: string }> = {
  lesson_open: { icon: BookOpen, cls: "bg-brand-50 text-brand-600", label: "Materi" },
  lesson_quiz: { icon: BookOpen, cls: "bg-brand-50 text-brand-600", label: "Mini quiz" },
  lesson_complete: { icon: BookOpen, cls: "bg-emerald-50 text-emerald-600", label: "Materi selesai" },
  practice: { icon: PencilLine, cls: "bg-emerald-50 text-emerald-600", label: "Latihan" },
  evaluation: { icon: ClipboardCheck, cls: "bg-sky-50 text-sky-600", label: "Evaluasi" },
  game: { icon: Gamepad2, cls: "bg-orange-50 text-orange-600", label: "Game" },
  lab: { icon: FlaskConical, cls: "bg-grape-50 text-grape-600", label: "Lab" },
  achievement: { icon: Award, cls: "bg-amber-50 text-amber-600", label: "Pencapaian" },
  level_up: { icon: TrendingUp, cls: "bg-grape-50 text-grape-600", label: "Level" },
};

export const ACTIVITY_LABEL = Object.fromEntries(Object.entries(META).map(([k, v]) => [k, v.label])) as Record<ActivityType, string>;

export function ActivityList({ items }: { items: ActivityRecord[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((a) => {
        const m = META[a.type];
        return (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <span className={cn("rounded-xl p-2", m.cls)}>
              <m.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
              <p className="truncate text-xs text-ink-muted">
                {a.detail} · {relativeTime(a.createdAt)}
              </p>
            </div>
            {a.xp > 0 && <span className="shrink-0 text-sm font-bold text-grape-700">+{a.xp}</span>}
          </li>
        );
      })}
    </ul>
  );
}
