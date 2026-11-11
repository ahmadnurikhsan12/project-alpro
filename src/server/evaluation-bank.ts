import "server-only";
import type { Question } from "@/lib/questions/types";

/**
 * BANK SOAL EVALUASI AKHIR — HANYA DI SERVER.
 * Modul ini diberi `import "server-only"` sehingga build akan gagal jika
 * ada komponen browser yang mencoba mengimpornya. Kunci jawaban tidak
 * pernah dikirim ke frontend selama evaluasi berlangsung.
 */

const eq = (a: number, b: number, c: number) => ({ a, b, c });

export const EVALUATION_QUESTIONS: Question[] = [
  {
    id: "e01", type: "mcq", topic: "m1", difficulty: "mudah", format: "konsep",
    prompt: "Bentuk umum persamaan linear dua variabel adalah ...",
    options: [
      { id: "a", text: "ax + by = c" },
      { id: "b", text: "ax² + by = c" },
      { id: "c", text: "ax + b = c" },
      { id: "d", text: "axy = c" },
    ],
    answer: "a",
    explanation: ["PLDV memuat dua variabel berpangkat satu: ax + by = c."],
  },
  {
    id: "e02", type: "number", topic: "m1", difficulty: "mudah", format: "konsep",
    prompt: "Berapakah konstanta pada persamaan 9p − 4q = 27?",
    answer: "27",
    explanation: ["Konstanta adalah suku tanpa variabel, yaitu 27."],
  },
  {
    id: "e03", type: "tf", topic: "m1", difficulty: "mudah", format: "konsep",
    prompt: "Persamaan 2x + 3 = 9 termasuk persamaan linear dua variabel.",
    answer: "false",
    explanation: ["Persamaan tersebut hanya memiliki satu variabel (x)."],
  },
  {
    id: "e04", type: "number", topic: "m1", difficulty: "sedang", format: "penyelesaian",
    prompt: "Jika (3, y) merupakan penyelesaian dari 4x − y = 7, berapakah nilai y?",
    answer: "5",
    explanation: ["4(3) − y = 7 → 12 − y = 7 → y = 5."],
  },
  {
    id: "e05", type: "mcq", topic: "m2", difficulty: "mudah", format: "konsep",
    prompt: "Penyelesaian SPLDV adalah pasangan nilai yang ...",
    options: [
      { id: "a", text: "Memenuhi persamaan pertama saja" },
      { id: "b", text: "Memenuhi persamaan kedua saja" },
      { id: "c", text: "Memenuhi kedua persamaan sekaligus" },
      { id: "d", text: "Tidak memenuhi kedua persamaan" },
    ],
    answer: "c",
    explanation: ["Penyelesaian SPLDV harus membuat kedua persamaan benar secara bersamaan."],
  },
  {
    id: "e06", type: "tf", topic: "m2", difficulty: "sedang", format: "penyelesaian",
    prompt: "Pasangan (4, 1) merupakan penyelesaian dari x + 2y = 6 dan 3x − y = 11.",
    answer: "true",
    explanation: ["4 + 2(1) = 6 ✓", "3(4) − 1 = 11 ✓"],
    verify: { kind: "pairCheck", e1: eq(1, 2, 6), e2: eq(3, -1, 11), x: 4, y: 1 },
  },
  {
    id: "e07", type: "mcq", topic: "m2", difficulty: "sedang", format: "konsep",
    prompt: "Grafik dua persamaan dalam sebuah SPLDV berpotongan di titik (2, −1). Penyelesaian SPLDV tersebut adalah ...",
    options: [
      { id: "a", text: "x = −1 dan y = 2" },
      { id: "b", text: "x = 2 dan y = −1" },
      { id: "c", text: "x = 2 dan y = 1" },
      { id: "d", text: "Tidak dapat ditentukan" },
    ],
    answer: "b",
    explanation: ["Koordinat titik potong (x, y) = (2, −1) adalah penyelesaiannya."],
  },
  {
    id: "e08", type: "mcq", topic: "m2", difficulty: "sulit", format: "konsep",
    prompt: "Sistem 3x − y = 4 dan 6x − 2y = 8 memiliki ...",
    options: [
      { id: "a", text: "Tepat satu penyelesaian" },
      { id: "b", text: "Tidak ada penyelesaian" },
      { id: "c", text: "Tak hingga penyelesaian" },
      { id: "d", text: "Tepat dua penyelesaian" },
    ],
    answer: "c",
    explanation: ["Persamaan kedua adalah 2 × persamaan pertama, sehingga kedua garis berimpit.", "Penyelesaiannya tak hingga."],
  },
  {
    id: "e09", type: "mcq", topic: "m3", difficulty: "mudah", format: "model",
    prompt: "\"Selisih dua bilangan adalah 8\" dengan x bilangan yang lebih besar dan y bilangan yang lebih kecil ditulis ...",
    options: [
      { id: "a", text: "x + y = 8" },
      { id: "b", text: "x − y = 8" },
      { id: "c", text: "y − x = 8" },
      { id: "d", text: "xy = 8" },
    ],
    answer: "b",
    explanation: ["Selisih = bilangan besar − bilangan kecil: x − y = 8."],
  },
  {
    id: "e10", type: "mcq", topic: "m3", difficulty: "sedang", format: "model",
    prompt: "Harga 2 kg beras dan 3 kg telur Rp105.000. Harga 1 kg beras dan 2 kg telur Rp65.000. Jika b = harga 1 kg beras dan t = harga 1 kg telur, modelnya adalah ...",
    options: [
      { id: "a", text: "2b + 3t = 65.000 dan b + 2t = 105.000" },
      { id: "b", text: "3b + 2t = 105.000 dan 2b + t = 65.000" },
      { id: "c", text: "2b + 3t = 105.000 dan b + 2t = 65.000" },
      { id: "d", text: "2b + 3t = 105.000 dan 2b + t = 65.000" },
    ],
    answer: "c",
    explanation: ["2 kg beras dan 3 kg telur → 2b + 3t = 105.000.", "1 kg beras dan 2 kg telur → b + 2t = 65.000."],
  },
  {
    id: "e11", type: "tf", topic: "m3", difficulty: "sedang", format: "model",
    prompt: "\"Jumlah roda s sepeda (2 roda) dan b becak (3 roda) adalah 48\" dapat ditulis 2s + 3b = 48.",
    answer: "true",
    explanation: ["Roda sepeda: 2s; roda becak: 3b; jumlahnya 48."],
  },
  {
    id: "e12", type: "mcq", topic: "m3", difficulty: "sulit", format: "model",
    prompt: "Umur ayah sekarang 4 kali umur anaknya. Lima tahun lagi, umur ayah menjadi 3 kali umur anaknya. Jika a = umur ayah dan n = umur anak sekarang, persamaan untuk kalimat kedua adalah ...",
    options: [
      { id: "a", text: "a + 5 = 3(n + 5)" },
      { id: "b", text: "a + 5 = 3n" },
      { id: "c", text: "a = 3(n + 5)" },
      { id: "d", text: "a − 5 = 3(n − 5)" },
    ],
    answer: "a",
    explanation: ["Lima tahun lagi umur ayah a + 5 dan umur anak n + 5.", "Maka a + 5 = 3(n + 5)."],
  },
  {
    id: "e13", type: "mcq", topic: "m4", difficulty: "mudah", format: "konsep",
    prompt: "Tujuan utama metode eliminasi adalah ...",
    options: [
      { id: "a", text: "Menambah banyak variabel" },
      { id: "b", text: "Menghilangkan salah satu variabel" },
      { id: "c", text: "Menggambar grafik" },
      { id: "d", text: "Mengubah persamaan menjadi pertidaksamaan" },
    ],
    answer: "b",
    explanation: ["Eliminasi berarti menghilangkan salah satu variabel agar tersisa persamaan satu variabel."],
  },
  {
    id: "e14", type: "mcq", topic: "m4", difficulty: "sedang", format: "operasi",
    prompt: "Sistem 5x + 3y = 21 dan 2x + 3y = 12. Agar y tereliminasi, kedua persamaan ...",
    options: [
      { id: "a", text: "Dijumlahkan" },
      { id: "b", text: "Dikurangkan" },
      { id: "c", text: "Dikalikan 3" },
      { id: "d", text: "Dibagi 3" },
    ],
    answer: "b",
    explanation: ["Koefisien y sama-sama +3, jadi dikurangkan: 3x = 9 → x = 3."],
    verify: { kind: "solution", e1: eq(5, 3, 21), e2: eq(2, 3, 12), x: 3, y: 2 },
  },
  {
    id: "e15", type: "tf", topic: "m4", difficulty: "mudah", format: "operasi",
    prompt: "Jika koefisien suatu variabel bernilai sama tetapi berlawanan tanda, kedua persamaan dijumlahkan untuk mengeliminasinya.",
    answer: "true",
    explanation: ["Contoh: +2y + (−2y) = 0, sehingga variabel y hilang."],
  },
  {
    id: "e16", type: "number", topic: "m5", difficulty: "sedang", format: "langkah",
    prompt: "Untuk mengeliminasi y dari 2x + 3y = 9 dan 5x − y = 14, persamaan kedua dikalikan ...",
    answer: "3",
    explanation: ["Koefisien y: 3 dan −1. Agar menjadi 3 dan −3, persamaan kedua dikali 3."],
    verify: { kind: "solution", e1: eq(2, 3, 9), e2: eq(5, -1, 14), x: 3, y: 1 },
  },
  {
    id: "e17", type: "number", topic: "m5", difficulty: "sedang", format: "penyelesaian",
    prompt: "Dari sistem 2x + 3y = 9 dan 5x − y = 14, berapakah nilai x?",
    answer: "3",
    explanation: ["Persamaan kedua × 3: 15x − 3y = 42.", "Jumlahkan dengan persamaan pertama: 17x = 51 → x = 3."],
    verify: { kind: "solution", e1: eq(2, 3, 9), e2: eq(5, -1, 14), x: 3, y: 1 },
  },
  {
    id: "e18", type: "pair", topic: "m5", difficulty: "sedang", format: "penyelesaian",
    prompt: "Tentukan penyelesaian dari x + 3y = 10 dan 2x − y = 6.",
    answer: "4,2",
    explanation: ["Persamaan pertama × 2: 2x + 6y = 20.", "Kurangkan dengan 2x − y = 6: 7y = 14 → y = 2.", "Substitusi: x + 6 = 10 → x = 4."],
    verify: { kind: "solution", e1: eq(1, 3, 10), e2: eq(2, -1, 6), x: 4, y: 2 },
  },
  {
    id: "e19", type: "pair", topic: "m5", difficulty: "sulit", format: "penyelesaian",
    prompt: "Tentukan penyelesaian dari 3x + 5y = 1 dan 2x + 3y = 0.",
    answer: "-3,2",
    explanation: ["Eliminasi x: (1) × 2 → 6x + 10y = 2; (2) × 3 → 6x + 9y = 0.", "Kurangkan: y = 2.", "Substitusi: 2x + 6 = 0 → x = −3."],
    verify: { kind: "solution", e1: eq(3, 5, 1), e2: eq(2, 3, 0), x: -3, y: 2 },
  },
  {
    id: "e20", type: "number", topic: "m5", difficulty: "sulit", format: "penyelesaian",
    prompt: "Dari sistem 4x + 3y = 23 dan 6x − 5y = −13, berapakah nilai x?",
    answer: "2",
    explanation: ["Eliminasi y: (1) × 5 → 20x + 15y = 115; (2) × 3 → 18x − 15y = −39.", "Jumlahkan: 38x = 76 → x = 2."],
    verify: { kind: "solution", e1: eq(4, 3, 23), e2: eq(6, -5, -13), x: 2, y: 5 },
  },
  {
    id: "e21", type: "tf", topic: "m6", difficulty: "mudah", format: "penyelesaian",
    prompt: "Pasangan (3, 2) merupakan penyelesaian dari 2x + y = 8 dan x − y = 1.",
    answer: "true",
    explanation: ["2(3) + 2 = 8 ✓", "3 − 2 = 1 ✓"],
    verify: { kind: "pairCheck", e1: eq(2, 1, 8), e2: eq(1, -1, 1), x: 3, y: 2 },
  },
  {
    id: "e22", type: "tf", topic: "m6", difficulty: "sedang", format: "penyelesaian",
    prompt: "Pasangan (2, 4) merupakan penyelesaian dari 3x − y = 2 dan x + 2y = 9.",
    answer: "false",
    explanation: ["3(2) − 4 = 2 ✓", "2 + 2(4) = 10 ≠ 9 ✗"],
    verify: { kind: "pairCheck", e1: eq(3, -1, 2), e2: eq(1, 2, 9), x: 2, y: 4 },
  },
  {
    id: "e23", type: "mcq", topic: "m6", difficulty: "sedang", format: "konsep",
    prompt: "Untuk memastikan penyelesaian SPLDV benar, nilai x dan y disubstitusikan ke ...",
    options: [
      { id: "a", text: "Persamaan pertama saja" },
      { id: "b", text: "Persamaan hasil eliminasi saja" },
      { id: "c", text: "Kedua persamaan awal" },
      { id: "d", text: "Tidak perlu disubstitusikan" },
    ],
    answer: "c",
    explanation: ["Penyelesaian harus memenuhi kedua persamaan awal."],
  },
  {
    id: "e24", type: "mcq", topic: "m6", difficulty: "sulit", format: "langkah",
    prompt: "Hasil dari (−4y) − (−7y) adalah ...",
    options: [
      { id: "a", text: "−11y" },
      { id: "b", text: "3y" },
      { id: "c", text: "−3y" },
      { id: "d", text: "11y" },
    ],
    answer: "b",
    explanation: ["−4y − (−7y) = −4y + 7y = 3y."],
  },
  {
    id: "e25", type: "number", topic: "m7", difficulty: "sedang", format: "cerita",
    prompt: "Harga 3 buku dan 2 pulpen Rp23.000. Harga 2 buku dan 2 pulpen Rp18.000. Berapa rupiah harga 1 buku?",
    answer: "5000",
    explanation: ["Kurangkan: (3b + 2p) − (2b + 2p) = 23.000 − 18.000 → b = 5.000."],
    verify: { kind: "solution", e1: eq(3, 2, 23000), e2: eq(2, 2, 18000), x: 5000, y: 4000 },
  },
  {
    id: "e26", type: "number", topic: "m7", difficulty: "sedang", format: "cerita",
    prompt: "Jumlah kelereng Andi dan Budi 45 butir. Kelereng Andi 9 butir lebih banyak daripada kelereng Budi. Berapa butir kelereng Andi?",
    answer: "27",
    explanation: ["Model: a + b = 45 dan a − b = 9.", "Jumlahkan: 2a = 54 → a = 27."],
    verify: { kind: "solution", e1: eq(1, 1, 45), e2: eq(1, -1, 9), x: 27, y: 18 },
  },
  {
    id: "e27", type: "number", topic: "m7", difficulty: "sulit", format: "cerita",
    prompt: "Berat 2 karung pupuk A dan 3 karung pupuk B adalah 130 kg. Berat 3 karung pupuk A dan 2 karung pupuk B adalah 120 kg. Berapa kg berat 1 karung pupuk A?",
    answer: "20",
    explanation: ["Model: 2a + 3b = 130 dan 3a + 2b = 120.", "Eliminasi b: (1) × 2 → 4a + 6b = 260; (2) × 3 → 9a + 6b = 360.", "Kurangkan: 5a = 100 → a = 20."],
    verify: { kind: "solution", e1: eq(2, 3, 130), e2: eq(3, 2, 120), x: 20, y: 30 },
  },
  {
    id: "e28", type: "number", topic: "m7", difficulty: "sulit", format: "cerita",
    prompt: "Uang Rp50.000 terdiri atas 13 lembar pecahan Rp2.000 dan Rp5.000. Berapa lembar pecahan Rp5.000?",
    answer: "8",
    explanation: ["Model: d + l = 13 dan 2.000d + 5.000l = 50.000 (disederhanakan: 2d + 5l = 50).", "Persamaan pertama × 2: 2d + 2l = 26.", "Kurangkan: 3l = 24 → l = 8."],
    verify: { kind: "solution", e1: eq(1, 1, 13), e2: eq(2, 5, 50), x: 5, y: 8 },
  },
  {
    id: "e29", type: "pair", topic: "m7", difficulty: "sulit", format: "cerita",
    prompt: "Jumlah umur kakak dan adik 30 tahun. Dua kali umur kakak dikurangi umur adik sama dengan 24 tahun. Tentukan umur kakak dan adik.",
    pairLabels: ["kakak", "adik"],
    answer: "18,12",
    explanation: ["Model: k + a = 30 dan 2k − a = 24.", "Jumlahkan: 3k = 54 → k = 18.", "a = 30 − 18 = 12."],
    verify: { kind: "solution", e1: eq(1, 1, 30), e2: eq(2, -1, 24), x: 18, y: 12 },
  },
  {
    id: "e30", type: "mcq", topic: "m4", difficulty: "sulit", format: "operasi",
    prompt: "Pada sistem 2x + 5y = 1 dan 3x + 2y = 7, langkah yang tepat untuk mengeliminasi x adalah ...",
    options: [
      { id: "a", text: "(1) × 3 dan (2) × 2, lalu dikurangkan" },
      { id: "b", text: "(1) × 3 dan (2) × 2, lalu dijumlahkan" },
      { id: "c", text: "(1) × 2 dan (2) × 3, lalu dikurangkan" },
      { id: "d", text: "(1) × 5 dan (2) × 2, lalu dikurangkan" },
    ],
    answer: "a",
    explanation: ["KPK dari 2 dan 3 adalah 6: (1) × 3 → 6x + 15y = 3; (2) × 2 → 6x + 4y = 14.", "Tanda koefisien x sama, sehingga dikurangkan: 11y = −11 → y = −1."],
    verify: { kind: "solution", e1: eq(2, 5, 1), e2: eq(3, 2, 7), x: 3, y: -1 },
  },
];

export const EVALUATION_BY_ID: Record<string, Question> = Object.fromEntries(EVALUATION_QUESTIONS.map((q) => [q.id, q]));
