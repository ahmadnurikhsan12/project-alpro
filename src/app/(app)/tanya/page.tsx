"use client";

import Link from "next/link";
import { MessageCircle, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader, Spinner, inputClass } from "@/components/ui";

const CONSENT_KEY = "mathquest.tanya.consent.v1";
const MAX = 400;
const SUGGESTIONS = [
  "Kenapa kalau tandanya sama, persamaannya dikurangkan?",
  "Bagaimana memilih variabel yang dieliminasi lebih dulu?",
  "Apa arti titik potong dua garis pada SPLDV?",
  "Kenapa hasilnya perlu diperiksa dengan substitusi?",
];

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: { title: string; href: string }[];
  note?: string;
}

function readConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export default function TanyaPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConsent(readConsent());
    fetch("/api/tanya", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs, busy]);

  const agree = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* tetap lanjut untuk sesi ini */
    }
    setConsent(true);
  };

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    const history = msgs.slice(-4).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setText("");
    try {
      const res = await fetch("/api/tanya", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, history }) });
      const data = (await res.json()) as { answer?: string; error?: string; sources?: Msg["sources"]; blocked?: boolean; guided?: boolean };
      if (!res.ok || !data.answer) {
        setError(data.error ?? "Tutor AI belum bisa menjawab. Coba lagi nanti.");
        setMsgs((m) => m.slice(0, -1));
        setText(question);
      } else {
        setMsgs((m) => [...m, { role: "assistant", text: data.answer!, sources: data.sources, note: data.guided ? "Ini tampak seperti soal latihan, jadi tutor hanya memberi petunjuk, bukan jawaban akhir." : undefined }]);
      }
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi internetmu.");
      setMsgs((m) => m.slice(0, -1));
      setText(question);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Bantuan belajar" title="Tanya Tutor AI" description="Tanyakan hal yang belum kamu pahami tentang SPLDV. Jawaban disusun dari materi MathQuest." icon={<MessageCircle className="h-5 w-5" />} />

      <Card className="border-amber-200 bg-amber-50">
        <h2 className="flex items-center gap-2 font-bold text-amber-900">
          <TriangleAlert className="h-5 w-5" aria-hidden /> Baca dulu
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
          <li>Ini adalah <strong>AI</strong>, bukan guru. Jawabannya bisa keliru: periksa dengan materi, substitusi, atau tanyakan kepada gurumu.</li>
          <li>Pertanyaanmu dikirim lewat server MathQuest ke <strong>layanan AI gratis pihak ketiga</strong>. <strong>Jangan menulis nama, sekolah, nomor, atau data pribadi.</strong> Percakapan tidak disimpan di MathQuest dan tidak ikut diekspor.</li>
          <li>Selama Pretest, Posttest, dan Evaluasi Akhir, tutor tidak membantu mengerjakan soalnya. Untuk soal Latihan, tutor hanya memberi petunjuk.</li>
          <li>Tutor ini tidak menggantikan bimbingan guru. Petunjuk bertahap (L1 sampai L4) di <Link href="/latihan" className="font-semibold underline">Latihan</Link> tetap tersedia tanpa AI.</li>
        </ul>
      </Card>

      {enabled === null && (
        <Card>
          <Spinner className="h-5 w-5" />
        </Card>
      )}

      {enabled === false && (
        <Card data-testid="tanya-disabled">
          <h2 className="font-bold text-ink">Tutor AI belum aktif</h2>
          <p className="mt-1 text-sm text-ink-soft">Fitur ini sedang tidak aktif di situs ini (belum disiapkan atau sedang dimatikan). Seluruh fitur belajar lain tetap berjalan, termasuk tutor petunjuk bertahap di Latihan.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
            <Link className="underline" href="/materi">Buka Materi</Link>
            <Link className="underline" href="/latihan">Kerjakan Latihan</Link>
          </div>
        </Card>
      )}

      {enabled && !consent && (
        <Card data-testid="tanya-consent">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden /> Persetujuan
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Dengan lanjut, kamu paham bahwa pertanyaan matematikamu dikirim ke layanan AI pihak ketiga dan kamu tidak akan menulis data pribadi. Jika ragu, tanyakan kepada guru lebih dulu.</p>
          <Button className="mt-3" onClick={agree}>
            Saya mengerti, lanjut
          </Button>
        </Card>
      )}

      {enabled && consent && (
        <Card data-testid="tanya-chat">
          <div className="space-y-3" aria-live="polite" aria-label="Percakapan">
            {msgs.length === 0 && (
              <div>
                <p className="text-sm text-ink-soft">Coba salah satu pertanyaan ini, atau tulis sendiri:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setText(s)} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-sm font-medium text-brand-700 hover:bg-brand-100">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} data-testid={`tanya-${m.role}`} className={m.role === "user" ? "ml-auto max-w-[90%] rounded-2xl bg-brand-600 px-4 py-2.5 text-sm text-white" : "max-w-[95%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-ink"}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.note && <p className="mt-2 text-xs text-ink-muted">{m.note}</p>}
                {m.sources && m.sources.length > 0 && (
                  <p className="mt-2 text-xs text-ink-muted">
                    Baca juga:{" "}
                    {m.sources.map((s, k) => (
                      <span key={s.href}>
                        {k > 0 && ", "}
                        <Link href={s.href} className="font-semibold underline">
                          {s.title}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
                {m.role === "assistant" && <p className="mt-2 text-xs text-ink-muted">Jawaban AI dapat keliru. Periksa dengan substitusi.</p>}
              </div>
            ))}
            {busy && (
              <p className="flex items-center gap-2 text-sm text-ink-soft" role="status">
                <Spinner className="h-4 w-4" /> Tutor sedang berpikir...
              </p>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
          >
            <label htmlFor="tanya-input" className="text-sm font-semibold text-ink">
              Pertanyaanmu
            </label>
            <textarea id="tanya-input" className={`${inputClass} mt-1.5 min-h-24 resize-y`} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pertanyaan tentang SPLDV (tanpa data pribadi)" />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-ink-muted">
                {text.length}/{MAX}
              </span>
              <Button type="submit" disabled={busy || text.trim().length < 3}>
                <Send className="h-4 w-4" aria-hidden /> Kirim
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
