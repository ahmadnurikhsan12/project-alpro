# MathQuest — Belajar SPLDV Interaktif

MathQuest adalah website pembelajaran matematika interaktif untuk siswa **SMP kelas VIII** dengan fokus materi **Sistem Persamaan Linear Dua Variabel (SPLDV)** dan **metode eliminasi**. Siswa dapat langsung belajar **tanpa membuat akun** (Guest Mode); login email bersifat opsional untuk menyimpan progres secara online (Email Mode).

Rancangan pembelajarannya mengacu pada pendekatan **Rigorous Mathematical Thinking (RMT)** (Kinard & Kozulin): *Learning Activity* (analisis tugas → perencanaan tindakan → refleksi), fungsi kognitif matematis, alat psikologis (tabel, grafik, persamaan yang saling terhubung), dan pengalaman belajar termediasi. **Catatan jujur:** pemetaan RMT pada fitur adalah *interpretasi pengembang*, bukan klaim buku. MathQuest **tidak** menggantikan mediasi guru, bukan penerapan penuh LPAD, dan **belum membuktikan efektivitas** RMT secara empiris; media ini disiapkan untuk uji coba terbatas. Tutor petunjuk bertahap L1–L4 memakai aturan matematika (tanpa LLM). Halaman opsional **Tanya Tutor AI** memakai layanan AI gratis pihak ketiga dan baru aktif bila kunci API diisi di server. Seluruh aplikasi berbiaya Rp0.

> **Dokumentasi lanjutan** ada di folder [`docs/`](docs/): [ringkasan RMT dan peta fitur](docs/ringkasan-rmt.md) · [panduan demo dan uji coba](docs/panduan-demo-uji-coba.md) · [asesmen dan ekspor CSV (Tahap 5)](docs/tahap5-asesmen-ekspor.md) · [data Guest Mode](docs/guest-data.md) · [Lab dan Learning Activity (Tahap 3)](docs/rmt-tahap3-penerapan.md) · [materi, soal, permainan (Tahap 4)](docs/rmt-tahap4-penerapan.md).

## 1. Tujuan

- Membantu siswa memahami konsep SPLDV secara bertahap, dari PLDV sampai soal cerita.
- Menjelaskan metode eliminasi langkah demi langkah, termasuk *mengapa* setiap langkah dilakukan.
- Menghubungkan soal cerita dengan model matematika.
- Memberi pengalaman belajar lewat simulasi, latihan, evaluasi, dan permainan edukatif.
- Memberi umpan balik langsung, memantau perkembangan, dan memotivasi lewat XP, level, dan badge.

## 2. Fitur

