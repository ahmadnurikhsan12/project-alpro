/**
 * KODE PESERTA ANONIM.
 *
 * Kode otomatis: "MQ-" + 5 karakter acak + 1 karakter pemeriksa (mendeteksi salah ketik).
 * Alfabet tanpa karakter yang mirip (0/O, 1/I/L). Tidak memuat nama atau data pribadi.
 * Guru boleh memberikan kode sendiri (huruf kapital/angka/strip, 3–14 karakter); kode seperti itu
 * tidak diperiksa checksum. Aplikasi tidak dapat mendeteksi apakah kode memuat nama — itu tanggung jawab guru.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 karakter
export const CODE_PATTERN = /^[A-Z0-9-]{3,14}$/;

export function checkChar(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += (ALPHABET.indexOf(body[i]) + 1) * (i + 3);
  return ALPHABET[sum % ALPHABET.length];
}

export function generateParticipantCode(rand: () => number = Math.random): string {
  let body = "";
  for (let i = 0; i < 5; i++) body += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return `MQ-${body}${checkChar(body)}`;
}

/** Merapikan masukan: huruf kapital, hanya A–Z, 0–9, dan strip. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}

export type CodeCheck = { ok: true; code: string; auto: boolean } | { ok: false; message: string };

export function validateParticipantCode(raw: string): CodeCheck {
  const code = normalizeCode(raw);
  if (!CODE_PATTERN.test(code)) return { ok: false, message: "Kode harus 3–14 karakter: huruf kapital, angka, atau strip." };
  const m = /^MQ-([A-Z0-9]{5})([A-Z0-9])$/.exec(code);
  if (m) {
    const body = m[1];
    if ([...body].some((c) => !ALPHABET.includes(c)) || checkChar(body) !== m[2]) return { ok: false, message: "Kode otomatis tampaknya salah ketik. Periksa kembali." };
    return { ok: true, code, auto: true };
  }
  return { ok: true, code, auto: false };
}

/** Kode kelompok opsional (mis. kelas), maksimal 8 karakter. Bukan data pribadi. */
export function normalizeCohort(raw: string): string {
  return normalizeCode(raw).slice(0, 8);
}
