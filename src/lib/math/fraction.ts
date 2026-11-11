/**
 * Bilangan rasional sederhana agar semua perhitungan SPLDV eksak
 * (tidak ada galat pembulatan floating point).
 */
export interface Fraction {
  n: number; // pembilang
  d: number; // penyebut (selalu > 0)
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

export function frac(n: number, d = 1): Fraction {
  if (d === 0) throw new Error("Penyebut tidak boleh nol");
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  // `|| 0` menormalkan -0 menjadi 0
  return { n: n / g || 0, d: d / g };
}

export const add = (a: Fraction, b: Fraction) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Fraction, b: Fraction) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Fraction, b: Fraction) => frac(a.n * b.n, a.d * b.d);
export const div = (a: Fraction, b: Fraction) => frac(a.n * b.d, a.d * b.n);
export const isInteger = (f: Fraction) => f.d === 1;
export const toNumber = (f: Fraction) => f.n / f.d;
export const equals = (a: Fraction, b: Fraction) => a.n === b.n && a.d === b.d;

export function formatFraction(f: Fraction): string {
  if (f.d === 1) return String(f.n);
  return `${f.n}/${f.d}`;
}

/** Mengubah teks seperti "3", "-2", "1/2", "2,5" menjadi pecahan. Mengembalikan null jika tidak valid. */
export function parseFraction(raw: string): Fraction | null {
  const s = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!s) return null;
  if (/^-?\d+\/-?\d+$/.test(s)) {
    const [a, b] = s.split("/").map(Number);
    if (b === 0) return null;
    return frac(a, b);
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const parts = s.split(".");
    if (parts.length === 1) return frac(Number(s));
    const decimals = parts[1].length;
    const d = 10 ** decimals;
    return frac(Math.round(Number(s) * d), d);
  }
  return null;
}
