import { coefficientOf, formatNumber, type Equation, type Variable } from "@/lib/math/spldv";
import type { CognitivePhase, Diagnosis, DiagnosisCode } from "./types";

/**
 * Katalog diagnosis. Setiap entri menyatakan POLA yang tampak pada jawaban (bukan vonis)
 * dan satu PERTANYAAN PENGARAH. Teks tidak boleh memuat jawaban akhir soal.
 * Pemetaan `phase` adalah interpretasi penerapan, bukan klaim buku (lihat types.ts).
 */
export interface DiagnosisContext {
  e1?: Equation;
  e2?: Equation;
  eliminate?: Variable;
  /** Untuk "sebagian_benar": variabel yang jawabannya sudah benar. */
  correctVar?: Variable;
  /** Untuk "tidak_cek_kedua_persamaan": nomor persamaan yang terpenuhi. */
  satisfiedEq?: 1 | 2;
}

interface Def {
  title: string;
  phase: CognitivePhase;
  observe: (c: DiagnosisContext) => string;
  ask: (c: DiagnosisContext) => string;
}

const coefText = (c: DiagnosisContext) => {
  if (!c.e1 || !c.e2 || !c.eliminate) return "";
  return ` (koefisien ${c.eliminate}: ${formatNumber(coefficientOf(c.e1, c.eliminate))} dan ${formatNumber(coefficientOf(c.e2, c.eliminate))})`;
};

