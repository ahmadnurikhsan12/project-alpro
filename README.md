# MathQuest — Belajar SPLDV Interaktif

MathQuest adalah website pembelajaran matematika interaktif untuk siswa **SMP kelas VIII** dengan fokus materi **Sistem Persamaan Linear Dua Variabel (SPLDV)** dan **metode eliminasi**. Siswa dapat langsung belajar **tanpa membuat akun** (Guest Mode); login email bersifat opsional untuk menyimpan progres secara online (Email Mode).

## 1. Tujuan

- Membantu siswa memahami konsep SPLDV secara bertahap, dari PLDV sampai soal cerita.
- Menjelaskan metode eliminasi langkah demi langkah, termasuk *mengapa* setiap langkah dilakukan.
- Menghubungkan soal cerita dengan model matematika.
- Memberi pengalaman belajar lewat simulasi, latihan, evaluasi, dan permainan edukatif.
- Memberi umpan balik langsung, memantau perkembangan, dan memotivasi lewat XP, level, dan badge.

## 2. Fitur

| Fitur | Isi |
|---|---|
| **Materi** | 7 modul. Setiap modul memuat tujuan, penjelasan konsep, istilah penting, konteks + ilustrasi, contoh soal langkah demi langkah, kesimpulan, dan mini quiz (lulus ≥ 60). |
| **SPLDV Lab** | *Simulasi Eliminasi* 8 langkah interaktif (pilih variabel → tentukan pengali → kalikan → pilih operasi → eliminasi → substitusi → periksa) dengan penjelasan "Mengapa?" dan petunjuk bertahap; *Uji Pasangan* (cek apakah (x, y) memenuhi kedua persamaan, lengkap dengan langkah substitusi); *Grafik* dua garis dengan slider koefisien, titik potong, serta misi sejajar/berimpit. |
| **Latihan** | 42 soal, 3 tingkat kesulitan, 4 tipe input (pilihan ganda, benar/salah, isian angka, isian pasangan) dan bentuk soal: konsep, melengkapi langkah, memilih operasi, pasangan penyelesaian, model, soal cerita. Petunjuk bertahap, umpan balik, pembahasan. |
| **Evaluasi Akhir** | 30 soal di bank server; jumlah soal (10/15/20/30) & timer (tanpa/10/20/30 menit) dapat diatur; navigasi & tanda soal; **kunci jawaban tidak pernah dikirim ke browser**; dinilai server; pembahasan setelah dikumpulkan. |
| **7 Game** | Detektif Variabel (investigasi petunjuk), Misi Belanja (nota & anggaran), Eliminasi Kilat (balapan waktu + combo), Pasangkan Istilah (mencocokkan), Tantangan SPLDV (10 tingkat + 3 nyawa), Susun Langkah Eliminasi (mengurutkan kartu), Tebak Nilai Variabel (sinyal terlalu besar/kecil). |
| **Gamifikasi** | XP, 10 level, 12 badge, aturan anti-farming (soal yang sudah memberi XP tidak memberi XP lagi; batas harian untuk game, evaluasi, lab). |
| **Dashboard** | XP, level, progres belajar, materi selesai, nilai evaluasi, latihan, ketepatan jawaban, grafik XP & nilai, rekomendasi, aktivitas terbaru, badge. |
| **Riwayat & Profil** | Tabel hasil (filter jenis) dan log aktivitas; ubah nama panggilan, info mode akses, keluar akun, atur ulang progres lokal. |

## 3. Teknologi

Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Supabase (Auth + PostgreSQL) · Lucide React · Recharts · Zod · React Hook Form · Vitest (unit test) · Playwright (E2E test).

## 4. Struktur folder

