import { expect, type Locator, type Page } from "@playwright/test";
import { completeAnalysis, solvePreset3WithY } from "./helpers";
import { completeAssessment, createAutoCode, readZip, researchData } from "./stage5-helpers";
import { kilatFlow, tebakFlow } from "./stage4-flows";

/**
 * Alur siswa dari awal sampai akhir (dipakai bersama oleh desktop dan mobile; tap = true → sentuhan),
 * ditutup dengan pemeriksaan konsistensi antartabel CSV.
 */
const act = (tap: boolean, l: Locator) => (tap ? l.tap() : l.click());

async function practiceUntilDone(page: Page, tap: boolean, nextName: string) {
  const next = page.getByRole("button", { name: nextName });
  const check = page.getByRole("button", { name: /Periksa (Jawaban|Lagi)/ });
  for (let guard = 0; guard < 10; guard++) {
    if (await next.isVisible().catch(() => false)) return;
    const giveUp = page.getByRole("button", { name: /Lewati dan lihat pembahasan/ });
    if (await giveUp.isVisible().catch(() => false)) {
      await act(tap, giveUp);
      continue;
    }
    const gate = page.getByTestId("reason-gate");
    if (await gate.isVisible().catch(() => false)) await act(tap, gate.getByRole("radio").first());
    const option = page.locator('main [role="radio"]:not([disabled])').first();
    if (await option.isVisible().catch(() => false)) await act(tap, option);
    else {
      const inputs = page.locator("main input");
      const n = await inputs.count();
      for (let k = 0; k < n; k++) await inputs.nth(k).fill(String(guard + 1));
    }
    if (await check.isEnabled().catch(() => false)) await act(tap, check);
  }
  await expect(next).toBeVisible();
}

