import { expect, test, type Page } from "@playwright/test";
import { completeAnalysis, predictPair, solvePreset3WithY } from "./helpers";

const guestState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.guest.v1") ?? "{}").state);

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Preset 3: 2x + y = 10 dan x + y = 7 → (3, 4). */
const PRESET3 = { a1: "2", b1: "1", c1: "10", a2: "1", b2: "1", c2: "7" };

test("Learning Activity: analisis tugas menahan perencanaan sampai benar, dengan petunjuk bertingkat", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/lab?tab=elimination");
  await page.locator("#preset-elim").selectOption("3");
  const panel = page.getByTestId("analysis-panel");
  await expect(panel).toContainText("Tujuan bagian ini");
  const next = page.getByRole("button", { name: /Lanjut ke perencanaan/ });
  await expect(next).toBeDisabled();

  // tabel salah (lupa konstanta) → umpan balik, belum lanjut
  await page.getByLabel("Tabel: koefisien x pada persamaan (1)").fill("2");
  await page.getByLabel("Tabel: koefisien y pada persamaan (1)").fill("2");
  for (const [label, v] of [["konstanta persamaan (1)", "10"], ["koefisien x pada persamaan (2)", "1"], ["koefisien y pada persamaan (2)", "1"], ["konstanta persamaan (2)", "7"]] as const) {
    await page.getByLabel(`Tabel: ${label}`).fill(v);
  }
  await page.getByRole("button", { name: "Periksa tabel" }).click();
  await expect(panel).toContainText("Ada sel yang belum tepat");
  await expect(page.getByRole("radio", { name: /Menemukan pasangan/ })).toHaveCount(0); // tujuan baru muncul setelah tabel benar
  await page.getByLabel("Tabel: koefisien y pada persamaan (1)").fill("1");
  await page.getByRole("button", { name: "Periksa tabel" }).click();
  await expect(panel).toContainText("Tabel sudah tepat");

  // tujuan keliru → penjelasan, belum lanjut
  await page.getByRole("radio", { name: /Menemukan nilai x saja/ }).click();
  await expect(panel).toContainText("definisi penyelesaian SPLDV");
  await expect(page.getByRole("radiogroup", { name: "Hubungan koefisien x" })).toHaveCount(0);
  await page.getByRole("radio", { name: /Menemukan pasangan \(x, y\)/ }).click();

  await page.getByRole("button", { name: /Butuh petunjuk analisis/ }).click();
  await expect(panel).toContainText("Petunjuk analisis 1");
  // hubungan koefisien: y sama besar & tanda sama; x berbeda
  await page.getByRole("radiogroup", { name: "Hubungan koefisien y" }).getByRole("radio", { name: "Sama besar, tanda berlawanan" }).click();
  await expect(panel).toContainText("Bandingkan lagi angka");
  await expect(next).toBeDisabled();
  await page.getByRole("radiogroup", { name: "Hubungan koefisien y" }).getByRole("radio", { name: "Sama besar, tanda sama" }).click();
  await page.getByRole("radiogroup", { name: "Hubungan koefisien x" }).getByRole("radio", { name: "Besarnya berbeda" }).click();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByRole("heading", { name: /Rencanakan/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Learning Activity: rencana + prediksi + grafik + refleksi, dan XP lab tetap 15", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/lab?tab=elimination");
  await page.locator("#preset-elim").selectOption("3");
  await completeAnalysis(page, PRESET3, { x: "Besarnya berbeda", y: "Sama besar, tanda sama" });

  // ---- perencanaan: variabel + alasan, dengan tanggapan yang jujur
  await page.getByRole("button", { name: /^x Koefisien: 2 dan 1/ }).click();
  await expect(page.getByRole("button", { name: /Lanjut ke pengali/ })).toBeDisabled(); // alasan wajib
  await page.getByRole("radio", { name: "Koefisiennya sudah sama besar" }).click();
  await expect(page.getByTestId("reason-feedback")).toContainText("Periksa lagi"); // x belum sama besar
  await page.getByRole("button", { name: /^y Koefisien: 1 dan 1/ }).click();
  await expect(page.getByTestId("reason-feedback")).toContainText("sudah sama besar, jadi tidak perlu dikalikan");
  await page.getByRole("button", { name: /Lanjut ke pengali/ }).click();

  // ---- grafik hadir sejak perencanaan, dan teksnya mengikuti langkah
  const plot = page.getByTestId("coordinate-plot");
  await expect(plot).toContainText("Setiap persamaan adalah sebuah garis");
  await page.getByLabel("Persamaan (1) ×").fill("1");
  await page.getByLabel("Persamaan (2) ×").fill("1");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Kalikan persamaan/ }).click();
  await expect(plot).toContainText("Garis putus-putus");
  await page.getByRole("button", { name: /Pilih operasi/ }).click();
  await page.getByRole("button", { name: "Kurangkan (−)" }).click();

  // ---- prediksi sebelum eliminasi dilakukan
  await expect(page.getByRole("button", { name: /Lakukan eliminasi/ })).toBeDisabled();
  await page.getByLabel("Prediksi koefisien x").fill("2");
  await page.getByLabel("Prediksi konstanta").fill("3");
  await page.getByRole("button", { name: "Kunci prediksi" }).click();
  await page.getByRole("button", { name: /Lakukan eliminasi/ }).click();
  await expect(page.getByTestId("prediction-result")).toContainText("Hasil nyata: 1x = 3");
  await expect(page.getByTestId("prediction-result")).toContainText("Berbeda dari prediksimu");
  await expect(plot).toContainText("Garis hijau adalah persamaan hasil eliminasi");

  // ---- non-linear: buka kembali analisis, ubah rencana, lalu kembali ke y
  await page.getByRole("button", { name: "Buka kembali analisisku" }).click();
  await expect(page.getByTestId("analysis-summary")).toContainText("Koefisien y: 1 dan 1");
  await page.getByRole("button", { name: "Tutup analisisku" }).click();
  await page.getByRole("button", { name: "Ubah rencana" }).click();
  await expect(page.getByRole("heading", { name: /Rencanakan/ })).toBeVisible();
  await expect(page.getByTestId("analysis-panel")).toHaveCount(0); // analisis tidak diulang
  await page.getByRole("button", { name: /^y Koefisien: 1 dan 1/ }).click();
  await page.getByRole("radio", { name: "Pengali yang diperlukan lebih kecil" }).click();
  await page.getByRole("button", { name: /Lanjut ke pengali/ }).click();
  await page.getByLabel("Persamaan (1) ×").fill("1");
  await page.getByLabel("Persamaan (2) ×").fill("1");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Kalikan persamaan/ }).click();
  await page.getByRole("button", { name: /Pilih operasi/ }).click();
  await page.getByRole("button", { name: "Kurangkan (−)" }).click();
  await page.getByLabel("Prediksi koefisien x").fill("-1");
  await page.getByLabel("Prediksi konstanta").fill("-3");
  await page.getByRole("button", { name: "Kunci prediksi" }).click();
  await page.getByRole("button", { name: /Lakukan eliminasi/ }).click();
  await expect(page.getByTestId("prediction-result")).toContainText("setara");
  await page.getByLabel("x =").fill("3");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Cari y/ }).click();
  await page.getByLabel("y =").fill("4");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Periksa jawaban/ }).click();
  await expect(page.getByText("{(3, 4)}")).toBeVisible();

  // ---- hubungan aljabar–grafik
  await page.getByRole("button", { name: /Tandai penyelesaianku/ }).click();
  await expect(page.getByTestId("graph-link")).toContainText("berada pada garis (1), garis (2), dan garis hasil eliminasi");
  await expect(plot.locator("svg")).toContainText("(3, 4)");

  // ---- refleksi (0 XP, boleh dikirim)
  await page.getByRole("button", { name: /Lanjut ke refleksi/ }).click();
  // perbandingan tidak membocorkan strategi: tabel & formulir tertutup sampai siswa menebak dulu
  await expect(page.getByTestId("plan-comparison")).toHaveCount(0);
  await expect(page.getByTestId("reflection-form")).toHaveCount(0);
  await expect(page.getByTestId("compare-guess")).toContainText("variabel mana yang memerlukan pengali lebih kecil");
  await expect(page.locator("body")).not.toContainText("×1, ×2");
  await page.getByRole("radiogroup", { name: /Tebakan variabel/ }).getByRole("radio", { name: "Variabel y" }).click();
  await expect(page.getByTestId("compare-guess-result")).toContainText("sesuai dengan tabel");
  await expect(page.getByTestId("plan-comparison")).toContainText("(pilihanmu)");
  await expect(page.getByTestId("plan-comparison")).toContainText("×1, ×2"); // alternatif x memerlukan pengali lebih besar
  await page.getByRole("radiogroup", { name: /Bagian mana yang paling menantang/ }).getByRole("radio", { name: "Menghubungkan dengan grafik" }).click();
  await page.getByRole("radiogroup", { name: /Dibanding variabel yang lain/ }).getByRole("radio", { name: "Lebih ringan" }).click();
  await page.getByRole("radio", { name: "4 dari 5" }).click();
  await page.getByRole("button", { name: "Kirim refleksi" }).click();
  await expect(page.getByTestId("reflection-done")).toContainText("tersimpan");

  const state = await guestState(page);
  expect(state.counters.reflections).toBe(1);
  expect(state.counters.labTools).toContain("elimination");
  // XP: 15 untuk alat lab (sekali per hari); refleksi dan Learning Activity tidak menambah XP
  const sumXp = (type: string) => state.activity.filter((a: { type: string }) => a.type === type).reduce((s: number, a: { xp: number }) => s + a.xp, 0);
  expect(sumXp("lab")).toBe(15);
  const reflectionXp = sumXp("reflection");
  expect(reflectionXp).toBe(0);
  expect(errors).toEqual([]);
});

