"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Award, BookOpen, ClipboardCheck, Cloud, LogOut, PencilLine, Sparkles, RotateCcw, Save, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useProgress } from "@/components/providers/progress-provider";
import { useToast } from "@/components/providers/toast-provider";
import { InstallAppButton } from "@/components/pwa";
import { Badge, Button, ButtonLink, Card, Field, inputClass, PageHeader, StatCard } from "@/components/ui";
import { deriveStats } from "@/lib/progress/engine";
import { profileSchema } from "@/lib/progress/schema";

type Form = { displayName: string };

export default function ProfilPage() {
  const { state, mode, user, displayName, setDisplayName, signOut, resetGuestProgress, supabaseEnabled, ready } = useProgress();
  const { push } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const st = deriveStats(state);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Form>({ resolver: zodResolver(profileSchema), defaultValues: { displayName } });

  useEffect(() => reset({ displayName }), [displayName, reset]);

  const onSubmit = async (v: Form) => {
    try {
      await setDisplayName(v.displayName);
      push({ tone: "success", title: "Nama berhasil disimpan." });
    } catch (e) {
      push({ tone: "warn", title: e instanceof Error ? e.message : "Gagal menyimpan nama." });
    }
  };

  return (
    <>
      <PageHeader eyebrow="Akun" title="Profil & Pengaturan" icon={<UserRound className="h-6 w-6" />} actions={<InstallAppButton />} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="font-bold text-ink">Identitas</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
              <Field label="Nama panggilan" htmlFor="displayName" hint="Ditampilkan di dashboard. Tidak perlu nama lengkap." error={errors.displayName?.message}>
                <input id="displayName" className={inputClass} maxLength={40} autoComplete="nickname" aria-invalid={!!errors.displayName} {...register("displayName")} />
              </Field>
              <Button type="submit" disabled={isSubmitting || !isDirty || !ready}>
                <Save className="h-4 w-4" /> Simpan nama
              </Button>
            </form>
            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Mode akses</dt>
                <dd>
                  <Badge color={mode === "email" ? "emerald" : "brand"}>
                    {mode === "email" ? <Cloud className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                    {mode === "email" ? "Email Mode" : "Guest Mode"}
                  </Badge>
                </dd>
              </div>
              {mode === "email" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Email</dt>
                  <dd className="truncate font-medium text-ink">{user?.email}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Penyimpanan</dt>
                <dd className="text-right text-ink-soft">{mode === "email" ? "Online (Supabase) — bisa dibuka di perangkat lain" : "Browser di perangkat ini"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-bold text-ink">Akun email</h2>
            {mode === "email" ? (
              <>
                <p className="mt-2 text-sm text-ink-soft">Progresmu tersimpan online. Setelah keluar, kamu kembali ke Guest Mode dan progres akun tetap aman untuk dibuka lagi kapan saja.</p>
                <Button variant="outline" className="mt-4" onClick={() => void signOut().then(() => push({ tone: "info", title: "Kamu telah keluar dari akun." }))}>
                  <LogOut className="h-4 w-4" /> Keluar dari akun
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-soft">
                  Ingin progres bisa dibuka di perangkat lain? Masuk dengan email — progres Guest Mode akan digabungkan secara aman.
                  {!supabaseEnabled && " (Fitur ini aktif setelah administrator mengonfigurasi Supabase.)"}
                </p>
                <ButtonLink href="/masuk" variant="secondary" className="mt-4">
                  <Cloud className="h-4 w-4" /> Simpan progres online
                </ButtonLink>
              </>
            )}
          </Card>

          {mode === "guest" && (
            <Card>
              <h2 className="font-bold text-ink">Data perangkat</h2>
              <p className="mt-2 text-sm text-ink-soft">Menghapus progres Guest Mode di browser ini. Tindakan ini tidak dapat dibatalkan.</p>
              {!confirmReset ? (
                <Button variant="ghost" className="mt-3 text-rose-600 hover:bg-rose-50" onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="h-4 w-4" /> Atur ulang progres
                </Button>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      resetGuestProgress();
                      setConfirmReset(false);
                      push({ tone: "info", title: "Progres Guest Mode telah diatur ulang." });
                    }}
                  >
                    Ya, hapus progres
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmReset(false)}>
                    Batal
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Level" value={st.level.level} hint={st.level.title} icon={<UserRound className="h-4 w-4" />} tone="grape" />
            <StatCard label="Total XP" value={state.xp} icon={<Sparkles className="h-4 w-4" />} />
            <StatCard label="Materi selesai" value={`${st.lessonsCompleted}/${st.totalLessons}`} icon={<BookOpen className="h-4 w-4" />} tone="emerald" />
            <StatCard label="Total latihan" value={st.practiceSessions} icon={<PencilLine className="h-4 w-4" />} tone="amber" />
            <StatCard label="Nilai evaluasi" value={st.bestEvaluation || "—"} hint="terbaik" icon={<ClipboardCheck className="h-4 w-4" />} tone="sky" />
            <StatCard label="Pencapaian" value={st.achievements} icon={<Award className="h-4 w-4" />} tone="rose" />
          </div>
          <Card>
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Privasi
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              <li>MathQuest hanya menyimpan nama panggilan (opsional), email untuk login, dan data belajar.</li>
              <li>Tidak ada kata sandi yang disimpan — login memakai kode/tautan sekali pakai.</li>
              <li>Data akun hanya dapat dibaca oleh pemiliknya (Row Level Security).</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
