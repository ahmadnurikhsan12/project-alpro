import { gradeAnswer } from "@/lib/questions/grade";
import type { Question } from "@/lib/questions/types";
import { ATTEMPT_RULES } from "@/lib/progress/gamification";
import { diagnose } from "./diagnose";
import type { MediationResult } from "./types";

export interface MediationInput {
  /** Semua jawaban yang sudah diperiksa pada soal ini (urut), termasuk yang terakhir. */
  attempts: string[];
  /** Banyak petunjuk bertingkat yang sudah dibuka (0–4). */
  hints: number;
}

/**
 * Menanggapi jawaban terakhir siswa: benar → selesai; salah → beri kesempatan berpikir
 * lagi (dengan diagnosis bila polanya dikenali dan petunjuk bertingkat) sampai batas
 * percobaan untuk tipe soal itu habis. Fungsi murni.
 *
 * Aturan penting: SATU kesalahan tidak langsung membuka jawaban. Pengecualian yang disengaja
 * hanya soal Benar/Salah (satu percobaan menurut kebijakan XP): pembahasan lengkap tetap
 * ditahan di balik tombol agar siswa lebih dulu membaca pertanyaan pengarah.
 */
export function mediate(q: Question, input: MediationInput): MediationResult {
  const limit = ATTEMPT_RULES.limitsPerSession[q.type];
  const attempts = input.attempts.slice(0, limit);
  const attemptNo = attempts.length;
  const last = attempts[attemptNo - 1];
  const solved = last !== undefined && gradeAnswer(q, last);

  if (solved) {
    return {
      status: "correct",
      attemptNo,
      limit,
      remaining: 0,
      identified: false,
      diagnoses: [],
      message: attemptNo === 1 ? "Benar! Kerja bagus." : `Benar! Kamu menemukannya pada percobaan ke-${attemptNo}.`,
      gate: false,
      revealExplanation: true,
      giveUpAllowed: false,
    };
  }

  const wrong = last === undefined ? { identified: false, diagnoses: [] } : diagnose(q, last);
  const exhausted = attemptNo >= limit;
  const remaining = Math.max(0, limit - attemptNo);

  if (exhausted) {
    const isTf = q.type === "tf";
    return {
      status: "exhausted",
      attemptNo,
      limit,
      remaining: 0,
      identified: wrong.identified,
      diagnoses: wrong.diagnoses,
      message: isTf ? "Belum tepat." : "Kesempatan untuk soal ini sudah habis. Pelajari pembahasannya, lalu coba soal ini lagi di lain waktu.",
      gate: false,
      revealExplanation: !isTf,
      giveUpAllowed: false,
    };
  }

  let nudge: string | undefined;
  if (attemptNo >= 2 && input.hints === 0) nudge = "Kamu belum membuka petunjuk. Petunjuk 1 hanya berupa pertanyaan pengarah — tidak memberi jawaban.";
  else if (input.hints >= 2) nudge = "Kamu sudah membuka petunjuk strategi. Coba terapkan pada satu langkah dulu, lalu periksa hasilnya.";

  return {
    status: "retry",
    attemptNo,
    limit,
    remaining,
    identified: wrong.identified,
    diagnoses: wrong.diagnoses,
    message: `Belum tepat. Percobaan ${attemptNo} dari ${limit}; kamu masih punya ${remaining} kesempatan untuk memperbaikinya.`,
    nudge,
    gate: q.type === "mcq",
    revealExplanation: false,
    giveUpAllowed: q.type !== "tf" && attemptNo >= 2,
  };
}
