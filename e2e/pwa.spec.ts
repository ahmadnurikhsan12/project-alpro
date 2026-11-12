import { expect, test } from "@playwright/test";

test("PWA: manifest valid & ikon tersedia", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  expect(m.start_url).toContain("/dashboard");
  expect(m.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
  expect(m.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  for (const i of m.icons) expect((await request.get(i.src)).ok(), i.src).toBe(true);
  expect((await request.get("/icons/apple-touch-icon.png")).ok()).toBe(true);
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});

test("PWA: service worker aktif & halaman yang pernah dibuka tetap terbuka saat offline", async ({ page, context }) => {
  await page.goto("/dashboard");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 30_000 });
  // muat ulang agar halaman dikendalikan SW & tersimpan di cache
  await page.reload();
  await page.goto("/materi");
  await expect(page.getByRole("heading", { name: "Materi SPLDV" })).toBeVisible();

  await context.setOffline(true);
  await page.goto("/materi");
  await expect(page.getByRole("heading", { name: "Materi SPLDV" })).toBeVisible();
  // halaman yang belum pernah dibuka → halaman offline yang ramah
  await page.goto("/games/misi-belanja");
  await expect(page.getByRole("heading", { name: "Kamu sedang offline" })).toBeVisible();
  await context.setOffline(false);
});
