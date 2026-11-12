import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export const metadata = { title: "Sedang offline" };

export default function OfflinePage() {
  return (
    <main id="konten" className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <WifiOff className="h-12 w-12 text-brand-500" />
      <h1 className="text-2xl font-extrabold text-ink">Kamu sedang offline</h1>
      <p className="max-w-sm text-ink-muted">
        Halaman ini belum tersimpan di perangkat. Halaman yang pernah kamu buka sebelumnya tetap bisa dibuka. Progres belajarmu tetap aman.
      </p>
      <ButtonLink href="/dashboard">Coba lagi</ButtonLink>
    </main>
  );
}
