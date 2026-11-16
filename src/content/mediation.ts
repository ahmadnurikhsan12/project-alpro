import type { QuestionMediation, SkillCode, TransferPrompt } from "@/lib/tutor/types";

/**
 * METADATA TUTOR untuk soal pilot Modul 4–6 (25 soal latihan + 12 soal mini quiz).
 *
 * Hanya memuat hal yang tidak dapat diturunkan dari soal itu sendiri: keterampilan, apa
 * yang ditanyakan (target) agar jawaban keliru khas dapat dikenali, dan pola kesalahan
 * pilihan ganda. Sistem persamaan diambil dari `verify` pada soal; kebenaran dihitung
 * oleh spldv.ts. Soal di luar pilot tetap mendapat tangga petunjuk dari petunjuk yang
 * sudah ada, tetapi tanpa diagnosis kecuali pasangan (x, y) yang dapat diturunkan.
 *
 * Pemetaan `phase` adalah INTERPRETASI penerapan, bukan klaim dari buku.
 */
const operasi = (eliminate: "x" | "y", options: QuestionMediation["options"]): QuestionMediation => ({
  phase: "elaborasi",
  skill: "pilih_operasi",
  eliminate,
  options,
});
const hitung = (target: QuestionMediation["target"], extra: Partial<QuestionMediation> = {}): QuestionMediation => ({
  phase: "elaborasi",
  skill: "hitung_eliminasi",
  target,
  ...extra,
});
const periksa = (): QuestionMediation => ({ phase: "output", skill: "periksa_solusi" });

