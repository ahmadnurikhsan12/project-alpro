import { lcm } from "@/lib/math/fraction";
import { coefficientOf, formatEquation, formatNumber, planElimination, scaleEquation, type Variable } from "@/lib/math/spldv";
import type { Question } from "@/lib/questions/types";
import { workedExampleFor } from "./examples";
import { leaksAnswer } from "./leak";
import { isTutorable, resolveMediation, type Resolved } from "./resolve";
import type { HintLevel, HintStep, SkillCode } from "./types";

/**
 * TANGGA PETUNJUK (graduated hints) — empat tingkat, dibuka satu per satu oleh siswa:
 *   L1 pertanyaan pengarah → L2 petunjuk strategi → L3 petunjuk langkah parsial
 *   → L4 contoh penyelesaian pada sistem serupa dengan angka berbeda.
 *
 * Jawaban akhir soal TIDAK PERNAH dimuat. Setiap teks L1–L3 diperiksa oleh pengaman
 * kebocoran; jika ada yang bocor, diganti teks umum keterampilan yang tidak memuat angka.
 */
export const LEVEL_META: Record<HintLevel, { title: string; purpose: string }> = {
  1: { title: "Pertanyaan pengarah", purpose: "Tujuan: memusatkan perhatianmu pada bagian soal yang penting." },
  2: { title: "Petunjuk strategi", purpose: "Tujuan: membantumu memilih cara yang tepat." },
  3: { title: "Petunjuk langkah", purpose: "Tujuan: mengerjakan satu langkah bersama — bukan seluruh soal." },
  4: { title: "Contoh serupa", purpose: "Tujuan: melihat cara yang sama pada angka berbeda, lalu kembali ke soalmu." },
};

const DEFAULT_L1: Record<SkillCode, string> = {
  pilih_operasi: "Lihat koefisien variabel yang ingin dihilangkan pada persamaan (1) dan (2). Apakah tandanya sama atau berlawanan?",
  samakan_koefisien: "Berapa koefisien variabel yang dihilangkan pada tiap persamaan? Bilangan apa yang merupakan kelipatan dari keduanya?",
  hitung_eliminasi: "Setelah operasi dilakukan, variabel mana yang hilang dan variabel mana yang tersisa? Apa yang kamu cari lebih dulu?",
  substitusi: "Satu variabel sudah diketahui. Apa yang belum diketahui, dan persamaan awal mana yang bisa dipakai untuk mencarinya?",
  periksa_solusi: "Sebuah pasangan nilai disebut penyelesaian SPLDV jika memenuhi persamaan yang mana saja?",
  ruas_kanan: "Ketika sebuah persamaan dikalikan sebuah bilangan, suku mana saja yang ikut dikalikan?",
  tanda: "Apa arti tanda minus di depan tanda kurung? Apa yang terjadi jika kamu mengurangkan sebuah bilangan negatif?",
  konsep: "Baca soal sekali lagi: apa yang diketahui dan apa yang ditanyakan?",
};

export const DEFAULT_L2: Record<SkillCode, string> = {
  pilih_operasi: "Variabel hilang jika koefisiennya menjadi 0. Ada dua cara membuat 0: a − a, atau a + (−a).",
  samakan_koefisien: "Gunakan KPK (kelipatan persekutuan terkecil) dari kedua koefisien, lalu bagi KPK dengan koefisien tiap persamaan untuk mendapatkan pengalinya.",
  hitung_eliminasi: "Samakan koefisien salah satu variabel, lalu jumlahkan atau kurangkan kedua persamaan pada ruas kiri DAN ruas kanan.",
  substitusi: "Ganti variabel yang sudah diketahui dengan nilainya pada salah satu persamaan awal, lalu selesaikan persamaan satu variabel yang tersisa.",
  periksa_solusi: "Substitusikan pasangan itu ke kedua persamaan, hitung ruas kirinya, lalu bandingkan dengan ruas kanan masing-masing.",
  ruas_kanan: "Mengalikan persamaan berarti mengalikan semua suku di kedua ruas dengan bilangan yang sama.",
  tanda: "Mengurangkan bilangan negatif sama dengan menjumlahkan lawannya.",
  konsep: "Tulis informasi penting dalam kata-katamu sendiri, lalu tentukan satu langkah pertama yang bisa kamu lakukan.",
};

export const DEFAULT_L3: Record<SkillCode, string> = {
  pilih_operasi: "Hitung hasil menjumlahkan dan hasil mengurangkan koefisien variabel itu. Operasi mana yang menghasilkan 0?",
  samakan_koefisien: "Tulis kelipatan tiap koefisien secara berurutan, lalu cari bilangan pertama yang muncul di kedua daftar.",
  hitung_eliminasi: "Kerjakan satu langkah dulu: tentukan variabel yang dieliminasi, lalu tuliskan pengali untuk tiap persamaan.",
  substitusi: "Pilih salah satu persamaan awal, ganti variabel yang sudah diketahui dengan nilainya, lalu hitung variabel satunya.",
  periksa_solusi: "Tulis ruas kiri persamaan (1) dengan nilai yang sudah dimasukkan, hitung hasilnya, lalu lakukan hal yang sama untuk persamaan (2).",
  ruas_kanan: "Tulis ulang persamaan suku demi suku setelah dikalikan, termasuk konstanta di ruas kanan.",
  tanda: "Tulis ulang soal tanpa tanda kurung dengan memakai aturan tanda, lalu hitung koefisiennya.",
  konsep: "Coba kerjakan sebagian kecil soal ini lebih dulu, lalu periksa apakah hasilnya masuk akal.",
};

