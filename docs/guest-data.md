# Data pembelajaran di Guest Mode (persiapan Tahap 5)

## Ringkasan

Guest Mode **sudah** menyimpan data pembelajaran di perangkat, tanpa login, API, LLM, atau biaya. Tidak ada sistem penyimpanan baru yang dibuat; mekanisme yang ada dipakai ulang.

| Kebutuhan | Kondisi |
|---|---|
| Catatan Learning Activity, jawaban refleksi, metrik proses disimpan lokal | Ya. Setiap event yang diterima (termasuk `la` dan jawaban refleksi) tersimpan di `GuestData.events`, kunci localStorage `mathquest.guest.v1`. |
| Tanpa login/API/LLM/biaya | Ya. Hanya `window.localStorage`. |
| Bertahan setelah browser ditutup | Ya. Diuji E2E (`e2e/stage4.spec.ts`, “data pembelajaran bertahan…”) dengan konteks browser baru. |
| Dapat diekspor manual ke CSV (Tahap 5) | Siap. `deriveLearningRecords(events)` membangun catatan dari event dengan mesin yang sama dengan server. Tombol ekspor sendiri **belum dibuat** (Tahap 5). |
| Tidak mengubah/menghapus data lama | Ya. Format tidak berubah; di bawah batas, daftar event tidak diubah sama sekali (diuji). |

## Yang ditambahkan pada Tahap 4 (aditif)

`src/lib/storage/guest-data.ts`:
1. `pruneEvents`: ketika jumlah event melewati batas (1000), event **biasa** tertua dibuang lebih dulu; event pembelajaran (refleksi dan metrik `la`) dipertahankan lebih lama. Sebelumnya semua event tertua dibuang tanpa pandang jenis.
2. `deriveLearningRecords`: mengubah event menjadi catatan pembelajaran (untuk CSV Tahap 5).
3. `guestStorageStatus`: jumlah event, ukuran perkiraan, dan peringatan mendekati batas (90%) untuk dipakai antarmuka Tahap 5.

## Risiko kehilangan data

- **Data hanya ada di satu browser pada satu perangkat.** Berganti browser atau perangkat berarti data tidak ada.
- **Menghapus data situs, riwayat browser, atau “bersihkan penyimpanan” menghapus semuanya.** Aplikasi tidak dapat mencegahnya.
- **Mode privat/penyamaran**: data hilang saat jendela ditutup, atau penyimpanan dapat diblokir (aplikasi menampilkan peringatan jika gagal menyimpan).
- **Perangkat bersama**: beberapa siswa yang memakai browser yang sama akan berbagi satu data Guest. Untuk pilot, sebaiknya satu perangkat satu siswa, atau gunakan profil browser terpisah.
- Beberapa browser (terutama iOS Safari) dapat membersihkan data situs yang lama tidak dibuka.

## Keterbatasan penyimpanan

- Batas bawaan browser sekitar 5 MB per situs. Satu event berukuran kecil (sekitar 0,2–1 KB), sehingga 1000 event umumnya jauh di bawah batas.
- **Batas 1000 event.** Jika terlampaui, event biasa tertua dibuang; XP dan progres (`state`) tetap, tetapi event lama yang dibuang tidak dapat ikut digabung ke akun pada sinkronisasi di masa depan. Event pembelajaran dipertahankan lebih lama, namun jika jumlahnya sendiri melebihi 1000, yang tertua dibuang.
- Catatan pembelajaran dalam bentuk turunan tidak disimpan terpisah; selalu dibangun dari event.

## Cadangan (cara yang direkomendasikan)

1. **Selama pilot (tanpa fitur baru):** minta siswa tidak menghapus data situs; satu perangkat per siswa; gunakan browser yang sama sepanjang pilot.
2. **Tahap 5 (setelah disetujui):** tombol ekspor manual CSV tanpa data pribadi (tanpa nama; hanya kode anonim), yang dapat disimpan siswa atau guru ke berkas. Sebaiknya diekspor di akhir setiap pertemuan.
3. **Privasi:** CSV tidak boleh memuat nama panggilan, email, atau teks bebas (refleksi memang hanya pilihan/skala).
