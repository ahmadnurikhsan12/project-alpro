"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="konten" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <TriangleAlert className="h-12 w-12 text-amber-500" />
      <h1 className="text-2xl font-extrabold text-ink">Ada yang tidak beres</h1>
      <p className="max-w-sm text-ink-muted">Terjadi kesalahan saat menampilkan halaman ini. Progresmu tetap aman.</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <ButtonLink href="/dashboard" variant="outline">
          Ke Dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