const wrap = (n: number) => (n < 0 ? `(${formatNumber(n)})` : formatNumber(n));
const opWord = (op: "add" | "subtract") => (op === "add" ? "jumlahkan" : "kurangkan");

/** L3 otomatis dari mesin matematika; mengembalikan null jika tidak ada bentuk yang sesuai. */
function generatedL3(r: Resolved): string | null {
  const sys = r.system;
  const t = r.target;
  const elim: Variable | undefined = (t && "eliminate" in t ? t.eliminate : undefined) ?? r.eliminate;

  if (r.skill === "pilih_operasi" && sys && elim) {
    const c1 = coefficientOf(sys.e1, elim);
    const c2 = coefficientOf(sys.e2, elim);
    return `Koefisien ${elim}: ${formatNumber(c1)} dan ${formatNumber(c2)}. Hitung ${formatNumber(c1)} + ${wrap(c2)} dan ${formatNumber(c1)} − ${wrap(c2)}. Mana yang hasilnya 0?`;
  }
  if (t?.kind === "multiplier" && sys) {
    const p = planElimination(sys.e1, sys.e2, t.eliminate);
    if (!p) return null;
    return `KPK dari ${Math.abs(p.coef1)} dan ${Math.abs(p.coef2)} adalah ${lcm(Math.abs(p.coef1), Math.abs(p.coef2))}. Pengali sebuah persamaan = KPK dibagi koefisien persamaan itu.`;
  }
  if (t?.kind === "combined_const" && sys) {
    const p = planElimination(sys.e1, sys.e2, t.eliminate);
    if (!p) return null;
    return `Lakukan operasi yang sama pada ruas kanan: ${opWord(p.operation)} ${formatNumber(sys.e1.c * p.m1)} dan ${formatNumber(sys.e2.c * p.m2)}.`;
  }
  if ((t?.kind === "pair" || t?.kind === "var") && sys && elim) {
    const p = planElimination(sys.e1, sys.e2, elim);
    if (!p) return null;
    const scaled = p.m1 !== 1 || p.m2 !== 1;
    return scaled
      ? `Kalikan (1) dengan ${p.m1} dan (2) dengan ${p.m2}: ${formatEquation(scaleEquation(sys.e1, p.m1))} dan ${formatEquation(scaleEquation(sys.e2, p.m2))}. Lalu ${opWord(p.operation)} kedua persamaan untuk menghilangkan ${elim}.`
      : `Koefisien ${elim} sudah sama besar, jadi tidak perlu dikalikan. ${opWord(p.operation)[0].toUpperCase()}${opWord(p.operation).slice(1)} kedua persamaan untuk menghilangkan ${elim}.`;
  }
  if (r.skill === "periksa_solusi" && sys && r.pair) {
    const f = (e: typeof sys.e1) => {
      const part = (coef: number, val: number, first: boolean) => `${first ? (coef < 0 ? "−" : "") : coef < 0 ? " − " : " + "}${Math.abs(coef) === 1 ? "" : Math.abs(coef)}(${formatNumber(val)})`;
      return `${part(e.a, r.pair!.x, true)}${part(e.b, r.pair!.y, false)}`;
    };
    return `Hitung dulu: persamaan (1): ${f(sys.e1)} = …  dan persamaan (2): ${f(sys.e2)} = …  Bandingkan masing-masing dengan ruas kanannya.`;
  }
  return null;
}

/**
 * Membangun tangga petunjuk untuk satu soal Latihan/Mini Quiz. Untuk soal di luar
 * Latihan/Mini Quiz (mis. Evaluasi Akhir) hasilnya kosong — tutor tidak berlaku di sana.
 */
export function buildLadder(q: Question): HintStep[] {
  if (!isTutorable(q.id)) return [];
  const r = resolveMediation(q);
  const med = r.authored;
  // Kandidat dicoba berurutan; yang pertama lolos pengaman kebocoran dipakai, selebihnya teks umum.
  const firstSafe = (candidates: (string | undefined | null)[], fallback: string) =>
    candidates.find((t): t is string => !!t && !leaksAnswer(q, t)) ?? fallback;

  const l1 = firstSafe([med?.ladder?.[1]], DEFAULT_L1[r.skill]);
  const l2 = firstSafe([med?.ladder?.[2], q.hints?.[0]], DEFAULT_L2[r.skill]);
  // petunjuk tulisan tangan berurutan (L2 lalu L3) dijaga searah; yang otomatis hanya mengisi kekosongan
  const l3 = firstSafe([med?.ladder?.[3], q.hints?.[1], generatedL3(r)], DEFAULT_L3[r.skill]);

  const steps: HintStep[] = [
    { level: 1, ...LEVEL_META[1], text: l1 },
    { level: 2, ...LEVEL_META[2], text: l2 },
    { level: 3, ...LEVEL_META[3], text: l3 },
  ];
  const example = workedExampleFor(r);
  if (example) steps.push({ level: 4, ...LEVEL_META[4], text: "Perhatikan cara penyelesaian pada soal lain berikut, lalu terapkan pada soalmu.", example });
  return steps;
}
