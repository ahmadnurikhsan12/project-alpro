"use client";

import { useId } from "react";
import { inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

export function NumberField({ label, value, onChange, onEnter, disabled, className, wide }: { label: string; value: string; onChange: (v: string) => void; onEnter?: () => void; disabled?: boolean; className?: string; wide?: boolean }) {
  const id = useId();
  return (
    <div className={cn(wide ? "w-40" : "w-28", className)}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className={cn(inputClass, "text-lg font-semibold")}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      />
    </div>
  );
}

/** Mengubah input menjadi bilangan bulat (menerima "12.000" dan "-3"). */
export function toInt(raw: string): number | null {
  const s = raw.trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  const clean = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  if (!/^-?\d+$/.test(clean)) return null;
  return Number(clean);
}

export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
