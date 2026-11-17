import { LESSON_BY_ID } from "@/content/lessons";
import { PRACTICE_BY_ID } from "@/content/practice";
import { ASSESSMENT_SKILLS } from "@/lib/assessment/blueprint";
import { gradeEvent } from "@/lib/progress/grading";
import type { GradedEvent, ProgressState, RawEvent } from "@/lib/progress/types";
import { isLearningEvent } from "@/lib/storage/guest-data";
import type { Question } from "@/lib/questions/types";
import { parseCsv, toCsv, type Cell, type Delimiter } from "./csv";
import type { ResearchData } from "./store";

/**
 * EKSPOR DATA UJI COBA — dibangun sepenuhnya di browser dari data lokal (tanpa login, API, atau biaya).
 *
 * PRIVASI: hanya kode peserta anonim, kode kelompok opsional, dan ID perangkat acak. TIDAK mengekspor nama
 * panggilan, email, atau teks bebas (refleksi hanya pilihan/skala).
 *
 * PENGGABUNGAN: setiap tabel memuat `kode_peserta`, `id_perangkat`, dan ID unik baris (`id_event`/`id_rekaman`),
 * sehingga berkas dari banyak perangkat dapat digabung (disambung/ditempel) lalu dihapus duplikatnya berdasarkan kunci.
 */
export const FORMAT_VERSION = 1;

export interface TableSpec {
  name: string;
  file: string;
  title: string;
  header: string[];
  /** Kolom yang bersama-sama unik per baris (dipakai untuk menghapus duplikat saat menggabungkan). */
  key: string[];
}

const ID = ["kode_peserta", "id_perangkat"];
const PRE_POST_SKILL = ASSESSMENT_SKILLS.flatMap((s) => [`pre_${s}`, `post_${s}`]);

export const TABLE_SPECS: TableSpec[] = [
  {
    name: "ringkasan_peserta",
    file: "1_ringkasan_peserta.csv",
    title: "Ringkasan per peserta",
    header: [
      ...ID, "kelompok",
      "formulir_pretest", "skor_pretest", "benar_pretest", "durasi_pretest_detik", "waktu_pretest",
      "formulir_posttest", "skor_posttest", "benar_posttest", "durasi_posttest_detik", "waktu_posttest",
      "selisih_skor", ...PRE_POST_SKILL,
      "sesi_latihan", "soal_latihan_dikerjakan", "total_percobaan", "total_petunjuk", "soal_mandiri",
      "refleksi_terisi", "refleksi_dilewati",
      "lab_eksplorasi", "lab_ubah_rencana_maks", "lab_prediksi_benar", "lab_prediksi_total", "game_prediksi_benar", "game_prediksi_total",
      "evaluasi_akhir_terbaik", "xp", "jumlah_event", "mendekati_batas", "diekspor_pada",
    ],
    key: ID,
  },
  {
    name: "asesmen_butir",
    file: "2_asesmen_butir.csv",
    title: "Pretest/posttest per butir",
    header: [...ID, "id_rekaman", "jenis", "formulir", "nomor_butir", "id_butir", "kompetensi", "tingkat", "tipe", "jawaban", "benar", "dijawab", "skor_total", "durasi_total_detik", "waktu_selesai"],
    key: ["id_rekaman", "id_butir"],
  },
  {
    name: "latihan_butir",
    file: "3_latihan_butir.csv",
    title: "Latihan dan mini quiz per soal",
    header: [...ID, "id_event", "waktu", "sumber", "modul", "id_soal", "tingkat", "tipe", "jumlah_percobaan", "benar_pada_percobaan_ke", "petunjuk_dibuka", "mandiri", "jawaban_terakhir"],
    key: ["id_event", "id_soal"],
  },
  {
    name: "aktivitas",
    file: "4_aktivitas.csv",
    title: "Semua aktivitas belajar",
    header: [...ID, "id_event", "waktu", "jenis", "rujukan", "skor", "benar", "total", "durasi_detik"],
    key: ["id_event"],
  },
  {
    name: "metrik_proses",
    file: "5_metrik_proses.csv",
    title: "Metrik Learning Activity, prediksi, dan perubahan rencana",
    header: [...ID, "id_event", "waktu", "sumber", "rujukan", "metrik", "nilai"],
    key: ["id_event", "metrik"],
  },
  {
    name: "refleksi",
    file: "6_refleksi.csv",
    title: "Jawaban refleksi",
    header: [...ID, "id_event", "waktu", "konteks", "rujukan", "id_pertanyaan", "jawaban", "dilewati"],
    key: ["id_event", "id_pertanyaan"],
  },
  {
    name: "info_ekspor",
    file: "0_info_ekspor.csv",
    title: "Informasi ekspor dan keterbatasan data",
    header: [...ID, "kunci", "nilai"],
    key: [...ID, "kunci"],
  },
];
export const SPEC_BY_NAME = Object.fromEntries(TABLE_SPECS.map((t) => [t.name, t])) as Record<string, TableSpec>;

