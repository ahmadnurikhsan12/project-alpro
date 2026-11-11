import { BookOpen, Crown, Flame, FlaskConical, Gamepad2, Search, Sprout, Star, Target, Trophy, Variable, Zap } from "lucide-react";
import type { AchievementDef } from "@/lib/progress/gamification";
import { cn } from "@/lib/utils";

const ICONS = { sprout: Sprout, variable: Variable, zap: Zap, search: Search, book: BookOpen, trophy: Trophy, target: Target, flask: FlaskConical, gamepad: Gamepad2, crown: Crown, flame: Flame, star: Star };

export function AchievementIcon({ icon, className, locked }: { icon: AchievementDef["icon"]; className?: string; locked?: boolean }) {
  const Icon = ICONS[icon];
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full", locked ? "bg-slate-100 text-slate-400" : "bg-gradient-to-br from-amber-300 to-orange-400 text-white", className)}>
      <Icon className="h-full w-full" aria-hidden />
    </span>
  );
}
