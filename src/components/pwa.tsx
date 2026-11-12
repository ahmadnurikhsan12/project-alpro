"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Mendaftarkan service worker (hanya di production). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

function useInstallState() {
  const [state, setState] = useState<{ canPrompt: boolean; installed: boolean; ios: boolean }>({ canPrompt: false, installed: false, ios: false });
  useEffect(() => {
    const update = () =>
      setState({
        canPrompt: !!deferred,
        installed: window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
        ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
      });
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return state;
}

/**
 * Tombol "Pasang Aplikasi". Muncul hanya jika browser mendukung pemasangan
 * (Android/Chrome/Edge) atau sebagai panduan di iPhone. Tidak tampil jika sudah terpasang.
 */
export function InstallAppButton({ variant = "outline", className }: { variant?: "outline" | "primary"; className?: string }) {
  const { canPrompt, installed, ios } = useInstallState();
  const [showIos, setShowIos] = useState(false);
  if (installed || (!canPrompt && !ios)) return null;

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            deferred = null;
            listeners.forEach((l) => l());
          } else setShowIos(true);
        }}
      >
        <Download className="h-4 w-4" /> Pasang Aplikasi
      </Button>
      {showIos && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
          <div className="w-full max-w-sm animate-pop rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 id="ios-install-title" className="flex items-center gap-2 font-bold text-ink">
                <Smartphone className="h-5 w-5 text-brand-600" /> Pasang di iPhone/iPad
              </h2>
              <button type="button" onClick={() => setShowIos(false)} className="rounded p-1 hover:bg-slate-100" aria-label="Tutup">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
              <li>Buka website ini di <strong>Safari</strong>.</li>
              <li>
                Ketuk tombol <strong>Bagikan</strong> <Share className="inline h-4 w-4" /> di bawah layar.
              </li>
              <li>
                Pilih <strong>Tambahkan ke Layar Utama</strong>, lalu ketuk <strong>Tambah</strong>.
              </li>
            </ol>
            <Button className="mt-4 w-full" onClick={() => setShowIos(false)}>
              Mengerti
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
