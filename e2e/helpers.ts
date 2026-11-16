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
