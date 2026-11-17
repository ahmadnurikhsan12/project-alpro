# Panduan demo dan uji coba terbatas MathQuest

Semua berjalan tanpa login, API berbayar, LLM, atau layanan eksternal (Rp0). Dokumen ini ringkas; rincian teknis ada di dokumen lain di folder ini.

## 1. Menjalankan untuk demonstrasi

Prasyarat: Node.js 20 atau 22 dan npm.

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

Tanpa `.env.local`, semua fitur berjalan dalam Guest Mode. Pretest/posttest dan Evaluasi Akhir **membutuhkan koneksi ke server aplikasi** (kunci jawaban ada di server, bukan di browser); jika aplikasi dijalankan lokal, server itu adalah komputer yang sama.

Alur demo yang disarankan (±15 menit):
1. Landing → **Mulai Belajar** (tanpa login).
2. **Pretest/Posttest** → *Buat kode otomatis* → jelaskan bahwa kode anonim (tanpa nama).
3. **Materi** modul 4 (Eliminasi): blok "Pikirkan dulu", tabel dan grafik terhubung, mini quiz, refleksi.
4. **Latihan**: coba jawab salah untuk melihat petunjuk bertingkat L1–L4 dan umpan balik tutor.
5. **SPLDV Lab → Simulasi Eliminasi**: analisis tugas, rencana + alasan, prediksi sebelum eliminasi, grafik, refleksi.
6. **Tebak Nilai** dan **Eliminasi Kilat** (prediksi dan refleksi setelah permainan).
7. **Ekspor Data**: unduh ZIP, buka `1_ringkasan_peserta.csv` di Excel.

## 2. Panduan singkat Guest Mode untuk siswa dan guru

- Data tersimpan **hanya di browser pada perangkat itu** (localStorage). Satu siswa = satu perangkat/profil browser, dan jangan memakai mode penyamaran.
- Jangan menghapus "data situs/riwayat". Itu menghapus progres, hasil asesmen, dan kode peserta.
- **Kode peserta**: otomatis (`MQ-xxxxxx`) atau dari guru (mis. `KLS1-07`). Jangan memakai nama atau nomor induk. Kode terkunci setelah pretest/posttest tercatat. Kode kelompok (opsional, ≤8 karakter) untuk kelas.
- **Pretest** sebelum belajar, **posttest** sesudahnya. Formulir A/B ditentukan otomatis dari kode (posttest memakai formulir lain). Tiap jenis hanya sekali. Hasil (skor pretest, posttest, selisih, profil kompetensi) langsung tampil di halaman Pretest/Posttest, tanpa perlu mengunduh.
- **Batas 1000 event** per perangkat; peringatan muncul di halaman Ekspor pada 90%.
- Jika data lokal **rusak atau berasal dari versi aplikasi lain**, aplikasi **tidak menimpanya**: isi lama disalin ke kunci cadangan `...backup-<waktu>` dan banner peringatan tampil. Jangan menghapus data situs; hubungi guru/peneliti agar cadangan dapat diselamatkan (mis. lewat DevTools → Application → Local Storage).

## 3. Mencadangkan dan mengekspor data

1. Buka **Ekspor Data** → **Unduh semua (.zip)** (7 CSV: info, ringkasan peserta, butir asesmen, butir latihan, aktivitas, metrik proses, refleksi). Pemisah `;` (Excel Indonesia) atau pilih koma.
2. Lakukan di **akhir setiap pertemuan** dan serahkan ZIP ke guru (flashdisk, WhatsApp, email).
3. **Menggabungkan banyak perangkat (guru):** di Ekspor Data bagian *Gabungkan data*, pilih semua CSV/ZIP hasil unzip dari siswa, lalu unduh ZIP gabungan. Baris ganda dihapus otomatis; peringatan muncul bila satu kode muncul di dua perangkat.
4. Berkas CSV bebas nama; nama panggilan tidak diekspor. Sel yang diawali `= + - @` diberi awalan `'` agar tidak dieksekusi sebagai rumus Excel.
5. Waktu pengerjaan hanya diekspor untuk asesmen, evaluasi akhir, dan permainan. Waktu per soal latihan tidak diukur.

Kamus kolom lengkap: [tahap5-asesmen-ekspor.md](tahap5-asesmen-ekspor.md).

## 4. Menjalankan pengujian

```bash
npm run lint && npm run typecheck && npm test      # ESLint, TypeScript, unit test
npm run build && npx playwright install chromium   # sekali saja untuk Playwright
npm run test:e2e                                   # E2E desktop + mobile (Pixel 7)
```

E2E menjalankan server produksi lokal pada port 3123 (`E2E_PORT` untuk mengganti). Pengujian alur siswa awal–akhir ada di `e2e/journey*.spec.ts` (desktop dan mobile).
Catatan: tes pembatas laju mengirim banyak permintaan dari alamat berbeda-beda; menjalankan seluruh suite berkali-kali dalam waktu kurang dari 10 menit dapat memicu batas 60 pengiriman/10 menit pada alamat `anon` lokal. Jika itu terjadi, mulai ulang server.

## 5. Status dependensi (`npm audit`)

| Temuan | Status | Catatan |
|---|---|---|
| PostCSS `<=8.5.22` (dibawa Next.js) | **Diperbaiki** | `overrides` di `package.json` memaksa `postcss@^8.5.33` untuk Next. Build dan seluruh tes lulus. Tidak ada upgrade besar. |
| Next.js (rantai ke PostCSS lama) | **Hilang** setelah override di atas | Versi Next tetap 15.5.29. |
| Zod `<4.6.6` (memori pada koleksi besar) | **Belum diperbaiki (disengaja)** | Perbaikan hanya ada di Zod 4 (perubahan besar). Risiko dibatasi: semua body API dibatasi 200 KB (`readJson`) dan skema membatasi panjang string/kunci. Rekomendasi: migrasi ke Zod 4 setelah uji coba, dengan seluruh tes sebagai jaring pengaman. |

## 6. Risiko yang tersisa

- **Integritas asesmen.** Server menilai dan tidak membocorkan kunci, tetapi mengembalikan benar/salah per butir, sehingga orang yang sengaja mengirim berulang dapat menebak kunci. Mitigasi saat ini: pembatas laju server (60/10 menit per alamat) dan pengawasan guru saat asesmen. Pembatas bersifat per instance pada hosting serverless dan tidak menghentikan upaya manual yang lambat. Pilihan penguatan (belum dikerjakan, butuh persetujuan karena mengubah alur): (a) *token percobaan bertanda tangan* yang diterbitkan saat soal dimuat, berlaku sekali dan memerlukan rahasia server + penyimpanan penanda pemakaian; (b) hanya mengembalikan skor total (menghapus benar/salah per butir, mengubah data butir yang diekspor); (c) pengawasan prosedural.
- **Kesetaraan formulir A/B** adalah kesetaraan rancangan; belum diuji secara empiris pada siswa.
- **Data lokal dapat diubah** pemiliknya dan CSV tidak bertanda tangan; cocok untuk analisis uji coba, bukan penilaian resmi.
- **Kehilangan data Guest** (hapus data situs, ganti browser/perangkat, penyamaran, pembersihan otomatis iOS Safari). Mitigasi: ekspor ZIP tiap pertemuan.
- **Kode ganda** (dua siswa memakai kode yang sama) hanya terdeteksi saat penggabungan.
- Belum diuji pada perangkat/browser fisik, pembaca layar, beban banyak siswa bersamaan, dan Email Mode dengan Supabase sungguhan.
