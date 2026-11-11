import type { Difficulty } from "@/lib/math/spldv";

export type GameId =
  | "detektif-variabel"
  | "misi-belanja"
  | "eliminasi-kilat"
  | "pasangkan-istilah"
  | "tantangan-spldv"
  | "susun-langkah"
  | "tebak-nilai";

export interface GameMeta {
  id: GameId;
  title: string;
  tagline: string;
  mechanic: string;
  howTo: string[];
  rules: string[];
  scoring: string;
  /** Skor maksimum yang mungkin dicapai — dipakai server untuk menolak skor palsu */
  maxScore: number;
  /** Skor yang dianggap 100% (untuk persentase & XP) */
  targetScore: number;
  /** Batas jumlah soal/ronde wajar, untuk validasi */
  maxTotal: number;
  /** Waktu minimal (detik) per soal/ronde agar hasil dianggap wajar */
  minSecondsPerItem: number;
  color: "brand" | "grape" | "emerald" | "amber" | "rose" | "sky" | "orange";
  difficultyNote: Record<Difficulty, string>;
}

export const GAMES: GameMeta[] = [
  {
    id: "detektif-variabel",
    title: "Detektif Variabel",
    tagline: "Pecahkan kasus dengan petunjuk sesedikit mungkin.",
    mechanic: "Investigasi petunjuk",
    howTo: [
      "Setiap kasus menyembunyikan dua nilai: x dan y.",
      "Dua persamaan (bukti utama) selalu terbuka. Buka petunjuk tambahan jika butuh — tetapi poin kasus berkurang.",
      "Tuliskan tersangka nilai x dan y, lalu tekan \"Ajukan Tuduhan\".",
    ],
    rules: [
      "Ada 5 kasus. Nilai awal tiap kasus 100 poin.",
      "Setiap petunjuk tambahan: −20 poin. Setiap tuduhan salah: −10 poin.",
      "Nilai minimal kasus yang terpecahkan adalah 20 poin. Kamu boleh menyerah dan lanjut ke kasus berikutnya (0 poin).",
    ],
    scoring: "Maksimal 500 poin.",
    maxScore: 500,
    targetScore: 500,
    maxTotal: 5,
    minSecondsPerItem: 3,
    color: "brand",
    difficultyNote: {
      mudah: "Koefisien kecil, nilai positif.",
      sedang: "Perlu mengalikan satu persamaan.",
      sulit: "Kedua persamaan dikalikan, nilai bisa negatif.",
    },
  },
  {
    id: "misi-belanja",
    title: "Misi Belanja",
    tagline: "Temukan harga satuan dari dua nota, lalu atur belanjaan.",
    mechanic: "Nota & anggaran",
    howTo: [
      "Kamu menerima dua nota belanja dengan barang yang sama.",
      "Tahap 1: tentukan harga satuan setiap barang.",
      "Tahap 2: hitung total harga daftar belanja baru dan putuskan apakah uangmu cukup.",
    ],
    rules: [
      "Ada 4 misi. Tahap 1 bernilai 60 poin, tahap 2 bernilai 40 poin.",
      "Setiap jawaban salah pada tahap 1 mengurangi 15 poin (minimal 15).",
      "Tahap 2 hanya bisa dijawab sekali.",
    ],
    scoring: "Maksimal 400 poin.",
    maxScore: 400,
    targetScore: 400,
    maxTotal: 4,
    minSecondsPerItem: 5,
    color: "emerald",
    difficultyNote: {
      mudah: "Harga ribuan bulat, satu barang koefisiennya sama.",
      sedang: "Salah satu nota perlu dikalikan.",
      sulit: "Kedua nota perlu dikalikan, belanjaan lebih banyak.",
    },
  },
  {
    id: "eliminasi-kilat",
    title: "Eliminasi Kilat",
    tagline: "Adu cepat memilih langkah eliminasi yang benar.",
    mechanic: "Balapan waktu",
    howTo: [
      "Sebuah SPLDV muncul bersama pertanyaan singkat: operasi apa, pengali berapa, atau nilai variabel.",
      "Pilih jawaban secepat mungkin sebelum waktu habis.",
      "Jawaban benar beruntun memberi bonus combo.",
    ],
    rules: [
      "Waktu: 90 detik (mudah), 75 detik (sedang), 60 detik (sulit).",
      "Benar: +10 poin + bonus combo (maks +5). Salah: combo kembali 0 dan waktu berkurang 3 detik.",
    ],
    scoring: "Semakin cepat dan teliti, semakin tinggi skornya.",
    maxScore: 900,
    targetScore: 300,
    maxTotal: 60,
    minSecondsPerItem: 1,
    color: "orange",
    difficultyNote: {
      mudah: "Koefisien langsung sama atau berlawanan.",
      sedang: "Ada pertanyaan pengali.",
      sulit: "Koefisien besar dan negatif.",
    },
  },
  {
    id: "pasangkan-istilah",
    title: "Pasangkan Istilah",
    tagline: "Hubungkan istilah matematika dengan pengertiannya.",
    mechanic: "Mencocokkan pasangan",
    howTo: [
      "Kolom kiri berisi istilah, kolom kanan berisi pengertian (diacak).",
      "Pilih satu istilah, lalu pilih pengertian yang cocok.",
      "Pasangan yang benar akan terkunci hijau.",
    ],
    rules: [
      "Setiap pasangan benar +25 poin. Setiap percobaan salah −5 poin.",
      "Bonus waktu hingga 100 poin jika selesai cepat.",
    ],
    scoring: "Maksimal 300 poin (mudah 6 pasang, sedang 7, sulit 8; skor dinormalkan).",
    maxScore: 300,
    targetScore: 300,
    maxTotal: 8,
    minSecondsPerItem: 1,
    color: "grape",
    difficultyNote: {
      mudah: "6 pasang istilah dasar.",
      sedang: "7 pasang, termasuk istilah eliminasi.",
      sulit: "8 pasang dengan pengertian yang mirip.",
    },
  },
  {
    id: "tantangan-spldv",
    title: "Tantangan SPLDV",
    tagline: "Naiki 10 tingkat soal dengan 3 nyawa.",
    mechanic: "Tangga level & nyawa",
    howTo: [
      "Kerjakan soal satu per satu. Setiap tingkat lebih sulit dari sebelumnya.",
      "Jawab benar untuk naik tingkat. Jawaban salah mengurangi satu nyawa.",
      "Permainan selesai ketika tingkat 10 terlewati atau nyawa habis.",
    ],
    rules: [
      "Poin tingkat ke-n adalah n × 10 (total maksimal 550).",
      "Kamu punya 3 nyawa. Salah menjawab: nyawa −1, soal diganti.",
    ],
    scoring: "Maksimal 550 poin.",
    maxScore: 550,
    targetScore: 550,
    maxTotal: 13,
    minSecondsPerItem: 2,
    color: "rose",
    difficultyNote: {
      mudah: "Mulai dari tingkat dasar.",
      sedang: "Mulai dari tingkat menengah.",
      sulit: "Langsung soal berat sejak awal.",
    },
  },
  {
    id: "susun-langkah",
    title: "Susun Langkah Eliminasi",
    tagline: "Urutkan langkah penyelesaian yang teracak.",
    mechanic: "Mengurutkan kartu",
    howTo: [
      "Kartu-kartu langkah eliminasi disajikan dalam urutan acak.",
      "Gunakan tombol panah naik/turun untuk memindahkan kartu.",
      "Tekan \"Periksa Urutan\" — kartu di posisi benar akan berwarna hijau.",
    ],
    rules: [
      "Ada 3 teka-teki. Nilai awal tiap teka-teki 100 poin.",
      "Setiap pemeriksaan yang belum benar: −20 poin (minimal 20).",
    ],
    scoring: "Maksimal 300 poin.",
    maxScore: 300,
    targetScore: 300,
    maxTotal: 3,
    minSecondsPerItem: 4,
    color: "sky",
    difficultyNote: {
      mudah: "5 kartu langkah.",
      sedang: "6 kartu langkah.",
      sulit: "7 kartu langkah termasuk pemeriksaan.",
    },
  },
  {
    id: "tebak-nilai",
    title: "Tebak Nilai Variabel",
    tagline: "Tebak (x, y) dengan bantuan sinyal \"terlalu besar/kecil\".",
    mechanic: "Tebak & sinyal",
    howTo: [
      "Komputer menyembunyikan pasangan (x, y) yang memenuhi sebuah SPLDV.",
      "Masukkan tebakanmu. Untuk setiap persamaan, kamu akan diberi tahu apakah ruas kirinya terlalu besar, terlalu kecil, atau tepat.",
      "Gunakan sinyal itu (atau eliminasi!) untuk menemukan jawabannya.",
    ],
    rules: [
      "Ada 3 ronde, masing-masing maksimal 8 tebakan.",
      "Nilai ronde: 100 − 10 × (tebakan − 1), minimal 10. Gagal dalam 8 tebakan: 0 poin.",
    ],
    scoring: "Maksimal 300 poin.",
    maxScore: 300,
    targetScore: 300,
    maxTotal: 3,
    minSecondsPerItem: 3,
    color: "amber",
    difficultyNote: {
      mudah: "x dan y antara 1–9.",
      sedang: "x dan y antara −3–10.",
      sulit: "x dan y antara −8–12.",
    },
  },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameMeta>;
export const GAME_IDS = GAMES.map((g) => g.id) as GameId[];
