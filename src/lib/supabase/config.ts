/** Konfigurasi publik Supabase. Jika kosong, aplikasi berjalan penuh dalam Guest Mode. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
}

export function siteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
