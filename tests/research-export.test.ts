import { describe, expect, it } from "vitest";
import { crc32, csvField, parseCsv, sanitizeCell, toCsv, zipStore } from "@/lib/research/csv";
import { TABLE_SPECS, buildTables, mergeCsvTexts, mergedToCsv, tablesToCsv, type Tables } from "@/lib/research/export";
import type { AssessmentRecord, ResearchData } from "@/lib/research/store";
import { createInitialState, applyEvent } from "@/lib/progress/engine";
import { gradeEvent } from "@/lib/progress/grading";
import type { RawEvent } from "@/lib/progress/types";
import { ASSESSMENT_SKILLS } from "@/lib/assessment/blueprint";
import { gradeAssessment } from "@/server/assessment";
import { ASSESSMENT_FORMS } from "@/server/assessment-bank";

let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n + 40000).padStart(12, "0")}`;
const AT = (i: number) => `2026-11-1${(i % 8) + 1}T08:0${i % 6}:00.000Z`;
const NOW = "2026-11-20T09:00:00.000Z";

function record(form: "A" | "B", kind: "pretest" | "posttest", wrongSlots: number[] = []): AssessmentRecord {
  const answers = Object.fromEntries(ASSESSMENT_FORMS[form].map((q) => [q.id, wrongSlots.includes(q.slot) ? "999" : q.answer]));
  const r = gradeAssessment(form, answers);
  return {
    id: uid(), kind, form, completedAt: AT(3), durationSec: 612, correct: r.correct, total: r.total, score: r.score, bySkill: r.bySkill,
    items: r.items.map((it) => {
      const q = ASSESSMENT_FORMS[form].find((x) => x.id === it.id)!;
      return { id: it.id, slot: it.slot, skill: it.skill, difficulty: q.difficulty, type: q.type, answer: answers[it.id], correct: it.correct, answered: it.answered };
    }),
  };
}

function research(code: string, device: string, extra: Partial<ResearchData> = {}): ResearchData {
  return { version: 1, deviceId: device, participant: { code, cohort: "KLS1", auto: false, createdAt: AT(0) }, assessments: [record("A", "pretest", [1, 2, 5]), record("B", "posttest", [12])], ...extra };
}

function events(): RawEvent[] {
  const ev: RawEvent[] = [
    { id: uid(), at: AT(1), type: "lesson_open", lessonId: "m4" },
    { id: uid(), at: AT(2), type: "practice", difficulty: "mudah", questionIds: ["p-m-03", "p-m-06"], answers: { "p-m-03": "6", "p-m-06": "a" }, responses: { "p-m-03": { attempts: ["5", "6"], hints: 2 }, "p-m-06": { attempts: ["a"], hints: 0 } } },
    { id: uid(), at: AT(3), type: "lesson_quiz", lessonId: "m4", answers: { "q-m4-1": "a", "q-m4-2": "b", "q-m4-3": "true", "q-m4-4": "14" } },
    { id: uid(), at: AT(4), type: "evaluation", questionIds: ["e01", "e02", "e03", "e04", "e05"], answers: {}, durationSec: 300, result: { correct: 4, total: 5, score: 80 } },
    { id: uid(), at: AT(5), type: "game", gameId: "tebak-nilai", difficulty: "mudah", score: 120, correct: 2, total: 3, durationSec: 90, la: { tebakan_total: 12, prediksi_total: 24, prediksi_benar: 20, alasan_substitusi: 5 } },
    { id: uid(), at: AT(6), type: "lab", tool: "elimination", la: { ubah_rencana: 2, prediksi_persis: 1, prediksi_setara: 0, prediksi_dilewati: 0, selesai_ke: 1 } },
    { id: uid(), at: AT(7), type: "lab", tool: "checker", la: { uji_total: 3, prediksi_total: 3, prediksi_benar: 2 } },
    { id: uid(), at: AT(8), type: "reflection", context: "lab_elimination", refId: "elimination", responses: { keyakinan: 4, bagian_menantang: "grafik" } },
    { id: uid(), at: AT(9), type: "reflection", context: "lesson", refId: "m4", responses: {}, skipped: true },
  ];
  return ev;
}

const input = (code = "KLS1-07", device = "dev-1", extra: Partial<ResearchData> = {}) => ({
  research: research(code, device, extra),
  events: events(),
  state: createInitialState(),
  maxEvents: 1000,
  now: NOW,
});

const col = (spec: string, tables: Tables, name: string) => {
  const s = TABLE_SPECS.find((t) => t.name === spec)!;
  return tables[spec].map((r) => r[s.header.indexOf(name)]);
};

describe("CSV", () => {
  it("escape: pemisah, kutip ganda, baris baru", () => {
    expect(csvField("a;b", ";")).toBe('"a;b"');
    expect(csvField("a,b", ";")).toBe("a,b");
    expect(csvField('kata "x"', ",")).toBe('"kata ""x"""');
    expect(csvField("baris\nbaru", ",")).toBe('"baris\nbaru"');
    expect(csvField(null, ",")).toBe("");
    expect(csvField(0, ",")).toBe("0");
  });

  it("proteksi injeksi rumus Excel, tanpa merusak angka negatif", () => {
    expect(sanitizeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(sanitizeCell("+1+1")).toBe("'+1+1");
    expect(sanitizeCell("@x")).toBe("'@x");
    expect(sanitizeCell("-abc")).toBe("'-abc");
    expect(sanitizeCell("-3")).toBe("-3");
    expect(sanitizeCell("-2.5")).toBe("-2.5");
    expect(sanitizeCell("(3, -1)")).toBe("(3, -1)");
  });

  it("toCsv: BOM, CRLF, pemisah sesuai pilihan; parse mengembalikan data semula", () => {
    const rows = [["a", 1, 'ada "kutip"'], ["b;c", -3, "x\ny"]];
    for (const d of [",", ";"] as const) {
      const csv = toCsv(["k1", "k2", "k3"], rows, d);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv.includes("\r\n")).toBe(true);
      const p = parseCsv(csv);
      expect(p.delimiter).toBe(d);
      expect(p.rows[0]).toEqual(["k1", "k2", "k3"]);
      expect(p.rows[1]).toEqual(["a", "1", 'ada "kutip"']);
      expect(p.rows[2]).toEqual(["b;c", "-3", "x\ny"]);
    }
    expect(toCsv(["a"], [], ",", false).charCodeAt(0)).toBe("a".charCodeAt(0));
  });
});

/** Pembaca ZIP minimal untuk memverifikasi keluaran zipStore (sebagaimana pembaca standar akan membacanya). */
function readZip(buf: Uint8Array) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const eocd = buf.length - 22;
  expect(dv.getUint32(eocd, true)).toBe(0x06054b50);
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out: { name: string; data: Uint8Array; crcOk: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    expect(dv.getUint32(p, true)).toBe(0x02014b50);
    const crc = dv.getUint32(p + 16, true);
    const size = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nameLen));
    expect(dv.getUint32(off, true)).toBe(0x04034b50);
    const lnLen = dv.getUint16(off + 26, true);
    const start = off + 30 + lnLen;
    const data = buf.slice(start, start + size);
    out.push({ name, data, crcOk: crc32(data) === crc });
    p += 46 + nameLen;
  }
  return out;
}

describe("ZIP", () => {
  it("CRC32 baku", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("berkas dapat dibaca kembali dengan isi, nama UTF-8, dan CRC yang benar", () => {
    const files = [
      { name: "1_ringkasan.csv", data: new TextEncoder().encode("a;b\r\n1;2\r\n") },
      { name: "data_é.csv", data: new TextEncoder().encode("﻿x,y\r\n") },
      { name: "kosong.csv", data: new Uint8Array(0) },
    ];
    const zip = zipStore(files, new Date(2026, 10, 12, 9, 30, 10));
    const back = readZip(zip);
    expect(back.map((f) => f.name)).toEqual(files.map((f) => f.name));
    back.forEach((f, i) => {
      expect(f.crcOk).toBe(true);
      expect(Array.from(f.data)).toEqual(Array.from(files[i].data));
    });
  });
});

describe("tabel ekspor", () => {
  const t = buildTables(input());

  it("memuat semua kategori data yang diminta", () => {
    expect(t.ringkasan_peserta).toHaveLength(1);
    expect(t.asesmen_butir).toHaveLength(24); // 12 butir × (pretest + posttest)
    expect(t.latihan_butir).toHaveLength(6); // 2 soal latihan + 4 soal mini quiz
    expect(t.aktivitas).toHaveLength(9);
    expect(t.refleksi.length).toBe(3); // 2 jawaban + 1 dilewati
    expect(t.metrik_proses.length).toBe(4 + 5 + 3); // game + lab eliminasi + lab checker
    expect(t.info_ekspor.length).toBeGreaterThan(5);
  });

  it("setiap baris sesuai jumlah kolom pada judul tabelnya", () => {
    for (const s of TABLE_SPECS) for (const row of t[s.name]) expect(row.length, s.name).toBe(s.header.length);
  });

  it("hasil pretest/posttest dan selisih skor benar", () => {
    const r = t.ringkasan_peserta[0];
    const h = TABLE_SPECS[0].header;
    expect(r[h.indexOf("kode_peserta")]).toBe("KLS1-07");
    expect(r[h.indexOf("kelompok")]).toBe("KLS1");
    expect(r[h.indexOf("skor_pretest")]).toBe(75); // 9/12
    expect(r[h.indexOf("skor_posttest")]).toBe(92); // 11/12
    expect(r[h.indexOf("selisih_skor")]).toBe(17);
    expect(r[h.indexOf("formulir_pretest")]).toBe("A");
    expect(r[h.indexOf("formulir_posttest")]).toBe("B");
    expect(r[h.indexOf("durasi_pretest_detik")]).toBe(612);
    expect(r[h.indexOf("pre_pilih_operasi")]).toBe(0); // slot 1 dan 2 salah
    expect(r[h.indexOf("post_pilih_operasi")]).toBe(2);
    expect(r[h.indexOf("pre_representasi")]).toBe(2);
    expect(r[h.indexOf("post_representasi")]).toBe(1); // slot 12 salah
    for (const s of ASSESSMENT_SKILLS) expect(h).toContain(`pre_${s}`);
  });

  it("latihan: percobaan, petunjuk, dan kemandirian dihitung dari respons", () => {
    const ids = col("latihan_butir", t, "id_soal");
    const i = ids.indexOf("p-m-03");
    expect(col("latihan_butir", t, "jumlah_percobaan")[i]).toBe(2);
    expect(col("latihan_butir", t, "benar_pada_percobaan_ke")[i]).toBe(2);
    expect(col("latihan_butir", t, "petunjuk_dibuka")[i]).toBe(2);
    expect(col("latihan_butir", t, "mandiri")[i]).toBe(0);
    const j = ids.indexOf("p-m-06");
    expect(col("latihan_butir", t, "mandiri")[j]).toBe(1);
    expect(col("latihan_butir", t, "sumber")[i]).toBe("latihan");
    expect(col("latihan_butir", t, "sumber").filter((s) => s === "mini_quiz")).toHaveLength(4);
    const h = TABLE_SPECS[0].header;
    expect(t.ringkasan_peserta[0][h.indexOf("total_percobaan")]).toBeGreaterThanOrEqual(2);
    expect(t.ringkasan_peserta[0][h.indexOf("total_petunjuk")]).toBe(2);
  });

  it("Learning Activity: prediksi dan perubahan rencana tercatat sebagai metrik", () => {
    const metrik = col("metrik_proses", t, "metrik");
    expect(metrik).toContain("ubah_rencana");
    expect(metrik).toContain("prediksi_persis");
    expect(metrik).toContain("prediksi_benar");
    const h = TABLE_SPECS[0].header;
    expect(t.ringkasan_peserta[0][h.indexOf("lab_ubah_rencana_maks")]).toBe(2);
    expect(t.ringkasan_peserta[0][h.indexOf("game_prediksi_benar")]).toBe(20);
    expect(t.ringkasan_peserta[0][h.indexOf("game_prediksi_total")]).toBe(24);
    expect(t.ringkasan_peserta[0][h.indexOf("lab_prediksi_total")]).toBe(4); // 1 eliminasi + 3 uji pasangan
    expect(t.ringkasan_peserta[0][h.indexOf("lab_prediksi_benar")]).toBe(3); // 1 + 2
  });

  it("refleksi: jawaban per pertanyaan, dan yang dilewati ditandai", () => {
    const rows = t.refleksi.map((r) => r.join("|"));
    expect(rows.some((r) => r.includes("keyakinan|4|0"))).toBe(true);
    expect(rows.some((r) => r.includes("bagian_menantang|grafik|0"))).toBe(true);
    expect(rows.some((r) => r.endsWith("||1"))).toBe(true);
  });

  it("durasi hanya untuk kegiatan yang mengukurnya", () => {
    const jenis = col("aktivitas", t, "jenis");
    const dur = col("aktivitas", t, "durasi_detik");
    expect(dur[jenis.indexOf("evaluasi_akhir")]).toBe(300);
    expect(dur[jenis.indexOf("permainan")]).toBe(90);
    expect(dur[jenis.indexOf("latihan")]).toBe("");
  });

  it("PRIVASI: tidak ada kolom/isi nama, email, atau teks bebas; hanya kode anonim", () => {
    const headers = TABLE_SPECS.flatMap((s) => s.header).join(" ");
    expect(headers).not.toMatch(/nama|email|alamat|telepon|sekolah/i);
    const all = JSON.stringify(t);
    expect(all).not.toMatch(/@/);
    expect(all).toContain("KLS1-07");
  });

  it("tanpa kode peserta: ditandai TANPA-KODE (halaman ekspor meminta kode lebih dulu)", () => {
    const tt = buildTables({ ...input(), research: { ...research("X", "d"), participant: null } });
    expect(tt.ringkasan_peserta[0][0]).toBe("TANPA-KODE");
  });

  it("mendekati batas penyimpanan ditandai", () => {
    const tt = buildTables({ ...input(), maxEvents: 10 });
    expect(col("info_ekspor", tt, "kunci")).toContain("mendekati_batas");
    const h = TABLE_SPECS[0].header;
    expect(tt.ringkasan_peserta[0][h.indexOf("mendekati_batas")]).toBe(1);
  });

  it("peserta tanpa asesmen: kolom asesmen kosong, bukan nol", () => {
    const tt = buildTables({ ...input(), research: research("KLS1-08", "d", { assessments: [] }) });
    const h = TABLE_SPECS[0].header;
    expect(tt.ringkasan_peserta[0][h.indexOf("skor_pretest")]).toBe("");
    expect(tt.ringkasan_peserta[0][h.indexOf("selisih_skor")]).toBe("");
    expect(tt.asesmen_butir).toHaveLength(0);
  });
});

describe("penggabungan data banyak perangkat", () => {
  const csvs = (code: string, device: string, d: "," | ";") =>
    tablesToCsv(buildTables(input(code, device)), d).map((x) => ({ name: x.spec.file, text: x.csv }));

  it("menggabungkan tiga siswa/perangkat, pemisah berbeda, tanpa kehilangan baris", () => {
    const files = [...csvs("KLS1-01", "dev-a", ";"), ...csvs("KLS1-02", "dev-b", ","), ...csvs("KLS1-03", "dev-c", ";")];
    const m = mergeCsvTexts(files);
    expect(m.stats.participants).toBe(3);
    expect(m.stats.duplicates).toBe(0);
    expect(m.stats.unknownFiles).toEqual([]);
    expect(m.tables.ringkasan_peserta.rows).toHaveLength(3);
    expect(m.tables.asesmen_butir.rows).toHaveLength(72);
    expect(m.tables.aktivitas.rows).toHaveLength(27);
  });

  it("berkas yang sama digabung dua kali (atau ekspor ulang) tidak menggandakan data", () => {
    const one = csvs("KLS1-01", "dev-a", ";");
    const m = mergeCsvTexts([...one, ...one]);
    expect(m.tables.ringkasan_peserta.rows).toHaveLength(1);
    expect(m.tables.latihan_butir.rows).toHaveLength(6);
    expect(m.stats.duplicates).toBeGreaterThan(0);
  });

  it("tabel dikenali dari judul kolom, bukan nama berkas; berkas asing dilaporkan", () => {
    const files = csvs("KLS1-01", "dev-a", ",").map((f, i) => ({ ...f, name: `berkas_${i}.csv` }));
    files.push({ name: "catatan.csv", text: "a,b\r\n1,2\r\n" });
    const m = mergeCsvTexts(files);
    expect(m.stats.unknownFiles).toEqual(["catatan.csv"]);
    expect(Object.keys(m.tables).sort()).toEqual(TABLE_SPECS.map((s) => s.name).sort());
  });

  it("peringatan: kode sama di dua perangkat, dan asesmen ganda untuk satu kode", () => {
    const m = mergeCsvTexts([...csvs("KLS1-01", "dev-a", ";"), ...csvs("KLS1-01", "dev-b", ";")]);
    expect(m.stats.warnings.some((w) => w.includes("KLS1-01") && w.includes("2 perangkat"))).toBe(true);
    expect(m.stats.warnings.some((w) => w.includes("rekaman asesmen"))).toBe(true);
  });

  it("hasil gabungan dapat diekspor ulang dan dibaca kembali tanpa perubahan data", () => {
    const m = mergeCsvTexts([...csvs("KLS1-01", "dev-a", ";"), ...csvs("KLS1-02", "dev-b", ";")]);
    const out = mergedToCsv(m, ";");
    const again = mergeCsvTexts(out.map((o) => ({ name: o.spec.file, text: o.csv })));
    expect(again.stats.duplicates).toBe(0);
    for (const s of TABLE_SPECS) expect(again.tables[s.name].rows).toEqual(m.tables[s.name].rows);
  });

  it("baris dengan jumlah kolom salah dilewati dengan peringatan", () => {
    const f = csvs("KLS1-01", "dev-a", ",")[1];
    const bad = { ...f, text: f.text + "x,y\r\n" };
    const m = mergeCsvTexts([bad]);
    expect(m.stats.warnings.some((w) => w.includes("jumlah kolom"))).toBe(true);
  });
});

describe("ekspor dari alur event nyata", () => {
  it("event yang diproses engine (bukan data sintetis) menghasilkan baris latihan konsisten dengan penghitung", () => {
    let s = createInitialState("2026-11-12T07:00:00.000Z");
    const ev: RawEvent = { id: uid(), at: "2026-11-12T08:00:00.000Z", type: "practice", difficulty: "mudah", questionIds: ["p-m-03"], answers: { "p-m-03": "6" }, responses: { "p-m-03": { attempts: ["1", "6"], hints: 1 } } };
    s = applyEvent(s, gradeEvent(ev)).state;
    const t = buildTables({ research: research("KLS1-09", "dev-z"), events: [ev], state: s, maxEvents: 1000, now: NOW });
    const stat = s.counters.questionStats["p-m-03"];
    expect(col("latihan_butir", t, "jumlah_percobaan")[0]).toBe(stat.attempts);
    expect(col("latihan_butir", t, "petunjuk_dibuka")[0]).toBe(stat.hints);
  });
});
