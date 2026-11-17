import { expect, test } from "@playwright/test";
import { createAutoCode } from "./stage5-helpers";

test("data lokal rusak/versi lain TIDAK ditimpa: cadangan dibuat dan peringatan tampil", async ({ page }) => {
  await page.goto("/asesmen");
  await page.evaluate(() => {
    localStorage.setItem("mathquest.research.v1", "{rusak");
    localStorage.setItem("mathquest.guest.v1", JSON.stringify({ state: { version: 2, xp: 999 }, events: [{ id: "x" }] }));
  });
  await page.reload();
  await expect(page.getByTestId("storage-warning")).toBeVisible();
  const code = await createAutoCode(page);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  const backups = keys.filter((k) => k.includes(".backup-"));
  expect(backups.some((k) => k.startsWith("mathquest.research.v1.backup-"))).toBe(true);
  const rb = await page.evaluate((k) => localStorage.getItem(k), backups.find((k) => k.startsWith("mathquest.research.v1"))!);
  expect(rb).toBe("{rusak"); // isi asli utuh
  // data baru tersimpan dan valid
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.research.v1")!));
  expect(r.participant.code).toBe(code);
  // aktivitas belajar membuat penyimpanan progres baru, dan data versi lain tetap ada di cadangan
  await page.goto("/materi/konsep-metode-eliminasi");
  await page.waitForTimeout(500);
  const gb = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("mathquest.guest.v1.backup-")).map((k) => localStorage.getItem(k)));
  expect(gb.length).toBe(1);
  expect(JSON.parse(gb[0]!).state.xp).toBe(999);
  await page.getByRole("button", { name: "Saya sudah membaca" }).click();
  await expect(page.getByTestId("storage-warning")).toHaveCount(0);
  // cadangan tidak hilang setelah peringatan ditutup
  expect((await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes(".backup-")))).length).toBeGreaterThanOrEqual(2);
});

test("data asesmen yang valid tidak pernah dicadangkan atau diganti", async ({ page }) => {
  await page.goto("/asesmen");
  const code = await createAutoCode(page);
  const before = await page.evaluate(() => localStorage.getItem("mathquest.research.v1"));
  await page.reload();
  await page.goto("/ekspor");
  expect(await page.evaluate(() => localStorage.getItem("mathquest.research.v1"))).toBe(before);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes(".backup-")))).toHaveLength(0);
  await expect(page.getByTestId("storage-warning")).toHaveCount(0);
  expect(code).toMatch(/^MQ-/);
});

test("pembatas laju server: kiriman berlebihan dari satu alamat ditolak 429, alamat lain tidak terganggu", async ({ request }) => {
  const post = (ip: string) => request.post("/api/assessment/submit", { headers: { "x-forwarded-for": ip }, data: { form: "A", answers: {} } });
  for (let i = 0; i < 60; i++) expect((await post("198.51.100.7")).status()).toBe(200);
  const blocked = await post("198.51.100.7");
  expect(blocked.status()).toBe(429);
  expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);
  expect((await post("198.51.100.8")).status()).toBe(200);
});

test("kontainer gulir horizontal dapat difokuskan keyboard dan tabel punya judul kolom terbaca", async ({ page }) => {
  await page.goto("/materi/sistem-persamaan-linear-dua-variabel");
  for (const el of await page.locator(".overflow-x-auto").all()) await expect(el).toHaveAttribute("tabindex", "0");
  await page.goto("/lab?tab=elimination");
  await page.locator("#preset-elim").selectOption("3");
  await expect(page.getByRole("list", { name: "Langkah simulasi" })).toHaveAttribute("tabindex", "0");
  for (const th of await page.locator("th").all()) expect((await th.innerText()).trim().length, "th tidak boleh kosong").toBeGreaterThan(0);
  const levels = await page.locator("h1,h2,h3").evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
  for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], "urutan judul tidak boleh melompat").toBeLessThanOrEqual(1);
});
