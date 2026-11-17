"use client";

import { Download, FileSpreadsheet, Layers, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { ParticipantCard } from "@/components/research/participant-card";
import { Badge, Button, Card, PageHeader, Segmented } from "@/components/ui";
import { zipStore, type Delimiter } from "@/lib/research/csv";
import { TABLE_SPECS, buildTables, mergeCsvTexts, mergedToCsv, tablesToCsv, type MergeResult } from "@/lib/research/export";
import { loadResearch, type ResearchData } from "@/lib/research/store";
import { guestStorageStatus, type GuestStorageStatus } from "@/lib/storage/guest-data";
import { loadGuest, MAX_LOCAL_EVENTS } from "@/lib/storage/local";

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export default function EksporPage() {
  const { mode } = useProgress();
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [status, setStatus] = useState<GuestStorageStatus | null>(null);
  const [delimiter, setDelimiter] = useState<Delimiter>(";");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [merged, setMerged] = useState<MergeResult | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const reload = () => {
    const r = loadResearch();
    const g = loadGuest();
    setResearch(r);
    setStatus(guestStorageStatus(g.events, MAX_LOCAL_EVENTS));
    const t = buildTables({ research: r, events: g.events, state: g.state, maxEvents: MAX_LOCAL_EVENTS, now: new Date().toISOString() });
    setCounts(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.length])));
  };
  useEffect(reload, []);

  const code = research?.participant?.code;
  const build = () => {
    const g = loadGuest();
    const r = loadResearch();
    return tablesToCsv(buildTables({ research: r, events: g.events, state: g.state, maxEvents: MAX_LOCAL_EVENTS, now: new Date().toISOString() }), delimiter);
  };

  const downloadAll = () => {
    const enc = new TextEncoder();
    const zip = zipStore(build().map((t) => ({ name: t.spec.file, data: enc.encode(t.csv) })));
    download(`mathquest_${code}_${stamp()}.zip`, zip, "application/zip");
  };
  const downloadOne = (file: string) => {
    const t = build().find((x) => x.spec.file === file);
    if (t) download(`mathquest_${code}_${t.spec.file}`, t.csv, "text/csv;charset=utf-8");
  };

  const onFiles = async (files: FileList | null) => {
    setMergeError(null);
    setMerged(null);
    if (!files || files.length === 0) return;
    try {
      const texts = await Promise.all([...files].map(async (f) => ({ name: f.name, text: await f.text() })));
      setMerged(mergeCsvTexts(texts));
    } catch {
      setMergeError("Gagal membaca berkas. Pastikan berkas berupa CSV hasil ekspor MathQuest.");
    }
  };
  const downloadMerged = () => {
    if (!merged) return;
    const enc = new TextEncoder();
    const zip = zipStore(mergedToCsv(merged, delimiter).map((t) => ({ name: t.spec.file, data: enc.encode(t.csv) })));
    download(`mathquest_gabungan_${stamp()}.zip`, zip, "application/zip");
  };

  return (
    <>
      <PageHeader eyebrow="Uji coba" title="Ekspor Data (CSV)" description="Unduh data belajarmu dari perangkat ini. Tanpa login, tanpa biaya." icon={<FileSpreadsheet className="h-6 w-6" />} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-5">
          <ParticipantCard onChange={() => reload()} />
          <Card>
            <h2 className="font-bold text-ink">Keadaan penyimpanan</h2>
            {status && (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-ink-muted">Event tersimpan</dt>
                <dd className="font-mono" data-testid="status-events">{status.events} / {status.maxEvents}</dd>
                <dt className="text-ink-muted">Event pembelajaran</dt>
                <dd className="font-mono">{status.learningEvents}</dd>
                <dt className="text-ink-muted">Perkiraan ukuran</dt>
                <dd className="font-mono">{Math.max(1, Math.round(status.approxBytes / 1024))} KB</dd>
                <dt className="text-ink-muted">Pretest / posttest</dt>
                <dd className="font-mono">
                  {research?.assessments.some((a) => a.kind === "pretest") ? "✓" : "—"} / {research?.assessments.some((a) => a.kind === "posttest") ? "✓" : "—"}
                </dd>
              </dl>
            )}
            {status?.nearLimit && (
              <p role="alert" className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Penyimpanan hampir penuh. Unduh data sekarang; event lama dapat terbuang.
              </p>
            )}
            {mode === "email" && <p className="mt-3 text-xs text-ink-muted">Mode akun: event rinci tidak disimpan di perangkat ini, sehingga ekspor hanya memuat hasil asesmen.</p>}
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <h2 className="font-bold text-ink">Risiko kehilangan data</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              <li>Data hanya ada di browser ini. Menghapus data situs, mode penyamaran, atau berganti browser/perangkat menghilangkannya.</li>
              <li>Unduh ZIP di akhir setiap pertemuan sebagai cadangan, dan serahkan ke guru.</li>
              <li>Satu perangkat satu siswa. Berkas dapat diubah oleh pemiliknya; gunakan untuk analisis uji coba, bukan penilaian resmi.</li>
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <Download className="h-5 w-5 text-brand-600" /> Unduh data
            </h2>
            {!code && <p className="mt-2 text-sm font-medium text-amber-800">Buat atau isi kode peserta dulu agar data dapat digabung dengan data teman sekelas.</p>}
            <div className="mt-3">
              <Segmented
                label="Pemisah kolom"
                value={delimiter}
                onChange={setDelimiter}
                options={[
                  { value: ";", label: "Titik koma ( ; )" },
                  { value: ",", label: "Koma ( , )" },
                ]}
              />
              <p className="mt-2 text-xs text-ink-muted">Excel dengan pengaturan Indonesia: pilih titik koma. Excel berbahasa Inggris, R, atau Python: pilih koma. Jika semua data muncul dalam satu kolom, ulangi dengan pemisah yang lain.</p>
            </div>
            <Button className="mt-4" disabled={!code} onClick={downloadAll}>
              <Download className="h-4 w-4" /> Unduh semua (.zip)
            </Button>
            <ul className="mt-4 divide-y divide-slate-100 text-sm" aria-label="Daftar berkas">
              {TABLE_SPECS.map((s) => (
                <li key={s.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-mono text-xs text-ink-muted">{s.file}</span>
                    <span className="block text-ink-soft">{s.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge color="slate">{counts[s.name] ?? 0} baris</Badge>
                    <Button size="sm" variant="outline" disabled={!code} onClick={() => downloadOne(s.file)} aria-label={`Unduh ${s.file}`}>
                      CSV
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card data-testid="merge-card">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <Layers className="h-5 w-5 text-grape-600" /> Gabungkan data banyak siswa (untuk guru)
            </h2>
            <p className="mt-2 text-sm text-ink-soft">Pilih beberapa berkas CSV hasil ekspor dari perangkat siswa (boleh dari banyak perangkat sekaligus). Berkas dikenali dari judul kolomnya, dan baris ganda dihapus. Semua proses terjadi di browser ini.</p>
            <label htmlFor="merge-files" className="mt-3 block text-sm font-semibold text-ink">
              Berkas CSV
            </label>
            <input id="merge-files" type="file" multiple accept=".csv,text/csv" className="mt-1.5 block w-full text-sm" onChange={(e) => void onFiles(e.target.files)} />
            {mergeError && (
              <p role="alert" className="mt-2 text-sm text-rose-700">
                {mergeError}
              </p>
            )}
            {merged && (
              <div className="mt-4 space-y-2 text-sm" data-testid="merge-result" role="status">
                <p>
                  <strong>{merged.stats.participants}</strong> peserta · <strong>{merged.stats.rows}</strong> baris digabung · <strong>{merged.stats.duplicates}</strong> baris ganda dihapus · {merged.stats.files} berkas dibaca
                </p>
                {merged.stats.unknownFiles.length > 0 && <p className="text-amber-800">Tidak dikenali: {merged.stats.unknownFiles.join(", ")}</p>}
                {merged.stats.warnings.slice(0, 6).map((w) => (
                  <p key={w} className="text-amber-800">
                    {w}
                  </p>
                ))}
                <Button size="sm" onClick={downloadMerged} disabled={Object.keys(merged.tables).length === 0}>
                  <Download className="h-4 w-4" /> Unduh hasil gabungan (.zip)
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
