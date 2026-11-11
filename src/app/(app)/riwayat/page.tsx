"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { ActivityList } from "@/components/activity-list";
import { useProgress } from "@/components/providers/progress-provider";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Segmented } from "@/components/ui";
import type { AttemptKind } from "@/lib/progress/types";
import { formatDateTime } from "@/lib/utils";

const KIND_LABEL: Record<AttemptKind, string> = { lesson_quiz: "Mini quiz", practice: "Latihan", evaluation: "Evaluasi", game: "Game" };
type Filter = "all" | AttemptKind;

export default function RiwayatPage() {
  const { state } = useProgress();
  const [view, setView] = useState<"hasil" | "aktivitas">("hasil");
  const [filter, setFilter] = useState<Filter>("all");
  const rows = state.attempts.filter((a) => filter === "all" || a.kind === filter);

  return (
    <>
      <PageHeader eyebrow="Catatan" title="Riwayat Belajar" icon={<History className="h-6 w-6" />} description="Semua hasil latihan, evaluasi, permainan, dan aktivitas belajarmu." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Tampilan"
          value={view}
          onChange={setView}
          options={[
            { value: "hasil", label: "Hasil & skor" },
            { value: "aktivitas", label: "Semua aktivitas" },
          ]}
        />
        {view === "hasil" && (
          <Segmented
            label="Jenis"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Semua" },
              { value: "lesson_quiz", label: "Mini quiz" },
              { value: "practice", label: "Latihan" },
              { value: "evaluation", label: "Evaluasi" },
              { value: "game", label: "Game" },
            ]}
          />
        )}
      </div>

      {view === "hasil" ? (
        rows.length === 0 ? (
          <EmptyState icon={<History className="h-6 w-6" />} title="Belum ada hasil" description="Kerjakan mini quiz, latihan, evaluasi, atau main game — hasilnya akan tercatat di sini." action={<ButtonLink href="/materi">Mulai belajar</ButtonLink>} />
        ) : (
          <Card className="overflow-x-auto p-0 sm:p-0">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Tabel hasil belajar</caption>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Tanggal</th>
                  <th scope="col" className="px-4 py-3">Jenis</th>
                  <th scope="col" className="px-4 py-3">Materi / permainan</th>
                  <th scope="col" className="px-4 py-3 text-right">Hasil</th>
                  <th scope="col" className="px-4 py-3 text-right">Skor</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const passed = a.kind === "game" ? a.score >= 50 : a.score >= (a.kind === "evaluation" ? 75 : 60);
                  return (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge color={a.kind === "game" ? "orange" : a.kind === "evaluation" ? "sky" : a.kind === "practice" ? "emerald" : "brand"}>{KIND_LABEL[a.kind]}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{a.title}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{a.kind === "game" ? `${a.rawScore ?? 0} poin` : `${a.correct}/${a.total} benar`}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-ink">{a.score}</td>
                      <td className="px-4 py-3">
                        <Badge color={passed ? "emerald" : "amber"}>{passed ? (a.kind === "game" ? "Baik" : "Lulus") : a.kind === "game" ? "Coba lagi" : "Belum lulus"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-grape-700">+{a.xp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )
      ) : state.activity.length === 0 ? (
        <EmptyState icon={<History className="h-6 w-6" />} title="Belum ada aktivitas" description="Aktivitasmu akan muncul di sini." />
      ) : (
        <Card>
          <ActivityList items={state.activity} />
        </Card>
      )}
    </>
  );
}