export const MEDIATION_BY_ID: Record<string, QuestionMediation> = {
  // ------------------------------------------------------------ Modul 4 — memilih operasi
  "p-m-06": operasi("y", { b: "salah_operasi", c: "kalikan_tidak_perlu", d: "operasi_bukan_eliminasi" }),
  "p-m-07": operasi("y", { a: "salah_operasi", c: "kalikan_tidak_perlu", d: "kira_tidak_bisa_dieliminasi" }),
  "p-s-04": operasi("y", { b: "salah_operasi", c: "kalikan_tidak_perlu", d: "operasi_bukan_eliminasi" }),
  "q-m4-1": operasi("y", { b: "salah_operasi", c: "kalikan_tidak_perlu", d: "operasi_bukan_eliminasi" }),
  "q-m4-2": operasi("y", { a: "salah_operasi", c: "kalikan_tidak_perlu", d: "kira_tidak_bisa_dieliminasi" }),
  "p-h-12": { phase: "elaborasi", skill: "pilih_operasi", eliminate: "y", tfWrong: "salah_operasi" },
  "q-m4-3": {
    phase: "elaborasi",
    skill: "ruas_kanan",
    tfWrong: {
      code: "opsi_khusus",
      observe: "Pernyataan ini dapat diuji dengan angka sebelum kamu menentukan benar atau salah.",
      ask: "Pasangan x = 2 dan y = 3 memenuhi x + y = 5. Kalikan kedua ruas persamaan itu dengan 2. Apakah x = 2 dan y = 3 masih memenuhi persamaan yang baru?",
    },
    ladder: {
      2: "Uji pernyataan dengan satu contoh: pilih sebuah persamaan beserta satu pasangan penyelesaiannya, lalu kalikan kedua ruasnya.",
      3: "Substitusikan pasangan yang sama ke persamaan yang sudah dikalikan. Bandingkan ruas kiri dan ruas kanannya.",
    },
  },
  "q-m4-4": hitung({ kind: "combined_const", eliminate: "y" }),

  // ------------------------------------------------------------ Modul 5 — langkah eliminasi
  "p-m-08": hitung({ kind: "combined_const", eliminate: "y" }),
  "p-s-05": hitung({ kind: "combined_const", eliminate: "y" }),
  "p-h-05": hitung({ kind: "combined_const", eliminate: "y" }),
  "p-m-09": hitung({ kind: "var", v: "x" }),
  "p-s-02": hitung({ kind: "var", v: "y" }, { ladder: { 3: "Kalikan persamaan kedua dengan 2 agar koefisien x sama dengan persamaan pertama, lalu kurangkan kedua persamaan pada ruas kiri dan ruas kanan." } }),
  "p-h-03": hitung(
    { kind: "var", v: "y" },
    {
      ladder: {
        2: "Pilih x untuk dieliminasi: KPK dari koefisien x (5 dan 3) adalah 15, jadi kedua persamaan perlu dikalikan.",
        3: "Kalikan (1) dengan 3 dan (2) dengan 5, lalu kurangkan. Hati-hati dengan tanda: 6y − (−20y) = 26y.",
      },
    },
  ),
  "q-m5-2": hitung(
    { kind: "var", v: "y" },
    {
      ladder: {
        2: "Variabel yang diminta masih bertanda negatif. Apa yang harus dilakukan pada kedua ruas agar y menjadi positif?",
        3: "Kalikan kedua ruas persamaan yang tersisa dengan −1. Apa bentuk persamaan yang baru?",
      },
    },
  ),
  "p-m-10": hitung({ kind: "pair" }),
  "p-m-11": hitung({ kind: "pair" }),
  "p-s-03": hitung({ kind: "pair" }),
  "p-s-09": hitung({ kind: "pair" }),
  "p-h-01": hitung({ kind: "pair" }),
  "p-h-02": hitung({ kind: "pair" }),
  "q-m5-3": hitung({ kind: "pair" }),
  "p-h-14": { phase: "elaborasi", skill: "hitung_eliminasi" },
  "p-s-01": { phase: "elaborasi", skill: "samakan_koefisien", target: { kind: "multiplier", eq: 2, eliminate: "x" } },
  "q-m5-1": { phase: "elaborasi", skill: "samakan_koefisien", target: { kind: "multiplier", eq: 2, eliminate: "x" } },
  "p-s-08": {
    phase: "elaborasi",
    skill: "samakan_koefisien",
    eliminate: "x",
    options: {
      a: { code: "opsi_khusus", observe: "Angka itu bukan kelipatan dari salah satu koefisien.", ask: "Tulis beberapa kelipatan dari koefisien pertama dan beberapa kelipatan dari koefisien kedua. Apakah angka pilihanmu muncul di kedua daftar?" },
      c: { code: "opsi_khusus", observe: "Angka 1 adalah faktor persekutuan kedua koefisien (FPB), bukan kelipatan persekutuan.", ask: "KPK adalah kelipatan, bukan faktor. Tulis kelipatan tiap koefisien secara berurutan, lalu cari angka pertama yang muncul di kedua daftar." },
      d: { code: "opsi_khusus", observe: "Angka itu memang kelipatan dari kedua koefisien, tetapi bukan yang terkecil.", ask: "Adakah kelipatan persekutuan yang lebih kecil? Tulis kelipatan kedua koefisien secara berurutan dari yang terkecil." },
    },
    ladder: {
      2: "KPK adalah kelipatan persekutuan yang paling kecil: bilangan terkecil yang merupakan kelipatan dari kedua koefisien.",
      3: "Tulis kelipatan koefisien pertama dan kelipatan koefisien kedua secara berurutan, lalu cari bilangan pertama yang muncul di kedua daftar.",
    },
  },
  "p-h-04": {
    phase: "elaborasi",
    skill: "samakan_koefisien",
    eliminate: "y",
    options: { b: "salah_operasi", c: "pengali_bukan_terkecil", d: "pengali_tertukar" },
  },
  "p-s-13": {
    phase: "elaborasi",
    skill: "substitusi",
    ladder: { 3: "Ganti x pada salah satu persamaan awal dengan nilai yang sudah kamu peroleh. Persamaan yang terbentuk hanya memuat satu variabel yang belum diketahui." },
    options: {
      a: { code: "opsi_khusus", observe: "Kamu menuliskan pasangan sebelum nilai variabel keduanya diketahui.", ask: "Dari eliminasi, nilai variabel mana yang sudah diperoleh dan mana yang belum? Bagaimana menemukan yang belum diketahui?" },
      c: { code: "opsi_khusus", observe: "Satu nilai sudah diketahui, jadi koefisien tidak perlu disamakan lagi.", ask: "Apa yang belum diketahui sekarang, dan persamaan awal mana yang bisa dipakai untuk mencarinya?" },
      d: { code: "opsi_khusus", observe: "Nilai salah satu variabel belum diketahui, sehingga jumlah kedua variabel belum bisa dihitung.", ask: "Variabel mana yang masih belum diketahui? Langkah apa yang dapat mencarinya?" },
    },
  },
  "q-m5-4": {
    phase: "elaborasi",
    skill: "konsep",
    options: {
      b: { code: "opsi_khusus", observe: "Setelah koefisien disamakan, belum ada nilai variabel yang diketahui.", ask: "Untuk apa koefisien disamakan? Operasi apa yang memanfaatkannya agar salah satu variabel hilang?" },
      c: { code: "opsi_khusus", observe: "Koefisien sudah sama besar, jadi tidak perlu dikalikan lagi.", ask: "Apa tujuan menyamakan koefisien? Langkah apa yang memanfaatkan koefisien yang sudah sama itu?" },
      d: { code: "opsi_khusus", observe: "Menggambar grafik bukan bagian dari metode eliminasi.", ask: "Metode eliminasi bekerja dengan operasi pada kedua persamaan. Operasi apa yang membuat salah satu variabel hilang?" },
    },
    ladder: {
      2: "Metode eliminasi: samakan koefisien, lalu lakukan satu operasi pada kedua persamaan agar satu variabel hilang.",
      3: "Setelah koefisien salah satu variabel sama besar, kedua persamaan dapat dijumlahkan atau dikurangkan. Pilih operasi berdasarkan tandanya.",
    },
  },

  // ------------------------------------------------------------ Modul 6 — memeriksa solusi
  "p-s-06": periksa(),
  "p-s-07": periksa(),
  "q-m6-1": periksa(),
  "q-m6-2": periksa(),
  "p-s-14": {
    phase: "elaborasi",
    skill: "ruas_kanan",
    target: { kind: "scaled_const", c: 4, factor: 3 },
    ladder: { 3: "Kalikan satu per satu: 2x dikali 3, −3y dikali 3, dan konstanta di ruas kanan dikali 3." },
  },
  "p-h-13": {
    phase: "elaborasi",
    skill: "periksa_solusi",
    ladder: { 3: "Jumlahkan sendiri kedua ruas kiri dan kedua ruas kanan, lalu bandingkan hasilmu dengan 3x = 5. Bagian mana yang berbeda?" },
    options: {
      b: { code: "opsi_khusus", observe: "Perhatikan koefisien y pada kedua persamaan: tandanya berlawanan, sehingga penjumlahan memang membuat y hilang.", ask: "Jika operasinya sudah tepat, bagian mana dari hasil Doni yang perlu diperiksa? Hitung ruas kiri dan ruas kanan satu per satu." },
      c: { code: "opsi_khusus", observe: "Ruas kiri dapat dihitung sendiri tanpa menebak.", ask: "Berapa hasil 2x + x? Lalu hitung ruas kanannya dengan cara yang sama." },
      d: { code: "opsi_khusus", observe: "Hasil Doni dapat diuji dengan substitusi.", ask: "Dari tiap pernyataan, adakah nilai x yang dapat kamu masukkan ke persamaan awal? Apakah ruas kirinya sama dengan ruas kanannya?" },
    },
  },
  "q-m6-3": {
    phase: "elaborasi",
    skill: "ruas_kanan",
    options: {
      a: { code: "opsi_khusus", observe: "Saat sebuah persamaan dikalikan 2, setiap suku ikut dikalikan 2.", ask: "Bagaimana koefisien x berubah ketika dikalikan 2? Bandingkan dengan yang Budi tulis." },
      c: { code: "opsi_khusus", observe: "Soal menyebut bahwa persamaan dikalikan 2.", ask: "Periksa hasil Budi suku demi suku: suku mana yang sudah dikali 2 dan mana yang belum?" },
      d: { code: "opsi_khusus", observe: "Pernyataan ini dapat diuji dengan angka.", ask: "Pasangan x = 1 dan y = 2 memenuhi x + 3y = 7. Masukkan pasangan itu ke persamaan baru Budi, 2x + 6y = 7. Apa hasil ruas kirinya?" },
    },
    ladder: {
      2: "Mengalikan sebuah persamaan berarti mengalikan semua suku di kedua ruas dengan bilangan yang sama.",
      3: "Periksa hasil Budi suku demi suku, mulai dari x, lalu y, lalu konstanta di ruas kanan.",
    },
  },
  "q-m6-4": {
    phase: "output",
    skill: "tanda",
    options: {
      a: "tanda_pengurangan",
      b: { code: "opsi_khusus", observe: "Hasil yang bertanda negatif perlu diperiksa: apakah mengurangkan bilangan negatif membuat nilainya makin kecil atau makin besar?", ask: "Tulis 5y − (−3y) tanpa tanda kurung. Apa yang terjadi pada tanda minus di depan (−3y)?" },
      d: { code: "opsi_khusus", observe: "Jawabanmu cocok dengan hasil kali 5 dan 3, padahal operasinya pengurangan.", ask: "Operasi apa yang tertulis di antara 5y dan (−3y)? Hitung dengan operasi itu." },
    },
    ladder: {
      2: "Ingat: mengurangkan bilangan negatif sama dengan menjumlahkan lawannya. Contoh: 4 − (−2) = 4 + 2.",
      3: "Tulis ulang soal tanpa tanda kurung dengan aturan tanda, lalu hitung koefisiennya.",
    },
  },
};

