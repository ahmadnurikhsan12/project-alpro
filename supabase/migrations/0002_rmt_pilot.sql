-- =====================================================================
-- MathQuest — migrasi 0002: data pendukung pilot RMT (Tahap 1)
--
-- SIFAT MIGRASI INI: hanya MENAMBAH, idempoten (aman dijalankan berulang),
-- dan tidak mengubah/menghapus data atau struktur yang sudah ada.
--   1. Kolom baru NULLABLE `detail` pada quiz_attempts (rincian percobaan per soal).
--   2. Tabel baru `learning_records` (refleksi & metrik Learning Activity).
--
-- Jalankan SETELAH 0001_init.sql (Supabase Dashboard > SQL Editor).
-- Kode aplikasi versi ini membaca/menulis kolom & tabel di atas, sehingga migrasi
-- ini harus sudah diterapkan sebelum Email Mode dipakai.
-- Statistik percobaan per soal disimpan di user_stats.counters (kolom jsonb yang
-- sudah ada) — tidak butuh perubahan struktur.
-- =====================================================================

alter table public.quiz_attempts add column if not exists detail jsonb;

create table if not exists public.learning_records (
  id          text not null,                  -- sama dengan ID event (mencegah duplikasi)
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (char_length(kind) between 1 and 30),
  ref_id      text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists learning_records_user_time on public.learning_records(user_id, created_at desc);

alter table public.learning_records enable row level security;

-- Pengguna hanya dapat MEMBACA catatan miliknya. Penulisan dilakukan server
-- (service role) setelah validasi, sama seperti tabel progres lainnya.
drop policy if exists "own learning read" on public.learning_records;
create policy "own learning read" on public.learning_records for select using (auth.uid() = user_id);