```
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 Landing page
│  │  ├─ (app)/                   Halaman aplikasi (dashboard, materi, lab, latihan,
│  │  │                           games, evaluasi, pencapaian, riwayat, profil, masuk)
│  │  ├─ api/                     API server: progress, evaluation, profile
│  │  └─ auth/callback/           Tujuan magic link email
│  ├─ components/                 UI, lab, quiz, games, provider (progres & toast)
│  ├─ content/                    Materi, bank soal latihan, daftar game
│  ├─ lib/
│  │  ├─ math/                    Pecahan eksak, solver & perencana eliminasi SPLDV
│  │  ├─ progress/                Engine XP/level/badge, penilaian event, migrasi
│  │  ├─ questions/               Tipe soal & penilai jawaban
│  │  ├─ storage/local.ts         Penyimpanan Guest Mode (localStorage)
│  │  └─ supabase/                Konfigurasi & klien browser
│  ├─ server/                     Kode khusus server: bank soal evaluasi (server-only),
│  │                              repositori database, klien service role
│  └─ middleware.ts               Penyegar sesi Supabase (tidak aktif tanpa konfigurasi)
├─ supabase/
│  ├─ migrations/0001_init.sql    Skema tabel + RLS + trigger
│  └─ seed.sql                    Data materi, soal, game, pencapaian (dibuat otomatis)
├─ scripts/generate-seed.ts       Pembuat seed.sql dari konten aplikasi
├─ tests/                         Unit test (Vitest)
├─ e2e/                           Test end-to-end (Playwright)
└─ .env.example
```

### Arsitektur progres (satu engine untuk dua mode)

Setiap aktivitas dicatat sebagai **event mentah** (mis. jawaban kuis, skor game). Event **dinilai** (`lib/progress/grading.ts`) lalu **diterapkan** (`lib/progress/engine.ts`) untuk menghitung XP, level, badge, dan riwayat.

- **Guest Mode:** event dinilai dan diterapkan di browser; state dan daftar event disimpan di `localStorage`.
- **Email Mode:** event dikirim ke `/api/progress/event`; server **menilai ulang** jawaban dari bank soal miliknya, menerapkan aturan XP yang sama, lalu menulis ke database dengan service role. XP dan skor dari frontend tidak pernah dipercaya begitu saja.
- **Migrasi Guest → Email:** saat login, event lokal dikirim ke `/api/progress/migrate`. Server melewati event yang ID-nya sudah tercatat (tanpa duplikasi), mengurutkan berdasarkan waktu, menilai ulang, dan menerapkannya dengan aturan anti-farming. Progres online tidak pernah turun: modul selesai tetap selesai, nilai terbaik diambil yang tertinggi, badge lama tetap ada. Siswa mendapat ringkasan hasil penggabungan.
- Jika server tidak dapat dihubungi saat Email Mode, event disimpan sementara di perangkat dan disinkronkan otomatis.

## 5. Instalasi & menjalankan lokal

Prasyarat: **Node.js 20 atau 22 (LTS)** dan npm.

```bash
npm install
cp .env.example .env.local   # opsional — lewati untuk Guest Mode saja
npm run dev                  # http://localhost:3000
```

Tanpa file `.env.local`, semua fitur tetap berjalan dalam Guest Mode; halaman *Masuk* akan menjelaskan bahwa penyimpanan online belum diaktifkan.

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run build` / `npm start` | Build & jalankan versi produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm test` | Unit test (Vitest) |
| `npm run test:e2e` | Test end-to-end (Playwright, butuh `npx playwright install chromium` sekali) |
| `npm run seed:generate` | Membuat ulang `supabase/seed.sql` dari konten |

## 6. Konfigurasi Supabase (untuk Email Mode)

1. Buat proyek di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan isi `supabase/migrations/0001_init.sql`, lalu jalankan `supabase/seed.sql`.
3. Buka **Project Settings → API**, salin ke `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (**rahasia**, hanya di server; jangan diberi awalan `NEXT_PUBLIC_` dan jangan di-commit)
   - `NEXT_PUBLIC_SITE_URL` — mis. `http://localhost:3000`
4. **Authentication → URL Configuration:** isi *Site URL* dengan URL website dan tambahkan `http://localhost:3000/auth/callback` serta `https://domain-anda/auth/callback` ke *Redirect URLs*.
5. **Authentication → Providers → Email:** pastikan aktif. Agar siswa juga bisa memasukkan **kode 6 digit**, ubah template email *Magic Link* (Authentication → Email Templates) sehingga memuat `{{ .Token }}`, contoh:
   ```html
   <p>Kode masuk MathQuest: <strong>{{ .Token }}</strong></p>
   <p>Atau klik: <a href="{{ .ConfirmationURL }}">Masuk ke MathQuest</a></p>
   ```
