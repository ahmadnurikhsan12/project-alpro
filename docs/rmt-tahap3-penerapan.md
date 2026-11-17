# Tahap 3 — Penerapan RMT di SPLDV Lab: konsep buku vs. interpretasi MathQuest

Dokumen ini memisahkan secara tegas dua hal:

- **[BUKU]** konsep Rigorous Mathematical Thinking (Kinard & Kozulin) sebagaimana dirangkum dari buku;
- **[INTERPRETASI]** cara kami menerjemahkannya menjadi fitur perangkat lunak berbasis aturan (tanpa AI/LLM, tanpa server). Bagian ini adalah keputusan desain kami, **bukan** isi buku, dan belum teruji efektivitasnya.

## Batas klaim

- MathQuest **tidak** mengklaim menerapkan LPAD/penilaian dinamis secara penuh, tidak menggantikan mediator manusia, dan tidak mengklaim efektivitas setara penelitian dalam buku.
- Mediasi di Lab adalah **aturan tetap** yang dihitung dari matematika SPLDV (`src/lib/lab/la.ts`). Ia tidak “memahami” siswa; ia hanya menanggapi pilihan yang siswa buat.
- Pemetaan kegiatan ke fase Input/Elaborasi/Output **tidak** dipakai dalam antarmuka dan tidak dijadikan urutan wajib.

## Learning Activity (tiga elemen)

| Elemen | [BUKU] | [INTERPRETASI] di MathQuest | Lokasi |
|---|---|---|---|
| Analisis tugas | Siswa memahami apa yang diminta dan apa yang diketahui sebelum bertindak | Tabel koefisien yang diisi siswa, pemilihan tujuan tugas, dan penentuan hubungan koefisien tiap variabel; petunjuk analisis bertingkat | `analysis-panel.tsx` |
| Perencanaan tindakan | Memilih strategi dan menyatakan alasannya sebelum melaksanakan | Memilih variabel yang dieliminasi + alasan terstruktur; prediksi hasil sebelum eliminasi dijalankan | `elimination-sim.tsx` (Langkah 2, 5) |
| Refleksi | Meninjau proses dan membandingkan dengan alternatif | Tebakan dulu, lalu tabel perbandingan x vs. y, lalu pertanyaan pilihan/skala (boleh dilewati, 0 XP) | `elimination-sim.tsx` (Langkah 9), `reflection-form.tsx` |

Ketiganya **tidak linear**: siswa dapat “Buka kembali analisisku”, “Ubah rencana”, atau “Coba variabel lain”, dan setiap perubahan rencana setelah menyelesaikan sistem dicatat (event `lab` dengan metrik `ubah_rencana` dan `selesai_ke`; XP tetap sekali per hari).

## Empat prinsip mediasi (MLE)

| Prinsip | [BUKU] | [INTERPRETASI] di MathQuest | Batas / kelemahan yang diakui |
|---|---|---|---|
| Intensionalitas–resiprositas | Mediator menyatakan tujuan secara eksplisit dan interaksi bersifat dua arah | Setiap panel utama memuat baris “Tujuan:”. Tanggapan memakai **pilihan nyata siswa** (variabel, alasan, prediksi, pengali) dan membandingkannya dengan hasil perhitungan | Dua arah hanya **pendekatan**: sistem menanggapi, tetapi tidak bertanya balik secara terbuka dan tidak membaca penalaran bebas. Tanggapan tidak menyebut angka pengali agar siswa tetap mengerjakannya |
| Transendensi | Menggeneralisasi di luar konteks soal | Pertanyaan aturan umum (mis. “koefisien sama besar & tanda sama → ?”), tabel perbandingan strategi x vs. y, dan “Coba variabel lain” pada sistem yang sama; refleksi Uji Pasangan menanyakan makna penyelesaian secara umum | Generalisasi terbatas pada satu keluarga soal (eliminasi SPLDV); tidak diuji transfer ke topik lain |
| Makna | Siswa memahami mengapa, bukan hanya prosedur | Kotak “Mengapa?”, serta tautan **bentuk aljabar ↔ grafik**: garis terkali berimpit dengan garis awal, garis hasil eliminasi melewati titik potong, titik penyelesaian berada di semua garis | Klaim grafik bersifat benar secara matematis (diuji pada 300 sistem acak), tetapi **belum ada bukti** bahwa tampilan itu menambah pemahaman siswa |
| Alat psikologis | Tabel, bidang koordinat, persamaan sebagai kesepadanan, bahasa matematika | Tabel koefisien, bidang koordinat statis, persamaan setelah dikalikan ditampilkan sebagai setara | — |

## Prediksi sebelum menguji (Uji Pasangan & eliminasi)

- [BUKU] Dorongan agar siswa bertindak secara terencana dan memeriksa hasil terhadap harapannya.
- [INTERPRETASI] Siswa wajib memprediksi apakah pasangan memenuhi tiap persamaan sebelum “Uji Pasangan” aktif; pada eliminasi, prediksi koefisien/konstanta boleh dilewati. Penyelesaian sebenarnya baru dapat dibuka setelah dua kali mencoba. Aturan “dua kali” adalah pilihan kami (heuristik), bukan dari buku.

## Perlindungan agar tidak membocorkan strategi

- Tabel perbandingan strategi **tertutup** sampai siswa membuat tebakan sendiri (x / y / sama / belum tahu); formulir refleksi ikut tertutup. Tabel hanya muncul setelah siswa menyelesaikan sistem.
- Tanggapan alasan pemilihan variabel tidak menyebut angka pengali.
- Evaluasi Akhir tidak memakai pendamping, petunjuk, atau prediksi.

## Data

- Refleksi hanya pilihan/skala (tanpa teks bebas), divalidasi terhadap registri `REFLECTION_PROMPTS`.
- Metrik proses (≤12 kunci bilangan bulat 0–1000, tanpa data pribadi): `analisis_percobaan`, `analisis_petunjuk`, `variabel_efisien`, `pengali_percobaan`, `operasi_percobaan`, `prediksi_persis`, `prediksi_setara`, `prediksi_dilewati`, `ubah_rencana`, `petunjuk_total`, `grafik_ditandai`, `selesai_ke`.
- Pada Guest Mode, catatan pembelajaran rinci (`learning`) belum disimpan di perangkat; hanya aktivitas dan penghitung. Penyimpanan rinci memerlukan Email Mode dan migrasi database yang **belum dijalankan** tanpa persetujuan.
