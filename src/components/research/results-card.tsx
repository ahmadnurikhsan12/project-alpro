"use client";

import { Card } from "@/components/ui";
import { ASSESSMENT_SKILLS, SKILL_LABEL } from "@/lib/assessment/blueprint";
import type { AssessmentRecord } from "@/lib/research/store";

/**
 * Hasil pretest dan posttest yang langsung tampil di halaman (tanpa unduh berkas).
 * Hanya skor dan profil per kompetensi; kunci jawaban dan benar/salah per butir tidak ditampilkan.
 */
export function ResultsCard({ assessments, title = "Hasil saya" }: { assessments: AssessmentRecord[]; title?: string }) {
  const pre = assessments.find((a) => a.kind === "pretest");
  const post = assessments.find((a) => a.kind === "posttest");
  if (!pre && !post) return null;
  const delta = pre && post ? post.score - pre.score : null;

  return (
    <Card data-testid="results-card">
      <h2 className="font-bold text-ink">{title}</h2>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Tile label="Pretest" value={pre ? String(pre.score) : "—"} sub={pre ? `${pre.correct} dari ${pre.total} benar` : "belum dikerjakan"} testId="result-pretest-score" />
        <Tile label="Posttest" value={post ? String(post.score) : "—"} sub={post ? `${post.correct} dari ${post.total} benar` : "belum dikerjakan"} testId="result-posttest-score" />
        <Tile
          label="Selisih"
          value={delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
          sub={delta === null ? "butuh keduanya" : delta > 0 ? "naik" : delta < 0 ? "turun" : "sama"}
          testId="result-delta"
          tone={delta === null ? "slate" : delta > 0 ? "emerald" : delta < 0 ? "amber" : "slate"}
        />
      </div>

      <div tabIndex={0} className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="mb-1 text-left text-xs font-semibold text-ink-muted">Hasil per kompetensi (benar dari 2 soal)</caption>
          <thead className="text-left text-xs text-ink-muted">
            <tr>
              <th className="py-1 pr-2">Kompetensi</th>
              <th className="py-1 pr-2">Pretest</th>
              <th className="py-1 pr-2">Posttest</th>
              <th className="py-1">Perubahan</th>
            </tr>
          </thead>
          <tbody>
            {ASSESSMENT_SKILLS.map((s) => {
              const a = pre?.bySkill[s]?.correct;
              const b = post?.bySkill[s]?.correct;
              const d = a !== undefined && b !== undefined ? b - a : null;
              return (
                <tr key={s} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2">{SKILL_LABEL[s]}</td>
                  <td className="py-1.5 pr-2 font-mono">{a ?? "—"}</td>
                  <td className="py-1.5 pr-2 font-mono">{b ?? "—"}</td>
                  <td className="py-1.5 text-xs font-semibold">
                    {d === null ? <span className="text-ink-muted">—</span> : d > 0 ? <span className="text-emerald-700">naik {d}</span> : d < 0 ? <span className="text-amber-800">turun {Math.abs(d)}</span> : <span className="text-ink-muted">tetap</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Skor = soal benar dibagi 12, dikali 100. Pretest dan posttest memakai soal berbeda dengan susunan yang setara, jadi selisih ini hanya gambaran, bukan nilai rapor. Hasil tersimpan di perangkat ini.
      </p>
    </Card>
  );
}

function Tile({ label, value, sub, testId, tone = "brand" }: { label: string; value: string; sub: string; testId: string; tone?: "brand" | "emerald" | "amber" | "slate" }) {
  const color = { brand: "text-brand-700", emerald: "text-emerald-700", amber: "text-amber-800", slate: "text-ink" }[tone];
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-3">
      <p className="text-xs font-semibold text-ink-muted">{label}</p>
      <p className={`text-3xl font-extrabold tabular-nums ${color}`} data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-ink-muted">{sub}</p>
    </div>
  );
}