/** Pertanyaan transfer (aturan umum) yang ditampilkan setelah soal terjawab benar. Tidak dinilai dan tidak memberi XP. */
export const TRANSFER_BY_SKILL: Partial<Record<SkillCode, TransferPrompt>> = {
  pilih_operasi: {
    prompt: "Aturan umum: kapan dua persamaan dijumlahkan, dan kapan dikurangkan, agar suatu variabel hilang?",
    options: [
      "Dijumlahkan jika koefisiennya bertanda berlawanan; dikurangkan jika bertanda sama",
      "Dijumlahkan jika koefisiennya bertanda sama; dikurangkan jika bertanda berlawanan",
      "Selalu dijumlahkan",
      "Bergantung pada konstanta di ruas kanan",
    ],
    correct: 0,
    feedback: "Variabel hilang jika koefisiennya menjadi 0: a + (−a) = 0, atau a − a = 0.",
  },
  ruas_kanan: {
    prompt: "Aturan umum: jika sebuah persamaan dikalikan k (k ≠ 0), suku mana saja yang dikalikan?",
    options: [
      "Hanya suku variabel di ruas kiri",
      "Semua suku di kedua ruas, termasuk konstanta",
      "Hanya konstanta di ruas kanan",
      "Konstanta ditambah k",
    ],
    correct: 1,
    feedback: "Kedua ruas harus berubah dengan cara yang sama agar persamaan tetap seimbang, sehingga penyelesaiannya tidak berubah.",
  },
  samakan_koefisien: {
    prompt: "Mengapa kita memakai KPK untuk menyamakan koefisien?",
    options: [
      "Karena KPK selalu sama dengan hasil kali kedua koefisien",
      "Agar konstanta di ruas kanan menjadi 0",
      "Agar angka yang dihitung sekecil mungkin, tetapi koefisiennya tetap bisa disamakan",
      "Tidak ada alasan khusus",
    ],
    correct: 2,
    feedback: "Pengali lain yang membuat koefisien sama juga berhasil, tetapi KPK memberi angka paling kecil sehingga perhitungan lebih ringan.",
  },
  periksa_solusi: {
    prompt: "Mengapa pasangan yang hanya memenuhi satu persamaan bukan penyelesaian SPLDV?",
    options: [
      "Penyelesaian SPLDV harus memenuhi kedua persamaan sekaligus",
      "Persamaan kedua selalu lebih penting",
      "Pasangan itu pasti salah hitung",
      "SPLDV tidak punya penyelesaian",
    ],
    correct: 0,
    feedback: "Secara grafik, penyelesaian adalah titik yang berada di kedua garis sekaligus.",
  },
  tanda: {
    prompt: "Mengurangkan sebuah bilangan negatif sama dengan ...",
    options: [
      "mengurangkan bilangan positif yang sama",
      "menjumlahkan lawan dari bilangan negatif itu (a − (−b) = a + b)",
      "tidak mengubah nilai",
      "mengalikan dengan 0",
    ],
    correct: 1,
    feedback: "a − (−b) = a + b. Tanda minus di depan tanda kurung membalik tanda yang ada di dalamnya.",
  },
};
