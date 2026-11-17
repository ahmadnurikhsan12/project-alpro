import { test } from "@playwright/test";
import { kilatFlow, lessonFlow, tebakFlow } from "./stage4-flows";

/** Tahap 4 pada tampilan ponsel (Pixel 7): ketukan, tabel, grafik, dan formulir refleksi. */
test("mobile: materi Modul 4 (prediksi, tabel, grafik, refleksi)", async ({ page }) => {
  await lessonFlow(page, true, "konsep-metode-eliminasi", { thinkWrong: "Suku x", thinkRight: /^Karena kedua persamaan benar/, plotText: "(7, 3)" });
});

test("mobile: materi Modul 6 (tabel pemeriksaan & grafik)", async ({ page }) => {
  await lessonFlow(page, true, "memeriksa-kebenaran-solusi", { thinkWrong: "Ya, karena memenuhi persamaan pertama", thinkRight: /^Mengulang perhitungan/, plotText: "(4, 1)" });
});

test("mobile: Tebak Nilai dengan prediksi, alasan, dan refleksi", async ({ page }) => {
  await tebakFlow(page, true);
});

test("mobile: Eliminasi Kilat dengan refleksi kecepatan–ketelitian", async ({ page }) => {
  await kilatFlow(page, true);
});
