import "server-only";
import { ASSESSMENT_SKILLS, type AssessmentSkill, type FormId } from "@/lib/assessment/blueprint";
import { formatEquation, type Equation } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";

/**
 * BANK SOAL PRETEST / POSTTEST — HANYA DI SERVER (`server-only`: build gagal jika dipakai komponen browser).
 *
 * Formulir A dan B dibangun dari cetak biru yang sama (src/lib/assessment/blueprint.ts): 12 butir, 2 per kompetensi.
 * Butir bernomor sama (slot) pada A dan B setara: jenis soal, tingkat kesulitan, tipe jawaban, struktur penyelesaian
 * (operasi, perlu-tidaknya mengalikan) dan posisi kunci pilihan ganda dibuat sama; hanya angka/konteks yang berbeda.
 * Tes `tests/assessment.test.ts` memverifikasi kesetaraan ini dan kebenaran setiap kunci.
 *
 * Butir TIDAK memakai soal Latihan, Mini Quiz, maupun Evaluasi Akhir yang ada.
 */
export interface AssessmentItem extends Question {
  slot: number;
  skill: AssessmentSkill;
  form: FormId;
}

const eq = (a: number, b: number, c: number): Equation => ({ a, b, c });
const sys = (e1: Equation, e2: Equation) => `Sistem ${formatEquation(e1)} dan ${formatEquation(e2)}`;

type Opt = { id: string; text: string };
/** Menempatkan jawaban benar pada posisi `pos` (0–3); id opsi a–d mengikuti urutan. */
function place(correct: string, wrongs: [string, string, string], pos: number): { options: Opt[]; answer: string } {
  const texts = [...wrongs];
  texts.splice(pos, 0, correct);
  const options = texts.map((text, i) => ({ id: "abcd"[i], text }));
  return { options, answer: "abcd"[pos] };
}

interface Params {
  form: FormId;
  s1: { e1: Equation; e2: Equation; x: number; y: number; wrongs: [string, string, string] };
  s2: { e1: Equation; e2: Equation; x: number; y: number; wrongs: [string, string, string] };
  s3: { e1: Equation; e2: Equation; x: number; y: number; multiplier: number };
  s4: { eq: Equation; k: number; correct: string; wrongs: [string, string, string] };
  s5: { e1: Equation; e2: Equation; x: number; y: number; constant: number };
  s6: { e1: Equation; e2: Equation; x: number; y: number; ask: "x" | "y" };
  s7: { e1: Equation; e2: Equation; x: number; y: number };
  s8: { e1: Equation; e2: Equation; x: number; y: number };
  s9: { e1: Equation; e2: Equation; x: number; y: number };
  s10: { e1: Equation; e2: Equation; x: number; y: number };
  s11: { e1: Equation; e2: Equation; x: number; y: number };
  s12: { value: number };
}