| Fitur | Isi |
|---|---|
| **Materi** | 7 modul: tujuan, penjelasan konsep, istilah, konteks, contoh langkah demi langkah, representasi tabel–persamaan–grafik yang saling terhubung, blok "Pikirkan dulu" (prediksi), mini quiz (lulus ≥ 60), dan refleksi. |
| **Tutor berbasis aturan** | Diagnosis kesalahan dari pola jawaban (tanpa LLM), petunjuk bertingkat **L1–L4**, kesempatan mencoba kembali sebelum jawaban akhir, penjelasan sesuai proses siswa. |
| **SPLDV Lab** | *Simulasi Eliminasi* (9 langkah dengan **Learning Activity**: analisis tugas → perencanaan → prediksi → eliminasi → periksa → refleksi, plus grafik terhubung dan perbandingan strategi); *Uji Pasangan* (prediksi dulu, lalu uji); *Grafik* dengan slider koefisien. |
| **Latihan** | 42 soal awal + 16 soal pengembangan RMT (Tahap 4), 3 tingkat, 4 tipe input; petunjuk bertingkat, umpan balik, pembahasan. |
| **Evaluasi Akhir** | 30 soal di server; jumlah (10/15/20/30) dan timer dapat diatur; **kunci jawaban tidak pernah dikirim ke browser**; dinilai server; pembahasan setelah dikumpulkan. |
| **Tanya Tutor AI** (opsional) | Halaman `/tanya`: siswa bertanya bebas tentang SPLDV; jawaban dari layanan AI **gratis** pihak ketiga, dibatasi pada materi MathQuest, tidak membantu soal Pretest/Posttest/Evaluasi, hanya petunjuk untuk soal Latihan, filter data pribadi, tanpa menyimpan percakapan. Aktif hanya bila `LLM_API_KEY` diisi di server; tanpa itu aplikasi berjalan normal. Lihat [docs/tanya-tutor-ai.md](docs/tanya-tutor-ai.md). |
| **Pretest dan Posttest** | Dua formulir paralel A/B (12 butir, 2 butir per kompetensi), urutan diimbangi dari kode peserta, dinilai server, kunci tidak dikirim ke browser, 0 XP, sekali per jenis. Lihat [docs/tahap5-asesmen-ekspor.md](docs/tahap5-asesmen-ekspor.md). |
| **Ekspor Data** | Kode peserta anonim + kode kelompok; unduh ZIP/CSV (Excel-friendly) dari perangkat tanpa login; alat gabung CSV banyak perangkat. Halaman `/ekspor`. |
| **7 Game** | Detektif Variabel, Misi Belanja, Eliminasi Kilat, Pasangkan Istilah, Tantangan SPLDV, Susun Langkah Eliminasi, Tebak Nilai Variabel (dengan prediksi dan refleksi). |
| **Gamifikasi** | XP, 10 level, badge. Kebijakan XP: percobaan ke-1 = 100%, ke-2 = 50%, ke-3 dan seterusnya = 0; XP sekali per soal; XP **tidak pernah berkurang** karena salah atau petunjuk; refleksi 0 XP; Lab maksimal 15 XP per alat per hari. |
| **Tentang RMT** | Halaman `/tentang` untuk siswa: apa itu RMT, tiga kegiatan belajar, di mana RMT muncul, dan batasan klaim yang jujur. Ringkasan lengkap: [docs/ringkasan-rmt.md](docs/ringkasan-rmt.md). |
| **Dashboard, Riwayat, Profil** | Ringkasan progres, grafik, rekomendasi, riwayat, nama panggilan (tidak diekspor), atur ulang progres lokal. |

## 3. Teknologi

Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Supabase (Auth + PostgreSQL) · Lucide React · Recharts · Zod · React Hook Form · Vitest (unit test) · Playwright (E2E test).

## 4. Struktur folder

