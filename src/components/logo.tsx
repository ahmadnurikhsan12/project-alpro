import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo MathQuest: dua garis yang berpotongan di satu titik — penyelesaian SPLDV.
 * Latar gradien memakai CSS (bukan <linearGradient> SVG) agar tidak bentrok ID
 * ketika logo muncul beberapa kali dalam satu halaman.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-9 w-9 shrink-0 rounded-[11px] bg-gradient-to-br from-brand-600 to-grape-600", className)} aria-hidden>
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <path d="M8 29 L32 11" stroke="white" strokeWidth="3.2" strokeLinecap="round" opacity="0.95" />
        <path d="M8 13 L32 27" stroke="#fde68a" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="20.3" cy="20" r="4" fill="#34d399" stroke="white" strokeWidth="2" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg", className)} aria-label="MathQuest — beranda">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-ink">
        Math<span className="text-brand-600">Quest</span>
      </span>
    </Link>
  );
}