function build(p: Params): AssessmentItem[] {
  const f = p.form;
  const id = (n: number) => `as-${f}-${String(n).padStart(2, "0")}`;
  const solution = (s: { e1: Equation; e2: Equation; x: number; y: number }) => ({ kind: "solution" as const, ...s });
  const base = (n: number, skill: AssessmentSkill): Pick<AssessmentItem, "id" | "slot" | "skill" | "form"> => ({ id: id(n), slot: n, skill, form: f });

  return [
    {
      ...base(1, "pilih_operasi"),
      type: "mcq", topic: "m4", difficulty: "mudah", format: "operasi",
      prompt: `${sys(p.s1.e1, p.s1.e2)}. Agar y tereliminasi, kedua persamaan harus ...`,
      ...place("Dikurangkan", p.s1.wrongs, 1),
      explanation: ["Koefisien y pada kedua persamaan sama besar dan bertanda sama, sehingga dikurangkan agar y menjadi 0."],
      verify: solution(p.s1),
    },
    {
      ...base(2, "pilih_operasi"),
      type: "mcq", topic: "m4", difficulty: "sedang", format: "operasi",
      prompt: `${sys(p.s2.e1, p.s2.e2)}. Agar x tereliminasi, kedua persamaan harus ...`,
      ...place("Dijumlahkan", p.s2.wrongs, 3),
      explanation: ["Koefisien x sama besar dan bertanda berlawanan, sehingga dijumlahkan agar x menjadi 0."],
      verify: solution(p.s2),
    },
    {
      ...base(3, "samakan_koefisien"),
      type: "number", topic: "m5", difficulty: "sedang", format: "langkah",
      prompt: `${sys(p.s3.e1, p.s3.e2)}. Koefisien x akan disamakan dengan KPK-nya. Persamaan pertama harus dikalikan berapa?`,
      answer: String(p.s3.multiplier),
      explanation: ["Pengali persamaan pertama = KPK kedua koefisien x dibagi koefisien x persamaan pertama."],
      verify: solution(p.s3),
    },
    {
      ...base(4, "samakan_koefisien"),
      type: "mcq", topic: "m4", difficulty: "sedang", format: "konsep",
      prompt: `Persamaan ${formatEquation(p.s4.eq)} dikalikan ${p.s4.k}. Hasilnya adalah ...`,
      ...place(p.s4.correct, p.s4.wrongs, 0),
      explanation: ["Mengalikan persamaan berarti mengalikan semua suku di kedua ruas, termasuk konstanta."],
    },
    {
      ...base(5, "hitung_eliminasi"),
      type: "number", topic: "m5", difficulty: "mudah", format: "langkah",
      prompt: "Jumlahkan kedua persamaan berikut untuk menghilangkan y. Berapakah konstanta di ruas kanan persamaan hasil penjumlahan?",
      context: [`(1)  ${formatEquation(p.s5.e1)}`, `(2)  ${formatEquation(p.s5.e2)}`],
      answer: String(p.s5.constant),
      explanation: ["Ruas kanan dijumlahkan seperti ruas kiri."],
      verify: solution(p.s5),
    },
    {
      ...base(6, "hitung_eliminasi"),
      type: "number", topic: "m5", difficulty: "sedang", format: "penyelesaian",
      prompt: `Tentukan nilai ${p.s6.ask} dari ${formatEquation(p.s6.e1)} dan ${formatEquation(p.s6.e2)}.`,
      answer: String(p.s6[p.s6.ask]),
      explanation: ["Samakan koefisien salah satu variabel, lalu kurangkan atau jumlahkan kedua persamaan."],
      verify: solution(p.s6),
    },
    {
      ...base(7, "selesaikan_sistem"),
      type: "pair", topic: "m5", difficulty: "sedang", format: "penyelesaian",
      prompt: `Tentukan penyelesaian dari ${formatEquation(p.s7.e1)} dan ${formatEquation(p.s7.e2)}.`,
      answer: `${p.s7.x},${p.s7.y}`,
      explanation: ["Koefisien salah satu variabel berlawanan: jumlahkan, hitung variabel pertama, lalu substitusi."],
      verify: solution(p.s7),
    },
    {
      ...base(8, "selesaikan_sistem"),
      type: "pair", topic: "m5", difficulty: "sulit", format: "penyelesaian",
      prompt: `Tentukan penyelesaian dari ${formatEquation(p.s8.e1)} dan ${formatEquation(p.s8.e2)}.`,
      answer: `${p.s8.x},${p.s8.y}`,
      explanation: ["Kalikan kedua persamaan agar koefisien satu variabel sama, eliminasi, lalu substitusi dengan hati-hati pada tanda."],
      verify: solution(p.s8),
    },
    {
      ...base(9, "periksa_solusi"),
      type: "tf", topic: "m6", difficulty: "mudah", format: "penyelesaian",
      prompt: `Pasangan (${p.s9.x}, ${p.s9.y}) adalah penyelesaian dari ${formatEquation(p.s9.e1)} dan ${formatEquation(p.s9.e2)}.`,
      answer: "true",
      explanation: ["Pasangan itu memenuhi kedua persamaan."],
      verify: { kind: "pairCheck", ...p.s9 },
    },
    {
      ...base(10, "periksa_solusi"),
      type: "tf", topic: "m6", difficulty: "sedang", format: "penyelesaian",
      prompt: `Pasangan (${p.s10.x}, ${p.s10.y}) adalah penyelesaian dari ${formatEquation(p.s10.e1)} dan ${formatEquation(p.s10.e2)}.`,
      answer: "false",
      explanation: ["Pasangan itu hanya memenuhi persamaan pertama; penyelesaian harus memenuhi kedua persamaan."],
      verify: { kind: "pairCheck", ...p.s10 },
    },
    {
      ...base(11, "representasi"),
      type: "mcq", topic: "m6", difficulty: "sedang", format: "konsep",
      prompt: `Garis ${formatEquation(p.s11.e1)} dan garis ${formatEquation(p.s11.e2)} berpotongan di titik (${p.s11.x}, ${p.s11.y}). Manakah pernyataan yang benar tentang titik (${p.s11.x}, ${p.s11.y})?`,
      ...place("Memenuhi kedua persamaan sekaligus", ["Hanya memenuhi persamaan pertama", "Hanya memenuhi persamaan kedua", "Tidak memenuhi persamaan mana pun"], 2),
      explanation: ["Titik potong berada di kedua garis, sehingga koordinatnya memenuhi kedua persamaan."],
      verify: solution(p.s11),
    },
    {
      ...base(12, "representasi"),
      type: "mcq", topic: "m4", difficulty: "sulit", format: "konsep",
      prompt: `Setelah mengeliminasi y, seorang siswa memperoleh x = ${p.s12.value < 0 ? `−${Math.abs(p.s12.value)}` : p.s12.value}. Pada grafik, persamaan itu digambarkan sebagai ...`,
      ...place("Garis tegak yang melewati titik potong kedua garis", ["Garis datar yang melewati titik potong kedua garis", "Sebuah titik tunggal pada sumbu-x", "Garis miring yang melewati titik asal"], 1),
      explanation: ["x = k dipenuhi semua titik dengan absis k: garis tegak. Karena nilai x penyelesaian adalah k, garis itu melewati titik potong."],
    },
  ];
}

