import { GAMES } from "@/content/games";
import { LESSONS } from "@/content/lessons";
import { LAB_TOOLS, type ProgressState } from "./types";

export interface Recommendation {
  title: string;
  reason: string;
  href: string;
  cta: string;
}

/** Rekomendasi langkah belajar berikutnya berdasarkan progres. */
export function recommendNext(s: ProgressState): Recommendation[] {
  const recs: Recommendation[] = [];
  const nextLesson = LESSONS.find((l) => s.lessons[l.id]?.status !== "completed");
  if (nextLesson) {
    const started = !!s.lessons[nextLesson.id];
    recs.push({
      title: `Modul ${nextLesson.number}: ${nextLesson.title}`,
      reason: started ? "Kamu sudah membuka modul ini. Selesaikan mini quiz-nya (nilai minimal 60)." : "Modul berikutnya dalam urutan belajar.",
      href: `/materi/${nextLesson.slug}`,
      cta: started ? "Lanjutkan" : "Mulai",
    });
  }
  const done = (id: string) => s.lessons[id]?.status === "completed";
  if (done("m4") && !s.counters.labTools.includes("elimination")) {
    recs.push({ title: "Simulasi Eliminasi", reason: "Praktikkan langkah eliminasi secara interaktif.", href: "/lab?tab=elimination", cta: "Buka Lab" });
  }
  if (!nextLesson && s.counters.bestEvaluation < 75) {
    recs.push({ title: "Evaluasi Akhir", reason: s.counters.evaluations ? `Nilai terbaikmu ${s.counters.bestEvaluation}. Targetkan minimal 75!` : "Semua modul selesai — saatnya menguji pemahamanmu.", href: "/evaluasi", cta: "Mulai evaluasi" });
  }
  if (s.counters.practiceSessions < 3) {
    recs.push({ title: "Latihan Soal", reason: "Perkuat pemahaman dengan latihan bertingkat.", href: "/latihan", cta: "Berlatih" });
  }
  const unplayed = GAMES.find((g) => s.counters.gamesBest[g.id] === undefined);
  if (unplayed) recs.push({ title: unplayed.title, reason: unplayed.tagline, href: `/games/${unplayed.id}`, cta: "Main" });
  const tool = LAB_TOOLS.find((t) => !s.counters.labTools.includes(t));
  if (tool && recs.length < 3) recs.push({ title: "Jelajahi SPLDV Lab", reason: "Masih ada alat lab yang belum kamu coba.", href: `/lab?tab=${tool}`, cta: "Buka Lab" });
  if (recs.length === 0) recs.push({ title: "Tantangan SPLDV", reason: "Kamu luar biasa! Uji dirimu di tingkat Sulit.", href: "/games/tantangan-spldv", cta: "Tantang diri" });
  return recs.slice(0, 3);
}
