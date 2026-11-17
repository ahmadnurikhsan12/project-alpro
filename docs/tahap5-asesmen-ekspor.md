# Tahap 5 — Pretest/Posttest dan Ekspor Data CSV (Guest Mode)

Seluruhnya berjalan tanpa login, API berbayar, LLM, atau layanan eksternal (Rp0). Tidak ada perubahan database, skema event, atau format penyimpanan lama.

## 1. Cara kerja di Guest Mode

| Komponen | Cara kerja |
|---|---|
| Kode peserta | Dibuat acak di perangkat (`MQ-` + 5 karakter + 1 karakter pemeriksa) atau diisi guru (mis. `KLS1-07`). Tidak memuat nama. Tidak dapat diganti setelah asesmen tercatat. Kode kelompok (opsional, ≤8 karakter) untuk analisis kelas. |
| Pretest/posttest | Soal dimuat dari server (`/api/assessment/questions`), dijawab siswa, lalu dinilai server (`/api/assessment/submit`). Server tidak menyimpan apa pun; hanya mengembalikan skor dan benar/salah per butir. Hasil disimpan di perangkat (`mathquest.research.v1`). Asesmen **0 XP**, tidak masuk progres, tidak ada petunjuk/pembahasan, satu kali per jenis. |
| Ekspor | Dibangun di browser dari dua sumber lokal: hasil asesmen dan log event progres (`mathquest.guest.v1`). Unduh ZIP (7 CSV) atau CSV per tabel. |
| Gabung banyak siswa | Alat di halaman Ekspor (untuk guru) membaca beberapa CSV dari banyak perangkat, mengenali tabel dari judul kolom, menghapus baris ganda, dan menghasilkan ZIP gabungan. |

## 2. Kesetaraan pretest dan posttest

Dua formulir paralel (A dan B) disusun dari **cetak biru yang sama**: 12 butir, 2 butir per kompetensi:

1. memilih operasi eliminasi, 2. menyamakan koefisien dan mengalikan persamaan, 3. menghitung hasil eliminasi,
4. menyelesaikan SPLDV, 5. memeriksa kebenaran solusi, 6. menghubungkan aljabar dan grafik.

Butir bernomor sama pada A dan B setara dalam: kompetensi, tipe jawaban, tingkat kesulitan, format, topik, **posisi kunci** pilihan ganda, kunci Benar/Salah, operasi yang dipakai, perlu-tidaknya mengalikan, **beban pengali** (hasil kali pengali pada rencana termudah), dan besar angka (±2×). Kesetaraan ini diuji otomatis (`tests/assessment.test.ts`).

Bukan pengulangan soal: tidak ada butir yang sama antara A dan B, dan tidak ada yang sama (teks maupun sistem persamaan) dengan soal Latihan, Mini Quiz, atau Evaluasi Akhir.

Pengimbangan urutan: formulir pretest ditentukan dari kode peserta (jumlah kode karakter genap → A, ganjil → B); posttest memakai formulir lain. Dengan kode yang sama di perangkat berbeda, urutan sama. Formulir dicatat di setiap baris CSV sehingga efek formulir dapat dianalisis.

**Batas yang jujur:** kesetaraan di atas adalah kesetaraan *rancangan* (struktur dan beban hitung). Belum ada uji empiris (mis. koreksi reliabilitas atau analisis butir pada sampel siswa), sehingga kesetaraan tingkat kesulitan sebenarnya belum terbukti. Analisis kecil pada data pilot (selisih skor per formulir) dapat dipakai untuk memeriksanya.

## 3. Penilaian

- 1 poin per butir benar; **tanpa nilai parsial** dan tanpa pengurangan untuk salah/kosong. Butir kosong dinilai salah dan dicatat terpisah (`dijawab` = 0).
- Setiap jawaban dinilai oleh fungsi `gradeAnswer` yang sama dengan Latihan dan Evaluasi Akhir (pecahan dinormalisasi; pasangan (x, y) harus tepat).
- Skor = benar ÷ 12 × 100, dibulatkan (`scoreOf`). Subskor per kompetensi (0–2).
- Skor pretest tidak ditampilkan ke siswa; skor posttest dan profil kompetensinya ditampilkan.

## 4. Keamanan kunci jawaban

- `src/server/assessment-bank.ts` dan `assessment.ts` memakai `import "server-only"`: build gagal jika dipakai komponen browser.
- API soal hanya mengirim butir publik (tanpa `answer`, `explanation`, `verify`, `hints`, kompetensi, atau nomor butir). Diuji unit dan E2E (isi respons jaringan).
- Respons penilaian hanya memuat benar/salah per butir. Siswa teoretis dapat mengetahui butir mana yang benar setelah mengirim, tetapi tidak dapat mengulang asesmen yang sama di perangkat itu.

## 5. Kamus data CSV