```
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 Landing page
│  │  ├─ (app)/                   Halaman aplikasi (dashboard, materi, lab, latihan, games,
│  │  │                           evaluasi, asesmen, ekspor, pencapaian, riwayat, profil, masuk)
│  │  ├─ api/                     API server: progress, evaluation, assessment, profile
│  │  └─ auth/callback/           Tujuan magic link email
│  ├─ components/                 UI, lab, quiz, games, provider (progres & toast)
│  ├─ content/                    Materi, bank soal latihan, daftar game
│  ├─ lib/
│  │  ├─ math/                    Pecahan eksak, solver & perencana eliminasi SPLDV
│  │  ├─ progress/                Engine XP/level/badge, penilaian event, migrasi
│  │  ├─ questions/               Tipe soal & penilai jawaban
│  │  ├─ tutor/, lab/, games/     Tutor aturan (L1–L4), Learning Activity, metrik permainan
│  │  ├─ assessment/, research/   Cetak biru A/B, kode peserta; penyimpanan, CSV, ZIP, gabung data
│  │  ├─ storage/                 Guest Mode (localStorage), pruning event, cadangan data rusak
│  │  └─ supabase/                Konfigurasi & klien browser
│  ├─ server/                     Kode khusus server: bank soal evaluasi dan asesmen (server-only),
│  │                              pembatas laju, repositori database, klien service role
│  └─ middleware.ts               Penyegar sesi Supabase (tidak aktif tanpa konfigurasi)
├─ supabase/
│  ├─ migrations/0001_init.sql    Skema tabel + RLS + trigger
│  ├─ migrations/0002_rmt_pilot.sql  Tambahan pilot RMT (kolom detail + tabel learning_records)
│  └─ seed.sql                    Data materi, soal, game, pencapaian (dibuat otomatis)
├─ scripts/generate-seed.ts       Pembuat seed.sql dari konten aplikasi
├─ docs/                          Dokumentasi tahap, panduan demo/uji coba, data Guest Mode
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
2. Buka **SQL Editor**, jalankan **berurutan**: `supabase/migrations/0001_init.sql`, lalu `supabase/migrations/0002_rmt_pilot.sql`, lalu `supabase/seed.sql`. Migrasi `0002` hanya menambah (kolom nullable dan satu tabel baru), aman dijalankan berulang, dan **wajib sudah diterapkan sebelum Email Mode dipakai** karena kode aplikasi membaca/menulis kolom dan tabel tersebut.
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

**Pretest, posttest, dan ekspor (uji coba):** buka **Pretest/Posttest** di menu, buat **kode peserta** otomatis (atau pakai kode dari guru; jangan memakai nama asli), kerjakan pretest sebelum belajar dan posttest sesudahnya. Unduh data di **Ekspor Data** (ZIP berisi 7 CSV) di akhir setiap pertemuan. Panduan lengkap termasuk cadangan dan penggabungan: [docs/panduan-demo-uji-coba.md](docs/panduan-demo-uji-coba.md).

**Email Mode:** klik **Simpan Progres** (atau menu Profil → Simpan progres online), masukkan email, lalu masukkan kode dari email atau klik tautannya. Progres Guest Mode di perangkat itu otomatis digabungkan. Keluar akun lewat halaman Profil.

## 8. Pengujian

```bash
npm run lint && npm run typecheck && npm test   # 339 unit test (18 berkas)
npm run build && npm run test:e2e               # 70 test E2E (desktop + ponsel Pixel 7)
```

Unit test memverifikasi, antara lain, kebenaran matematis seluruh bank soal (sistem diselesaikan ulang dengan pecahan eksak), solver dan perencana eliminasi, kebijakan XP (percobaan, anti-farming, batas harian), tutor dan petunjuk L1–L4 (termasuk tidak membocorkan jawaban), metrik Learning Activity, kesetaraan formulir pretest/posttest A/B, penilaian asesmen, CSV/ZIP/penggabungan/proteksi rumus, pruning event Guest, pembatas laju, dan migrasi. E2E menjalankan alur nyata di Chromium: Guest Mode, materi, latihan, Lab (Learning Activity), tujuh game, evaluasi (respons soal tanpa kunci), pretest/posttest, ekspor dan gabung data, perlindungan data rusak, aksesibilitas dasar, persistensi setelah reload, tanpa scroll horizontal di ponsel, serta **alur siswa awal–akhir** di desktop dan mobile (`e2e/journey*.spec.ts`). Panduan menjalankan dan memahami hasil: [docs/panduan-demo-uji-coba.md](docs/panduan-demo-uji-coba.md).

Email Mode memerlukan proyek Supabase sungguhan untuk diuji end-to-end; uji manual: login → kerjakan mini quiz → buka dari browser lain dan login dengan email yang sama → progres muncul.

## 9. Deployment ke Vercel

Versi saat ini sudah online di **https://mathquest-puce.vercel.app** (Vercel paket gratis, Guest Mode, tanpa variabel lingkungan). Cara memperbarui, rollback, pengujian situs online, dan batas paket: [docs/deployment.md](docs/deployment.md).

Untuk membuat deployment baru lewat GitHub: unggah proyek ke GitHub, di [vercel.com](https://vercel.com) pilih **Add New → Project**, impor repositori (Next.js terdeteksi otomatis). Variabel lingkungan (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`) hanya diperlukan untuk Email Mode (opsional).

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
- Pembatasan laju: `/api/assessment/submit` memakai pembatas laju sederhana di memori server (60 pengiriman/10 menit per alamat; longgar bagi satu kelas). Pada hosting serverless ini bersifat *sebaik mungkin* per instance, bukan jaminan mutlak. Untuk penggunaan publik skala besar, tambahkan di level platform (mis. Vercel Firewall). Opsi penguatan: [docs/panduan-demo-uji-coba.md](docs/panduan-demo-uji-coba.md#6-risiko-yang-tersisa).
- Dependensi: status `npm audit` dan rekomendasi penanganan dicatat di [docs/panduan-demo-uji-coba.md](docs/panduan-demo-uji-coba.md#5-status-dependensi-npm-audit).