6. Untuk penggunaan banyak siswa, atur SMTP sendiri (Authentication → SMTP Settings); SMTP bawaan Supabase memiliki batas kirim yang kecil.
7. Jalankan ulang `npm run dev`.

### Keamanan database

- RLS aktif di semua tabel. Pengguna hanya dapat **membaca** data miliknya sendiri; penulisan XP/skor/progres hanya dilakukan server (service role) setelah validasi.
- Tabel `quiz_questions` (berisi kunci) tidak memiliki policy SELECT, sehingga tertutup bagi pengguna.
- Pengguna hanya boleh mengubah kolom `display_name` di `profiles`.

## 7. Cara menggunakan

**Guest Mode:** di halaman awal klik **Mulai Belajar**. Semua fitur langsung terbuka. Progres tersimpan di browser perangkat itu; menghapus data browser atau berganti perangkat berarti progres lokal tidak dapat dipulihkan.

**Email Mode:** klik **Simpan Progres** (atau menu Profil → Simpan progres online), masukkan email, lalu masukkan kode dari email atau klik tautannya. Progres Guest Mode di perangkat itu otomatis digabungkan. Keluar akun lewat halaman Profil.

## 8. Pengujian

```bash
npm run lint && npm run typecheck && npm test   # 126 unit test
npm run build && npm run test:e2e               # 29 test E2E (desktop + ponsel)
```

Unit test memverifikasi secara otomatis **kebenaran matematis seluruh 100 soal** (sistem diselesaikan ulang dengan pecahan eksak), solver & perencana eliminasi, engine XP (anti-farming, batas harian, validasi skor game), dan aturan migrasi. Test E2E menjalankan alur nyata di Chromium: Guest Mode, mini quiz + persistensi setelah reload, simulasi eliminasi lengkap, uji pasangan, grafik, latihan, evaluasi (memastikan respons soal tidak berisi kunci), ketujuh game, profil, serta pemeriksaan tidak ada scroll horizontal pada layar ponsel.

Email Mode memerlukan proyek Supabase sungguhan untuk diuji end-to-end; uji manual: login → kerjakan mini quiz → buka dari browser lain dan login dengan email yang sama → progres muncul.

## 9. Deployment ke Vercel

1. Unggah proyek ke GitHub (lihat bagian berikut).
2. Di [vercel.com](https://vercel.com) pilih **Add New → Project**, impor repositori. Framework terdeteksi otomatis (Next.js).
3. Tambahkan Environment Variables (opsional, untuk Email Mode): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (= domain Vercel Anda).
4. Klik **Deploy**. Setelah selesai, tambahkan `https://domain-anda/auth/callback` ke Redirect URLs Supabase.

## 10. Mengunggah ke GitHub

```bash
git init
git add .
git commit -m "MathQuest: website pembelajaran SPLDV"
git branch -M main
git remote add origin https://github.com/<akun>/<repo>.git
git push -u origin main
```

`.gitignore` sudah mengecualikan `node_modules`, `.next`, dan semua file `.env*` berisi kredensial (kecuali `.env.example`).

## 11. Catatan & pengembangan lanjutan

- **Halaman administrator** (opsional dalam spesifikasi) belum dibuat. Konten dikelola di `src/content/*.ts` dan `src/server/evaluation-bank.ts`; jalankan `npm run seed:generate` agar tabel katalog di database ikut diperbarui. Variabel `ADMIN_EMAILS` sudah disiapkan untuk pengembangan halaman admin.
- Progres Guest Mode di browser pada dasarnya dapat diubah oleh pengguna sendiri (hanya memengaruhi perangkatnya). Saat dimigrasikan ke akun, seluruh event dinilai ulang server sehingga data palsu tidak ikut terbawa.
- Pembatasan laju (rate limiting) API belum diterapkan; untuk penggunaan publik skala besar, tambahkan di level platform (mis. Vercel Firewall).
