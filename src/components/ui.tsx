import Link from "next/link";
import { forwardRef, Fragment, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import type { Difficulty } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ Button

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "bg-grape-600 text-white hover:bg-grape-700 shadow-sm",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  outline: "border border-slate-300 bg-white text-ink hover:border-brand-400 hover:bg-brand-50",
  ghost: "text-ink-soft hover:bg-slate-100",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  function Button({ variant, size, className, type = "button", ...props }, ref) {
    return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
  },
);

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

// ------------------------------------------------------------------ Card

export function Card({ className, children, as: As = "div", ...rest }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" } & Record<string, unknown>) {
  return (
    <As className={cn("rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6", className)} {...rest}>
      {children}
    </As>
  );
}

// ------------------------------------------------------------------ Badge

const BADGE = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  grape: "bg-grape-50 text-grape-700 ring-grape-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  orange: "bg-orange-50 text-orange-800 ring-orange-200",
};
export type BadgeColor = keyof typeof BADGE;

export function Badge({ color = "slate", children, className }: { color?: BadgeColor; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", BADGE[color], className)}>{children}</span>;
}

const DIFF_COLOR: Record<Difficulty, BadgeColor> = { mudah: "emerald", sedang: "amber", sulit: "rose" };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge color={DIFF_COLOR[difficulty]}>{DIFFICULTY_LABEL[difficulty]}</Badge>;
}

// ------------------------------------------------------------------ Progress

export function ProgressBar({ value, className, color = "brand", label }: { value: number; className?: string; color?: "brand" | "emerald" | "grape" | "amber"; label: string }) {
  const bar = { brand: "bg-gradient-to-r from-brand-500 to-grape-500", emerald: "bg-emerald-500", grape: "bg-grape-500", amber: "bg-amber-500" }[color];
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-all duration-500", bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

// ------------------------------------------------------------------ Layout helpers

export function PageHeader({ title, description, eyebrow, actions, icon }: { title: string; description?: ReactNode; eyebrow?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 hidden rounded-xl bg-brand-50 p-2.5 text-brand-600 sm:block">{icon}</div>}
        <div>
          {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-ink-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, hint, icon, tone = "brand" }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: "brand" | "grape" | "emerald" | "amber" | "rose" | "sky" }) {
  const ring = { brand: "bg-brand-50 text-brand-600", grape: "bg-grape-50 text-grape-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600", sky: "bg-sky-50 text-sky-600" }[tone];
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <span className={cn("rounded-lg p-1.5", ring)}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <div className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-500">{icon}</div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ Math & text

/** Blok persamaan dengan font monospace agar suku-suku rata. */
export function MathBlock({ lines, caption, className, highlight }: { lines: string[]; caption?: string; className?: string; highlight?: number[] }) {
  return (
    <figure className={cn("my-3", className)}>
      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
        <pre className="font-mono text-[0.95rem] leading-relaxed text-ink">
          {lines.map((l, i) => (
            <div key={i} className={cn(highlight?.includes(i) && "font-bold text-brand-700")}>
              {l}
            </div>
          ))}
        </pre>
      </div>
      {caption && <figcaption className="mt-1.5 text-xs text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}

/** Teks dengan **tebal** dan *miring* sederhana. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-hidden />;
}

export function LoadingBlock({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-muted" role="status">
      <Spinner className="h-5 w-5 text-brand-600" />
      <span>{label}</span>
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p className="mt-1 text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50";

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            value === o.value ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