test("Learning Activity: refleksi boleh dilewati, tidak menambah XP", async ({ page }) => {
  await page.goto("/lab?tab=elimination");
  await page.locator("#preset-elim").selectOption("3");
  await completeAnalysis(page, PRESET3, { x: "Besarnya berbeda", y: "Sama besar, tanda sama" });
  await page.getByRole("button", { name: /^y Koefisien: 1 dan 1/ }).click();
  await page.getByRole("radio", { name: "Memilih saja" }).click();
  await expect(page.getByTestId("reason-feedback")).toContainText("Tidak apa-apa");
  await page.getByRole("button", { name: /Lanjut ke pengali/ }).click();
  await page.getByLabel("Persamaan (1) ×").fill("1");
  await page.getByLabel("Persamaan (2) ×").fill("1");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Kalikan persamaan/ }).click();
  await page.getByRole("button", { name: /Pilih operasi/ }).click();
  await page.getByRole("button", { name: "Kurangkan (−)" }).click();
  await page.getByRole("button", { name: "Lewati prediksi" }).click(); // prediksi dapat dilewati
  await page.getByRole("button", { name: /Lakukan eliminasi/ }).click();
  await expect(page.getByTestId("prediction-result")).toHaveCount(0);
  await page.getByLabel("x =").fill("3");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Cari y/ }).click();
  await page.getByLabel("y =").fill("4");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Periksa jawaban/ }).click();
  await page.getByRole("button", { name: /Lanjut ke refleksi/ }).click();
  await expect(page.getByRole("button", { name: "Kirim refleksi" })).toHaveCount(0); // formulir tertutup sampai siswa menebak
  await page.getByRole("radiogroup", { name: /Tebakan variabel/ }).getByRole("radio", { name: "Belum tahu" }).click();
  await expect(page.getByRole("button", { name: "Kirim refleksi" })).toBeDisabled(); // belum ada jawaban
  await page.getByRole("button", { name: "Lewati refleksi" }).click();
  await expect(page.getByTestId("reflection-done")).toContainText("dilewati");
  const state = await guestState(page);
  expect(state.counters.reflections).toBe(0);
  expect(state.counters.reflectionsSkipped).toBe(1);
  expect(state.xp).toBeGreaterThanOrEqual(15);
});

