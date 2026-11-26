# Pemakaian AI pada MathQuest

## 1. AI di dalam aplikasi: Tanya Tutor AI

| Hal | Keterangan |
|---|---|
| Fungsi | Siswa bertanya bebas tentang SPLDV; AI menjawab dengan pertanyaan pemandu, dibatasi pada materi MathQuest |
| Alamat | https://mathquest-puce.vercel.app/tanya |
| Penyedia API | Groq (paket gratis), API kompatibel format OpenAI |
| Model | `qwen/qwen3.8-27b` |
| DeepSeek | Tidak dipakai. Groq dipilih karena tersedia gratis (target biaya Rp0). Penyedia dapat diganti lewat variabel lingkungan tanpa mengubah kode |

### Letak di kode

| Berkas | Isi |
|---|---|
| `src/app/(app)/tanya/page.tsx` | Halaman tanya jawab |
| `src/app/api/tanya/route.ts` | Rute server yang menerima pertanyaan |
| `src/server/ask/llm.ts` | Pemanggilan API AI |
| `src/server/ask/prompt.ts` | Instruksi untuk AI (cakupan SPLDV, gaya RMT, kejujuran) |
| `src/server/ask/retrieve.ts` | Pengambilan kutipan dari materi MathQuest |
| `src/server/ask/guard.ts` | Filter data pribadi dan pemblokiran soal asesmen |
| `tests/ask.test.ts`, `e2e/tanya*.ts` | Pengujian fitur |

### Konfigurasi (API key)

Kunci API **tidak ditulis di kode** dan tidak diunggah ke GitHub. Ada dua tempat penyimpanannya:
- Situs online: Environment Variables di Vercel (`LLM_API_KEY`, `LLM_MODEL`).
- Menjalankan lokal: berkas `.env` (contoh nama variabel ada di `.env.example`).

### Asisten Belajar

Halaman `/asisten` memakai AI yang sama sebagai pembimbing proses berpikir pada soal cerita bertahap. Rinciannya: [tahap2-asisten-belajar.md](tahap2-asisten-belajar.md).

## 2. AI sebagai alat bantu pengembangan

Kode aplikasi dikembangkan dengan bantuan asisten pemrograman AI (Claude Code) di VS Code. Jejaknya terlihat pada riwayat commit Git (baris `Co-Authored-By: Claude`).

## 3. Cara memverifikasi

1. Buka https://mathquest-puce.vercel.app/tanya, setujui peringatan, lalu ajukan pertanyaan, misalnya "Apa arti titik potong dua garis pada SPLDV?". Jawaban disusun saat itu juga oleh AI.
2. Menjalankan lokal: isi `LLM_API_KEY` di `.env`, jalankan `npm install` lalu `npm run dev`, buka `http://localhost:3000/tanya`.
3. Periksa berkas pada tabel di atas dan jalankan `npm test`.

## 4. Batasan

- Hanya halaman Asisten Belajar dan Tanya Tutor AI yang memakai AI. Tutor petunjuk L1–L4, latihan, permainan, dan asesmen memakai aturan matematika.
- Jawaban AI dapat keliru; siswa diminta memeriksanya.
- Paket gratis memiliki batas pemakaian.

Rincian keamanan dan privasi: [tanya-tutor-ai.md](tanya-tutor-ai.md).
