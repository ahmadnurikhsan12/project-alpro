# Deployment MathQuest (Vercel, paket gratis)

## Status
- **URL publik (HTTPS):** https://mathquest-puce.vercel.app
- **Platform:** Vercel (akun Hobby/gratis), proyek `mathquest`, framework Next.js App Router, API Routes berjalan sebagai fungsi server (penilaian asesmen dan Evaluasi Akhir dilakukan di server).
- **Mode:** Guest Mode penuh. **Tidak ada environment variable**, tidak ada Supabase, tidak ada database, tidak ada LLM/API berbayar. Data siswa hanya di browser siswa (localStorage); server tidak menyimpan apa pun.
- **Biaya:** Rp0. Jangan mengaktifkan billing/upgrade. Tidak ada domain berbayar (memakai subdomain `*.vercel.app`).
- URL per-deployment (mis. `mathquest-xxxx-iksanbre.vercel.app`) dilindungi *Vercel Authentication* (hanya pemilik akun); **siswa memakai URL produksi di atas**.

## Cara memperbarui (tanpa push GitHub)
Dari folder proyek, setelah mengerjakan perubahan dan lolos tes:

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx vercel@latest login      # sekali saja per komputer (buka browser, login akun Vercel Anda)
npx vercel@latest deploy --prod --yes
```

`.vercelignore` mengecualikan `.env*`, sehingga rahasia lokal tidak ikut terunggah. Repositori sudah tertaut ke proyek lewat folder `.vercel/` (tidak di-commit).

### Kembali ke versi sebelumnya (rollback)
Dashboard Vercel → proyek `mathquest` → **Deployments** → pilih deployment lama → **Promote to Production** (atau `npx vercel@latest rollback`).

## Pengujian terhadap situs yang sudah online
```bash
PUBLIC_URL=https://mathquest-puce.vercel.app npx playwright test -c playwright.public.config.ts --grep-invert "pembatas laju"
```
Tes pembatas laju dikecualikan karena Vercel menimpa header `x-forwarded-for` dengan alamat klien sebenarnya (alamat palsu tidak dapat disimulasikan dari luar).

## Batas paket gratis dan catatan
- Hobby ditujukan untuk penggunaan non-komersial/pribadi (uji coba pendidikan sesuai); kuota fungsi dan bandwidth dibatasi. Periksa halaman batas Vercel sebelum dipakai kelas besar; kuota satu kelas (±30–40 siswa) jauh di bawah batas normal.
- **Pembatas laju** asesmen (60 pengiriman/10 menit per alamat) berada di memori tiap instance fungsi, sehingga berlaku "sebaik mungkin" dan tidak terbagi antar instance. Lihat `docs/panduan-demo-uji-coba.md`, bagian risiko.
- Menambah Email Mode (Supabase) **tidak diperlukan** untuk uji coba dan tidak diaktifkan. Mengaktifkannya membutuhkan akun Supabase, variabel lingkungan di Vercel, dan menjalankan migrasi SQL `supabase/migrations/*` (memerlukan persetujuan terpisah).
- Integrasi GitHub otomatis (`vercel git connect`) belum dipasang. Repositori GitHub saat ini hanya berisi branch `main` lama; branch `rmt-pilot` belum di-push.

## Konfigurasi yang diperiksa sebelum publikasi
- Tidak ada secret/API key di kode frontend (pencarian pada bundel publik: kosong). `.env*` tidak di-commit dan tidak diunggah.
- Kunci pretest, posttest, dan Evaluasi Akhir hanya di server (respons API tidak memuat `answer/explanation/verify/hints`).
- `/api/progress/*` tanpa login mengembalikan 401; Guest Mode tidak memerlukannya.
- Header keamanan: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`.