const FORM_A = build({
  form: "A",
  s1: { e1: eq(6, 2, 22), e2: eq(4, 2, 14), x: 4, y: -1, wrongs: ["Dijumlahkan", "Dikalikan 2", "Dibagi 2"] },
  s2: { e1: eq(-3, 4, 5), e2: eq(3, 2, 7), x: 1, y: 2, wrongs: ["Dikurangkan", "Dikalikan 3", "Dibagi 3"] },
  s3: { e1: eq(4, 3, 17), e2: eq(6, 5, 27), x: 2, y: 3, multiplier: 3 },
  s4: { eq: eq(2, -1, 5), k: 4, correct: "8x − 4y = 20", wrongs: ["8x − 4y = 5", "8x − y = 20", "8x + 4y = 20"] },
  s5: { e1: eq(4, 3, 25), e2: eq(2, -3, -1), x: 4, y: 3, constant: 24 },
  s6: { e1: eq(3, 2, 16), e2: eq(5, 4, 30), x: 2, y: 5, ask: "x" },
  s7: { e1: eq(5, 2, 24), e2: eq(3, -2, 8), x: 4, y: 2 },
  s8: { e1: eq(2, 3, 3), e2: eq(5, -2, 17), x: 3, y: -1 },
  s9: { e1: eq(1, 2, 11), e2: eq(2, -1, 2), x: 3, y: 4 },
  s10: { e1: eq(2, 3, 11), e2: eq(1, -2, 1), x: 4, y: 1 },
  s11: { e1: eq(3, 1, 13), e2: eq(1, -1, 3), x: 4, y: 1 },
  s12: { value: 5 },
});

const FORM_B = build({
  form: "B",
  s1: { e1: eq(7, 3, 23), e2: eq(4, 3, 17), x: 2, y: 3, wrongs: ["Dijumlahkan", "Dikalikan 3", "Dibagi 3"] },
  s2: { e1: eq(-2, 3, -1), e2: eq(2, 5, 9), x: 2, y: 1, wrongs: ["Dikurangkan", "Dikalikan 2", "Dibagi 2"] },
  s3: { e1: eq(9, 4, 30), e2: eq(6, 7, 33), x: 2, y: 3, multiplier: 2 },
  s4: { eq: eq(3, 1, 4), k: 5, correct: "15x + 5y = 20", wrongs: ["15x + 5y = 4", "15x + y = 20", "15x − 5y = 20"] },
  s5: { e1: eq(5, 2, 22), e2: eq(3, -2, 10), x: 4, y: 1, constant: 32 },
  s6: { e1: eq(6, 5, 39), e2: eq(3, 4, 24), x: 4, y: 3, ask: "y" },
  s7: { e1: eq(4, 3, 29), e2: eq(2, -3, 1), x: 5, y: 3 },
  s8: { e1: eq(3, 2, 2), e2: eq(4, -3, -20), x: -2, y: 4 },
  s9: { e1: eq(1, 3, 11), e2: eq(3, -1, 13), x: 5, y: 2 },
  s10: { e1: eq(1, 2, 10), e2: eq(2, -3, 4), x: 6, y: 2 },
  s11: { e1: eq(2, 1, 14), e2: eq(1, -1, 1), x: 5, y: 4 },
  s12: { value: -3 },
});

export const ASSESSMENT_FORMS: Record<FormId, AssessmentItem[]> = { A: FORM_A, B: FORM_B };
export const ASSESSMENT_SKILL_ORDER = ASSESSMENT_SKILLS;
