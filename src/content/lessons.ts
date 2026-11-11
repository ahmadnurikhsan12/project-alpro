import type { Difficulty } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "math"; lines: string[]; caption?: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "callout"; tone: "info" | "tip" | "warn"; title: string; text: string }
  | { type: "compare"; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  | { type: "anatomy"; equation: string; parts: { label: string; value: string; color: "brand" | "grape" | "amber" | "emerald" }[] };

export interface WorkedExample {
  title: string;
  problem: string;
  context?: string[];
  steps: { title: string; detail: string; math?: string[] }[];
  answer: string;
}

export type Illustration = "balance" | "receipt" | "lines" | "scale-multiply" | "steps" | "checklist" | "story";

export interface Lesson {
  id: string; // "m1".."m7"
  slug: string;
  number: number;
  title: string;
  summary: string;
  difficulty: Difficulty;
  minutes: number;
  objectives: string[];
  sections: { heading: string; blocks: ContentBlock[] }[];
  terms: { term: string; meaning: string }[];
  context: { title: string; text: string; illustration: Illustration };
  examples: WorkedExample[];
  conclusion: string[];
  quiz: Question[];
}

const eq = (a: number, b: number, c: number) => ({ a, b, c });

export const LESSONS: Lesson[] = [
  // ---------------------------------------------------------------- MODUL 1
  {
    id: "m1",
    slug: "persamaan-linear-dua-variabel",
    number: 1,
    title: "Persamaan Linear Dua Variabel",
    summary: "Kenali bentuk ax + by = c, bagian-bagiannya, dan arti penyelesaian sebuah PLDV.",
    difficulty: "mudah",
    minutes: 15,
    objectives: [
      "Menjelaskan pengertian persamaan linear dua variabel (PLDV).",
      "Menunjukkan variabel, koefisien, konstanta, dan suku pada sebuah PLDV.",
      "Membedakan contoh dan bukan contoh PLDV beserta alasannya.",
      "Menentukan beberapa pasangan penyelesaian dari sebuah PLDV.",
    ],
    sections: [
      {
        heading: "Apa itu persamaan linear dua variabel?",
        blocks: [
          {
            type: "p",
            text: "Persamaan adalah kalimat matematika yang memuat tanda sama dengan (=). Persamaan disebut **linear dua variabel** jika memuat **dua variabel berbeda** dan **pangkat tertinggi setiap variabel adalah satu**.",
          },
          {
            type: "p",
            text: "Kata *linear* berarti \"berbentuk garis\". Jika semua pasangan penyelesaiannya digambar pada bidang koordinat, titik-titiknya membentuk garis lurus.",
          },
          { type: "math", lines: ["x + y = 10", "2p − 3q = 6", "5a + b = 20"], caption: "Contoh PLDV" },
        ],
      },
      {
        heading: "Bagian-bagian PLDV",
        blocks: [
          { type: "p", text: "Perhatikan persamaan 3x + 2y = 12. Setiap bagiannya punya nama:" },
          {
            type: "anatomy",
            equation: "3x + 2y = 12",
            parts: [
              { label: "Variabel", value: "x dan y — huruf pengganti bilangan yang belum diketahui", color: "brand" },
              { label: "Koefisien", value: "3 (milik x) dan 2 (milik y) — bilangan di depan variabel", color: "grape" },
              { label: "Konstanta", value: "12 — bilangan tanpa variabel", color: "amber" },
              { label: "Suku", value: "3x, 2y, dan 12 — bagian yang dipisahkan tanda + atau −", color: "emerald" },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Perhatikan tandanya",
            text: "Pada 7x − 5y = 30, koefisien y adalah −5, bukan 5. Tanda di depan suku ikut menjadi bagian koefisien.",
          },
        ],
      },
      {
        heading: "Bentuk umum",
        blocks: [
          { type: "math", lines: ["ax + by = c"], caption: "a, b, c bilangan real; a ≠ 0 dan b ≠ 0" },
          {
            type: "p",
            text: "Persamaan yang belum berbentuk ax + by = c tetap termasuk PLDV jika dapat diubah ke bentuk itu. Misalnya 4a = 20 − b dapat ditulis menjadi 4a + b = 20 (kedua ruas ditambah b).",
          },
        ],
      },
      {
        heading: "Contoh dan bukan contoh",
        blocks: [
          {
            type: "compare",
            left: {
              title: "Termasuk PLDV",
              items: ["x + y = 10", "2p − 3q = 6", "4a = 20 − b  (setara 4a + b = 20)", "y = 2x + 1  (setara −2x + y = 1)"],
            },
            right: {
              title: "Bukan PLDV",
              items: [
                "x² + y = 5 — ada variabel berpangkat 2",
                "3x + 5 = 11 — hanya satu variabel",
                "xy = 12 — variabel saling dikalikan",
                "2x + y > 7 — pertidaksamaan, bukan persamaan",
              ],
            },
          },
        ],
      },
      {
        heading: "Penyelesaian PLDV",
        blocks: [
          {
            type: "p",
            text: "**Penyelesaian** PLDV adalah pasangan nilai (x, y) yang membuat persamaan menjadi pernyataan yang benar. Caranya: pilih satu nilai x, lalu hitung nilai y yang sesuai.",
          },
          {
            type: "math",
            lines: ["x + y = 5", "x = 0 → y = 5   (0, 5)", "x = 1 → y = 4   (1, 4)", "x = 2 → y = 3   (2, 3)", "x = 3 → y = 2   (3, 2)"],
          },
          {
            type: "callout",
            tone: "info",
            title: "Penting",
            text: "Satu PLDV memiliki tak hingga banyak penyelesaian jika x dan y boleh bilangan real. Karena itu kita membutuhkan persamaan kedua untuk mendapatkan satu jawaban pasti — inilah yang dipelajari pada Modul 2.",
          },
        ],
      },
    ],
    terms: [
      { term: "Variabel", meaning: "Lambang (biasanya huruf) pengganti bilangan yang nilainya belum diketahui." },
      { term: "Koefisien", meaning: "Bilangan yang dikalikan dengan variabel, termasuk tandanya." },
      { term: "Konstanta", meaning: "Suku berupa bilangan tetap tanpa variabel." },
      { term: "Suku", meaning: "Bagian dari bentuk aljabar yang dipisahkan oleh tanda + atau −." },
      { term: "Penyelesaian", meaning: "Pasangan nilai variabel yang membuat persamaan bernilai benar." },
    ],
    context: {
      title: "Belanja di kantin",
      text: "Harga 1 roti dimisalkan x rupiah dan 1 susu y rupiah. Jika 2 roti dan 1 susu harganya Rp14.000, kita menulis 2x + y = 14.000. Dari satu informasi ini saja, banyak kemungkinan harga: roti Rp5.000 dan susu Rp4.000, atau roti Rp6.000 dan susu Rp2.000, dan seterusnya.",
      illustration: "receipt",
    },
    examples: [
      {
        title: "Contoh 1 — Mengenali bagian PLDV",
        problem: "Tentukan variabel, koefisien, dan konstanta dari persamaan berikut.",
        context: ["5p − 2q = 20"],
        steps: [
          { title: "Cari huruf", detail: "Huruf yang muncul adalah p dan q, jadi variabelnya p dan q." },
          { title: "Cari bilangan di depan variabel", detail: "Koefisien p adalah 5. Koefisien q adalah −2 karena ada tanda minus di depannya." },
          { title: "Cari bilangan tanpa variabel", detail: "Konstantanya adalah 20." },
        ],
        answer: "Variabel: p dan q. Koefisien p = 5, koefisien q = −2. Konstanta = 20.",
      },
      {
        title: "Contoh 2 — Mencari penyelesaian",
        problem: "Tentukan tiga penyelesaian dari 2x + y = 8 untuk x bilangan cacah.",
        context: ["2x + y = 8"],
        steps: [
          { title: "Ubah agar y sendirian", detail: "Kurangkan kedua ruas dengan 2x sehingga y = 8 − 2x.", math: ["y = 8 − 2x"] },
          {
            title: "Coba beberapa nilai x",
            detail: "Substitusikan x = 0, 1, dan 2.",
            math: ["x = 0 → y = 8 − 0 = 8", "x = 1 → y = 8 − 2 = 6", "x = 2 → y = 8 − 4 = 4"],
          },
          { title: "Periksa salah satunya", detail: "Untuk (2, 4): 2(2) + 4 = 4 + 4 = 8. Benar.", math: ["2(2) + 4 = 8 ✓"] },
        ],
        answer: "Tiga penyelesaiannya adalah (0, 8), (1, 6), dan (2, 4).",
      },
    ],
    conclusion: [
      "PLDV memuat dua variabel berpangkat satu dan berbentuk umum ax + by = c.",
      "Koefisien adalah bilangan di depan variabel lengkap dengan tandanya; konstanta adalah bilangan tanpa variabel.",
      "Penyelesaian PLDV berupa pasangan (x, y), dan jumlahnya tak hingga.",
    ],
    quiz: [
      {
        id: "q-m1-1",
        type: "mcq",
        topic: "m1",
        difficulty: "mudah",
        format: "konsep",
        prompt: "Manakah yang merupakan persamaan linear dua variabel?",
        options: [
          { id: "a", text: "x² + y = 9" },
          { id: "b", text: "3x − 4y = 12" },
          { id: "c", text: "2x + 7 = 15" },
          { id: "d", text: "xy = 6" },
        ],
        answer: "b",
        explanation: [
          "3x − 4y = 12 memuat dua variabel (x dan y) yang masing-masing berpangkat satu.",
          "x² + y = 9 memuat pangkat dua, 2x + 7 = 15 hanya satu variabel, dan xy = 6 berisi perkalian dua variabel.",
        ],
        hints: ["Periksa pangkat setiap variabel.", "PLDV harus memiliki dua variabel berbeda."],
      },
      {
        id: "q-m1-2",
        type: "number",
        topic: "m1",
        difficulty: "mudah",
        format: "konsep",
        prompt: "Berapakah koefisien y pada persamaan 7x − 5y = 30? (Tulis lengkap dengan tandanya.)",
        answer: "-5",
        explanation: ["Suku yang memuat y adalah −5y.", "Bilangan di depan y beserta tandanya adalah −5."],
        hints: ["Koefisien adalah bilangan di depan variabel.", "Jangan lupakan tanda minus."],
      },
      {
        id: "q-m1-3",
        type: "tf",
        topic: "m1",
        difficulty: "mudah",
        format: "penyelesaian",
        prompt: "Pasangan (2, 3) merupakan penyelesaian dari 3x + 2y = 12.",
        answer: "true",
        explanation: ["Substitusikan x = 2 dan y = 3: 3(2) + 2(3) = 6 + 6 = 12.", "Hasilnya sama dengan ruas kanan, jadi pernyataan benar."],
        hints: ["Ganti x dengan 2 dan y dengan 3."],
      },
      {
        id: "q-m1-4",
        type: "number",
        topic: "m1",
        difficulty: "sedang",
        format: "penyelesaian",
        prompt: "Jika x = 4 pada persamaan x + 2y = 10, berapakah nilai y?",
        answer: "3",
        explanation: ["4 + 2y = 10", "2y = 10 − 4 = 6", "y = 6 : 2 = 3"],
        hints: ["Ganti x dengan 4 terlebih dahulu.", "Pindahkan 4 ke ruas kanan, lalu bagi dengan 2."],
      },
    ],
  },

  // ---------------------------------------------------------------- MODUL 2
  {
    id: "m2",
    slug: "sistem-persamaan-linear-dua-variabel",
    number: 2,
    title: "Sistem Persamaan Linear Dua Variabel",
    summary: "Pahami arti SPLDV dan mengapa penyelesaiannya harus memenuhi kedua persamaan sekaligus.",
    difficulty: "mudah",
    minutes: 15,
    objectives: [
      "Menjelaskan pengertian SPLDV.",
      "Membedakan PLDV dan SPLDV.",
      "Menuliskan bentuk umum SPLDV.",
      "Memeriksa apakah suatu pasangan nilai merupakan penyelesaian SPLDV.",
    ],
    sections: [
      {
        heading: "Pengertian SPLDV",
        blocks: [
          {
            type: "p",
            text: "**Sistem persamaan linear dua variabel (SPLDV)** adalah dua PLDV yang memakai variabel yang sama dan saling berkaitan. Kita mencari **satu pasangan nilai** yang membuat **kedua persamaan benar secara bersamaan**.",
          },
          { type: "math", lines: ["x + y = 7", "x − y = 1"], caption: "Sebuah SPLDV" },
        ],
      },
      {
        heading: "Perbedaan PLDV dan SPLDV",
        blocks: [
          {
            type: "compare",
            left: {
              title: "PLDV",
              items: ["Terdiri dari satu persamaan", "Contoh: x + y = 7", "Penyelesaian: tak hingga banyaknya", "Grafik: satu garis lurus"],
            },
            right: {
              title: "SPLDV",
              items: [
                "Terdiri dari dua persamaan",
                "Contoh: x + y = 7 dan x − y = 1",
                "Penyelesaian: biasanya tepat satu pasangan",
                "Grafik: dua garis; penyelesaian = titik potongnya",
              ],
            },
          },
        ],
      },
      {
        heading: "Bentuk umum SPLDV",
        blocks: [
          { type: "math", lines: ["a₁x + b₁y = c₁", "a₂x + b₂y = c₂"] },
          { type: "p", text: "Angka kecil ₁ dan ₂ menunjukkan bahwa koefisien itu milik persamaan pertama atau kedua." },
        ],
      },
      {
        heading: "Makna penyelesaian SPLDV",
        blocks: [
          {
            type: "p",
            text: "Setiap persamaan dapat digambar sebagai garis. Penyelesaian SPLDV adalah titik yang terletak pada **kedua garis sekaligus**, yaitu **titik potongnya**.",
          },
          {
            type: "list",
            items: [
              "**Garis berpotongan** → tepat satu penyelesaian.",
              "**Garis sejajar** → tidak ada penyelesaian.",
              "**Garis berimpit** (sama persis) → tak hingga banyak penyelesaian.",
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Coba sendiri",
            text: "Buka SPLDV Lab → Grafik untuk melihat bagaimana titik potong berpindah ketika koefisien diubah.",
          },
        ],
      },
      {
        heading: "Pasangan yang memenuhi kedua persamaan",
        blocks: [
          { type: "p", text: "Perhatikan sistem x + y = 7 dan x − y = 1. Coba dua pasangan berikut:" },
          {
            type: "math",
            lines: ["(4, 3): 4 + 3 = 7 ✓   dan   4 − 3 = 1 ✓  → penyelesaian", "(5, 2): 5 + 2 = 7 ✓   tetapi 5 − 2 = 3 ✗  → bukan penyelesaian"],
          },
          { type: "p", text: "Pasangan (5, 2) hanya memenuhi persamaan pertama, sehingga **bukan** penyelesaian SPLDV." },
        ],
      },
    ],
    terms: [
      { term: "Sistem", meaning: "Kumpulan persamaan yang diselesaikan bersama-sama." },
      { term: "Penyelesaian SPLDV", meaning: "Pasangan (x, y) yang memenuhi semua persamaan dalam sistem." },
      { term: "Titik potong", meaning: "Titik pertemuan dua garis; koordinatnya adalah penyelesaian SPLDV." },
      { term: "Himpunan penyelesaian", meaning: "Himpunan yang berisi semua penyelesaian, ditulis {(x, y)}." },
    ],
    context: {
      title: "Tebak dua bilangan",
      text: "Temanmu berkata: \"Jumlah dua bilanganku 7.\" Ada banyak kemungkinan. Lalu ia menambahkan: \"Selisihnya 1.\" Sekarang hanya ada satu jawaban: 4 dan 3. Informasi kedua mempersempit kemungkinan — itulah gunanya sistem persamaan.",
      illustration: "lines",
    },
    examples: [
      {
        title: "Contoh 1 — Pasangan yang memenuhi",
        problem: "Periksa apakah (3, 2) merupakan penyelesaian SPLDV berikut.",
        context: ["2x + y = 8", "x − y = 1"],
        steps: [
          { title: "Uji persamaan pertama", detail: "Substitusikan x = 3 dan y = 2.", math: ["2(3) + 2 = 6 + 2 = 8 ✓"] },
          { title: "Uji persamaan kedua", detail: "Substitusikan nilai yang sama.", math: ["3 − 2 = 1 ✓"] },
          { title: "Simpulkan", detail: "Kedua persamaan bernilai benar." },
        ],
        answer: "Ya, (3, 2) adalah penyelesaian SPLDV tersebut.",
      },
      {
        title: "Contoh 2 — Pasangan yang tidak memenuhi",
        problem: "Periksa apakah (1, 6) merupakan penyelesaian SPLDV berikut.",
        context: ["x + y = 7", "2x − y = 3"],
        steps: [
          { title: "Uji persamaan pertama", detail: "1 + 6 = 7, benar.", math: ["1 + 6 = 7 ✓"] },
          { title: "Uji persamaan kedua", detail: "2(1) − 6 = −4, padahal seharusnya 3.", math: ["2(1) − 6 = −4 ≠ 3 ✗"] },
          { title: "Simpulkan", detail: "Satu persamaan tidak terpenuhi, jadi pasangan ini gagal." },
        ],
        answer: "Bukan, (1, 6) bukan penyelesaian karena tidak memenuhi persamaan kedua.",
      },
    ],
    conclusion: [
      "SPLDV terdiri atas dua PLDV dengan variabel yang sama.",
      "Penyelesaian SPLDV harus memenuhi kedua persamaan sekaligus.",
      "Secara grafik, penyelesaian adalah titik potong dua garis; garis sejajar berarti tidak ada penyelesaian.",
    ],
    quiz: [
      {
        id: "q-m2-1",
        type: "mcq",
        topic: "m2",
        difficulty: "mudah",
        format: "penyelesaian",
        prompt: "Pasangan manakah yang merupakan penyelesaian dari x + y = 9 dan x − y = 3?",
        options: [
          { id: "a", text: "(6, 3)" },
          { id: "b", text: "(5, 4)" },
          { id: "c", text: "(3, 6)" },
          { id: "d", text: "(7, 2)" },
        ],
        answer: "a",
        explanation: ["Uji (6, 3): 6 + 3 = 9 ✓ dan 6 − 3 = 3 ✓.", "Pasangan lain hanya memenuhi persamaan pertama."],
        hints: ["Semua pilihan memenuhi x + y = 9. Uji persamaan kedua."],
        verify: { kind: "solution", e1: eq(1, 1, 9), e2: eq(1, -1, 3), x: 6, y: 3 },
      },
      {
        id: "q-m2-2",
        type: "tf",
        topic: "m2",
        difficulty: "mudah",
        format: "konsep",
        prompt: "SPLDV selalu memiliki tepat satu penyelesaian.",
        answer: "false",
        explanation: ["Tidak selalu. Jika kedua garis sejajar, tidak ada penyelesaian.", "Jika kedua garis berimpit, penyelesaiannya tak hingga."],
        hints: ["Ingat tiga kemungkinan posisi dua garis."],
      },
      {
        id: "q-m2-3",
        type: "mcq",
        topic: "m2",
        difficulty: "mudah",
        format: "konsep",
        prompt: "Berapa banyak penyelesaian dari satu persamaan x + y = 4 jika x dan y bilangan real?",
        options: [
          { id: "a", text: "Tidak ada" },
          { id: "b", text: "Tepat satu" },
          { id: "c", text: "Tepat dua" },
          { id: "d", text: "Tak hingga banyaknya" },
        ],
        answer: "d",
        explanation: ["Setiap nilai x yang dipilih menghasilkan satu nilai y yang sesuai.", "Karena pilihan x tak terbatas, penyelesaiannya tak hingga."],
        hints: ["Coba x = 0, x = 1, x = 2,... apakah selalu ada y yang cocok?"],
      },
      {
        id: "q-m2-4",
        type: "tf",
        topic: "m2",
        difficulty: "sedang",
        format: "konsep",
        prompt: "Jika grafik dua persamaan dalam SPLDV sejajar, maka SPLDV tersebut tidak memiliki penyelesaian.",
        answer: "true",
        explanation: ["Garis sejajar tidak pernah berpotongan.", "Tanpa titik potong, tidak ada pasangan yang memenuhi kedua persamaan."],
        hints: ["Penyelesaian SPLDV = titik potong."],
      },
    ],
  },

  // ---------------------------------------------------------------- MODUL 3
  {
    id: "m3",
    slug: "membuat-model-matematika",
    number: 3,
    title: "Membuat Model Matematika",
    summary: "Ubah soal cerita sehari-hari menjadi dua persamaan linear yang siap diselesaikan.",
    difficulty: "sedang",
    minutes: 20,
    objectives: [
      "Mengidentifikasi informasi yang diketahui dan ditanyakan dalam soal cerita.",
      "Menentukan variabel beserta artinya.",
      "Menyusun dua persamaan linear dari informasi soal.",
      "Menuliskan model SPLDV dari permasalahan sehari-hari.",
    ],
    sections: [
      {
        heading: "Apa itu model matematika?",
        blocks: [
          {
            type: "p",
            text: "**Model matematika** adalah \"terjemahan\" soal cerita ke dalam bahasa matematika. Pada SPLDV, modelnya berupa **dua persamaan** yang memakai **dua variabel**.",
          },
        ],
      },
      {
        heading: "Empat langkah menyusun model",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**Baca dan tandai informasi.** Tulis apa yang diketahui dan apa yang ditanyakan.",
              "**Tentukan variabel.** Pilih dua hal yang belum diketahui, lalu beri huruf beserta artinya. Contoh: b = harga 1 buku (rupiah).",
              "**Susun persamaan pertama** dari informasi pertama.",
              "**Susun persamaan kedua** dari informasi kedua, lalu tulis keduanya sebagai sistem.",
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Kamus kata kunci",
            text: "\"jumlah\" → +, \"selisih\" atau \"lebih ... dari\" → −, \"kali\" atau \"lipat\" → ×, \"sama dengan\", \"adalah\", \"harganya\" → =.",
          },
        ],
      },
      {
        heading: "Memilih huruf variabel",
        blocks: [
          {
            type: "p",
            text: "Kamu boleh memakai huruf apa saja, tetapi huruf awal benda membuat model lebih mudah dibaca: b untuk buku, p untuk pensil, a untuk ayam, k untuk kambing. Selalu tuliskan arti hurufnya.",
          },
          {
            type: "callout",
            tone: "warn",
            title: "Kesalahan umum",
            text: "Pada soal kaki hewan, jangan menulis a + k = jumlah kaki. Setiap ayam berkaki 2 dan kambing berkaki 4, jadi jumlah kaki adalah 2a + 4k.",
          },
        ],
      },
    ],
    terms: [
      { term: "Model matematika", meaning: "Bentuk matematika (persamaan) yang mewakili masalah nyata." },
      { term: "Diketahui", meaning: "Informasi yang sudah diberikan dalam soal." },
      { term: "Ditanyakan", meaning: "Nilai yang harus dicari." },
      { term: "Permisalan", meaning: "Pernyataan arti variabel, misalnya \"misalkan x = harga 1 apel\"." },
    ],
    context: {
      title: "Nota belanja Sinta",
      text: "Sinta membeli 2 buku dan 3 pensil seharga Rp19.000. Esoknya ia membeli 1 buku dan 2 pensil seharga Rp11.000. Dua nota belanja ini adalah dua informasi — cukup untuk menyusun SPLDV dan menemukan harga masing-masing barang.",
      illustration: "receipt",
    },
    examples: [
      {
        title: "Contoh 1 — Harga barang",
        problem: "Harga 2 buku dan 3 pensil adalah Rp19.000. Harga 1 buku dan 2 pensil adalah Rp11.000. Susunlah model matematikanya.",
        steps: [
          { title: "Diketahui & ditanya", detail: "Diketahui dua nota belanja. Ditanya model matematikanya." },
          { title: "Tentukan variabel", detail: "Misalkan b = harga 1 buku dan p = harga 1 pensil (dalam rupiah)." },
          { title: "Persamaan pertama", detail: "2 buku dan 3 pensil seharga 19.000.", math: ["2b + 3p = 19.000"] },
          { title: "Persamaan kedua", detail: "1 buku dan 2 pensil seharga 11.000.", math: ["b + 2p = 11.000"] },
        ],
        answer: "Model: 2b + 3p = 19.000 dan b + 2p = 11.000.",
      },
      {
        title: "Contoh 2 — Jumlah dan selisih",
        problem: "Jumlah dua bilangan adalah 30 dan selisihnya 6. Susunlah model matematikanya.",
        steps: [
          { title: "Tentukan variabel", detail: "Misalkan x = bilangan yang lebih besar dan y = bilangan yang lebih kecil." },
          { title: "\"Jumlah\" berarti tambah", detail: "", math: ["x + y = 30"] },
          { title: "\"Selisih\" berarti kurang (besar − kecil)", detail: "", math: ["x − y = 6"] },
        ],
        answer: "Model: x + y = 30 dan x − y = 6.",
      },
      {
        title: "Contoh 3 — Kaki hewan",
        problem: "Di sebuah kandang ada 20 ekor ayam dan kambing. Jumlah kaki seluruhnya 56. Susunlah model matematikanya.",
        steps: [
          { title: "Tentukan variabel", detail: "Misalkan a = banyak ayam dan k = banyak kambing." },
          { title: "Informasi banyak hewan", detail: "", math: ["a + k = 20"] },
          { title: "Informasi kaki", detail: "Setiap ayam 2 kaki, setiap kambing 4 kaki.", math: ["2a + 4k = 56"] },
        ],
        answer: "Model: a + k = 20 dan 2a + 4k = 56. (Nanti akan diperoleh a = 12 dan k = 8.)",
      },
    ],
    conclusion: [
      "Model matematika menerjemahkan soal cerita menjadi persamaan.",
      "Selalu tuliskan arti setiap variabel sebelum menyusun persamaan.",
      "Setiap informasi dalam soal menghasilkan satu persamaan; SPLDV membutuhkan dua informasi.",
    ],
    quiz: [
      {
        id: "q-m3-1",
        type: "mcq",
        topic: "m3",
        difficulty: "mudah",
        format: "model",
        prompt: "Harga 3 apel dan 2 jeruk Rp13.000, sedangkan harga 1 apel dan 1 jeruk Rp5.000. Jika a = harga 1 apel dan j = harga 1 jeruk, model yang tepat adalah ...",
        options: [
          { id: "a", text: "3a + 2j = 13.000 dan a + j = 5.000" },
          { id: "b", text: "3a + 2j = 5.000 dan a + j = 13.000" },
          { id: "c", text: "2a + 3j = 13.000 dan a + j = 5.000" },
          { id: "d", text: "3a × 2j = 13.000 dan a + j = 5.000" },
        ],
        answer: "a",
        explanation: ["\"3 apel dan 2 jeruk\" berarti 3a + 2j, harganya 13.000.", "\"1 apel dan 1 jeruk\" berarti a + j, harganya 5.000."],
        hints: ["Bilangan di depan nama buah menjadi koefisien.", "Cocokkan setiap nota dengan harganya."],
      },
      {
        id: "q-m3-2",
        type: "mcq",
        topic: "m3",
        difficulty: "mudah",
        format: "konsep",
        prompt: "Langkah pertama dalam membuat model matematika dari soal cerita adalah ...",
        options: [
          { id: "a", text: "Langsung mengeliminasi variabel" },
          { id: "b", text: "Mengidentifikasi informasi yang diketahui dan ditanyakan" },
          { id: "c", text: "Menebak jawaban akhir" },
          { id: "d", text: "Menggambar grafik" },
        ],
        answer: "b",
        explanation: ["Sebelum menyusun persamaan, kita harus memahami informasi apa yang tersedia dan apa yang dicari."],
        hints: ["Apa yang perlu kamu pahami sebelum menulis persamaan?"],
      },
      {
        id: "q-m3-3",
        type: "mcq",
        topic: "m3",
        difficulty: "sedang",
        format: "model",
        prompt: "\"Umur ayah 3 kali umur anaknya.\" Jika a = umur ayah dan n = umur anak, persamaan yang tepat adalah ...",
        options: [
          { id: "a", text: "n = 3a" },
          { id: "b", text: "a = 3n" },
          { id: "c", text: "a + n = 3" },
          { id: "d", text: "a − 3 = n" },
        ],
        answer: "b",
        explanation: ["Ayah lebih tua, jadi umur ayah = 3 × umur anak.", "Ditulis a = 3n."],
        hints: ["Siapa yang umurnya lebih besar?"],
      },
      {
        id: "q-m3-4",
        type: "tf",
        topic: "m3",
        difficulty: "sedang",
        format: "model",
        prompt: "Pada soal \"jumlah kaki ayam dan kambing adalah 56\", persamaan yang tepat adalah a + k = 56.",
        answer: "false",
        explanation: ["a + k menyatakan banyak hewan, bukan banyak kaki.", "Persamaan yang benar: 2a + 4k = 56."],
        hints: ["Berapa kaki seekor ayam? Seekor kambing?"],
      },
    ],
  },

  // ---------------------------------------------------------------- MODUL 4
  {
    id: "m4",
    slug: "konsep-metode-eliminasi",
    number: 4,
    title: "Konsep Metode Eliminasi",
    summary: "Mengapa salah satu variabel perlu dihilangkan, dan kapan kita menjumlahkan atau mengurangkan.",
    difficulty: "sedang",
    minutes: 20,
    objectives: [
      "Menjelaskan arti dan tujuan metode eliminasi.",
      "Menjelaskan mengapa satu variabel perlu dihilangkan.",
      "Menentukan operasi (jumlah/kurang) berdasarkan tanda koefisien.",
      "Menjelaskan bahwa mengalikan kedua ruas tidak mengubah penyelesaian.",
    ],
    sections: [
      {
        heading: "Arti eliminasi",
        blocks: [
          {
            type: "p",
            text: "**Eliminasi** berarti **menghilangkan**. Dalam SPLDV, kita menjumlahkan atau mengurangkan dua persamaan sehingga **salah satu variabel hilang** dan tersisa persamaan dengan **satu variabel**.",
          },
        ],
      },
      {
        heading: "Mengapa harus dihilangkan?",
        blocks: [
          {
            type: "p",
            text: "Persamaan dengan dua variabel memiliki banyak penyelesaian, sehingga kita belum bisa menentukan nilai pastinya. Persamaan dengan satu variabel, misalnya 2x = 14, langsung memberi jawaban x = 7. Eliminasi mengubah masalah yang sulit (dua variabel) menjadi masalah yang mudah (satu variabel).",
          },
        ],
      },
      {
        heading: "Mengapa persamaan boleh dijumlahkan?",
        blocks: [
          {
            type: "p",
            text: "Bayangkan dua timbangan yang sama-sama seimbang. Jika isi kiri kedua timbangan digabung dan isi kanannya juga digabung, hasilnya tetap seimbang. Begitu pula persamaan: ruas kiri dijumlahkan dengan ruas kiri, ruas kanan dengan ruas kanan.",
          },
          {
            type: "math",
            lines: ["  x + y = 10", "  x − y = 4", "———————— +", " 2x     = 14", "  x     = 7"],
            caption: "+y dan −y saling meniadakan",
          },
        ],
      },
      {
        heading: "Hubungan koefisien dan operasi",
        blocks: [
          {
            type: "list",
            items: [
              "Koefisien **sama** (tanda sama), misalnya 2x dan 2x → **kurangkan** karena 2x − 2x = 0.",
              "Koefisien **berlawanan** (nilai sama, tanda beda), misalnya +y dan −y → **jumlahkan** karena y + (−y) = 0.",
              "Koefisien **berbeda**, misalnya 2x dan 3x → **kalikan** dulu agar sama (gunakan KPK), baru kurangkan atau jumlahkan.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Mengalikan itu aman",
            text: "Jika x + y = 5, maka 2x + 2y = 10 juga benar untuk pasangan (x, y) yang sama. Mengalikan kedua ruas dengan bilangan yang sama (bukan nol) tidak mengubah penyelesaian — asalkan semua suku ikut dikalikan, termasuk ruas kanan.",
          },
        ],
      },
    ],
    terms: [
      { term: "Eliminasi", meaning: "Menghilangkan salah satu variabel dengan menjumlahkan atau mengurangkan persamaan." },
      { term: "Koefisien berlawanan", meaning: "Dua koefisien bernilai sama tetapi tandanya berbeda, misalnya 3 dan −3." },
      { term: "KPK", meaning: "Kelipatan persekutuan terkecil; dipakai untuk menyamakan koefisien." },
      { term: "Ruas", meaning: "Bagian kiri atau kanan tanda sama dengan." },
    ],
    context: {
      title: "Dua timbangan seimbang",
      text: "Timbangan A: 1 kotak merah + 1 kotak biru = 10 kg. Timbangan B: 1 kotak merah − 1 kotak biru = 4 kg (kotak biru dipindah ke sisi lain). Gabungkan keduanya: kotak biru saling meniadakan, sehingga 2 kotak merah = 14 kg, berarti 1 kotak merah = 7 kg.",
      illustration: "balance",
    },
    examples: [
      {
        title: "Contoh 1 — Koefisien berlawanan",
        problem: "Hilangkan y dari sistem berikut, lalu tentukan nilai x.",
        context: ["x + y = 10", "x − y = 4"],
        steps: [
          { title: "Lihat koefisien y", detail: "Koefisien y adalah +1 dan −1, berlawanan tanda." },
          { title: "Pilih operasi", detail: "Karena berlawanan, kita jumlahkan agar y hilang.", math: ["(x + y) + (x − y) = 10 + 4", "2x = 14"] },
          { title: "Hitung x", detail: "Bagi kedua ruas dengan 2.", math: ["x = 7"] },
        ],
        answer: "x = 7 (dan jika disubstitusikan, y = 3).",
      },
      {
        title: "Contoh 2 — Koefisien sama",
        problem: "Hilangkan x dari sistem berikut, lalu tentukan nilai y.",
        context: ["2x + 3y = 13", "2x + y = 7"],
        steps: [
          { title: "Lihat koefisien x", detail: "Keduanya 2x, sama dan bertanda sama." },
          { title: "Pilih operasi", detail: "Karena sama, kita kurangkan agar x hilang.", math: ["(2x + 3y) − (2x + y) = 13 − 7", "2y = 6"] },
          { title: "Hitung y", detail: "", math: ["y = 3"] },
        ],
        answer: "y = 3 (dan jika disubstitusikan, x = 2).",
      },
    ],
    conclusion: [
      "Eliminasi menghilangkan satu variabel agar tersisa persamaan satu variabel.",
      "Koefisien sama → kurangkan; koefisien berlawanan → jumlahkan.",
      "Jika koefisien belum sama, kalikan persamaan (seluruh ruas) dengan bilangan yang tepat.",
    ],
    quiz: [
      {
        id: "q-m4-1",
        type: "mcq",
        topic: "m4",
        difficulty: "mudah",
        format: "operasi",
        prompt: "Sistem 3x + 2y = 16 dan 5x − 2y = 0. Agar y tereliminasi, kedua persamaan harus ...",
        options: [
          { id: "a", text: "Dijumlahkan" },
          { id: "b", text: "Dikurangkan" },
          { id: "c", text: "Dikalikan" },
          { id: "d", text: "Dibagi" },
        ],
        answer: "a",
        explanation: ["Koefisien y adalah +2 dan −2 (berlawanan).", "Jika dijumlahkan, 2y + (−2y) = 0 sehingga y hilang: 8x = 16."],
        hints: ["Perhatikan tanda koefisien y."],
        verify: { kind: "solution", e1: eq(3, 2, 16), e2: eq(5, -2, 0), x: 2, y: 5 },
      },
      {
        id: "q-m4-2",
        type: "mcq",
        topic: "m4",
        difficulty: "mudah",
        format: "operasi",
        prompt: "Sistem 4x + y = 11 dan 2x + y = 7. Agar y tereliminasi, kedua persamaan harus ...",
        options: [
          { id: "a", text: "Dijumlahkan" },
          { id: "b", text: "Dikurangkan" },
          { id: "c", text: "Dikalikan 2" },
          { id: "d", text: "Tidak bisa dieliminasi" },
        ],
        answer: "b",
        explanation: ["Koefisien y sama-sama +1.", "Dikurangkan: (4x + y) − (2x + y) = 11 − 7 → 2x = 4."],
        hints: ["Tanda koefisien y sama atau berbeda?"],
        verify: { kind: "solution", e1: eq(4, 1, 11), e2: eq(2, 1, 7), x: 2, y: 3 },
      },
      {
        id: "q-m4-3",
        type: "tf",
        topic: "m4",
        difficulty: "mudah",
        format: "konsep",
        prompt: "Mengalikan kedua ruas sebuah persamaan dengan bilangan yang sama (bukan nol) tidak mengubah penyelesaiannya.",
        answer: "true",
        explanation: ["Persamaan tetap seimbang karena kedua ruas berubah dengan cara yang sama."],
        hints: ["Ingat analogi timbangan."],
      },
      {
        id: "q-m4-4",
        type: "number",
        topic: "m4",
        difficulty: "sedang",
        format: "langkah",
        prompt: "Lengkapi hasil eliminasi y berikut: 2x = ...",
        context: ["  x + y = 12", "  x − y = 2", "———————— +", " 2x     = ..."],
        answer: "14",
        explanation: ["Ruas kanan dijumlahkan: 12 + 2 = 14.", "Jadi 2x = 14 dan x = 7."],
        hints: ["Ruas kanan juga harus dijumlahkan."],
        verify: { kind: "solution", e1: eq(1, 1, 12), e2: eq(1, -1, 2), x: 7, y: 5 },
      },
    ],
  },

  // ---------------------------------------------------------------- MODUL 5
  {
    id: "m5",
    slug: "langkah-penyelesaian-metode-eliminasi",
    number: 5,
    title: "Langkah Penyelesaian Metode Eliminasi",
    summary: "Tujuh langkah sistematis: menyamakan koefisien, memilih operasi, sampai menulis pasangan penyelesaian.",
    difficulty: "sedang",
    minutes: 25,
    objectives: [
      "Menyamakan koefisien variabel dengan mengalikan persamaan.",
      "Menentukan operasi penjumlahan atau pengurangan yang tepat.",
      "Menghitung nilai variabel pertama dan kedua.",
      "Menuliskan pasangan penyelesaian SPLDV.",
    ],
    sections: [
      {
        heading: "Tujuh langkah eliminasi",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**Susun kedua persamaan** dalam bentuk ax + by = c, dengan x di bawah x dan y di bawah y.",
              "**Pilih variabel** yang akan dieliminasi (biasanya yang koefisiennya paling mudah disamakan).",
              "**Samakan koefisiennya** dengan mencari KPK dari kedua koefisien.",
              "**Kalikan setiap persamaan** dengan pengali yang sesuai — seluruh suku, termasuk ruas kanan.",
              "**Pilih operasi**: kurangkan jika tandanya sama, jumlahkan jika tandanya berlawanan.",
              "**Hitung variabel pertama** dari persamaan satu variabel yang tersisa.",
              "**Hitung variabel kedua** dengan substitusi (atau eliminasi lagi), lalu tulis pasangan (x, y).",
            ],
          },
        ],
      },
      {
        heading: "Mencari pengali dengan KPK",
        blocks: [
          {
            type: "p",
            text: "Misalkan koefisien x adalah 2 dan 3. KPK dari 2 dan 3 adalah 6. Agar keduanya menjadi 6, persamaan pertama dikalikan 6 : 2 = **3**, dan persamaan kedua dikalikan 6 : 3 = **2**.",
          },
          {
            type: "callout",
            tone: "tip",
            title: "Pilih yang lebih ringan",
            text: "Bandingkan pengali untuk x dan untuk y. Pilih variabel yang pengalinya lebih kecil supaya angka yang dihitung tidak terlalu besar.",
          },
        ],
      },
      {
        heading: "Variabel kedua: substitusi",
        blocks: [
          {
            type: "p",
            text: "Setelah satu nilai ditemukan, masukkan nilai itu ke salah satu persamaan awal (pilih yang paling sederhana). Persamaan itu kini hanya memiliki satu variabel yang belum diketahui.",
          },
        ],
      },
    ],
    terms: [
      { term: "Pengali", meaning: "Bilangan yang dikalikan ke seluruh suku persamaan untuk menyamakan koefisien." },
      { term: "Substitusi", meaning: "Mengganti variabel dengan nilai yang sudah diketahui." },
      { term: "Pasangan penyelesaian", meaning: "Hasil akhir yang ditulis (x, y), misalnya (3, 2)." },
    ],
    context: {
      title: "Seperti resep",
      text: "Metode eliminasi mirip resep masakan: urutan langkahnya tetap, apa pun bahannya. Begitu kamu hafal urutannya, sistem dengan angka apa pun dapat diselesaikan.",
      illustration: "steps",
    },
    examples: [
      {
        title: "Contoh 1 — Kedua persamaan dikalikan, lalu dikurangkan",
        problem: "Tentukan penyelesaian SPLDV berikut dengan metode eliminasi.",
        context: ["2x + 3y = 12  … (1)", "3x + 4y = 17  … (2)"],
        steps: [
          { title: "Pilih variabel", detail: "Kita eliminasi x. Koefisiennya 2 dan 3, KPK-nya 6." },
          {
            title: "Kalikan",
            detail: "Persamaan (1) dikali 3 dan persamaan (2) dikali 2, termasuk ruas kanan.",
            math: ["(1) × 3 → 6x + 9y = 36", "(2) × 2 → 6x + 8y = 34"],
          },
          {
            title: "Pilih operasi",
            detail: "Koefisien x sama-sama +6, jadi kurangkan.",
            math: ["  6x + 9y = 36", "  6x + 8y = 34", "———————— −", "        y = 2"],
          },
          { title: "Substitusi", detail: "Masukkan y = 2 ke persamaan (1).", math: ["2x + 3(2) = 12", "2x + 6 = 12", "2x = 6 → x = 3"] },
          { title: "Periksa", detail: "Uji ke persamaan (2): 3(3) + 4(2) = 9 + 8 = 17 ✓" },
        ],
        answer: "Penyelesaiannya (x, y) = (3, 2).",
      },
      {
        title: "Contoh 2 — Tanda berlawanan, lalu dijumlahkan",
        problem: "Tentukan penyelesaian SPLDV berikut dengan metode eliminasi.",
        context: ["3x − 2y = 4  … (1)", "2x + 5y = 9  … (2)"],
        steps: [
          { title: "Pilih variabel", detail: "Kita eliminasi y. Koefisiennya −2 dan 5, KPK dari 2 dan 5 adalah 10." },
          { title: "Kalikan", detail: "(1) × 5 dan (2) × 2.", math: ["15x − 10y = 20", " 4x + 10y = 18"] },
          { title: "Pilih operasi", detail: "−10y dan +10y berlawanan tanda, jadi jumlahkan.", math: ["19x = 38", "x = 2"] },
          { title: "Substitusi", detail: "Masukkan x = 2 ke persamaan (1).", math: ["3(2) − 2y = 4", "6 − 2y = 4", "−2y = −2 → y = 1"] },
          { title: "Periksa", detail: "Uji ke persamaan (2): 2(2) + 5(1) = 4 + 5 = 9 ✓" },
        ],
        answer: "Penyelesaiannya (x, y) = (2, 1).",
      },
    ],
    conclusion: [
      "Samakan koefisien dengan KPK, lalu kalikan seluruh suku persamaan.",
      "Tanda sama → kurangkan; tanda berlawanan → jumlahkan.",
      "Nilai variabel kedua diperoleh dengan substitusi, lalu tulis jawaban sebagai pasangan (x, y).",
    ],
    quiz: [
      {
        id: "q-m5-1",
        type: "number",
        topic: "m5",
        difficulty: "sedang",
        format: "langkah",
        prompt: "Untuk mengeliminasi x dari 2x + y = 7 dan 3x + 2y = 12, persamaan pertama dikalikan 3, dan persamaan kedua dikalikan ...",
        answer: "2",
        explanation: ["KPK dari koefisien x (2 dan 3) adalah 6.", "Persamaan kedua: 6 : 3 = 2."],
        hints: ["Cari KPK dari 2 dan 3.", "Bagi KPK dengan koefisien x pada persamaan kedua."],
        verify: { kind: "solution", e1: eq(2, 1, 7), e2: eq(3, 2, 12), x: 2, y: 3 },
      },
      {
        id: "q-m5-2",
        type: "number",
        topic: "m5",
        difficulty: "sedang",
        format: "langkah",
        prompt: "Lanjutkan proses berikut. Berapakah nilai y?",
        context: ["  6x + 3y = 21", "  6x + 4y = 24", "———————— −", "       −y = −3"],
        answer: "3",
        explanation: ["Dari −y = −3, kalikan kedua ruas dengan −1.", "y = 3."],
        hints: ["Jika −y = −3, maka y = ...?"],
        verify: { kind: "solution", e1: eq(2, 1, 7), e2: eq(3, 2, 12), x: 2, y: 3 },
      },
      {
        id: "q-m5-3",
        type: "pair",
        topic: "m5",
        difficulty: "sedang",
        format: "penyelesaian",
        prompt: "Tentukan penyelesaian dari x + 2y = 8 dan 3x − 2y = 8.",
        answer: "4,2",
        explanation: ["Koefisien y berlawanan (+2 dan −2), jumlahkan: 4x = 16 → x = 4.", "Substitusi: 4 + 2y = 8 → 2y = 4 → y = 2.", "Periksa: 3(4) − 2(2) = 12 − 4 = 8 ✓"],
        hints: ["Koefisien y sudah berlawanan.", "Jumlahkan kedua persamaan."],
        verify: { kind: "solution", e1: eq(1, 2, 8), e2: eq(3, -2, 8), x: 4, y: 2 },
      },
      {
        id: "q-m5-4",
        type: "mcq",
        topic: "m5",
        difficulty: "mudah",
        format: "langkah",
        prompt: "Setelah koefisien salah satu variabel disamakan, langkah berikutnya adalah ...",
        options: [
          { id: "a", text: "Menjumlahkan atau mengurangkan kedua persamaan" },
          { id: "b", text: "Menuliskan pasangan penyelesaian" },
          { id: "c", text: "Mengalikan lagi dengan KPK" },
          { id: "d", text: "Menggambar grafik" },
        ],
        answer: "a",
        explanation: ["Koefisien yang sudah sama siap dihilangkan dengan penjumlahan atau pengurangan."],
        hints: ["Apa tujuan menyamakan koefisien?"],
      },
    ],
  },

  // ---------------------------------------------------------------- MODUL 6
  {
    id: "m6",
    slug: "memeriksa-kebenaran-solusi",
    number: 6,
    title: "Memeriksa Kebenaran Solusi",
    summary: "Substitusikan jawaban ke kedua persamaan dan kenali kesalahan umum dalam eliminasi.",
    difficulty: "sedang",
    minutes: 15,
    objectives: [
      "Memeriksa jawaban dengan substitusi ke persamaan pertama dan kedua.",
      "Menyimpulkan apakah jawaban benar.",
      "Mengenali dan memperbaiki kesalahan umum dalam metode eliminasi.",
    ],
    sections: [
      {
        heading: "Mengapa perlu memeriksa?",
        blocks: [
          {
            type: "p",
            text: "Satu kesalahan tanda saja bisa membuat jawaban salah. Pemeriksaan hanya butuh waktu sebentar, tetapi memberi keyakinan bahwa jawabanmu benar.",
          },
        ],
      },
      {
        heading: "Cara memeriksa",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Substitusikan x dan y ke **persamaan pertama**. Hitung ruas kiri, bandingkan dengan ruas kanan.",
              "Substitusikan x dan y ke **persamaan kedua**.",
              "Jawaban benar hanya jika **kedua** persamaan terpenuhi. Jika satu saja gagal, ulangi perhitungan.",
            ],
          },
        ],
      },
      {
        heading: "Kesalahan umum",
        blocks: [
          {
            type: "list",
            items: [
              "**Lupa mengalikan ruas kanan.** x + 3y = 7 dikali 2 harus menjadi 2x + 6y = 14, bukan 2x + 6y = 7.",
              "**Salah tanda saat mengurangkan.** 5y − (−3y) = 5y + 3y = 8y, bukan 2y.",
              "**Salah memilih operasi.** Tanda sama harus dikurangkan, bukan dijumlahkan.",
              "**Hanya memeriksa satu persamaan.** Pasangan bisa memenuhi persamaan pertama tetapi gagal di persamaan kedua.",
              "**Tertukar urutan.** Pasangan ditulis (x, y): nilai x di depan.",
            ],
          },
          {
            type: "callout",
            tone: "warn",
            title: "Hati-hati dengan tanda minus",
            text: "Saat mengurangkan persamaan, setiap suku pada persamaan kedua berubah tanda. Tulis dengan tanda kurung agar tidak terlewat.",
          },
        ],
      },
    ],
    terms: [
      { term: "Substitusi", meaning: "Mengganti variabel dengan nilainya untuk dihitung." },
      { term: "Terpenuhi", meaning: "Ruas kiri bernilai sama dengan ruas kanan setelah substitusi." },
      { term: "Verifikasi", meaning: "Proses memastikan jawaban benar." },
    ],
    context: {
      title: "Pemeriksa yang teliti",
      text: "Seorang kasir selalu menghitung ulang kembalian sebelum memberikannya. Begitu juga matematikawan: setelah mendapat jawaban, mereka mengujinya kembali ke soal awal.",
      illustration: "checklist",
    },
    examples: [
      {
        title: "Contoh 1 — Jawaban yang benar",
        problem: "Rafi mendapatkan (4, 3) sebagai penyelesaian sistem berikut. Periksa jawabannya.",
        context: ["2x + y = 11", "x − y = 1"],
        steps: [
          { title: "Persamaan pertama", detail: "", math: ["2(4) + 3 = 8 + 3 = 11 ✓"] },
          { title: "Persamaan kedua", detail: "", math: ["4 − 3 = 1 ✓"] },
        ],
        answer: "Kedua persamaan terpenuhi, jadi jawaban Rafi benar.",
      },
      {
        title: "Contoh 2 — Menemukan kesalahan",
        problem: "Sinta mendapatkan (4, 2) sebagai penyelesaian sistem berikut. Periksa dan perbaiki.",
        context: ["3x + 2y = 18", "x + 2y = 10"],
        steps: [
          { title: "Uji persamaan pertama", detail: "Ternyata tidak sama dengan 18.", math: ["3(4) + 2(2) = 12 + 4 = 16 ≠ 18 ✗"] },
          {
            title: "Kerjakan ulang",
            detail: "Koefisien y sama (+2), jadi kurangkan.",
            math: ["(3x + 2y) − (x + 2y) = 18 − 10", "2x = 8 → x = 4"],
          },
          { title: "Substitusi", detail: "Nilai x sudah benar; kesalahan ada pada y.", math: ["4 + 2y = 10", "2y = 6 → y = 3"] },
          { title: "Periksa lagi", detail: "", math: ["3(4) + 2(3) = 18 ✓", "4 + 2(3) = 10 ✓"] },
        ],
        answer: "Jawaban yang benar adalah (4, 3).",
      },
    ],
    conclusion: [
      "Periksa jawaban dengan substitusi ke kedua persamaan.",
      "Jawaban benar hanya jika kedua persamaan terpenuhi.",
      "Waspadai kesalahan tanda dan lupa mengalikan ruas kanan.",
    ],
    quiz: [
      {
        id: "q-m6-1",
        type: "tf",
        topic: "m6",
        difficulty: "mudah",
        format: "penyelesaian",
        prompt: "Pasangan (5, 1) merupakan penyelesaian dari 2x − y = 9 dan x + y = 6.",
        answer: "true",
        explanation: ["2(5) − 1 = 9 ✓", "5 + 1 = 6 ✓"],
        hints: ["Uji kedua persamaan."],
        verify: { kind: "pairCheck", e1: eq(2, -1, 9), e2: eq(1, 1, 6), x: 5, y: 1 },
      },
      {
        id: "q-m6-2",
        type: "tf",
        topic: "m6",
        difficulty: "sedang",
        format: "penyelesaian",
        prompt: "Pasangan (3, 4) merupakan penyelesaian dari x + y = 7 dan 2x − y = 3.",
        answer: "false",
        explanation: ["3 + 4 = 7 ✓", "2(3) − 4 = 2 ≠ 3 ✗", "Karena persamaan kedua tidak terpenuhi, pernyataan salah."],
        hints: ["Jangan berhenti setelah persamaan pertama."],
        verify: { kind: "pairCheck", e1: eq(1, 1, 7), e2: eq(2, -1, 3), x: 3, y: 4 },
      },
      {
        id: "q-m6-3",
        type: "mcq",
        topic: "m6",
        difficulty: "sedang",
        format: "langkah",
        prompt: "Budi mengalikan persamaan x + 3y = 7 dengan 2 dan menulis 2x + 6y = 7. Apa kesalahannya?",
        options: [
          { id: "a", text: "Koefisien x seharusnya tetap 1" },
          { id: "b", text: "Ruas kanan tidak ikut dikalikan; seharusnya 14" },
          { id: "c", text: "Seharusnya dikalikan 3" },
          { id: "d", text: "Tidak ada kesalahan" },
        ],
        answer: "b",
        explanation: ["Semua suku harus dikalikan, termasuk ruas kanan: 7 × 2 = 14.", "Hasil yang benar: 2x + 6y = 14."],
        hints: ["Apakah semua suku sudah dikalikan 2?"],
      },
      {
        id: "q-m6-4",
        type: "mcq",
        topic: "m6",
        difficulty: "sedang",
        format: "konsep",
        prompt: "Hasil dari 5y − (−3y) adalah ...",
        options: [
          { id: "a", text: "2y" },
          { id: "b", text: "−8y" },
          { id: "c", text: "8y" },
          { id: "d", text: "15y" },
        ],
        answer: "c",
        explanation: ["Mengurangkan bilangan negatif sama dengan menjumlahkan: 5y − (−3y) = 5y + 3y = 8y."],
        hints: ["Minus dikali minus menjadi ...?"],
      },
    ],
  },

  // ---------------------------------------------------------------- MODUL 7
  {
    id: "m7",
    slug: "penerapan-spldv",
    number: 7,
    title: "Penerapan SPLDV",
    summary: "Selesaikan soal cerita harga barang, jumlah benda, dan umur dengan metode eliminasi.",
    difficulty: "sulit",
    minutes: 30,
    objectives: [
      "Menyelesaikan masalah harga barang dengan SPLDV.",
      "Menyelesaikan masalah jumlah benda dengan SPLDV.",
      "Menyelesaikan masalah umur dengan SPLDV.",
      "Menuliskan jawaban akhir dalam kalimat sesuai konteks soal.",
    ],
    sections: [
      {
        heading: "Lima langkah soal cerita",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**Pahami** soal: apa yang diketahui dan ditanyakan.",
              "**Buat model**: tentukan variabel, susun dua persamaan.",
              "**Eliminasi**: cari nilai kedua variabel.",
              "**Periksa**: substitusikan ke kedua persamaan.",
              "**Jawab** dengan kalimat, termasuk satuan (rupiah, ekor, tahun, ...).",
            ],
          },
        ],
      },
      {
        heading: "Jenis-jenis masalah",
        blocks: [
          {
            type: "list",
            items: [
              "**Harga barang** — dua nota belanja dengan barang yang sama.",
              "**Jumlah benda** — banyak benda dan banyak kaki/roda/lembar uang.",
              "**Umur** — jumlah, selisih, atau perbandingan umur; perhatikan \"... tahun lalu\" dan \"... tahun lagi\".",
              "**Lainnya** — tiket, nilai ujian, campuran bahan, dan sebagainya.",
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Periksa kewajaran",
            text: "Banyak hewan tidak mungkin negatif atau pecahan, dan harga barang biasanya kelipatan ratusan. Jika hasilmu aneh, periksa kembali.",
          },
        ],
      },
    ],
    terms: [
      { term: "Konteks", meaning: "Situasi nyata dalam soal cerita." },
      { term: "Satuan", meaning: "Keterangan besaran seperti rupiah, ekor, atau tahun." },
      { term: "Kesimpulan", meaning: "Kalimat jawaban yang menjawab pertanyaan soal." },
    ],
    context: {
      title: "Matematika di sekitar kita",
      text: "Pedagang menghitung harga satuan dari nota grosir, petugas parkir menghitung banyak motor dan mobil dari jumlah roda, dan kamu bisa menebak umur kakak dan adik dari jumlah serta selisihnya. Semua itu adalah SPLDV.",
      illustration: "story",
    },
    examples: [
      {
        title: "Contoh 1 — Harga barang",
        problem: "Harga 3 pulpen dan 2 buku Rp16.000. Harga 1 pulpen dan 2 buku Rp12.000. Berapa harga 2 pulpen dan 3 buku?",
        steps: [
          { title: "Model", detail: "Misalkan p = harga 1 pulpen, b = harga 1 buku.", math: ["3p + 2b = 16.000", " p + 2b = 12.000"] },
          { title: "Eliminasi b", detail: "Koefisien b sama (+2), kurangkan.", math: ["2p = 4.000 → p = 2.000"] },
          { title: "Substitusi", detail: "", math: ["2.000 + 2b = 12.000", "2b = 10.000 → b = 5.000"] },
          { title: "Periksa", detail: "3(2.000) + 2(5.000) = 6.000 + 10.000 = 16.000 ✓" },
          { title: "Jawab pertanyaan", detail: "", math: ["2p + 3b = 2(2.000) + 3(5.000) = 4.000 + 15.000 = 19.000"] },
        ],
        answer: "Harga 2 pulpen dan 3 buku adalah Rp19.000.",
      },
      {
        title: "Contoh 2 — Jumlah benda",
        problem: "Di tempat parkir terdapat 30 kendaraan yang terdiri atas motor (2 roda) dan mobil (4 roda). Jumlah roda seluruhnya 86. Berapa banyak mobil?",
        steps: [
          { title: "Model", detail: "Misalkan m = banyak motor, c = banyak mobil.", math: [" m +  c = 30", "2m + 4c = 86"] },
          { title: "Samakan koefisien m", detail: "Persamaan pertama dikali 2.", math: ["2m + 2c = 60", "2m + 4c = 86"] },
          { title: "Kurangkan", detail: "(2m + 4c) − (2m + 2c) = 86 − 60", math: ["2c = 26 → c = 13"] },
          { title: "Substitusi", detail: "", math: ["m = 30 − 13 = 17"] },
          { title: "Periksa", detail: "2(17) + 4(13) = 34 + 52 = 86 ✓" },
        ],
        answer: "Terdapat 13 mobil (dan 17 motor).",
      },
      {
        title: "Contoh 3 — Umur",
        problem: "Jumlah umur ayah dan anaknya 50 tahun. Selisih umur mereka 26 tahun. Berapa umur masing-masing?",
        steps: [
          { title: "Model", detail: "Misalkan a = umur ayah, n = umur anak.", math: ["a + n = 50", "a − n = 26"] },
          { title: "Jumlahkan", detail: "Koefisien n berlawanan.", math: ["2a = 76 → a = 38"] },
          { title: "Substitusi", detail: "", math: ["38 + n = 50 → n = 12"] },
          { title: "Periksa", detail: "38 − 12 = 26 ✓" },
        ],
        answer: "Umur ayah 38 tahun dan umur anak 12 tahun.",
      },
    ],
    conclusion: [
      "Soal cerita diselesaikan dengan: pahami → model → eliminasi → periksa → jawab.",
      "Pastikan jawaban akhir menjawab pertanyaan soal, lengkap dengan satuannya.",
      "Periksa kewajaran hasil sesuai konteks.",
    ],
    quiz: [
      {
        id: "q-m7-1",
        type: "pair",
        topic: "m7",
        difficulty: "sedang",
        format: "cerita",
        prompt: "Jumlah dua bilangan adalah 25 dan selisihnya 7. Tentukan bilangan besar dan bilangan kecil.",
        pairLabels: ["besar", "kecil"],
        answer: "16,9",
        explanation: ["Model: x + y = 25 dan x − y = 7.", "Jumlahkan: 2x = 32 → x = 16.", "y = 25 − 16 = 9. Periksa: 16 − 9 = 7 ✓"],
        hints: ["Misalkan x bilangan besar, y bilangan kecil.", "Koefisien y berlawanan, jumlahkan."],
        verify: { kind: "solution", e1: eq(1, 1, 25), e2: eq(1, -1, 7), x: 16, y: 9 },
      },
      {
        id: "q-m7-2",
        type: "number",
        topic: "m7",
        difficulty: "sedang",
        format: "cerita",
        prompt: "Harga 2 kg gula dan 1 kg beras Rp40.000. Harga 1 kg gula dan 1 kg beras Rp26.000. Berapa rupiah harga 1 kg gula?",
        answer: "14000",
        explanation: ["Model: 2g + b = 40.000 dan g + b = 26.000.", "Kurangkan: g = 14.000.", "Periksa: b = 12.000; 2(14.000) + 12.000 = 40.000 ✓"],
        hints: ["Koefisien b sama, kurangkan kedua persamaan."],
        verify: { kind: "solution", e1: eq(2, 1, 40000), e2: eq(1, 1, 26000), x: 14000, y: 12000 },
      },
      {
        id: "q-m7-3",
        type: "number",
        topic: "m7",
        difficulty: "sulit",
        format: "cerita",
        prompt: "Di sebuah kandang terdapat 15 ekor ayam dan kambing. Jumlah kaki seluruhnya 40. Berapa ekor kambing?",
        answer: "5",
        explanation: ["Model: a + k = 15 dan 2a + 4k = 40.", "Kalikan persamaan pertama dengan 2: 2a + 2k = 30.", "Kurangkan: 2k = 10 → k = 5.", "Periksa: a = 10; 2(10) + 4(5) = 40 ✓"],
        hints: ["Ayam berkaki 2, kambing berkaki 4.", "Samakan koefisien a dengan mengalikan persamaan pertama dengan 2."],
        verify: { kind: "solution", e1: eq(1, 1, 15), e2: eq(2, 4, 40), x: 10, y: 5 },
      },
      {
        id: "q-m7-4",
        type: "mcq",
        topic: "m7",
        difficulty: "sedang",
        format: "cerita",
        prompt: "Umur kakak 4 tahun lebih tua daripada umur adik. Jumlah umur mereka 20 tahun. Berapa umur kakak?",
        options: [
          { id: "a", text: "8 tahun" },
          { id: "b", text: "10 tahun" },
          { id: "c", text: "12 tahun" },
          { id: "d", text: "16 tahun" },
        ],
        answer: "c",
        explanation: ["Model: k − a = 4 dan k + a = 20.", "Jumlahkan: 2k = 24 → k = 12.", "Adik: 20 − 12 = 8. Periksa: 12 − 8 = 4 ✓"],
        hints: ["\"lebih tua 4 tahun\" berarti selisihnya 4."],
        verify: { kind: "solution", e1: eq(1, -1, 4), e2: eq(1, 1, 20), x: 12, y: 8 },
      },
    ],
  },
];

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l])) as Record<string, Lesson>;
export const LESSON_BY_SLUG = Object.fromEntries(LESSONS.map((l) => [l.slug, l])) as Record<string, Lesson>;
export const ALL_LESSON_QUIZ_QUESTIONS = LESSONS.flatMap((l) => l.quiz);
