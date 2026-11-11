"use client";

import {
  BookOpen,
  ClipboardCheck,
  Cloud,
  CloudOff,
  FlaskConical,
  Gamepad2,
  History,
  LayoutDashboard,
  Menu,
  PencilLine,
  RefreshCw,
  Smartphone,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { levelFromXp } from "@/lib/progress/gamification";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useProgress } from "./providers/progress-provider";
import { Button, ProgressBar } from "./ui";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materi", label: "Materi", icon: BookOpen },
  { href: "/lab", label: "SPLDV Lab", icon: FlaskConical },
  { href: "/latihan", label: "Latihan", icon: PencilLine },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/evaluasi", label: "Evaluasi", icon: ClipboardCheck },
  { href: "/pencapaian", label: "Pencapaian", icon: Trophy },
  { href: "/riwayat", label: "Riwayat", icon: History },
  { href: "/profil", label: "Profil", icon: UserRound },
] as const;

const BOTTOM = ["/dashboard", "/materi", "/lab", "/latihan", "/games"];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

function UserCard() {
  const { state, mode, displayName, user, ready } = useProgress();
  const lvl = levelFromXp(state.xp);
  const name = displayName || (mode === "email" ? user?.email?.split("@")[0] : "") || "Pelajar";
  return (
    <Link href="/profil" className="block rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 to-grape-50 p-3.5 transition hover:border-brand-300">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-grape-600 text-sm font-bold text-white">
          {lvl.level}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{ready ? name : "Memuat..."}</p>
          <p className="truncate text-xs text-ink-muted">
            {lvl.title} · {state.xp} XP
          </p>
        </div>
      </div>
      <ProgressBar value={lvl.progress} className="mt-3 h-1.5" label="Progres menuju level berikutnya" />
      <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-ink-muted">
        {mode === "email" ? <Cloud className="h-3.5 w-3.5 text-emerald-600" /> : <Smartphone className="h-3.5 w-3.5" />}
        {mode === "email" ? "Email Mode · tersimpan online" : "Guest Mode · tersimpan di perangkat"}
      </p>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-brand-600 text-white shadow-sm" : "text-ink-soft hover:bg-slate-100 hover:text-ink",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function StatusBanners() {
  const { sync, syncError, retrySync, mode, migration, dismissMigration, pendingCount } = useProgress();
  return (
    <>
      {migration && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 sm:flex-row sm:items-center sm:justify-between" role="status">
          <p className="text-sm">
            <strong>Progres Guest Mode berhasil digabungkan ke akunmu.</strong> {migration.imported} aktivitas dipindahkan
            {migration.skipped > 0 && `, ${migration.skipped} sudah ada/tidak diubah`}
            {migration.rejected > 0 && `, ${migration.rejected} ditolak karena tidak valid`}. XP dihitung ulang oleh server (+{migration.xpGained} XP).
          </p>
          <Button size="sm" variant="outline" onClick={dismissMigration}>
            Mengerti
          </Button>
        </div>
      )}
      {mode === "email" && (sync === "error" || sync === "offline") && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-900 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex items-start gap-2 text-sm">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {syncError ?? "Tidak dapat terhubung ke server."} {pendingCount > 0 && `${pendingCount} aktivitas tersimpan sementara di perangkat.`} Kamu tetap bisa belajar.
            </span>
          </p>
          <Button size="sm" variant="outline" onClick={() => void retrySync()}>
            <RefreshCw className="h-4 w-4" /> Coba sinkron lagi
          </Button>
        </div>
      )}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <Logo href="/" className="px-2" />
        <UserCard />
        <NavLinks />
      </aside>

      {/* Top bar mobile */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-ink hover:bg-slate-100"
          aria-label="Buka menu"
          aria-expanded={open}
          aria-controls="menu-mobile"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi" id="menu-mobile">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Tutup menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[84%] max-w-xs animate-fade-up flex-col gap-5 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo href="/" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <UserCard />
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main id="konten" className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <StatusBanners />
          {children}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav aria-label="Navigasi cepat" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => BOTTOM.includes(n.href)).map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", active ? "text-brand-600" : "text-ink-muted")}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label === "SPLDV Lab" ? "Lab" : label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
