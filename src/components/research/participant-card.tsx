"use client";

import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, inputClass } from "@/components/ui";
import { generateParticipantCode, normalizeCohort, validateParticipantCode } from "@/lib/assessment/participant";
import { loadResearch, setParticipant, type ResearchData } from "@/lib/research/store";

/**
 * Kode peserta anonim untuk uji coba. Tidak memuat nama. Tidak dapat diganti setelah pretest/posttest tercatat.
 */
export function ParticipantCard({ onChange }: { onChange?: (r: ResearchData) => void }) {
  const [data, setData] = useState<ResearchData | null>(null);
  const [custom, setCustom] = useState("");
  const [cohort, setCohort] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const d = loadResearch();
    setData(d);
    setCohort(d.participant?.cohort ?? "");
    onChange?.(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = (code: string, auto: boolean) => {
    const res = setParticipant(code, normalizeCohort(cohort), auto);
    if (!res.ok) return setError(res.message ?? "Gagal menyimpan.");
    const d = loadResearch();
    setData(d);
    setError(null);
    setEditing(false);
    setCustom("");
    onChange?.(d);
  };

  const saveCustom = () => {
    const v = validateParticipantCode(custom);
    if (!v.ok) return setError(v.message);
    apply(v.code, v.auto);
  };

  if (!data) return <Card className="min-h-24" aria-busy>{null}</Card>;
  const p = data.participant;
  const locked = data.assessments.length > 0;

  return (
    <Card data-testid="participant-card">
      <h2 className="flex items-center gap-2 font-bold text-ink">
        <ShieldCheck className="h-5 w-5 text-emerald-600" /> Kode peserta (anonim)
      </h2>
      {p && !editing ? (
        <>
          <p data-testid="participant-code" className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-extrabold tracking-wider text-ink">
            {p.code}
          </p>
          {p.cohort && <p className="mt-2 text-center text-sm text-ink-muted">Kelompok: {p.cohort}</p>}
          <p className="mt-3 text-sm text-ink-soft">Catat kode ini. Kode dipakai untuk menggabungkan datamu dengan data teman sekelas tanpa memakai nama.</p>
          {!locked ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(true)}>
              Ganti kode
            </Button>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">Kode tidak dapat diganti setelah pretest/posttest tercatat.</p>
          )}
        </>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Jangan memakai nama asli, nomor induk, atau data pribadi lain sebagai kode.</span>
          </p>
          <div>
            <p className="text-sm font-semibold text-ink">Pilihan 1: kode otomatis</p>
            <Button className="mt-2" onClick={() => apply(generateParticipantCode(), true)}>
              Buat kode otomatis
            </Button>
          </div>
          <div>
            <label htmlFor="kode-guru" className="text-sm font-semibold text-ink">
              Pilihan 2: kode dari guru
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <input id="kode-guru" className={`${inputClass} max-w-[14rem] font-mono uppercase`} maxLength={20} autoComplete="off" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="mis. KLS1-07" />
              <Button variant="outline" disabled={!custom.trim()} onClick={saveCustom}>
                Pakai kode ini
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor="kelompok" className="text-sm font-semibold text-ink">
              Kode kelompok (opsional)
            </label>
            <input id="kelompok" className={`${inputClass} mt-1.5 max-w-[10rem] font-mono uppercase`} maxLength={8} autoComplete="off" value={cohort} onChange={(e) => setCohort(normalizeCohort(e.target.value))} placeholder="mis. KLS1" />
            <p className="mt-1 text-xs text-ink-muted">Boleh diisi bila guru memintanya (mis. kode kelas). Dipakai untuk analisis kelompok.</p>
          </div>
          {p && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Batal
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
    </Card>
  );
}
