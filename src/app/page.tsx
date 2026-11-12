import {
  ArrowRight,
  BookOpen,
  ChartLine,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  FlaskConical,
  Gamepad2,
  Lightbulb,
  PencilLine,
  ShieldCheck,
  Smartphone,
  Trophy,
} from "lucide-react";
import { HeroGraph } from "@/components/illustrations";
import { Logo } from "@/components/logo";
import { InstallAppButton } from "@/components/pwa";
import { Badge, ButtonLink, DifficultyBadge } from "@/components/ui";
import { GAMES } from "@/content/games";
import { LESSONS } from "@/content/lessons";

const FEATURES = [
  { icon: BookOpen, title: "7 Modul Bertahap", text: "Dari pengertian PLDV sampai soal cerita, lengkap dengan contoh langkah demi langkah dan mini quiz.", color: "bg-brand-50 text-brand-600" },
  { icon: FlaskConical, title: "SPLDV Lab", text: "Uji pasangan nilai, jalankan simulasi eliminasi langkah demi langkah, dan lihat titik potong di grafik.", color: "bg-grape-50 text-grape-600" },
  { icon: PencilLine, title: "Latihan Bervariasi", text: "42 soal dengan 7 jenis bentuk soal, tiga tingkat kesulitan, petunjuk bertahap, dan pembahasan.", color: "bg-emerald-50 text-emerald-600" },
  { icon: Gamepad2, title: "7 Game Edukatif", text: "Detektif, belanja, adu cepat, mencocokkan, menyusun langkah — tiap game punya mekanisme berbeda.", color: "bg-orange-50 text-orange-600" },
  { icon: ClipboardCheck, title: "Evaluasi Akhir", text: "Jumlah soal & timer dapat diatur. Dinilai otomatis oleh server tanpa membocorkan kunci jawaban.", color: "bg-sky-50 text-sky-600" },
  { icon: Trophy, title: "XP, Level & Badge", text: "Dapatkan XP dari aktivitas nyata, naik level, dan kumpulkan 12 pencapaian.", color: "bg-amber-50 text-amber-600" },
];

