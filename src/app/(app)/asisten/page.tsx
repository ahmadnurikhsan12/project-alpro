"use client";

import { Bot, CheckCircle2, HelpCircle, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, DIFFICULTY_LABEL, PageHeader, ProgressBar, Segmented, Spinner, inputClass } from "@/components/ui";
import { CHECKED_STAGES, STAGES, STAGE_INFO, SUPPORT_LABEL, type CheckResponse, type PublicProblem, type Stage, type StageInput } from "@/lib/asisten/types";

interface Form {
  px: number | null;
  py: number | null;
  ask: number | null;
  eq: [string, string, string, string, string, string];
  variable: "x" | "y" | null;
  operation: "tambah" | "kurang" | null;
  reason: "sama" | "kecil" | "urutan" | null;
  x: string;
  y: string;
  value: string;
}
const EMPTY: Form = { px: null, py: null, ask: null, eq: ["", "", "", "", "", ""], variable: null, operation: null, reason: null, x: "", y: "", value: "" };

const REFLECTIONS = [
  { id: "sulit", q: "Tahap mana yang paling menantang bagimu?", options: ["Memahami cerita", "Membuat persamaan", "Merencanakan", "Menghitung", "Menafsirkan hasil"] },
  { id: "periksa", q: "Bagaimana kamu memastikan jawabanmu benar?", options: ["Substitusi ke kedua persamaan", "Mencocokkan dengan cerita", "Belum memeriksa"] },
  { id: "lain", q: "Untuk masalah lain, apa langkah pertamamu?", options: ["Menentukan arti variabel", "Langsung menghitung", "Menebak jawabannya"] },
];

/** Menyusun masukan tahap; null bila belum lengkap. Saat meminta bantuan, isian kosong diperbolehkan. */
function toInput(stage: Stage, f: Form, help: boolean): StageInput | null {
  switch (stage) {
    case "pahami":
      if (!help && (f.px === null || f.py === null || f.ask === null)) return null;
      return { stage, x: f.px ?? 0, y: f.py ?? 0, ask: f.ask ?? 0 };
    case "model":
      return !help && f.eq.some((v) => !v.trim()) ? null : { stage, eq: f.eq };
    case "rencana":
      if (!help && (!f.variable || !f.operation || !f.reason)) return null;
      return { stage, variable: f.variable ?? "x", operation: f.operation ?? "kurang", reason: f.reason ?? "kecil" };
    case "selesaikan":
      return !help && (!f.x.trim() || !f.y.trim()) ? null : { stage, x: f.x, y: f.y };
    case "tafsirkan":
      return !help && !f.value.trim() ? null : { stage, value: f.value };
    default:
      return null;
  }
}

