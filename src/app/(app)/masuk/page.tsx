"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Cloud, KeyRound, Mail, Smartphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useProgress } from "@/components/providers/progress-provider";
import { Button, ButtonLink, Card, Field, inputClass, LoadingBlock, PageHeader, Spinner } from "@/components/ui";
import { hasGuestProgress } from "@/lib/storage/local";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/supabase/config";

const emailSchema = z.object({ email: z.string().trim().min(1, "Email wajib diisi.").email("Format email belum benar.") });
const codeSchema = z.object({ code: z.string().trim().regex(/^\d{6,10}$/, "Kode berupa 6 digit angka dari email.") });

function friendly(msg: string) {
  if (/rate|seconds|too many/i.test(msg)) return "Terlalu sering meminta kode. Tunggu sekitar satu menit lalu coba lagi.";
  if (/expired|invalid/i.test(msg)) return "Kode salah atau sudah kedaluwarsa. Minta kode baru.";
  return "Terjadi kendala saat mengirim/memverifikasi. Coba lagi beberapa saat lagi.";
}

function MasukContent() {
  const { supabaseEnabled, mode, user, ready } = useProgress();
  const params = useSearchParams();
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? "Tautan masuk tidak valid atau sudah kedaluwarsa. Minta tautan baru." : null);
  const emailForm = useForm<{ email: string }>({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) });
  const guestData = typeof window !== "undefined" && hasGuestProgress();

  const sendCode = async ({ email }: { email: string }) => {
    setError(null);
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error: err } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
    });
    if (err) setError(friendly(err.message));
    else setSentTo(email);
  };

  const verify = async ({ code }: { code: string }) => {
    setError(null);
    const sb = getBrowserSupabase();
    if (!sb || !sentTo) return;
    const { error: err } = await sb.auth.verifyOtp({ email: sentTo, token: code, type: "email" });
    if (err) setError(friendly(err.message));
    else router.push("/dashboard");
  };

  if (!ready) return <LoadingBlock />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Opsional" title="Simpan Progres Online" icon={<Cloud className="h-6 w-6" />} description="Masuk dengan email agar progres bisa dibuka di perangkat lain. Tanpa kata sandi." />

      {mode === "email" ? (
        <Card className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-3 text-lg font-bold text-ink">Kamu sudah masuk sebagai {user?.email}</h2>
          <p className="mt-1 text-sm text-ink-muted">Progresmu tersimpan online secara otomatis.</p>
          <ButtonLink href="/dashboard" className="mt-5">
            Ke Dashboard <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </Card>
      ) : !supabaseEnabled ? (
        <Card>
          <h2 className="font-bold text-ink">Penyimpanan online belum diaktifkan</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Administrator website belum mengonfigurasi Supabase, sehingga login email belum tersedia. Kamu tetap bisa memakai <strong>semua fitur</strong> dalam Guest Mode — progres tersimpan di browser ini.
          </p>
          <p className="mt-2 text-xs text-ink-muted">Untuk pengembang: isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY (lihat README).</p>
          <ButtonLink href="/dashboard" className="mt-5">
            Mulai Belajar (Guest Mode) <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
          <Card>
            {!sentTo ? (
              <form onSubmit={emailForm.handleSubmit(sendCode)} noValidate className="space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-ink">
                  <Mail className="h-5 w-5 text-grape-600" /> Masuk / daftar dengan email
                </h2>
                <Field label="Alamat email" htmlFor="email" error={emailForm.formState.errors.email?.message} hint="Kami akan mengirim kode 6 digit dan tautan masuk.">
                  <input id="email" type="email" autoComplete="email" inputMode="email" className={inputClass} placeholder="nama@contoh.com" aria-invalid={!!emailForm.formState.errors.email} {...emailForm.register("email")} />
                </Field>
                <Button type="submit" variant="secondary" disabled={emailForm.formState.isSubmitting} className="w-full">
                  {emailForm.formState.isSubmitting ? <Spinner /> : <Mail className="h-4 w-4" />} Kirim kode
                </Button>
              </form>
            ) : (
              <form onSubmit={codeForm.handleSubmit(verify)} noValidate className="space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-ink">
                  <KeyRound className="h-5 w-5 text-grape-600" /> Masukkan kode
                </h2>
                <p className="text-sm text-ink-soft">
                  Kode telah dikirim ke <strong>{sentTo}</strong>. Masukkan kodenya di sini, atau klik tautan di email.
                </p>
                <Field label="Kode verifikasi" htmlFor="code" error={codeForm.formState.errors.code?.message}>
                  <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} className={`${inputClass} text-center font-mono text-2xl tracking-[0.4em]`} aria-invalid={!!codeForm.formState.errors.code} {...codeForm.register("code")} />
                </Field>
                <Button type="submit" variant="secondary" disabled={codeForm.formState.isSubmitting} className="w-full">
                  {codeForm.formState.isSubmitting ? <Spinner /> : <KeyRound className="h-4 w-4" />} Verifikasi & masuk
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSentTo(null);
                    codeForm.reset();
                  }}
                >
                  Ganti email / kirim ulang
                </Button>
              </form>
            )}
            {error && (
              <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">
                {error}
              </p>
            )}
          </Card>
          <Card className="h-fit">
            <h2 className="font-bold text-ink">Yang perlu kamu tahu</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Login bersifat opsional — semua fitur tetap terbuka tanpa akun.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Tidak ada kata sandi; kode hanya berlaku sebentar.
              </li>
              <li className="flex gap-2">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {guestData
                  ? "Progres Guest Mode di perangkat ini akan digabungkan ke akunmu setelah masuk. XP dihitung ulang oleh server dan tidak ada yang tercatat ganda."
                  : "Jika kamu punya progres Guest Mode, progres itu akan digabungkan otomatis ke akunmu."}
              </li>
            </ul>
            <ButtonLink href="/dashboard" variant="ghost" className="mt-4">
              Lanjut tanpa login
            </ButtonLink>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MasukPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <MasukContent />
    </Suspense>
  );
}
