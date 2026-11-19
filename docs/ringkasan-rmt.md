# Ringkasan RMT dan penerapannya di MathQuest

**Rigorous Mathematical Thinking (RMT)** adalah pendekatan pembelajaran matematika dari Kinard dan Kozulin. Dokumen ini merangkum konsep intinya sebagaimana dipakai sebagai dasar pembangunan MathQuest, lalu memetakannya ke fitur aplikasi. Tanda yang dipakai:

- **[BUKU]**: konsep RMT sebagaimana dirangkum dari buku.
- **[INTERPRETASI]**: cara kami menerjemahkannya menjadi fitur perangkat lunak. Ini keputusan desain pengembang, **bukan isi buku**, dan belum teruji efektivitasnya.

> Catatan: ringkasan ini disusun dari catatan RMT yang dipakai selama pengembangan. Mohon dicocokkan dengan buku atau ringkasan dari dosen sebelum dikutip sebagai rujukan resmi.

## Batas klaim (penting)

- MathQuest **tidak** menggantikan mediasi guru atau mediator manusia.
- MathQuest **bukan** penerapan penuh LPAD (penilaian dinamis) dan tidak mengklaimnya.
- MathQuest **belum membuktikan** efektivitas RMT secara empiris. Seluruh manfaat bersifat hipotesis dan baru dapat diuji lewat uji coba terbatas.
- Kesetaraan pretest dan posttest (formulir A/B) adalah kesetaraan rancangan, belum terbukti pada siswa.

## 1. Learning Activity: tiga elemen

| Elemen | [BUKU] | [INTERPRETASI] di MathQuest |
|---|---|---|
| Analisis tugas | Siswa memahami apa yang diminta dan diketahui sebelum bertindak | Mengisi tabel koefisien, memilih tujuan tugas, dan menentukan hubungan koefisien tiap variabel sebelum menyelesaikan sistem di SPLDV Lab |
| Perencanaan tindakan | Memilih strategi dan menyatakan alasannya sebelum melaksanakan | Memilih variabel yang dieliminasi beserta alasan, dan memprediksi hasil sebelum eliminasi dijalankan |
| Refleksi | Meninjau proses dan membandingkan dengan alternatif | Menebak dulu lalu membandingkan strategi eliminasi x dan y, serta pertanyaan refleksi pilihan/skala (boleh dilewati, 0 XP) |

Ketiganya tidak harus berurutan: siswa dapat membuka kembali analisisnya, mengubah rencana, atau mencoba variabel lain.

## 2. Mediated Learning Experience (MLE)

| Prinsip | [BUKU] | [INTERPRETASI] |
|---|---|---|
| Intensionalitas dan resiprositas | Tujuan dinyatakan jelas dan interaksi dua arah | Setiap panel utama memuat baris "Tujuan"; tanggapan memakai pilihan nyata siswa (variabel, alasan, prediksi, pengali). Dua arah hanya pendekatan: sistem menanggapi, tetapi tidak membaca pikiran siswa |
| Transendensi | Menggeneralisasi di luar konteks soal | Pertanyaan aturan umum, perbandingan strategi, dan "coba variabel lain". Terbatas pada keluarga soal eliminasi SPLDV |
| Makna | Memahami mengapa, bukan hanya prosedur | Kotak "Mengapa?", dan tautan bentuk aljabar dengan grafik (garis hasil eliminasi melewati titik potong) |

## 3. Alat psikologis dan representasi yang saling terhubung

- **[BUKU]** Tabel, bidang koordinat, dan persamaan sebagai alat berpikir yang memediasi pemahaman.
- **[INTERPRETASI]** Satu sistem persamaan ditampilkan sebagai tabel pasangan, dua garis pada grafik, dan hasil eliminasi. Titik potong sama dengan baris tabel dan hasil hitung; setiap titik pada grafik diuji otomatis terhadap persamaannya.

## 4. Fungsi kognitif matematis

- **[BUKU]** Kemampuan berpikir yang dilatih lewat tugas matematis, misalnya memprediksi, membandingkan, memeriksa hasil, dan menjelaskan alasan.
- **[INTERPRETASI]** Diwujudkan sebagai prediksi sebelum menguji (Uji Pasangan, eliminasi, Tebak Nilai), memeriksa solusi dengan substitusi, membandingkan strategi, dan memilih alasan. Pemetaan tiap fungsi ke fitur adalah interpretasi kami.

## 5. Peta fitur MathQuest

| Fitur | Unsur RMT yang dituju | Catatan |
|---|---|---|
| 7 modul materi | Representasi terhubung, makna, "Pikirkan dulu" (prediksi), refleksi | Modul 4–6 paling lengkap |
| SPLDV Lab (eliminasi, uji pasangan, grafik) | Learning Activity, prediksi, transendensi | Aturan tetap, tanpa AI |
| Tutor petunjuk L1–L4 | Mediasi bertahap, kesempatan mencoba kembali | Berbasis aturan matematika (tanpa AI); petunjuk tidak membuka jawaban |
| Latihan dan 16 soal RMT | Alasan, penilaian klaim, tabel dan grafik | Soal konsep ditulis khusus |
| Tebak Nilai, Eliminasi Kilat | Prediksi, validasi, refleksi kecepatan vs ketelitian | Skor dan XP tidak berubah oleh prediksi |
| Pretest dan posttest A/B | Pengukuran kompetensi sebelum dan sesudah | Dinilai server; kunci tidak dikirim ke browser |
| Ekspor CSV | Data proses (percobaan, petunjuk, prediksi, refleksi) untuk analisis | Tanpa data pribadi |
| Tanya Tutor AI (opsional) | Tanya jawab bergaya mediasi (pertanyaan pemandu, alasan) | Memakai layanan AI gratis pihak ketiga; tidak menjawab soal asesmen; dapat keliru |

## 6. Kebijakan XP yang konsisten dengan RMT

Percobaan ke-1 mendapat 100% XP, ke-2 50%, ke-3 dan seterusnya 0%; XP sekali per soal; XP tidak pernah berkurang karena salah atau memakai petunjuk; refleksi 0 XP. Tujuannya: proses berpikir dihargai, bukan sekadar kecepatan menjawab. Ini **[INTERPRETASI]**.

## 7. Keterbatasan

- Belum diuji dengan siswa nyata.
- Mediasi aplikasi adalah aturan tetap, tidak "memahami" siswa.
- Generalisasi terbatas pada eliminasi SPLDV.
- Tanya Tutor AI dapat keliru dan bergantung pada model gratis pihak ketiga.

Rincian per tahap: [rmt-tahap3-penerapan.md](rmt-tahap3-penerapan.md), [rmt-tahap4-penerapan.md](rmt-tahap4-penerapan.md), [tahap5-asesmen-ekspor.md](tahap5-asesmen-ekspor.md), [tanya-tutor-ai.md](tanya-tutor-ai.md).