export default function AsistenPage() {
  const [problems, setProblems] = useState<PublicProblem[] | null>(null);
  const [ai, setAi] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [problem, setProblem] = useState<PublicProblem | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [wrong, setWrong] = useState(0);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflection, setReflection] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/asisten", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { problems: PublicProblem[]; ai: boolean }) => {
        setProblems(d.problems);
        setAi(d.ai);
      })
      .catch(() => setLoadError(true));
  }, []);

  const start = (p: PublicProblem) => {
    setProblem(p);
    setStep(0);
    setForm(EMPTY);
    setWrong(0);
    setResult(null);
    setNotes([]);
    setMessage("");
    setError(null);
    setReflection({});
    setDone(false);
  };

  const stage = STAGES[step];
  const info = STAGE_INFO[stage];
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const send = async (help: boolean) => {
    if (!problem || busy) return;
    const input = toInput(stage, form, help);
    if (!input) return setError("Lengkapi jawabanmu dulu, atau tekan Minta bantuan.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/asisten", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ problemId: problem.id, input, wrong, help, message: message.trim() || undefined }) });
      const data = (await res.json()) as CheckResponse & { error?: string };
      if (!res.ok) return setError(data.error ?? "Belum bisa diperiksa. Coba lagi.");
      setResult(data);
      if (data.correct) {
        if (data.note) setNotes((n) => [...n, data.note!]);
      } else if (!help) setWrong((w) => w + 1);
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi internetmu.");
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setStep((s) => s + 1);
    setWrong(0);
    setResult(null);
    setMessage("");
    setError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Soal cerita bertahap" title="Asisten Belajar" description="Selesaikan masalah sehari-hari selangkah demi selangkah. Asisten membimbing cara berpikirmu, bukan memberi jawaban." icon={<Bot className="h-5 w-5" />} />

      {loadError && (
        <p role="alert" className="text-sm font-medium text-rose-700">
          Soal belum dapat dimuat. Periksa koneksi lalu muat ulang halaman.
        </p>
      )}
      {!problems && !loadError && (
        <Card>
          <Spinner className="h-5 w-5" />
        </Card>
      )}

      {problems && !problem && (
        <>
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-ink-soft" data-testid="asisten-status">
            {ai
              ? "Bimbingan AI aktif. Jawaban dan catatan kesulitanmu dikirim ke layanan AI pihak ketiga, jadi jangan menulis nama atau data pribadi. AI bisa keliru."
              : "Bimbingan AI sedang tidak aktif. Petunjuk bertahap tetap tersedia."}
          </p>
          <ul className="grid gap-4 md:grid-cols-3">
            {problems.map((p) => (
              <li key={p.id}>
                <Card className="flex h-full flex-col">
                  <Badge color={p.level === "mudah" ? "emerald" : p.level === "sedang" ? "amber" : "rose"}>{DIFFICULTY_LABEL[p.level]}</Badge>
                  <h2 className="mt-2 text-lg font-bold text-ink">{p.title}</h2>
                  <p className="mt-1 flex-1 text-sm text-ink-soft">{p.story}</p>
                  <Button className="mt-3" onClick={() => start(p)}>
                    Kerjakan
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-muted">Saran: mulai dari tingkat mudah, lalu naik bertahap.</p>
        </>
      )}

      {problem && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <Card>
              <h2 className="font-bold text-ink">{problem.title}</h2>
              <p className="mt-2 text-sm text-ink-soft">{problem.story}</p>
              <p className="mt-2 text-sm font-semibold text-ink">{problem.question}</p>
            </Card>
            <Card data-testid="catatan-kerja">
              <h2 className="flex items-center gap-2 font-bold text-ink">
                <ListChecks className="h-5 w-5 text-brand-600" aria-hidden /> Catatan kerja
              </h2>
              {notes.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">Hasil tiap tahap yang sudah benar akan muncul di sini.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  {notes.map((n) => (
                    <li key={n} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Button variant="ghost" size="sm" onClick={() => setProblem(null)}>
              Pilih soal lain
            </Button>
          </div>

          <div className="space-y-4">
            <ProgressBar value={((done ? STAGES.length : step) / STAGES.length) * 100} label="Kemajuan tahap" />
            <Card data-testid={`tahap-${stage}`}>
              <p className="text-sm font-semibold text-brand-700">
                Tahap {step + 1} dari {STAGES.length}
              </p>
              <h2 className="text-lg font-bold text-ink">{info.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">Tujuan: {info.goal}</p>

              <div className="mt-4 space-y-4">
                {stage === "pahami" && (
                  <>
                    <Choice name="Apa arti x?" options={problem.options.x} value={form.px} onChange={(v) => set("px", v)} />
                    <Choice name="Apa arti y?" options={problem.options.y} value={form.py} onChange={(v) => set("py", v)} />
                    <Choice name="Apa yang ditanyakan?" options={problem.options.ask} value={form.ask} onChange={(v) => set("ask", v)} />
                  </>
                )}
                {stage === "model" &&
                  [0, 1].map((row) => (
                    <fieldset key={row} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <legend className="mb-1 font-semibold">Persamaan ({row + 1}), total dalam ribuan</legend>
                      {(["koefisien x", "koefisien y", "total"] as const).map((label, k) => (
                        <span key={label} className="flex items-center gap-2">
                          <input
                            aria-label={`Persamaan ${row + 1}: ${label}`}
                            inputMode="decimal"
                            className={`${inputClass} w-20 text-center`}
                            maxLength={8}
                            value={form.eq[row * 3 + k]}
                            onChange={(e) => {
                              const eq = [...form.eq] as Form["eq"];
                              eq[row * 3 + k] = e.target.value;
                              set("eq", eq);
                            }}
                          />
                          <span className="font-mono">{k === 0 ? "x +" : k === 1 ? "y =" : ""}</span>
                        </span>
                      ))}
                    </fieldset>
                  ))}
                {stage === "rencana" && (
                  <>
                    <Pick label="Variabel yang dieliminasi" value={form.variable} onChange={(v) => set("variable", v)} options={[{ value: "x", label: "x" }, { value: "y", label: "y" }]} />
                    <Pick label="Operasi setelah koefisiennya sama" value={form.operation} onChange={(v) => set("operation", v)} options={[{ value: "tambah", label: "Dijumlahkan" }, { value: "kurang", label: "Dikurangkan" }]} />
                    <Pick
                      label="Alasan memilih variabel itu"
                      value={form.reason}
                      onChange={(v) => set("reason", v)}
                      options={[
                        { value: "sama", label: "Koefisiennya sudah sama besar" },
                        { value: "kecil", label: "Pengalinya tidak lebih besar" },
                        { value: "urutan", label: "Urutan hurufnya" },
                      ]}
                    />
                  </>
                )}
                {stage === "selesaikan" && (
                  <div className="flex flex-wrap gap-4">
                    <NumberField label="x =" value={form.x} onChange={(v) => set("x", v)} />
                    <NumberField label="y =" value={form.y} onChange={(v) => set("y", v)} />
                  </div>
                )}
                {stage === "tafsirkan" && <NumberField label={`Jawaban cerita (${problem.unit})`} value={form.value} onChange={(v) => set("value", v)} />}
                {stage === "refleksi" &&
                  REFLECTIONS.map((r) => <Choice key={r.id} name={r.q} options={r.options} value={reflection[r.id] === undefined ? null : r.options.indexOf(reflection[r.id])} onChange={(i) => setReflection((x) => ({ ...x, [r.id]: r.options[i] }))} />)}
              </div>

              {stage !== "refleksi" && !result?.correct && (
                <>
                  <label htmlFor="kesulitan" className="mt-4 block text-sm font-semibold text-ink">
                    Bagian yang membingungkan (opsional)
                  </label>
                  <input id="kesulitan" className={`${inputClass} mt-1`} maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="mis. saya bingung angka mana yang jadi koefisien" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => void send(false)}>
                      Periksa
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => void send(true)}>
                      <HelpCircle className="h-4 w-4" aria-hidden /> Minta bantuan
                    </Button>
                  </div>
                </>
              )}

              {busy && (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                  <Spinner className="h-4 w-4" /> Asisten memeriksa...
                </p>
              )}
              {error && (
                <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}

              <div aria-live="polite">
                {result && !busy && (
                  <div data-testid="asisten-feedback" className={`mt-4 rounded-xl border p-4 text-sm ${result.correct ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <p className="font-semibold">{result.feedback}</p>
                    {result.level && result.hint && (
                      <p className="mt-2">
                        <span className="font-semibold">
                          Bantuan tingkat {result.level} ({SUPPORT_LABEL[result.level]}):
                        </span>{" "}
                        {result.hint}
                      </p>
                    )}
                    {result.ai && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-ink" data-testid="asisten-ai">
                        <span className="font-semibold">Asisten AI:</span> {result.ai}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {result?.correct && step < CHECKED_STAGES.length && (
                <Button className="mt-3" onClick={next}>
                  Lanjut ke tahap berikutnya
                </Button>
              )}
              {stage === "refleksi" && !done && (
                <Button className="mt-4" disabled={Object.keys(reflection).length < REFLECTIONS.length} onClick={() => setDone(true)}>
                  Selesaikan
                </Button>
              )}
              {done && (
                <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900" data-testid="asisten-selesai">
                  Hebat, kamu menuntaskan seluruh tahap. Langkah yang sama dapat dipakai untuk masalah lain: pahami, modelkan, rencanakan, selesaikan, lalu tafsirkan.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Choice({ name, options, value, onChange }: { name: string; options: string[]; value: number | null; onChange: (i: number) => void }) {
  return (
    <div role="radiogroup" aria-label={name}>
      <p className="text-sm font-semibold text-ink">{name}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === i}
            onClick={() => onChange(i)}
            className={`rounded-xl border px-3 py-2 text-left text-sm ${value === i ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-slate-200 bg-white text-ink-soft hover:bg-slate-50"}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Pick<T extends string>({ label, value, onChange, options }: { label: string; value: T | null; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-ink">{label}</p>
      <Segmented label={label} value={(value ?? "") as T} onChange={onChange} options={options} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
      {label}
      <input inputMode="decimal" className={`${inputClass} w-36`} maxLength={12} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
