# Tahap 2: Asisten Belajar (AI, RMT, Cognitive Load, Mathematical Literacy)

Halaman **/asisten** berisi soal cerita SPLDV yang diselesaikan bertahap. Asisten membimbing proses berpikir siswa, bukan memberi jawaban akhir.

## 1. Alur satu soal

| Tahap | RMT (ringkasan buku Kinard & Kozulin) | Literasi matematika | Yang dikerjakan siswa |
|---|---|---|---|
| 1. Pahami masalah | Learning Activity: analisis tugas; fungsi kognitif fase Input | Merumuskan | Arti x, arti y, yang ditanyakan |
| 2. Buat model | Alat psikologis: simbol dan persamaan | Merumuskan | Dua persamaan dari cerita |
| 3. Rencanakan | Learning Activity: perencanaan tindakan; fase Elaborasi | Menggunakan | Variabel yang dieliminasi, operasi, alasan |
| 4. Selesaikan | Siklus Representasi, Manipulasi, Validasi | Menggunakan | Nilai x dan y |
| 5. Periksa dan tafsirkan | Fase Output; validasi | Menafsirkan | Jawaban cerita dengan satuan |
| 6. Refleksi | Learning Activity: refleksi; metakognisi | Mengevaluasi | Tiga pertanyaan pilihan |

**Catatan kejujuran:** konsep RMT berasal dari ringkasan buku yang diberikan dosen. Urutan enam tahap, pasangannya dengan literasi matematika, dan wujudnya di aplikasi adalah **interpretasi pengembang**. Ringkasan RMT tidak menetapkan urutan enam tahap ini.

## 2. Peran AI sebagai pembimbing

- **Benar atau salah ditentukan aturan matematika**, bukan AI, sehingga penilaian konsisten.
- Bila siswa keliru atau menekan *Minta bantuan*, AI diberi: soal cerita, tahap, jawaban siswa, hasil pemeriksaan, dan tingkat bantuan. AI **tidak diberi kunci jawaban**.
- Instruksi AI mengikuti tiga kriteria MLE: intensionalitas dan resiprositas, makna, transendensi.
- Jawaban AI yang menyebut nilai variabel, jawaban akhir, atau model lengkap **dibuang** oleh server; petunjuk aturan tetap tampil.
- Tanpa kunci API atau saat layanan AI gagal, bimbingan berbasis aturan tetap berjalan.

## 3. Pengelolaan Cognitive Load

Cognitive Load Theory (Sweller) **bukan bagian dari buku RMT**; dipakai sebagai kerangka tambahan sesuai tugas.

| Jenis beban | Strategi di Asisten Belajar |
|---|---|
| **Intrinsic** (kerumitan materi) | Tiga soal berurutan mudah, sedang, sulit; masalah dipecah menjadi enam tahap; satu tahap per layar |
| **Extraneous** (beban akibat penyajian) | Hanya tahap aktif yang tampil; "Catatan kerja" menyimpan hasil tahap sebelumnya sehingga tidak perlu diingat; AI dibatasi sekitar 60 kata tanpa simbol rumit |
| **Germane** (usaha membangun pemahaman) | Siswa memilih alasan strategi, memeriksa dan menafsirkan hasil, merefleksikan cara berpikir; AI mengajukan pertanyaan, bukan jawaban |

### Bantuan menyesuaikan kesulitan siswa

| Percobaan salah pada satu tahap | Tingkat bantuan |
|---|---|
| ke-1 | 1: pertanyaan pemandu |
| ke-2 | 2: petunjuk lebih rinci dengan alasan |
| ke-3 dan seterusnya | 3: contoh serupa dengan angka berbeda |

Bantuan kembali ke tingkat awal pada tahap berikutnya (bantuan dikurangi saat siswa sudah bisa). Pesan diagnosis juga menyesuaikan jenis kekeliruan (mis. koefisien tertukar, hanya memenuhi satu persamaan, salah satuan).

## 4. Mathematical Literacy

Mengacu pada proses literasi matematika kerangka PISA (OECD): merumuskan masalah, menggunakan matematika, serta menafsirkan dan mengevaluasi hasil. Kerangka ini **di luar ringkasan RMT**; sesuaikan bila dosen memakai indikator lain.

## 5. AI yang dipakai dan DeepSeek

Aplikasi memakai API chat berformat OpenAI. Konfigurasi saat ini: **Groq** (model `qwen/qwen3.8-27b`). Untuk memakai **DeepSeek**, tidak ada kode yang diubah; ganti variabel lingkungan di server (`.env` lokal dan Vercel):

```
LLM_API_KEY=kunci-deepseek-anda
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=nama-model-deepseek
```

Periksa nama model dan harga di dokumentasi resmi DeepSeek; layanannya umumnya memakai saldo prabayar. Kunci hanya dibaca di server, tidak ada di kode frontend, dan `.env` tidak diunggah ke GitHub.

## 6. Letak kode

`src/app/(app)/asisten/page.tsx`, `src/app/api/asisten/route.ts`, `src/server/asisten/` (soal, pemeriksaan, instruksi AI), `src/lib/asisten/types.ts`, `tests/asisten.test.ts`, `e2e/asisten*.ts`.

## 7. Keterbatasan

- Tiga soal cerita; belum diuji dengan siswa, sehingga manfaat terhadap literasi matematika dan beban kognitif **belum terbukti** dan belum diukur.
- Penyesuaian bantuan hanya berdasarkan jumlah percobaan salah dan jenis kekeliruan.
- Progres soal bertahap tidak disimpan, tidak memberi XP, dan tidak ikut ekspor CSV.
- Pengaman kebocoran jawaban AI berbasis pola teks, sehingga tidak sempurna.
- Jawaban AI dapat keliru; pendampingan guru tetap diperlukan.
