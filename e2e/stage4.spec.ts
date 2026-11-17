import { expect, test } from "@playwright/test";
import { guestData, kilatFlow, lessonFlow, tebakFlow } from "./stage4-flows";

function trackErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test("materi Modul 4: prediksi, tabel, grafik, dan refleksi", async ({ page }) => {
  const errors = trackErrors(page);
  await lessonFlow(page, false, "konsep-metode-eliminasi", { thinkWrong: "Suku x", thinkRight: /^Karena kedua persamaan benar/, plotText: "(7, 3)" });
  expect(errors).toEqual([]);
});

test("materi Modul 5: pilih variabel, satu sistem tiga representasi", async ({ page }) => {
  const errors = trackErrors(page);
  await lessonFlow(page, false, "langkah-penyelesaian-metode-eliminasi", { thinkWrong: "Variabel y", thinkRight: /^Garis datar yang melewati/, plotText: "(3, 2)" });
  await expect(page.getByTestId("coordinate-plot").first().locator("svg")).toContainText("y = 2 (hasil eliminasi)");
  expect(errors).toEqual([]);
});

test("materi Modul 6: memeriksa kedua persamaan, tabel & grafik pemeriksaan", async ({ page }) => {
  const errors = trackErrors(page);
  await lessonFlow(page, false, "memeriksa-kebenaran-solusi", { thinkWrong: "Ya, karena memenuhi persamaan pertama", thinkRight: /^Mengulang perhitungan/, plotText: "(4, 1)" });
  await expect(page.getByTestId("lesson-table").first()).toContainText("Bukan penyelesaian");
  expect(errors).toEqual([]);
});

test("Tebak Nilai: prediksi dan alasan wajib sebelum mencoba, refleksi sesudah bermain", async ({ page }) => {
  const errors = trackErrors(page);
  await tebakFlow(page, false);
  expect(errors).toEqual([]);
});

test("Eliminasi Kilat: penjelasan saat salah, metrik kecepatan–ketelitian, dan refleksi", async ({ page }) => {
  const errors = trackErrors(page);
  await kilatFlow(page, false);
  expect(errors).toEqual([]);
});

test("Guest Mode: data pembelajaran bertahan setelah browser ditutup dan dibuka lagi", async ({ page, browser }) => {
  await lessonFlow(page, false, "konsep-metode-eliminasi", { thinkWrong: "Suku x", thinkRight: /^Karena kedua persamaan benar/, plotText: "(7, 3)" });
  const before = await guestData(page);
  const beforeRefl = before.events.filter((e) => e.type === "reflection");
  expect(beforeRefl.length).toBeGreaterThanOrEqual(1);

  // "tutup browser": ambil penyimpanan, buat konteks baru (sesi baru) dengan penyimpanan yang sama
  const storage = await page.context().storageState();
  const ctx2 = await browser.newContext({ storageState: storage });
  const page2 = await ctx2.newPage();
  await page2.goto("/dashboard");
  const after = await guestData(page2);
  expect(after.events.filter((e) => e.type === "reflection")).toEqual(beforeRefl);
  expect(after.state.counters.reflections).toBe(before.state.counters.reflections);
  expect(after.state.xp).toBe(before.state.xp);
  await ctx2.close();

  // data lama tidak diubah ketika aplikasi memuat ulang
  await page.reload();
  expect((await guestData(page)).events).toEqual(before.events);
});