export interface ExportInput {
  research: ResearchData;
  events: RawEvent[];
  state: ProgressState;
  maxEvents: number;
  now: string;
}
export type Tables = Record<string, Cell[][]>;

const bool = (b: boolean) => (b ? 1 : 0);

function questionOf(ev: RawEvent, id: string): Question | undefined {
  if (ev.type === "lesson_quiz") return LESSON_BY_ID[ev.lessonId]?.quiz.find((q) => q.id === id);
  return PRACTICE_BY_ID[id];
}

function lastAnswer(ev: RawEvent, id: string): string {
  if (ev.type !== "practice" && ev.type !== "lesson_quiz") return "";
  const attempts = ev.responses?.[id]?.attempts;
  return (attempts?.length ? attempts[attempts.length - 1] : ev.answers[id]) ?? "";
}

export function buildTables(input: ExportInput): Tables {
  const { research: r, state, now } = input;
  const code = r.participant?.code ?? "TANPA-KODE";
  const cohort = r.participant?.cohort ?? "";
  const id = [code, r.deviceId];
  const events = [...input.events].sort((a, b) => a.at.localeCompare(b.at));

  const t: Tables = Object.fromEntries(TABLE_SPECS.map((s) => [s.name, []]));

  // ---- asesmen
  for (const a of r.assessments) {
    for (const it of a.items) {
      t.asesmen_butir.push([...id, a.id, a.kind, a.form, it.slot, it.id, it.skill, it.difficulty, it.type, it.answer, it.correct, it.answered, a.score, a.durationSec, a.completedAt]);
    }
  }

  // ---- aktivitas, latihan, metrik, refleksi
  let sessions = 0, questionsDone = 0, attempts = 0, hints = 0, independent = 0, reflFilled = 0, reflSkipped = 0;
  let labRuns = 0, labPlanMax = 0, labPredOk = 0, labPredTotal = 0, gamePredOk = 0, gamePredTotal = 0;

  for (const ev of events) {
    let graded: GradedEvent | null = null;
    try {
      graded = gradeEvent(ev);
    } catch {
      graded = null; // konten berubah/rusak: baris aktivitas tetap ditulis tanpa skor
    }
    let jenis: string = ev.type;
    let rujukan = "";
    let skor: Cell = "", benar: Cell = "", total: Cell = "", durasi: Cell = "";

    switch (ev.type) {
      case "lesson_open":
        jenis = "buka_materi";
        rujukan = ev.lessonId;
        break;
      case "lesson_quiz":
      case "practice": {
        jenis = ev.type === "practice" ? "latihan" : "mini_quiz";
        rujukan = ev.type === "practice" ? ev.difficulty : ev.lessonId;
        if (ev.type === "practice") sessions++;
        if (graded && graded.kind === "graded") {
          const g = graded;
          skor = g.score;
          benar = g.correct;
          total = g.total;
          for (const q of g.perQuestion) {
            const meta = questionOf(ev, q.id);
            const solvedAt = q.solvedAt;
            const mandiri = solvedAt === 1 && q.hints === 0;
            questionsDone++;
            attempts += q.attempts.length;
            hints += q.hints;
            if (mandiri) independent++;
            t.latihan_butir.push([...id, ev.id, ev.at, jenis, meta?.topic ?? "", q.id, q.difficulty, meta?.type ?? "", q.attempts.length, solvedAt ?? "", q.hints, bool(mandiri), lastAnswer(ev, q.id)]);
          }
        }
        break;
      }
      case "evaluation": {
        jenis = "evaluasi_akhir";
        rujukan = `${ev.questionIds.length}_soal`;
        durasi = ev.durationSec;
        if (graded && "score" in graded) {
          skor = graded.score;
          benar = graded.correct;
          total = graded.total;
        }
        break;
      }
      case "game": {
        jenis = "permainan";
        rujukan = ev.gameId;
        durasi = ev.durationSec;
        skor = graded && "percent" in graded ? graded.percent : "";
        benar = ev.correct;
        total = ev.total;
        if (ev.la) {
          if (ev.gameId === "tebak-nilai") {
            gamePredOk += ev.la.prediksi_benar ?? 0;
            gamePredTotal += ev.la.prediksi_total ?? 0;
          }
          for (const [k, v] of Object.entries(ev.la)) t.metrik_proses.push([...id, ev.id, ev.at, "permainan", ev.gameId, k, v]);
        }
        break;
      }
      case "lab": {
        jenis = "lab";
        rujukan = ev.tool;
        if (ev.la) {
          labRuns++;
          if (ev.tool === "elimination") {
            labPlanMax = Math.max(labPlanMax, ev.la.ubah_rencana ?? 0);
            if ((ev.la.prediksi_persis ?? 0) + (ev.la.prediksi_setara ?? 0) + (ev.la.prediksi_dilewati ?? 0) > 0) {
              labPredTotal += ev.la.prediksi_dilewati ? 0 : 1;
              labPredOk += (ev.la.prediksi_persis ?? 0) + (ev.la.prediksi_setara ?? 0) > 0 ? 1 : 0;
            }
          } else if (ev.tool === "checker") {
            labPredTotal += ev.la.prediksi_total ?? 0;
            labPredOk += ev.la.prediksi_benar ?? 0;
          }
          for (const [k, v] of Object.entries(ev.la)) t.metrik_proses.push([...id, ev.id, ev.at, "lab", ev.tool, k, v]);
        }
        break;
      }
      case "reflection": {
        jenis = "refleksi";
        rujukan = `${ev.context}/${ev.refId}`;
        if (ev.skipped) {
          reflSkipped++;
          t.refleksi.push([...id, ev.id, ev.at, ev.context, ev.refId, "", "", 1]);
        } else {
          reflFilled++;
          for (const [pid, val] of Object.entries(ev.responses)) t.refleksi.push([...id, ev.id, ev.at, ev.context, ev.refId, pid, val, 0]);
        }
        break;
      }
      default:
        break;
    }
    t.aktivitas.push([...id, ev.id, ev.at, jenis, rujukan, skor, benar, total, durasi]);
  }

  // ---- ringkasan
  const pre = r.assessments.find((a) => a.kind === "pretest");
  const post = r.assessments.find((a) => a.kind === "posttest");
  const skillCols = ASSESSMENT_SKILLS.flatMap((s) => [pre ? pre.bySkill[s].correct : "", post ? post.bySkill[s].correct : ""]);
  const learningCount = events.filter(isLearningEvent).length;
  const near = events.length >= 0.9 * input.maxEvents;
  t.ringkasan_peserta.push([
    ...id, cohort,
    pre?.form ?? "", pre?.score ?? "", pre?.correct ?? "", pre?.durationSec ?? "", pre?.completedAt ?? "",
    post?.form ?? "", post?.score ?? "", post?.correct ?? "", post?.durationSec ?? "", post?.completedAt ?? "",
    pre && post ? post.score - pre.score : "", ...skillCols,
    sessions, questionsDone, attempts, hints, independent,
    reflFilled, reflSkipped,
    labRuns, labPlanMax, labPredOk, labPredTotal, gamePredOk, gamePredTotal,
    state.counters.evaluations > 0 ? state.counters.bestEvaluation : "",
    state.xp, events.length, bool(near), now,
  ]);

  // ---- info & keterbatasan
  const info: [string, Cell][] = [
    ["versi_format", FORMAT_VERSION],
    ["diekspor_pada", now],
    ["kode_otomatis", bool(!!r.participant?.auto)],
    ["jumlah_event_tersimpan", events.length],
    ["jumlah_event_pembelajaran", learningCount],
    ["batas_event_perangkat", input.maxEvents],
    ["mendekati_batas", bool(near)],
    ["catatan_1", "Data berasal dari satu browser pada satu perangkat; data di perangkat lain atau browser lain tidak ikut."],
    ["catatan_2", "Event tertua dapat terbuang jika batas tercapai; event pembelajaran (refleksi, metrik proses) dipertahankan lebih lama."],
    ["catatan_3", "Durasi tersedia hanya untuk asesmen (total), evaluasi akhir, dan permainan; waktu per soal latihan tidak diukur."],
    ["catatan_4", "Berkas ini disimpan di perangkat siswa dan dapat diubah; tidak ada tanda tangan digital. Gunakan untuk analisis uji coba, bukan penilaian resmi."],
  ];
  for (const [k, v] of info) t.info_ekspor.push([...id, k, v]);
  return t;
}