export const DIAGNOSIS_CATALOG: Record<Exclude<DiagnosisCode, "opsi_khusus">, Def> = {
  lupa_kalikan_ruas_kanan: {
    title: "Ruas kanan belum ikut dikalikan",
    phase: "elaborasi",
    observe: () => "Jawabanmu cocok dengan pola ketika hanya ruas kiri persamaan yang dikalikan, sedangkan konstanta di ruas kanan tidak ikut.",
    ask: () => "Sebuah persamaan seperti sebuah timbangan seimbang. Jika x + y = 5 dikalikan 2, bagaimana bentuk lengkapnya? Terapkan cara itu pada persamaan di soalmu.",
  },
  tanda_pengurangan: {
    title: "Tanda saat mengurangkan",
    phase: "output",
    observe: () => "Jawabanmu cocok dengan pola ketika tanda suku yang dikurangkan tidak ikut dibalik (misalnya 5 − (−3) dihitung seperti 5 − 3).",
    ask: () => "Tulis pengurangannya dengan tanda kurung. Berapa hasil 5 − (−3)? Lalu periksa kembali bagian yang melibatkan bilangan negatif pada langkahmu.",
  },
  salah_operasi: {
    title: "Pilihan operasi",
    phase: "elaborasi",
    observe: (c) => `Jawabanmu cocok dengan pola ketika operasi yang dipakai (jumlah atau kurang) kebalikan dari yang membuat variabelnya hilang${coefText(c)}.`,
    ask: (c) => `Hitung hasil operasi yang kamu pilih pada koefisien ${c.eliminate ?? "variabel itu"}. Apakah variabel itu benar-benar hilang (menjadi 0)? Jika belum, coba operasi yang lain.`,
  },
  tidak_samakan_koefisien: {
    title: "Koefisien belum disamakan",
    phase: "elaborasi",
    observe: () => "Jawabanmu cocok dengan pola ketika kedua persamaan langsung dijumlahkan atau dikurangkan tanpa menyamakan koefisien lebih dulu.",
    ask: () => "Setelah dijumlahkan atau dikurangkan, apakah salah satu variabel benar-benar hilang? Apa yang perlu dilakukan lebih dulu agar variabel itu hilang?",
  },
  variabel_tertukar: {
    title: "Urutan x dan y",
    phase: "output",
    observe: () => "Nilai-nilai yang kamu tulis cocok dengan pola ketika posisi x dan y tertukar.",
    ask: () => "Pasangan ditulis (x, y), nilai x lebih dulu. Dari perhitunganmu, mana nilai x dan mana nilai y? Periksa dengan memasukkannya ke persamaan.",
  },
  variabel_lain: {
    title: "Variabel yang ditanyakan",
    phase: "input",
    observe: () => "Jawabanmu cocok dengan nilai variabel yang lain, bukan variabel yang ditanyakan soal.",
    ask: () => "Baca kembali pertanyaannya: variabel apa yang diminta? Dari langkahmu, nilai mana milik variabel itu?",
  },
  tanda_hasil: {
    title: "Tanda hasil",
    phase: "output",
    observe: () => "Jawabanmu cocok dengan pola salah tanda pada langkah terakhir (positif dan negatif tertukar).",
    ask: () => "Periksa langkah terakhirmu: ketika kedua ruas dibagi atau dikali bilangan negatif, apa yang terjadi pada tandanya? Uji hasilmu dengan memasukkannya ke persamaan awal.",
  },
  sebagian_benar: {
    title: "Sebagian jawabanmu sudah tepat",
    phase: "output",
    observe: (c) => `Sebagian jawabanmu sudah tepat: nilai ${c.correctVar ?? "salah satu variabel"} cocok dengan perhitungan yang benar.`,
    ask: (c) => `Dengan nilai ${c.correctVar ?? "yang sudah tepat"} itu, bagaimana kamu mencari variabel satunya? Substitusikan ke salah satu persamaan awal, lalu uji pasangannya di persamaan yang lain.`,
  },
  pengali_bukan_terkecil: {
    title: "Pengali belum yang terkecil",
    phase: "elaborasi",
    observe: () => "Pengali yang kamu pilih memang membuat koefisien kedua persamaan sama besar, tetapi bukan pengali yang terkecil.",
    ask: () => "Bilangan terkecil berapa yang merupakan kelipatan kedua koefisien itu (KPK)? Bagaimana KPK itu dipakai untuk memperoleh pengali persamaan yang ditanyakan?",
  },
  kpk_bukan_pengali: {
    title: "KPK bukan pengali",
    phase: "elaborasi",
    observe: () => "Jawabanmu sama dengan KPK dari kedua koefisien. Menemukan KPK adalah langkah yang tepat, tetapi yang ditanyakan adalah pengali untuk persamaan.",
    ask: () => "Agar koefisien persamaan itu menjadi sama dengan KPK, ia harus dikalikan dengan bilangan berapa? (KPK dibagi koefisien persamaan itu.)",
  },
  pengali_tertukar: {
    title: "Pengali persamaan lain",
    phase: "elaborasi",
    observe: () => "Jawabanmu cocok dengan pengali untuk persamaan yang lain, bukan persamaan yang ditanyakan.",
    ask: () => "Pengali tiap persamaan = KPK dibagi koefisien persamaan itu sendiri. Berapa hasilnya khusus untuk persamaan yang ditanyakan?",
  },
  tambah_bukan_kali: {
    title: "Menambah, bukan mengalikan",
    phase: "elaborasi",
    observe: () => "Jawabanmu cocok dengan pola ketika konstanta ditambah dengan pengali, bukan dikalikan.",
    ask: () => "Mengalikan persamaan dengan k berarti setiap suku dikalikan k. Jika persamaan x = 5 dikalikan 3, berapa ruas kanannya?",
  },
  tidak_cek_kedua_persamaan: {
    title: "Kedua persamaan harus terpenuhi",
    phase: "input",
    observe: (c) =>
      c.satisfiedEq
        ? `Pasangan itu hanya memenuhi persamaan (${c.satisfiedEq}). Penyelesaian SPLDV harus memenuhi kedua persamaan sekaligus.`
        : "Penyelesaian SPLDV harus memenuhi kedua persamaan sekaligus, bukan salah satunya.",
    ask: () => "Substitusikan pasangan itu ke persamaan yang belum kamu uji. Apakah ruas kirinya sama dengan ruas kanannya?",
  },
  kalikan_tidak_perlu: {
    title: "Koefisien sudah sama besar",
    phase: "elaborasi",
    observe: (c) => `Kamu memilih mengalikan lebih dulu, padahal koefisien variabel yang dihilangkan sudah sama besar${coefText(c)}.`,
    ask: () => "Bandingkan besar koefisien variabel itu pada kedua persamaan. Apakah masih perlu disamakan? Jika tidak, langkah apa yang tersisa?",
  },
  operasi_bukan_eliminasi: {
    title: "Operasi yang menghilangkan variabel",
    phase: "elaborasi",
    observe: () => "Operasi yang kamu pilih tidak menghilangkan variabel. Eliminasi dilakukan dengan menjumlahkan atau mengurangkan kedua persamaan.",
    ask: () => "Operasi apa antara dua persamaan yang bisa membuat koefisien suatu variabel menjadi 0?",
  },
  kira_tidak_bisa_dieliminasi: {
    title: "Variabel itu dapat dieliminasi",
    phase: "elaborasi",
    observe: (c) => `Kamu memilih bahwa variabel itu tidak bisa dihilangkan${coefText(c)}.`,
    ask: () => "Lihat koefisien variabel itu pada kedua persamaan. Sudah samakah besarnya? Jika sudah, operasi apa yang membuatnya menjadi 0?",
  },
};

export function buildDiagnosis(code: Exclude<DiagnosisCode, "opsi_khusus">, ctx: DiagnosisContext): Diagnosis {
  const def = DIAGNOSIS_CATALOG[code];
  return { code, phase: def.phase, title: def.title, observe: def.observe(ctx), ask: def.ask(ctx) };
}

export function customDiagnosis(observe: string, ask: string, phase: CognitivePhase = "elaborasi"): Diagnosis {
  return { code: "opsi_khusus", phase, title: "Pengamatan pada pilihanmu", observe, ask };
}
