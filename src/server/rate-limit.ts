import "server-only";

/**
 * Pembatas laju sederhana di memori server (Rp0, tanpa layanan eksternal).
 *
 * KETERBATASAN (jujur): status disimpan per instance server. Pada hosting serverless, tiap instance punya
 * hitungan sendiri dan hitungan hilang saat instance berhenti, sehingga ini perlindungan "sebaik mungkin"
 * terhadap percobaan berulang/otomatis, bukan jaminan mutlak. Batas dibuat longgar agar satu kelas yang
 * berbagi satu IP sekolah (NAT) tidak terganggu.
 */
export interface LimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): LimitResult {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear(); // batas memori: lebih baik melonggarkan daripada membengkak
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}

/** Alamat klien dari header proxy (diisi hosting); "anon" bila tidak tersedia. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "anon";
}
