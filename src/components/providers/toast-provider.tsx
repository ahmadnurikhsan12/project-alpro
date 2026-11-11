"use client";

import { Award, CheckCircle2, Info, Sparkles, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "xp" | "achievement" | "warn";

interface Toast {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}

const ToastContext = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

const ICON = { success: CheckCircle2, info: Info, xp: Sparkles, achievement: Award, warn: TriangleAlert };
const STYLE: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-brand-200 bg-white text-ink",
  xp: "border-grape-200 bg-grape-50 text-grape-700",
  achievement: "border-amber-200 bg-amber-50 text-amber-900",
  warn: "border-orange-200 bg-orange-50 text-orange-900",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "achievement" ? 6000 : 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end lg:bottom-6"
      >
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div
              key={t.id}
              className={cn("pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-xl border p-3 shadow-card", STYLE[t.tone])}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm opacity-80">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded p-0.5 opacity-60 hover:opacity-100 focus-visible:opacity-100"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}
