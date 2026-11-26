import "server-only";
import type { CheckedStage, StageInput, SupportLevel } from "@/lib/asisten/types";
import { finalValue, type Eq, type Problem } from "./problems";

/**
 * Pemeriksaan jawaban dengan ATURAN MATEMATIKA (bukan AI), sehingga benar/salah selalu konsisten.
 * Pesan diagnosis menunjuk jenis kekeliruan tanpa menyebut jawaban.
 */
export interface Verdict {
  correct: boolean;
  feedback: string;
  note?: string;
}

const parseNum = (s: string): number => {
  const t = s.trim().replace(",", ".").replace(/[−–]/g, "-");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Persamaan setara bila seluruh koefisien dan konstanta sebanding (garis yang sama). */
function sameEq(u: Eq, v: Eq): boolean {
  if (u.a === 0 && u.b === 0) return false;
  return near(u.a * v.b, u.b * v.a) && near(u.a * v.c, u.c * v.a) && near(u.b * v.c, u.c * v.b);
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** Beban menyamakan koefisien variabel: hasil kali kedua pengali. */
export function multiplierCost(p: Problem, v: "x" | "y"): number {
  const [m, n] = v === "x" ? [p.eq1.a, p.eq2.a] : [p.eq1.b, p.eq2.b];
  const g = gcd(m, n);
  return Math.abs((m / g) * (n / g));
}

const term = (coef: number, v: string) => `${coef === 1 ? "" : coef}${v}`;
export const formatEq = (e: Eq) => `${term(e.a, "x")} + ${term(e.b, "y")} = ${e.c}`;

export function checkStage(p: Problem, input: StageInput): Verdict {
  switch (input.stage) {
    case "pahami": {
      const wrong: string[] = [];
      if (input.x !== p.correct.x) wrong.push("arti x");
      if (input.y !== p.correct.y) wrong.push("arti y");
      if (input.ask !== p.correct.ask) wrong.push("hal yang ditanyakan");
      if (!wrong.length) return { correct: true, feedback: "Tepat. Kamu sudah memisahkan yang belum diketahui dari yang ditanyakan.", note: `x = ${p.names.x}; y = ${p.names.y}.` };
      return { correct: false, feedback: `Periksa lagi: ${wrong.join(", ")}.` };
    }
    case "model": {
      const n = input.eq.map(parseNum);
      if (n.some(Number.isNaN)) return { correct: false, feedback: "Isi keenam kotak dengan angka." };
      const u: Eq = { a: n[0], b: n[1], c: n[2] };
      const v: Eq = { a: n[3], b: n[4], c: n[5] };
      if ((sameEq(u, p.eq1) && sameEq(v, p.eq2)) || (sameEq(u, p.eq2) && sameEq(v, p.eq1))) {
        return { correct: true, feedback: "Model matematikamu sesuai dengan cerita.", note: `(1) ${formatEq(p.eq1)}; (2) ${formatEq(p.eq2)}.` };
      }
      const swapped = (e: Eq) => ({ a: e.b, b: e.a, c: e.c });
      if ([u, v].some((e) => sameEq(swapped(e), p.eq1) || sameEq(swapped(e), p.eq2))) {
        return { correct: false, feedback: "Koefisien x dan y tampaknya tertukar. Cocokkan lagi dengan arti x dan y di Catatan kerja." };
      }
      if (sameEq(u, v)) return { correct: false, feedback: "Kedua persamaanmu menyatakan hal yang sama. Cerita ini punya dua kejadian berbeda." };
      const okCount = [u, v].filter((e) => sameEq(e, p.eq1) || sameEq(e, p.eq2)).length;
      if (okCount === 1) return { correct: false, feedback: "Satu persamaan sudah tepat. Periksa persamaan yang satunya." };
      return { correct: false, feedback: "Belum sesuai. Ambil satu kejadian dalam cerita: berapa banyak benda pertama, berapa benda kedua, dan berapa totalnya?" };
    }
    case "rencana": {
      const v = input.variable;
      const other = v === "x" ? "y" : "x";
      const [m, n] = v === "x" ? [p.eq1.a, p.eq2.a] : [p.eq1.b, p.eq2.b];
      const expected = Math.sign(m) === Math.sign(n) ? "kurang" : "tambah";
      if (input.operation !== expected) return { correct: false, feedback: `Perhatikan tanda koefisien ${v} pada kedua persamaan. Operasi mana yang membuat suku ${v} menjadi nol?` };
      if (input.reason === "urutan") return { correct: false, feedback: "Urutan huruf bukan alasan matematis. Bandingkan koefisien kedua variabel." };
      if (input.reason === "sama" && Math.abs(m) !== Math.abs(n)) return { correct: false, feedback: `Koefisien ${v} pada kedua persamaan belum sama besar. Pilih alasan yang sesuai.` };
      if (input.reason === "kecil" && multiplierCost(p, v) > multiplierCost(p, other)) return { correct: false, feedback: `Bandingkan pengali untuk x dan y: apakah benar pengali untuk ${v} lebih kecil?` };
      return { correct: true, feedback: "Rencanamu masuk akal dan alasannya sesuai.", note: `Rencana: eliminasi ${v} dengan operasi ${expected}.` };
    }
    case "selesaikan": {
      const x = parseNum(input.x);
      const y = parseNum(input.y);
      if (Number.isNaN(x) || Number.isNaN(y)) return { correct: false, feedback: "Isi nilai x dan y dengan angka." };
      if (near(x, p.solution.x) && near(y, p.solution.y)) return { correct: true, feedback: "Pasanganmu memenuhi kedua persamaan.", note: `x = ${x}; y = ${y}.` };
      if (near(x, p.solution.y) && near(y, p.solution.x)) return { correct: false, feedback: "Nilai x dan y tampaknya tertukar. Substitusikan ke persamaan (1) untuk memeriksanya." };
      const s1 = near(p.eq1.a * x + p.eq1.b * y, p.eq1.c);
      const s2 = near(p.eq2.a * x + p.eq2.b * y, p.eq2.c);
      if (s1 !== s2) return { correct: false, feedback: `Pasanganmu memenuhi persamaan (${s1 ? 1 : 2}) tetapi belum persamaan (${s1 ? 2 : 1}). Penyelesaian harus memenuhi keduanya.` };
      if (near(x, p.solution.x)) return { correct: false, feedback: "Nilai x sudah tepat. Periksa langkah substitusi saat mencari y." };
      if (near(y, p.solution.y)) return { correct: false, feedback: "Nilai y sudah tepat. Periksa langkah mencari x." };
      return { correct: false, feedback: "Pasangan itu belum memenuhi persamaan. Telusuri lagi: perkalian, penjumlahan atau pengurangan, lalu pembagian." };
    }
    case "tafsirkan": {
      const val = parseNum(input.value);
      if (Number.isNaN(val)) return { correct: false, feedback: "Isi dengan angka (dalam ribu rupiah)." };
      const f = finalValue(p);
      if (near(val, f)) return { correct: true, feedback: "Tepat. Hasil perhitunganmu sudah dikembalikan ke konteks cerita.", note: `Jawaban cerita: Rp${f}.000.` };
      if (near(val, f * 1000)) return { correct: false, feedback: "Perhatikan satuannya: jawaban diminta dalam ribu rupiah." };
      if (near(val, p.solution.x) || near(val, p.solution.y)) return { correct: false, feedback: "Itu nilai salah satu variabel. Baca lagi pertanyaan ceritanya: apa yang diminta?" };
      return { correct: false, feedback: "Belum sesuai. Gunakan nilai x dan y sesuai banyaknya benda pada pertanyaan." };
    }
  }
}

/** Petunjuk tetap per tingkat bantuan; tingkat 3 memakai contoh dengan angka BERBEDA dari soal. */
export const HINTS: Record<CheckedStage, Record<SupportLevel, string>> = {
  pahami: {
    1: "Apa yang tidak diberi tahu angkanya dalam cerita? Itu calon x dan y.",
    2: "Variabel menyatakan nilai satu benda yang belum diketahui, bukan banyaknya (banyaknya sudah tertulis). Pertanyaan akhir ada di kalimat tanya.",
    3: "Contoh lain: \"4 buku dan 3 pensil seharga Rp30.000\". Banyaknya (4 dan 3) sudah diketahui, jadi x = harga 1 buku dan y = harga 1 pensil.",
  },
  model: {
    1: "Satu kejadian pembelian menjadi satu persamaan. Angka mana yang mengalikan x?",
    2: "Pola: (banyak benda pertama)x + (banyak benda kedua)y = total dalam ribuan. Buat satu untuk kejadian pertama, satu untuk kedua.",
    3: "Contoh lain: 4 buku dan 3 pensil Rp30.000 menjadi 4x + 3y = 30. Isi kotak: 4, 3, 30.",
  },
  rencana: {
    1: "Variabel mana yang paling mudah dibuat sama besar koefisiennya?",
    2: "Bandingkan koefisien x, lalu koefisien y. Jika tandanya sama, kurangkan; jika berlawanan, jumlahkan. Alasan \"sudah sama\" hanya berlaku bila angkanya memang sama.",
    3: "Contoh lain: pada 4x + 3y = 30 dan x + 3y = 12, koefisien y sudah sama dan bertanda sama, jadi y dieliminasi dengan pengurangan.",
  },
  selesaikan: {
    1: "Setelah satu variabel hilang, persamaan apa yang tersisa?",
    2: "Samakan koefisien, lakukan operasi pada KEDUA ruas, selesaikan satu variabel, lalu substitusikan ke persamaan awal.",
    3: "Contoh lain: 4x + 3y = 30 dan x + 3y = 12. Dikurangkan: 3x = 18, x = 6. Substitusi: 6 + 3y = 12, y = 2.",
  },
  tafsirkan: {
    1: "Apa tepatnya yang ditanyakan cerita? Apakah satu variabel saja?",
    2: "Kalikan nilai x dan y dengan banyaknya benda pada pertanyaan, lalu jumlahkan. Tulis dalam ribuan.",
    3: "Contoh lain: bila x = 6 dan y = 2, biaya 2 buku dan 5 pensil = 2·6 + 5·2 = 22 ribu rupiah.",
  },
};

/** Menolak bimbingan AI yang menyebut jawaban tahap ini atau jawaban akhir. */
export function leaksAnswer(p: Problem, stage: CheckedStage, text: string): boolean {
  const t = text.toLowerCase().replace(/[−–]/g, "-").replace(/[\s.]*000\b/g, "000").replace(/\s+/g, " ");
  const compact = t.replace(/\s+/g, "");
  const f = finalValue(p);
  const has = (re: RegExp) => re.test(t);
  if (has(new RegExp(`\\bx\\s*(=|adalah|bernilai)\\s*(rp\\s*)?${p.solution.x}(000)?\\b`))) return true;
  if (has(new RegExp(`\\by\\s*(=|adalah|bernilai)\\s*(rp\\s*)?${p.solution.y}(000)?\\b`))) return true;
  if (has(new RegExp(`(?<![\\d.,])${f}(?![\\d])`)) || compact.includes(`${f}000`)) return true;
  if (stage === "model") {
    return [p.eq1, p.eq2].some((e) => compact.includes(formatEq(e).replace(/\s+/g, "")));
  }
  return false;
}
