import { expect, test } from "@playwright/test";

test("halaman Tentang RMT: penjelasan, batasan klaim jujur, dan tautan menu", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Tentang RMT" }).first().click();
  await expect(page).toHaveURL(/\/tentang$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tentang MathQuest dan RMT");
  for (const h of ["Apa itu RMT?", "Tiga kegiatan belajar (Learning Activity)", "Di mana RMT muncul di MathQuest?", "Yang perlu kamu ketahui (batasan)", "Data dan privasi"]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  for (const t of ["Analisis tugas", "Perencanaan tindakan", "Refleksi"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
  // klaim tidak berlebihan
  await expect(page.getByText("tidak menggantikan guru")).toBeVisible();
  await expect(page.getByText("bukan penerapan penuh LPAD")).toBeVisible();
  await expect(page.getByText("belum terbukti efektif")).toBeVisible();
  const levels = await page.locator("h1,h2,h3").evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
  for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