export function tablesToCsv(tables: Tables, d: Delimiter): { spec: TableSpec; csv: string; rows: number }[] {
  return TABLE_SPECS.map((spec) => ({ spec, csv: toCsv(spec.header, tables[spec.name] ?? [], d), rows: (tables[spec.name] ?? []).length }));
}

// ------------------------------------------------------------------ penggabungan beberapa berkas

export interface MergeResult {
  tables: Record<string, { header: string[]; rows: string[][] }>;
  stats: { files: number; rows: number; duplicates: number; unknownFiles: string[]; participants: number; warnings: string[] };
}

/**
 * Menggabungkan berkas CSV hasil ekspor dari banyak perangkat. Tabel dikenali dari baris judul kolom
 * (nama berkas boleh diubah). Baris duplikat (kunci sama) dihapus; pemisah , atau ; dideteksi otomatis.
 */
export function mergeCsvTexts(files: { name: string; text: string }[]): MergeResult {
  const tables: MergeResult["tables"] = {};
  const seen: Record<string, Set<string>> = {};
  const unknown: string[] = [];
  const warnings: string[] = [];
  let rows = 0, duplicates = 0;

  for (const f of files) {
    const { rows: parsed } = parseCsv(f.text);
    const header = parsed[0]?.map((h) => h.trim());
    const spec = header ? TABLE_SPECS.find((s) => s.header.length === header.length && s.header.every((h, i) => h === header[i])) : undefined;
    if (!spec || !header) {
      unknown.push(f.name);
      continue;
    }
    const idx = spec.key.map((k) => header.indexOf(k));
    const bucket = (tables[spec.name] ??= { header, rows: [] });
    const keys = (seen[spec.name] ??= new Set());
    for (const row of parsed.slice(1)) {
      if (row.length !== header.length) {
        warnings.push(`${f.name}: baris dengan jumlah kolom tidak sesuai dilewati.`);
        continue;
      }
      const key = idx.map((i) => row[i]).join("\u0001");
      if (keys.has(key)) {
        duplicates++;
        continue;
      }
      keys.add(key);
      bucket.rows.push(row);
      rows++;
    }
  }

  // pemeriksaan kualitas: kode yang sama di banyak perangkat, dan asesmen ganda
  const rp = tables["ringkasan_peserta"];
  const people = new Set<string>();
  if (rp) {
    const ci = rp.header.indexOf("kode_peserta");
    const di = rp.header.indexOf("id_perangkat");
    const byCode = new Map<string, Set<string>>();
    for (const row of rp.rows) {
      people.add(row[ci]);
      byCode.set(row[ci], (byCode.get(row[ci]) ?? new Set()).add(row[di]));
    }
    for (const [c, devs] of byCode) if (devs.size > 1) warnings.push(`Kode ${c} muncul di ${devs.size} perangkat; periksa apakah ini peserta yang sama atau kode ganda.`);
  }
  const ab = tables["asesmen_butir"];
  if (ab) {
    const ci = ab.header.indexOf("kode_peserta");
    const ji = ab.header.indexOf("jenis");
    const ri = ab.header.indexOf("id_rekaman");
    const per = new Map<string, Set<string>>();
    for (const row of ab.rows) per.set(`${row[ci]}|${row[ji]}`, (per.get(`${row[ci]}|${row[ji]}`) ?? new Set()).add(row[ri]));
    for (const [k, recs] of per) if (recs.size > 1) warnings.push(`Peserta/jenis ${k.replace("|", " ")} memiliki ${recs.size} rekaman asesmen; hanya satu yang seharusnya dipakai.`);
  }
  return { tables, stats: { files: files.length, rows, duplicates, unknownFiles: unknown, participants: people.size, warnings } };
}

export function mergedToCsv(m: MergeResult, d: Delimiter): { spec: TableSpec; csv: string; rows: number }[] {
  return TABLE_SPECS.filter((s) => m.tables[s.name]).map((spec) => ({ spec, csv: toCsv(spec.header, m.tables[spec.name].rows, d), rows: m.tables[spec.name].rows.length }));
}
