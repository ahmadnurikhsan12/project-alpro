import { type Page } from "@playwright/test";

const CELL_LABEL: Record<string, string> = {
  a1: "Tabel: koefisien x pada persamaan (1)",
  b1: "Tabel: koefisien y pada persamaan (1)",
  c1: "Tabel: konstanta persamaan (1)",
  a2: "Tabel: koefisien x pada persamaan (2)",
  b2: "Tabel: koefisien y pada persamaan (2)",
  c2: "Tabel: konstanta persamaan (2)",
};

/** Menyelesaikan Analisis Tugas pada Simulasi Eliminasi (tabel, tujuan, hubungan koefisien). */
export async function completeAnalysis(page: Page, table: Record<string, string>, relations: { x?: string; y?: string }) {
  for (const [id, value] of Object.entries(table)) await page.getByLabel(CELL_LABEL[id]).fill(value);
  await page.getByRole("button", { name: "Periksa tabel" }).click();
  await page.getByRole("radio", { name: /Menemukan pasangan \(x, y\)/ }).click();
  for (const v of ["x", "y"] as const) {
    const label = relations[v];
    if (label) await page.getByRole("radiogroup", { name: `Hubungan koefisien ${v}` }).getByRole("radio", { name: label }).click();
  }
  await page.getByRole("button", { name: /Lanjut ke perencanaan/ }).click();
}

/** Memilih prediksi untuk persamaan (1) dan (2) pada Uji Pasangan. */
export async function predictPair(page: Page, p1: boolean, p2: boolean) {
  await page.getByRole("radiogroup", { name: "Prediksi persamaan (1)" }).getByRole("radio", { name: p1 ? "Terpenuhi" : "Tidak terpenuhi", exact: true }).click();
  await page.getByRole("radiogroup", { name: "Prediksi persamaan (2)" }).getByRole("radio", { name: p2 ? "Terpenuhi" : "Tidak terpenuhi", exact: true }).click();
}

/** Preset 3 (2x + y = 10, x + y = 7): dari perencanaan memilih y sampai halaman "Periksa kebenaran solusi". */
export async function solvePreset3WithY(page: Page, tap = false) {
  const click = (l: import("@playwright/test").Locator) => (tap ? l.tap() : l.click());
  await click(page.getByRole("button", { name: /^y Koefisien: 1 dan 1/ }));
  await click(page.getByRole("radio", { name: "Pengali yang diperlukan lebih kecil" }));
  await click(page.getByRole("button", { name: /Lanjut ke pengali/ }));
  await page.getByLabel("Persamaan (1) ×").fill("1");
  await page.getByLabel("Persamaan (2) ×").fill("1");
  await click(page.getByRole("button", { name: "Periksa", exact: true }));
  await click(page.getByRole("button", { name: /Kalikan persamaan/ }));
  await click(page.getByRole("button", { name: /Pilih operasi/ }));
  await click(page.getByRole("button", { name: "Kurangkan (−)" }));
  await page.getByLabel("Prediksi koefisien x").fill("1");
  await page.getByLabel("Prediksi konstanta").fill("3");
  await click(page.getByRole("button", { name: "Kunci prediksi" }));
  await click(page.getByRole("button", { name: /Lakukan eliminasi/ }));
  await page.getByLabel("x =").fill("3");
  await click(page.getByRole("button", { name: "Periksa", exact: true }));
  await click(page.getByRole("button", { name: /Cari y/ }));
  await page.getByLabel("y =").fill("4");
  await click(page.getByRole("button", { name: "Periksa", exact: true }));
  await click(page.getByRole("button", { name: /Periksa jawaban/ }));
}
