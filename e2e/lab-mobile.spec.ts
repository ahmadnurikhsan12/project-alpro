import { expect, test, type Page } from "@playwright/test";
import { completeAnalysis, predictPair, solvePreset3WithY } from "./helpers";

/** Uji khusus tampilan ponsel (Pixel 7) untuk seluruh alur Lab: tombol, tabel, grafik, dan formulir refleksi. */
const PRESET3 = { a1: "2", b1: "1", c1: "10", a2: "1", b2: "1", c2: "7" };
const guestState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.guest.v1") ?? "{}").state);

async function noPageOverflow(page: Page, where: string) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(o.sw, `scroll horizontal pada: ${where}`).toBeLessThanOrEqual(o.iw);
}

/** Semua kontrol interaktif yang terlihat harus berukuran cukup untuk disentuh dan tidak keluar layar. */
async function controlsReachable(page: Page, where: string) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    const vw = window.innerWidth;
    document.querySelectorAll<HTMLElement>("button, input, select, [role=radio], [role=tab]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return; // tersembunyi
      const label = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30);
      if (r.height < 32) out.push(`terlalu pendek (${Math.round(r.height)}px): ${label}`);
      if (r.left < -1 || r.right > vw + 1) out.push(`keluar layar: ${label}`);
    });
    return out;
  });
  expect(bad, where).toEqual([]);
}

test("Lab di ponsel: analisis, rencana, prediksi, grafik, tabel perbandingan, dan refleksi", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/lab?tab=elimination");
  await page.locator("#preset-elim").selectOption("3");
  await noPageOverflow(page, "awal lab");

  // ---- Analisis tugas: tabel 2×3 harus muat dan dapat diisi di layar sempit
  const panel = page.getByTestId("analysis-panel");
  await panel.scrollIntoViewIfNeeded();
  await noPageOverflow(page, "panel analisis");
  await controlsReachable(page, "analisis");
  const tableBox = await panel.locator("table").boundingBox();
  const vw = page.viewportSize()!.width;
  expect(tableBox!.x + tableBox!.width).toBeLessThanOrEqual(vw);
  await completeAnalysis(page, PRESET3, { x: "Besarnya berbeda", y: "Sama besar, tanda sama" });

  // ---- Rencana: kartu variabel, alasan, grafik
  await noPageOverflow(page, "rencana");
  await controlsReachable(page, "rencana");
  const plot = page.getByTestId("coordinate-plot");
  await plot.scrollIntoViewIfNeeded();
  const svgBox = await plot.locator("svg").boundingBox();
  expect(svgBox!.width).toBeGreaterThan(200);
  expect(svgBox!.x).toBeGreaterThanOrEqual(0);
  expect(svgBox!.x + svgBox!.width).toBeLessThanOrEqual(vw);
  expect(svgBox!.height).toBeGreaterThan(200); // grafik tetap terbaca (tidak gepeng)
  await expect(plot).toContainText("(1)");

  // ---- seluruh langkah memakai ketukan (tap)
  await solvePreset3WithY(page, true);
  await expect(page.getByText("{(3, 4)}")).toBeVisible();
  await noPageOverflow(page, "periksa solusi");
  await controlsReachable(page, "periksa solusi");
  await page.getByRole("button", { name: /Tandai penyelesaianku/ }).tap();
  await expect(page.getByTestId("graph-link")).toBeVisible();
  await expect(plot.locator("svg")).toContainText("(3, 4)");
  await noPageOverflow(page, "setelah titik ditandai");

  // ---- Refleksi: tebak dulu, tabel perbandingan, formulir
  await page.getByRole("button", { name: /Lanjut ke refleksi/ }).tap();
  await noPageOverflow(page, "tebakan perbandingan");
  await controlsReachable(page, "tebakan perbandingan");
  await page.getByRole("radiogroup", { name: /Tebakan variabel/ }).getByRole("radio", { name: "Sama saja" }).tap();
  const table = page.getByTestId("plan-comparison");
  await expect(table).toBeVisible();
  await noPageOverflow(page, "tabel perbandingan"); // tabel boleh bergulir di dalam wadahnya, bukan halaman
  const scrollable = await table.evaluate((el) => el.scrollWidth >= el.clientWidth);
  expect(scrollable).toBe(true);
  await controlsReachable(page, "tabel perbandingan");

  const form = page.getByTestId("reflection-form");
  await form.scrollIntoViewIfNeeded();
  await controlsReachable(page, "formulir refleksi");
  await page.getByRole("radiogroup", { name: /Bagian mana yang paling menantang/ }).getByRole("radio", { name: "Menghubungkan dengan grafik" }).tap();
  await page.getByRole("radio", { name: "5 dari 5" }).tap();
  await page.getByRole("button", { name: "Kirim refleksi" }).tap();
  await expect(page.getByTestId("reflection-done")).toBeVisible();
  await noPageOverflow(page, "refleksi terkirim");

  const state = await guestState(page);
  expect(state.counters.reflections).toBe(1);
  expect(errors).toEqual([]);
});

test("Uji Pasangan di ponsel: prediksi, hasil, dan refleksi dapat dipakai dengan sentuhan", async ({ page }) => {
  await page.goto("/lab?tab=elimination");
  await page.getByRole("tab", { name: /Uji Pasangan/ }).tap();
  await noPageOverflow(page, "uji pasangan");
  await controlsReachable(page, "uji pasangan");
  await page.getByLabel("Nilai x").fill("5");
  await page.getByLabel("Nilai y").fill("2");
  await predictPair(page, true, true);
  await page.getByRole("button", { name: "Uji Pasangan", exact: true }).tap();
  await expect(page.getByTestId("pair-prediction-result")).toBeVisible();
  await noPageOverflow(page, "hasil uji");
  await page.getByLabel("Nilai x").fill("4");
  await page.getByLabel("Nilai y").fill("3");
  await predictPair(page, true, true);
  await page.getByRole("button", { name: "Uji Pasangan", exact: true }).tap();
  await expect(page.getByText(/adalah penyelesaian SPLDV ini/)).toBeVisible();
  await controlsReachable(page, "refleksi uji pasangan");
  await page.getByRole("radio", { name: "Menghitung dengan substitusi" }).tap();
  await page.getByRole("radio", { name: "Memenuhi kedua persamaan sekaligus" }).tap();
  await page.getByRole("radio", { name: "3 dari 5" }).tap();
  await page.getByRole("button", { name: "Kirim refleksi" }).tap();
  await expect(page.getByText("Terima kasih, refleksimu tersimpan.")).toBeVisible();
  await noPageOverflow(page, "akhir uji pasangan");
});

test("Grafik Lab di ponsel tetap terbaca tanpa scroll horizontal", async ({ page }) => {
  await page.goto("/lab?tab=graph");
  await noPageOverflow(page, "grafik");
  await expect(page.getByText("Berpotongan di satu titik → tepat satu penyelesaian")).toBeVisible();
});
