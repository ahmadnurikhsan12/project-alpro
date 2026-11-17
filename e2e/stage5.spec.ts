import { expect, test, type Page } from "@playwright/test";
import { completeAssessment, createAutoCode, readZip, researchData, setTeacherCode } from "./stage5-helpers";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Penyimpanan progres baru dibuat setelah ada aktivitas belajar; asesmen sendiri tidak membuatnya. */
const guest = (page: Page) =>
  page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("mathquest.guest.v1") ?? "{}") as { state?: { xp: number }; events?: { type: string }[] };
    return { state: { xp: d.state?.xp ?? 0 }, events: d.events ?? [] };
  });

test("pretest dan posttest end-to-end: kode anonim, penilaian server, tanpa kebocoran kunci, 0 XP", async ({ page }) => {
  const errors = trackErrors(page);
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.url().includes("/api/assessment/")) bodies.push(await r.text());
  });

  await page.goto("/asesmen");
  // tanpa kode: tidak bisa memulai
  await expect(page.getByTestId("asesmen-pretest").getByRole("button", { name: /^Mulai/ })).toBeDisabled();
  const code = await createAutoCode(page);
  const xpBefore = (await guest(page)).state.xp;

  // ---- pretest: 2 butir salah (slot 1 dan 12) → 10/12 = 83
  const preForm = await completeAssessment(page, code, "pretest", { wrongSlots: [1, 12] });
  // hasil langsung tampil di halaman (tanpa unduh): skor pretest dan profil kompetensi, tanpa benar/salah per butir
  await expect(page.getByTestId("pretest-score")).toHaveText("83");
  await expect(page.getByTestId("posttest-score")).toHaveCount(0);
  await expect(page.getByTestId("result-pretest-score")).toHaveText("83");
  await expect(page.getByTestId("result-posttest-score")).toHaveText("—");
  await expect(page.getByTestId("results-card")).toContainText("Hasil per kompetensi");
  let data = await researchData(page);
  expect(data.participant?.code).toBe(code);
  expect(data.assessments).toHaveLength(1);
  expect(data.assessments[0]).toMatchObject({ kind: "pretest", form: preForm, score: 83, correct: 10 });
  expect(data.assessments[0].items).toHaveLength(12);
  expect(data.assessments[0].items.filter((i) => i.correct === 0).map((i) => i.slot)).toEqual([1, 12]);

  // tidak dapat diulang
  await page.goto("/asesmen");
  await expect(page.getByTestId("asesmen-pretest")).toContainText("Selesai");
  await expect(page.getByTestId("asesmen-pretest").getByRole("button", { name: /^Mulai/ })).toHaveCount(0);

  // ---- posttest: formulir LAIN, semua benar
  const postForm = await completeAssessment(page, code, "posttest");
  expect(postForm).not.toBe(preForm);
  await expect(page.getByTestId("posttest-score")).toHaveText("100");
  await expect(page.getByTestId("asesmen-done")).toContainText("pretest 83 → posttest 100");
  await expect(page.getByTestId("result-pretest-score")).toHaveText("83");
  await expect(page.getByTestId("result-posttest-score")).toHaveText("100");
  await expect(page.getByTestId("result-delta")).toHaveText("+17");
  // hasil juga muncul di menu asesmen kapan saja, tanpa membuka halaman Ekspor
  await page.getByRole("button", { name: "Kembali ke menu asesmen" }).click();
  await expect(page.getByTestId("results-card")).toContainText("naik");
  data = await researchData(page);
  expect(data.assessments.map((a) => a.kind)).toEqual(["pretest", "posttest"]);
  expect(data.assessments[1]).toMatchObject({ form: postForm, score: 100, correct: 12 });
  expect(data.assessments[1].durationSec).toBeGreaterThan(0);

  // ---- KUNCI TIDAK BOCOR: respons API tidak memuat answer/explanation/verify/hints
  const questionBodies = bodies.filter((b) => b.includes('"questions"'));
  expect(questionBodies.length).toBe(2);
  for (const b of questionBodies) for (const field of ['"answer"', '"explanation"', '"verify"', '"hints"']) expect(b).not.toContain(field);
  const submitBodies = bodies.filter((b) => b.includes('"result"'));
  for (const b of submitBodies) for (const field of ['"explanation"', '"verify"', '"hints"', '"correctAnswer"']) expect(b).not.toContain(field);

  // ---- 0 XP, progres tidak tersentuh, tidak ada event progres baru
  const g = await guest(page);
  expect(g.state.xp).toBe(xpBefore);
  expect(g.events.filter((e) => ["evaluation", "practice", "lesson_quiz"].includes(e.type))).toHaveLength(0);

  // ---- bertahan setelah reload
  await page.reload();
  expect((await researchData(page)).assessments).toHaveLength(2);
  expect(errors).toEqual([]);
});

