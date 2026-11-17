# Tanya Tutor AI (opsional, layanan gratis)

Halaman **/tanya** memungkinkan siswa bertanya bebas tentang SPLDV. Jawaban disusun oleh model bahasa dari layanan gratis pihak ketiga, **dibatasi pada materi MathQuest**. Fitur ini **tidak menggantikan** tutor aturan L1–L4 di Latihan (yang tetap tanpa AI) dan tidak menggantikan guru.

## Status
Fitur aktif hanya jika server memiliki `LLM_API_KEY`. Tanpa kunci, halaman menampilkan "Tutor AI belum aktif" dan seluruh aplikasi berjalan normal (Guest Mode, asesmen, ekspor).

## Cara kerja (alur satu pertanyaan)
1. Siswa membaca peringatan dan menyetujui sekali (disimpan lokal).
2. Browser mengirim pertanyaan ke `/api/tanya` di server MathQuest (kunci API **tidak pernah** ke browser).
3. Server memeriksa berurutan: kunci ada → batas laju per alamat (20/10 menit) → **filter data pribadi** (email, nomor panjang, tautan, "nama saya…") → **pengenal soal bernilai**.
4. **Soal bernilai:** bila siswa menempelkan soal Pretest/Posttest/Evaluasi Akhir (dikenali dari urutan angka soal), AI **tidak dipanggil** dan siswa diarahkan belajar. Bila soal Latihan/Mini Quiz, AI hanya diminta memberi petunjuk bertahap tanpa jawaban akhir.
5. Server mengambil 3 kutipan terdekat dari **materi MathQuest sendiri** (pencarian kata sederhana, tanpa layanan luar) dan menyusun *system prompt*: hanya SPLDV, gaya RMT (pertanyaan pemandu, prediksi, alasan, hubungan tabel–persamaan–grafik), jujur bila tidak yakin, mengabaikan perintah yang mengubah aturan.
6. Server memanggil layanan AI (API chat kompatibel OpenAI), lalu mengembalikan jawaban + tautan materi terkait. Batas harian global (`LLM_DAILY_CAP`, bawaan 800) melindungi kuota gratis.

## Privasi
- Yang dikirim ke penyedia AI: teks pertanyaan siswa (≤400 karakter), maksimal 4 pesan sebelumnya, dan kutipan materi. **Tidak** dikirim: kode peserta, ID perangkat, nama panggilan, data progres, hasil asesmen.
- Server MathQuest tidak menyimpan atau mencatat pertanyaan/jawaban; percakapan hanya di memori halaman dan hilang saat ditutup; tidak masuk ekspor CSV.
- Penyedia AI pihak ketiga memiliki kebijakan datanya sendiri. **Pilih penyedia dan baca kebijakannya sebelum mengaktifkan.** Catatan hasil penelusuran (belum diverifikasi pada halaman resmi): layanan gratis Google Gemini API menyatakan konten dapat dipakai untuk meningkatkan produk dan dapat ditinjau manusia, sehingga **kurang cocok untuk pertanyaan siswa di bawah umur**; untuk Groq, sumber sekunder menyebut data tidak dipakai melatih model tetapi kebijakan retensi belum terkonfirmasi. Sebaiknya guru/sekolah memberi tahu siswa dan wali murid bahwa fitur ini mengirim pertanyaan ke layanan luar.
- Filter data pribadi bersifat heuristik (tidak sempurna); siswa tetap diminta tidak menulis data pribadi.

## Mengaktifkan (tindakan pemilik akun)
1. Buat akun dan **API key gratis** pada penyedia pilihan Anda (mis. console.groq.com). Jangan membagikan kunci di chat/GitHub.
2. Tambahkan variabel lingkungan produksi di Vercel (kunci diketik di terminal Anda, tidak ditampilkan di percakapan):
   ```bash
   npx vercel@latest env add LLM_API_KEY production
   # opsional: LLM_BASE_URL, LLM_MODEL, LLM_DAILY_CAP
   npx vercel@latest deploy --prod --yes
   ```
3. Buka `/tanya` dan uji satu pertanyaan.
Mematikan fitur: hapus `LLM_API_KEY` (`npx vercel env rm LLM_API_KEY production`) lalu deploy ulang.

## Penyedia dan model yang dipakai saat ini
- Penyedia: Groq (paket gratis, tanpa kartu). Model: `qwen/qwen3.8-27b` (diatur lewat `LLM_MODEL`). Model bawaan sebelumnya (`llama-3.3-70b-versatile`) sudah tidak tersedia; daftar model Groq berubah, periksa dengan `GET https://api.groq.com/openai/v1/models`. Jika fitur tiba-tiba menjawab "Tutor AI sedang tidak dapat dihubungi", periksa dulu apakah model masih ada.
- Jawaban model dirapikan di server menjadi teks biasa (LaTeX/markdown dihapus).
- **Kunci API:** jika pernah tertempel di chat, repositori, atau tangkapan layar, anggap bocor: cabut di console.groq.com → API Keys, buat yang baru, lalu `npx vercel@latest env rm LLM_API_KEY production`, `env add LLM_API_KEY production`, dan deploy ulang.

## Batasan dan risiko
- AI dapat keliru (termasuk matematika). Siswa diingatkan memeriksa dengan substitusi dan materi; jawaban AI **tidak dinilai** dan tidak memberi XP.
- Pengenal soal bernilai berbasis angka: soal yang diparafrasekan dengan angka berbeda tidak terdeteksi (dan memang bukan soal yang sama). Orang yang sengaja menyiasati tidak dapat dicegah sepenuhnya; pengawasan guru saat asesmen tetap perlu.
- Batas laju dan batas harian berada di memori per instance (hosting serverless), jadi bersifat "sebaik mungkin". Kuota gratis penyedia dapat berubah atau habis; fitur menampilkan pesan ramah dan aplikasi lain tidak terpengaruh.
- Kualitas bahasa dan ketepatan bergantung model gratis yang dipilih; uji dengan pertanyaan khas siswa sebelum dipakai di kelas.
- Fitur ini mengubah klaim "tanpa LLM": tutor L1–L4, tes, dan asesmen tetap tanpa AI; hanya halaman `/tanya` memakai LLM.