const OBJECTIVES = [
  "Memahami pengertian PLDV dan SPLDV beserta penyelesaiannya.",
  "Menyusun model matematika dari soal cerita sehari-hari.",
  "Menyelesaikan SPLDV dengan metode eliminasi secara runtut.",
  "Memeriksa kebenaran penyelesaian dan mengenali kesalahan umum.",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Navigasi beranda">
            <ButtonLink href="/materi" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Materi
            </ButtonLink>
            <ButtonLink href="/games" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Games
            </ButtonLink>
            <ButtonLink href="/masuk" variant="outline" size="sm">
              Masuk
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main id="konten">
        {/* HERO */}
        <section className="grid-paper relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-grape-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <div className="animate-fade-up">
              <Badge color="brand" className="mb-4">
                <Lightbulb className="h-3.5 w-3.5" /> Matematika SMP Kelas VIII
              </Badge>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
                Kuasai <span className="bg-gradient-to-r from-brand-600 to-grape-600 bg-clip-text text-transparent">SPLDV</span> dengan cara yang seru dan masuk akal.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                MathQuest membantumu memahami Sistem Persamaan Linear Dua Variabel dan metode eliminasi lewat penjelasan bertahap, simulasi interaktif, latihan, dan permainan.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/dashboard" size="lg">
                  Mulai Belajar <ArrowRight className="h-5 w-5" />
                </ButtonLink>
                <ButtonLink href="/masuk" size="lg" variant="outline">
                  <Cloud className="h-5 w-5" /> Simpan Progres
                </ButtonLink>
              </div>
              <p className="mt-3 text-sm text-ink-muted">Tanpa daftar, tanpa login. Langsung belajar.</p>
              <div className="mt-4">
                <InstallAppButton />
              </div>
            </div>
            <div className="mx-auto w-full max-w-md animate-pop rounded-[28px] border border-slate-200 bg-white p-3 shadow-lift">
              <HeroGraph />
              <p className="px-2 pb-1 pt-3 text-center text-sm text-ink-muted">
                Penyelesaian SPLDV = <strong className="text-emerald-700">titik potong</strong> dua garis.
              </p>
            </div>
          </div>
        </section>

        {/* AKSES */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="akses">
          <h2 id="akses" className="text-center text-2xl font-extrabold text-ink sm:text-3xl">
            Pilih cara belajarmu
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-ink-muted">Semua materi, latihan, evaluasi, dan game tersedia di kedua mode.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-3xl border-2 border-brand-200 bg-brand-50/50 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-brand-600 p-3 text-white">
                  <Smartphone className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink">Mulai Belajar (Guest Mode)</h3>
                  <p className="text-sm text-ink-muted">Langsung pakai, tanpa akun</p>
                </div>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                {["Semua fitur terbuka penuh", "XP, level, dan pencapaian tetap didapat", "Progres disimpan di browser perangkat ini", "Jika data browser dihapus atau ganti perangkat, progres lokal tidak dapat dipulihkan"].map((t, i) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 className={i === 3 ? "mt-0.5 h-4 w-4 shrink-0 text-amber-500" : "mt-0.5 h-4 w-4 shrink-0 text-emerald-600"} /> {t}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/dashboard" className="mt-6">
                Mulai Belajar <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
            <div className="flex flex-col rounded-3xl border-2 border-grape-200 bg-grape-50/50 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-grape-600 p-3 text-white">
                  <Cloud className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink">Simpan Progres (Email Mode)</h3>
                  <p className="text-sm text-ink-muted">Opsional, tanpa kata sandi</p>
                </div>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                {["Masuk dengan kode/tautan yang dikirim ke email", "Progres tersimpan online dan bisa dibuka di perangkat lain", "Progres Guest Mode otomatis digabungkan dengan aman", "Bisa keluar dari akun kapan saja"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {t}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/masuk" variant="secondary" className="mt-6">
                Simpan Progres <Cloud className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* TUJUAN */}
        <section className="bg-slate-50 py-14" aria-labelledby="tujuan">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 id="tujuan" className="text-2xl font-extrabold text-ink sm:text-3xl">
                Tujuan pembelajaran
              </h2>
              <p className="mt-2 text-ink-muted">Setelah belajar di MathQuest, kamu diharapkan mampu:</p>
              <ul className="mt-5 space-y-3">
                {OBJECTIVES.map((o, i) => (
                  <li key={o} className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                    <span className="text-ink-soft">{o}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Materi SPLDV</h2>
              <p className="mt-2 text-ink-muted">Tujuh modul yang disusun dari konsep dasar hingga penerapan.</p>
              <ol className="mt-5 space-y-2">
                {LESSONS.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-sm font-semibold text-ink">
                      <span className="mr-2 text-brand-600">Modul {l.number}</span>
                      {l.title}
                    </span>
                    <DifficultyBadge difficulty={l.difficulty} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* FITUR */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="fitur">
          <h2 id="fitur" className="text-center text-2xl font-extrabold text-ink sm:text-3xl">
            Semua yang kamu butuhkan untuk belajar SPLDV
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, color }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className={`inline-flex rounded-xl p-2.5 ${color}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-bold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {GAMES.map((g) => (
              <Badge key={g.id} color="grape">
                <Gamepad2 className="h-3.5 w-3.5" /> {g.title}
              </Badge>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 rounded-3xl bg-gradient-to-br from-brand-600 to-grape-600 px-6 py-12 text-center text-white">
            <ChartLine className="h-10 w-10" />
            <h2 className="text-2xl font-extrabold sm:text-3xl">Siap menemukan titik potongnya?</h2>
            <p className="max-w-xl text-white/85">Mulai dari Modul 1, atau langsung coba simulasi eliminasi di SPLDV Lab.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard" size="lg" className="bg-white !text-brand-700 hover:bg-brand-50">
                Mulai Belajar
              </ButtonLink>
              <ButtonLink href="/lab" size="lg" variant="ghost" className="!text-white ring-1 ring-white/60 hover:bg-white/10">
                Buka SPLDV Lab
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-ink-muted sm:flex-row sm:px-6">
          <Logo />
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Tidak mengumpulkan data pribadi yang tidak diperlukan.
          </p>
        </div>
      </footer>
    </div>
  );
}