test("butir kosong dinilai salah dan dicatat tidak dijawab; konfirmasi sebelum mengirim", async ({ page }) => {
  await page.goto("/asesmen");
  const code = await createAutoCode(page);
  await completeAssessment(page, code, "pretest", { skipSlots: [3, 4] }); // 10/12 = 83
  const d = await researchData(page);
  expect(d.assessments[0]).toMatchObject({ score: 83, correct: 10 });
  const item = d.assessments[0].items.find((i) => i.slot === 3)!;
  expect(item).toMatchObject({ correct: 0, answer: "" });
});

test("kode dari guru: dinormalisasi dan dipakai; kode terkunci setelah asesmen tercatat", async ({ page }) => {
  await page.goto("/asesmen");
  await setTeacherCode(page, "KLS1-07");
  await expect(page.getByRole("button", { name: "Ganti kode" })).toBeVisible();
  await completeAssessment(page, "KLS1-07", "pretest");
  await page.goto("/asesmen");
  await expect(page.getByRole("button", { name: "Ganti kode" })).toHaveCount(0);
  await expect(page.getByText("Kode tidak dapat diganti")).toBeVisible();
});

test("ekspor CSV/ZIP dari Guest Mode: isi, privasi, pemisah, dan Excel-friendly", async ({ page }) => {
  const errors = trackErrors(page);
  // nama panggilan TIDAK boleh ikut terekspor
  await page.goto("/profil");
  await page.getByLabel("Nama panggilan").fill("Budi Santoso");
  await page.getByRole("button", { name: "Simpan nama" }).click();
  await page.goto("/dashboard");
  await expect(page.getByText("Halo, Budi Santoso!")).toBeVisible();

  await page.goto("/asesmen");
  const code = await createAutoCode(page);
  await completeAssessment(page, code, "pretest", { wrongSlots: [1] });
  await completeAssessment(page, code, "posttest");

  // satu mini quiz lengkap agar tabel latihan terisi
  await page.goto("/materi/konsep-metode-eliminasi");
  const quiz = page.locator("#quiz");
  await quiz.getByRole("radio", { name: "A Dijumlahkan" }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();
  await quiz.getByRole("radio", { name: "B Dikurangkan" }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();
  await quiz.getByRole("radio", { name: "Benar" }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();
  await quiz.getByLabel("Jawaban").fill("14");
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await quiz.getByRole("button", { name: "Lihat Hasil" }).click();
  await expect(quiz.getByText("Mini quiz selesai!")).toBeVisible();

  await page.goto("/ekspor");
  await expect(page.getByTestId("status-events")).toContainText("/ 1000");
  // tombol unduh aktif karena kode ada
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Unduh semua (.zip)" }).click()]);
  expect(dl.suggestedFilename()).toBe(`mathquest_${code}_${new Date().toISOString().slice(0, 10)}.zip`);
  const zipBuf = Buffer.from(await (await import("node:fs/promises")).readFile((await dl.path())!));
  const files = readZip(zipBuf);
  expect(Object.keys(files).sort()).toEqual(["0_info_ekspor.csv", "1_ringkasan_peserta.csv", "2_asesmen_butir.csv", "3_latihan_butir.csv", "4_aktivitas.csv", "5_metrik_proses.csv", "6_refleksi.csv"]);

  const text = (n: string) => files[n].toString("utf8");
  for (const n of Object.keys(files)) {
    expect(text(n).charCodeAt(0), `${n}: BOM`).toBe(0xfeff);
    expect(text(n), `${n}: tanpa nama panggilan`).not.toContain("Budi");
    expect(text(n), `${n}: CRLF`).toContain("\r\n");
  }
  const summary = text("1_ringkasan_peserta.csv").split("\r\n");
  expect(summary[0]).toContain("kode_peserta;id_perangkat"); // pemisah ; (Excel Indonesia)
  expect(summary[1]).toContain(code);
  const header = summary[0].replace("﻿", "").split(";");
  const row = summary[1].split(";");
  expect(row[header.indexOf("skor_pretest")]).toBe("92");
  expect(row[header.indexOf("skor_posttest")]).toBe("100");
  expect(row[header.indexOf("selisih_skor")]).toBe("8");
  expect(text("2_asesmen_butir.csv").trim().split("\r\n")).toHaveLength(25); // judul + 24 butir
  expect(text("3_latihan_butir.csv")).toContain("q-m4-1");
  expect(text("0_info_ekspor.csv")).toContain("mendekati_batas");

  // pemisah koma → satu berkas
  await page.getByRole("radio", { name: /Koma/ }).click();
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Unduh 1_ringkasan_peserta.csv" }).click()]);
  expect(dl2.suggestedFilename()).toBe(`mathquest_${code}_1_ringkasan_peserta.csv`);
  const csv2 = (await (await import("node:fs/promises")).readFile((await dl2.path())!)).toString("utf8");
  expect(csv2.split("\r\n")[0]).toContain("kode_peserta,id_perangkat");
  expect(errors).toEqual([]);
});

test("menggabungkan ekspor dari dua perangkat berbeda tanpa kehilangan atau menggandakan data", async ({ page, browser }) => {
  const fs = await import("node:fs/promises");
  const exportZip = async (p: Page) => {
    await p.goto("/ekspor");
    const [d] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Unduh semua (.zip)" }).click()]);
    return readZip(Buffer.from(await fs.readFile((await d.path())!)));
  };

  // perangkat 1
  await page.goto("/asesmen");
  await setTeacherCode(page, "KLS1-01");
  await completeAssessment(page, "KLS1-01", "pretest", { wrongSlots: [2] });
  const zip1 = await exportZip(page);

  // perangkat 2 (profil browser baru = penyimpanan terpisah)
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto("/asesmen");
  await setTeacherCode(page2, "KLS1-02");
  await completeAssessment(page2, "KLS1-02", "pretest");
  await completeAssessment(page2, "KLS1-02", "posttest");
  const zip2 = await exportZip(page2);
  await ctx2.close();

  const d1 = await researchData(page);
  expect(d1.participant?.code).toBe("KLS1-01");

  // guru menggabungkan: semua berkas dari kedua perangkat + satu berkas yang sengaja dobel
  await page.goto("/ekspor");
  const upload = [...Object.entries(zip1), ...Object.entries(zip2), ["salinan_ringkasan_perangkat1.csv", zip1["1_ringkasan_peserta.csv"]] as const].map(([name, buffer]) => ({ name, mimeType: "text/csv", buffer: buffer as Buffer }));
  await page.locator("#merge-files").setInputFiles(upload);
  const result = page.getByTestId("merge-result");
  await expect(result).toContainText("2 peserta");
  await expect(result).toContainText("baris ganda dihapus");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Unduh hasil gabungan/ }).click()]);
  const merged = readZip(Buffer.from(await fs.readFile((await dl.path())!)));
  const rows = (n: string) => merged[n].toString("utf8").trim().split("\r\n");
  expect(rows("1_ringkasan_peserta.csv")).toHaveLength(3); // judul + 2 peserta
  expect(rows("2_asesmen_butir.csv")).toHaveLength(1 + 12 + 24); // 12 (KLS1-01 pretest) + 24 (KLS1-02)
  const all = merged["1_ringkasan_peserta.csv"].toString("utf8");
  expect(all).toContain("KLS1-01");
  expect(all).toContain("KLS1-02");
});
