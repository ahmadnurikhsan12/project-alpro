import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "MathQuest — Belajar SPLDV Interaktif", template: "%s · MathQuest" },
  description:
    "MathQuest adalah media pembelajaran interaktif Sistem Persamaan Linear Dua Variabel (SPLDV) untuk siswa SMP kelas VIII: materi, simulasi eliminasi, grafik, latihan, evaluasi, dan game edukatif.",
  applicationName: "MathQuest",
  keywords: ["SPLDV", "metode eliminasi", "matematika SMP", "kelas VIII", "persamaan linear"],
};

export const viewport: Viewport = {
  themeColor: "#2546ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        <a
          href="#konten"
          className="sr-only z-[100] rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Lewati ke konten utama
        </a>
        <ToastProvider>
          <ProgressProvider>{children}</ProgressProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