Pemisah `;` (Excel Indonesia) atau `,`; UTF-8 BOM; CRLF; tanggal ISO 8601 (UTC); angka tanpa pemisah ribuan; boolean 0/1.
Setiap tabel diawali `kode_peserta`, `id_perangkat` (kecuali dinyatakan lain).

| Berkas | Isi | Kunci unik (untuk menghapus duplikat) |
|---|---|---|
| `0_info_ekspor.csv` | versi format, waktu ekspor, jumlah event, status batas penyimpanan, catatan keterbatasan | peserta, perangkat, `kunci` |
| `1_ringkasan_peserta.csv` | satu baris per peserta-perangkat: skor/benar/durasi/waktu pretest & posttest, selisih skor, subskor per kompetensi (`pre_*`, `post_*`), jumlah sesi latihan, soal dikerjakan, total percobaan, total petunjuk, soal mandiri, refleksi terisi/dilewati, ringkasan Lab (ubah rencana, prediksi), prediksi Tebak Nilai, nilai evaluasi akhir terbaik, XP, jumlah event | peserta, perangkat |
| `2_asesmen_butir.csv` | per butir pretest/posttest: jenis, formulir, nomor, kompetensi, tingkat, tipe, jawaban siswa, benar, dijawab | `id_rekaman`, `id_butir` |
| `3_latihan_butir.csv` | per soal latihan/mini quiz: jumlah percobaan, percobaan keberapa benar, petunjuk dibuka, mandiri, jawaban terakhir | `id_event`, `id_soal` |
| `4_aktivitas.csv` | satu baris per event: jenis (buka materi, latihan, mini quiz, evaluasi akhir, permainan, lab, refleksi), rujukan, skor, benar, total, durasi | `id_event` |
| `5_metrik_proses.csv` | format panjang: metrik Learning Activity Lab dan permainan (prediksi, ubah rencana, petunjuk, dll.) | `id_event`, `metrik` |
| `6_refleksi.csv` | format panjang: konteks, pertanyaan, jawaban (pilihan/skala), dilewati | `id_event`, `id_pertanyaan` |

**Waktu pengerjaan** hanya diekspor bila dapat diukur dengan tepat: durasi total asesmen (sejak soal dimuat sampai terkirim; waktu tab tidak aktif ikut terhitung), evaluasi akhir, dan permainan. **Waktu per soal latihan tidak diukur** dan tidak diekspor.

## 6. Privasi

Hanya kode peserta anonim, kode kelompok opsional, dan ID perangkat acak. Tidak mengekspor nama panggilan, email, atau teks bebas (refleksi hanya pilihan/skala; jawaban butir berupa pilihan atau angka). Diuji otomatis. Guru bertanggung jawab agar kode yang diberikan tidak memuat nama atau data pribadi (aplikasi tidak dapat mendeteksinya).

## 7. Menggabungkan data banyak perangkat

1. Siswa mengunduh ZIP dari `/ekspor` dan menyerahkannya ke guru (flashdisk, WhatsApp, atau email).
2. Guru membuka `/ekspor`, memilih semua CSV di bagian **Gabungkan data**, lalu mengunduh ZIP gabungan.
3. Baris ganda (mis. siswa mengekspor dua kali) dihapus otomatis berdasarkan kunci unik. Peringatan ditampilkan bila kode yang sama muncul di dua perangkat atau satu kode memiliki dua rekaman asesmen.
4. Tanpa alat ini, berkas dengan judul kolom sama dapat disambung manual; hapus duplikat berdasarkan kolom kunci di atas.

## 8. Keterbatasan dan risiko kehilangan data

- Data hanya ada di satu browser/perangkat; menghapus data situs, mode penyamaran, atau berganti browser menghilangkannya. Cadangan = unduh ZIP di akhir setiap pertemuan.
- Batas 1000 event: event biasa tertua dapat terbuang; event pembelajaran (refleksi, metrik proses) dipertahankan lebih lama. Halaman Ekspor menampilkan peringatan saat ≥90%.
- Berkas dapat diubah pemiliknya dan tidak ditandatangani; gunakan untuk analisis uji coba, bukan penilaian resmi.
- Asesmen membutuhkan koneksi internet saat memuat soal dan mengirim jawaban (kunci ada di server). Jawaban sementara disimpan di sesi browser bila kirim gagal.
- Asesmen hanya tersimpan lokal (tidak disinkronkan ke akun). Mode akun tidak menyimpan event rinci di perangkat, sehingga ekspor di mode akun hanya memuat hasil asesmen.
- Kode yang sama dipakai dua siswa tidak dapat dideteksi di perangkat; hanya terdeteksi saat penggabungan.

## 9. Saran protokol singkat

Pertemuan 1: kode peserta + pretest (±20 menit) → Modul 4. Pertemuan 2: Modul 5 dan Lab. Pertemuan 3: Modul 6, Tebak Nilai, posttest (±20 menit) → ekspor ZIP. Siswa menyerahkan ZIP di akhir tiap pertemuan.