test("Uji Pasangan: wajib prediksi sebelum uji, penyelesaian dibuka setelah dua kali mencoba", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/lab?tab=elimination");
  await page.getByRole("tab", { name: /Uji Pasangan/ }).click();
  const test1 = page.getByRole("button", { name: "Uji Pasangan", exact: true });
  await page.getByLabel("Nilai x").fill("5");
  await page.getByLabel("Nilai y").fill("2");
  await expect(test1).toBeDisabled(); // belum memprediksi
  await expect(page.getByRole("button", { name: /Lihat penyelesaian sebenarnya/ })).toBeDisabled();

  await predictPair(page, true, true); // sebenarnya (2) tidak terpenuhi: 5 − 2 = 3 ≠ 1
  await test1.click();
  await expect(page.getByTestId("pair-prediction-result")).toContainText("persamaan (2) belum tepat");
  await expect(page.getByRole("button", { name: /Lihat penyelesaian sebenarnya/ })).toBeDisabled(); // baru 1 uji
  await expect(test1).toBeDisabled(); // prediksi harus dibuat ulang untuk uji berikutnya

  await page.getByLabel("Nilai x").fill("4");
  await page.getByLabel("Nilai y").fill("3");
  await predictPair(page, true, true);
  await test1.click();
  await expect(page.getByText(/adalah penyelesaian SPLDV ini/)).toBeVisible();
  await expect(page.getByTestId("pair-prediction-result")).toContainText("Kedua prediksimu tepat");
  await expect(page.getByRole("button", { name: /Lihat penyelesaian sebenarnya/ })).toBeEnabled();

  // refleksi singkat
  await page.getByRole("radio", { name: "Menghitung dengan substitusi" }).click();
  await page.getByRole("radio", { name: "4 dari 5" }).click();
  await page.getByRole("button", { name: "Kirim refleksi" }).click();
  await expect(page.getByText("Terima kasih, refleksimu tersimpan.")).toBeVisible();
  const state = await guestState(page);
  expect(state.counters.reflections).toBe(1);
  expect(state.counters.labTools).toContain("checker");
  expect(errors).toEqual([]);
});

test("metrik tercatat saat menyelesaikan dan saat rencana diubah sesudahnya (XP tetap sekali)", async ({ page }) => {
  await page.goto("/lab?tab=elimination");
  await page.locator("#preset-elim").selectOption("3");
  await completeAnalysis(page, PRESET3, { x: "Besarnya berbeda", y: "Sama besar, tanda sama" });
  await solvePreset3WithY(page);
  const lab = async () => (await guestState(page)).activity.filter((a: { type: string }) => a.type === "lab");
  await expect.poll(async () => (await lab()).length).toBe(1); // selesai pertama
  await page.getByRole("button", { name: "Coba variabel lain" }).click(); // ubah rencana setelah selesai
  await expect.poll(async () => (await lab()).length).toBe(2); // eksplorasi alternatif tercatat
  const rows = await lab();
  expect(rows.reduce((s: number, a: { xp: number }) => s + a.xp, 0)).toBe(15); // XP hanya sekali per hari
  expect(rows.some((a: { detail: string }) => a.detail === "Mengulang eksplorasi")).toBe(true);
});