export async function fullJourney(page: Page, tap: boolean) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (/\/api\/(assessment|evaluation)\/questions/.test(r.url())) bodies.push(await r.text());
  });

  // nama panggilan diisi → harus TIDAK ada di ekspor
  await page.goto("/profil");
  await page.getByLabel("Nama panggilan").fill("Rahasia Siswa");
  await act(tap, page.getByRole("button", { name: "Simpan nama" }));

  await page.goto("/asesmen");
  const code = await createAutoCode(page, tap);
  await completeAssessment(page, code, "pretest", { wrongSlots: [1, 5], tap });

  // materi + mini quiz
  await page.goto("/materi/konsep-metode-eliminasi");
  const quiz = page.locator("#quiz");
  await quiz.scrollIntoViewIfNeeded();
  await act(tap, quiz.getByRole("radio", { name: "A Dijumlahkan" }));
  await act(tap, quiz.getByRole("button", { name: "Periksa Jawaban" }));
  await act(tap, quiz.getByRole("button", { name: "Soal Berikutnya" }));
  await act(tap, quiz.getByRole("radio", { name: "B Dikurangkan" }));
  await act(tap, quiz.getByRole("button", { name: "Periksa Jawaban" }));
  await act(tap, quiz.getByRole("button", { name: "Soal Berikutnya" }));
  await act(tap, quiz.getByRole("radio", { name: "Benar" }));
  await act(tap, quiz.getByRole("button", { name: "Periksa Jawaban" }));
  await act(tap, quiz.getByRole("button", { name: "Soal Berikutnya" }));
  await quiz.getByLabel("Jawaban").fill("14");
  await act(tap, quiz.getByRole("button", { name: "Periksa Jawaban" }));
  await act(tap, quiz.getByRole("button", { name: "Lihat Hasil" }));
  await expect(quiz.getByText("Mini quiz selesai!")).toBeVisible();

  // latihan (5 soal)
  await page.goto("/latihan");
  await act(tap, page.getByRole("button", { name: /Mulai Latihan/ }));
  for (let i = 0; i < 5; i++) {
    await practiceUntilDone(page, tap, i < 4 ? "Soal Berikutnya" : "Lihat Hasil");
    await act(tap, page.getByRole("button", { name: i < 4 ? "Soal Berikutnya" : "Lihat Hasil" }));
  }
  await expect(page.getByText("Latihan Mudah selesai!")).toBeVisible();

  // Lab: eliminasi (Learning Activity) lengkap
  await page.goto("/lab?tab=elimination");
  await page.locator("#preset-elim").selectOption("3");
  await completeAnalysis(page, { a1: "2", b1: "1", c1: "10", a2: "1", b2: "1", c2: "7" }, { x: "Besarnya berbeda", y: "Sama besar, tanda sama" });
  await solvePreset3WithY(page, tap);

  // permainan
  await tebakFlow(page, tap);
  await kilatFlow(page, tap);

  // evaluasi akhir dikumpulkan kosong → skor 0 harus tetap diekspor sebagai 0
  await page.goto("/evaluasi");
  await act(tap, page.getByRole("radio", { name: "10", exact: true }));
  await act(tap, page.getByRole("radio", { name: "Tanpa timer" }));
  await act(tap, page.getByRole("button", { name: /Mulai Evaluasi/ }));
  await expect(page.getByText("0 dari 10 soal terjawab")).toBeVisible();
  await act(tap, page.getByRole("button", { name: "Kumpulkan Jawaban" }));
  await act(tap, page.getByRole("button", { name: "Ya, kumpulkan" }));
  await expect(page.getByText("Hasil Evaluasi Akhir")).toBeVisible();

  await completeAssessment(page, code, "posttest", { tap });

  // kunci tidak bocor pada seluruh respons soal
  expect(bodies.length).toBeGreaterThanOrEqual(3);
  for (const b of bodies) for (const f of ['"answer"', '"explanation"', '"verify"', '"hints"']) expect(b).not.toContain(f);

  // ---- ekspor + konsistensi
  await page.goto("/ekspor");
  const [dl] = await Promise.all([page.waitForEvent("download"), act(tap, page.getByRole("button", { name: "Unduh semua (.zip)" }))]);
  const fs = await import("node:fs/promises");
  const files = readZip(Buffer.from(await fs.readFile((await dl.path())!)));
  const parse = (n: string) => {
    const lines = files[n].toString("utf8").replace(/^﻿/, "").trim().split("\r\n").map((l) => l.split(";"));
    const h = lines[0];
    return { rows: lines.slice(1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))) as Record<string, string>[] };
  };
  const T = Object.fromEntries(["1_ringkasan_peserta", "2_asesmen_butir", "3_latihan_butir", "4_aktivitas", "5_metrik_proses", "6_refleksi"].map((n) => [n, parse(`${n}.csv`)]));
  for (const n of Object.keys(files)) expect(files[n].toString("utf8"), `${n} bebas nama`).not.toContain("Rahasia");

  const r = T["1_ringkasan_peserta"].rows;
  expect(r).toHaveLength(1);
  for (const [n, t] of Object.entries(T)) for (const row of t.rows) {
    expect(row.kode_peserta, `${n}: kode`).toBe(code);
    expect(row.id_perangkat, `${n}: perangkat`).toBe(r[0].id_perangkat);
  }
  const ab = T["2_asesmen_butir"].rows;
  for (const kind of ["pretest", "posttest"]) {
    const items = ab.filter((x) => x.jenis === kind);
    expect(items).toHaveLength(12);
    const correct = items.reduce((s, x) => s + Number(x.benar), 0);
    expect(Math.round((correct / 12) * 100)).toBe(Number(r[0][`skor_${kind}`]));
    expect(correct).toBe(Number(r[0][`benar_${kind}`]));
    expect(new Set(items.map((x) => x.id_rekaman)).size).toBe(1);
    const pre = kind === "pretest" ? "pre" : "post";
    for (const s of new Set(ab.map((x) => x.kompetensi))) expect(Number(r[0][`${pre}_${s}`])).toBe(items.filter((x) => x.kompetensi === s).reduce((a, x) => a + Number(x.benar), 0));
  }
  expect(Number(r[0].skor_pretest)).toBe(83);
  expect(Number(r[0].skor_posttest)).toBe(100);
  expect(r[0].evaluasi_akhir_terbaik).toBe("0"); // skor 0 diekspor sebagai 0, bukan kosong

  const act4 = new Map(T["4_aktivitas"].rows.map((x) => [x.id_event, x]));
  expect(act4.size).toBe(T["4_aktivitas"].rows.length);
  for (const n of ["3_latihan_butir", "5_metrik_proses", "6_refleksi"]) for (const row of T[n].rows) expect(act4.has(row.id_event), `${n}: ${row.id_event}`).toBe(true);
  const kinds = new Set(T["4_aktivitas"].rows.map((x) => x.jenis));
  for (const k of ["buka_materi", "mini_quiz", "latihan", "lab", "permainan", "refleksi", "evaluasi_akhir"]) expect(kinds.has(k), `jenis ${k}`).toBe(true);
  expect(Number(r[0].jumlah_event)).toBe(T["4_aktivitas"].rows.length);
  const lat = T["3_latihan_butir"].rows;
  expect(Number(r[0].soal_latihan_dikerjakan)).toBe(lat.length);
  expect(Number(r[0].total_percobaan)).toBe(lat.reduce((s, x) => s + Number(x.jumlah_percobaan), 0));
  expect(Number(r[0].total_petunjuk)).toBe(lat.reduce((s, x) => s + Number(x.petunjuk_dibuka), 0));
  expect(Number(r[0].soal_mandiri)).toBe(lat.reduce((s, x) => s + Number(x.mandiri), 0));
  expect(Number(r[0].refleksi_terisi) + Number(r[0].refleksi_dilewati)).toBe(T["4_aktivitas"].rows.filter((x) => x.jenis === "refleksi").length);
  for (const m of T["5_metrik_proses"].rows) expect(Number.isInteger(Number(m.nilai)), `metrik ${m.metrik}`).toBe(true);

  const g = await page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.guest.v1") ?? "{}") as { state: { xp: number }; events: unknown[] });
  expect(Number(r[0].xp)).toBe(g.state.xp);
  expect(Number(r[0].jumlah_event)).toBe(g.events.length);
  expect((await researchData(page)).assessments).toHaveLength(2);
  expect(errors).toEqual([]);
}
