"use client";

import { FlaskConical, LineChart, ListOrdered, SearchCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EliminationSim } from "@/components/lab/elimination-sim";
import { GraphLab } from "@/components/lab/graph-lab";
import { PairChecker } from "@/components/lab/pair-checker";
import { useProgress } from "@/components/providers/progress-provider";
import { LoadingBlock, PageHeader } from "@/components/ui";
import type { LabTool } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

const TABS: { id: LabTool; label: string; icon: typeof FlaskConical; desc: string }[] = [
  { id: "elimination", label: "Simulasi Eliminasi", icon: ListOrdered, desc: "Langkah demi langkah" },
  { id: "checker", label: "Uji Pasangan", icon: SearchCheck, desc: "Cek (x, y)" },
  { id: "graph", label: "Grafik", icon: LineChart, desc: "Titik potong" },
];

function LabContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { state } = useProgress();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "elimination") as LabTool;

  return (
    <>
      <PageHeader
        eyebrow="Eksplorasi"
        title="SPLDV Lab"
        icon={<FlaskConical className="h-6 w-6" />}
        description="Laboratorium interaktif untuk menguji, mensimulasikan, dan memvisualisasikan SPLDV."
      />
      <div role="tablist" aria-label="Alat lab" className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5">
        {TABS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => router.replace(`/lab?tab=${id}`, { scroll: false })}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition sm:flex-row sm:justify-center sm:gap-2",
              tab === id ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-bold sm:text-sm">{label}</span>
            <span className="hidden text-xs text-ink-muted xl:inline">· {desc}</span>
            {state.counters.labTools.includes(id) && <span className="sr-only">(sudah dicoba)</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "elimination" && <EliminationSim />}
        {tab === "checker" && <PairChecker />}
        {tab === "graph" && <GraphLab />}
      </div>
    </>
  );
}

export default function LabPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <LabContent />
    </Suspense>
  );
}
