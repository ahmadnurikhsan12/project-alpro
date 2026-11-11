import { expect, test } from "@playwright/test";

const PAGES = ["/", "/dashboard", "/materi", "/materi/langkah-penyelesaian-metode-eliminasi", "/lab", "/lab?tab=graph", "/lab?tab=checker", "/latihan", "/games", "/games/tebak-nilai", "/evaluasi", "/pencapaian", "/riwayat", "/profil", "/masuk"];

for (const p of PAGES) {
  test(`tanpa scroll horizontal di ponsel: ${p}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `lebar berlebih ${overflow}px`).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test("menu mobile dapat dibuka dan ditutup dengan keyboard", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Buka menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu navigasi" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu navigasi" })).toHaveCount(0);
});
