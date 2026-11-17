# Tahap 4 — Materi dan permainan berbasis RMT: buku vs. interpretasi MathQuest

Format sama dengan `rmt-tahap3-penerapan.md`: **[BUKU]** = konsep RMT (Kinard & Kozulin) dari ringkasan buku; **[INTERPRETASI]** = keputusan desain kami yang belum teruji efektivitasnya.

## Batas klaim

MathQuest **tidak** menerapkan LPAD secara penuh, tidak menggantikan mediator manusia, dan tidak mengklaim efektivitas setara penelitian. Seluruh umpan balik adalah aturan tetap yang dihitung dari matematika SPLDV.

## Materi Modul 4–6

| Fitur | [BUKU] | [INTERPRETASI] |
|---|---|---|
| Blok “Pikirkan dulu” | Siswa memprediksi atau bernalar sebelum mendapat penjelasan; penjelasan menghubungkan jawaban dengan alasan | Pertanyaan pilihan dengan umpan balik beralasan (tidak dinilai, 0 XP); jawaban keliru tidak dicap “salah” melainkan “belum sesuai” disertai alasan |
| Tabel + grafik + aljabar pada satu sistem | Alat psikologis dan representasi yang saling terhubung | Satu sistem ditampilkan sebagai tabel pasangan, dua garis, dan hasil eliminasi; titik potong sama dengan baris tabel dan hasil hitung. Setiap titik pada grafik **diuji otomatis** terhadap persamaan garisnya |
| Garis hasil eliminasi pada grafik | Makna: mengapa prosedur bekerja | y = 2 atau x = 7 digambarkan sebagai garis yang melewati titik potong (eliminasi tidak mengubah penyelesaian) |
| Refleksi di akhir materi | Refleksi atas proses belajar | Empat pertanyaan pilihan/skala, boleh dilewati, 0 XP; menanyakan kemampuan menjelaskan dengan kata sendiri dan representasi yang paling membantu |

## 16 soal latihan (8 Modul 4, 8 Modul 6)

- **Fokus konsep**: memilih alasan matematis, menilai klaim, membaca tabel dan grafik, mengenali kekeliruan siswa lain. Dua belas dari 16 soal berformat konsep atau penyelesaian.
- **[INTERPRETASI]**: pola kesalahan pilihan ganda ditulis khusus (bukan katalog prosedural) dan berupa pengamatan serta pertanyaan pengarah, bukan jawaban. Tangga petunjuk L1–L4 tersedia dan diperiksa pengaman kebocoran.
- Semua soal dengan sistem persamaan memuat metadata `verify` sehingga kunci jawabannya diuji otomatis.

## Tebak Nilai

- **[BUKU]** Perencanaan sebelum bertindak dan validasi hasil terhadap harapan.
- **[INTERPRETASI]** Sebelum setiap tebakan siswa **wajib** memilih prediksi sinyal tiap persamaan (terlalu kecil, tepat, terlalu besar) dan **alasan** pilihan tertutup (substitusi, sinyal sebelumnya, eliminasi, menebak). Prediksi dibandingkan dengan hasil. **Skor dan XP tidak berubah.** Alasan “menebak dulu” sengaja disediakan agar siswa tidak dipaksa berpura-pura bernalar; metriknya dicatat. Setelah bermain: refleksi strategi dan manfaat prediksi.
- Prediksi mensyaratkan siswa menghitung ruas kiri (substitusi), sehingga sekaligus melatih validasi.

## Eliminasi Kilat

- **[INTERPRETASI]** Jawaban salah kini disertai alasan matematis (mengapa dijumlahkan atau dikurangkan, bagaimana KPK memberi pengali). Setelah bermain, siswa melihat cermin angkanya sendiri (akurasi, rata-rata detik per soal) dan merefleksikan kecepatan vs. ketelitian. Skor, waktu, dan aturan permainan tidak berubah (kecuali jeda tampilan penjelasan setelah jawaban salah, dari 0,9 menjadi 1,6 detik).

## Data

- Metrik `la` pada event `game`: Tebak Nilai (tebakan_total, prediksi_total, prediksi_benar, alasan_*, ronde_*), Eliminasi Kilat (jawaban_total, benar, salah, akurasi, combo_maks, waktu_rata_x10). Semua bilangan bulat 0–1000, tanpa teks bebas.
- Refleksi baru pada konteks `tebak_nilai`, `eliminasi_kilat`, `lesson`.

## Keterbatasan

- Belum ada uji dengan siswa nyata; semua klaim manfaat bersifat hipotesis.
- Soal latihan RMT diambil acak bersama soal lain pada sesi latihan, sehingga tiap sesi tidak selalu memuat soal konsep.
- Tahap 5 (diagnostik pra/pasca, dashboard, ekspor CSV, protokol pilot) belum dimulai.
