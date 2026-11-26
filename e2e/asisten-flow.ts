import { expect, type Locator, type Page } from "@playwright/test";

const act = (tap: boolean, l: Locator) => (tap ? l.tap() : l.click());

/** Menyelesaikan soal "Jajan di Kantin" dari awal sampai refleksi, dengan satu rangkaian kesalahan untuk melihat bantuan naik. */
export async function asistenFlow(page: Page, tap: boolean) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto("/asisten");
  await expect(page.getByTestId("asisten-status")).toBeVisible();
  await act(tap, page.getByRole("button", { name: "Kerjakan" }).first());
  const fb = page.getByTestId("asisten-feedback");
  const check = () => act(tap, page.getByRole("button", { name: "Periksa", exact: true }));
  const next = () => act(tap, page.getByRole("button", { name: "Lanjut ke tahap berikutnya" }));
  const pick = (group: string, option: string) => act(tap, page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option, exact: true }));

  // 1. pahami
  await pick("Apa arti x?", "Harga satu roti (dalam ribu rupiah)");
  await pick("Apa arti y?", "Harga satu susu (dalam ribu rupiah)");
  await pick("Apa yang ditanyakan?", "Total harga 3 roti dan 2 susu");
  await check();
  await expect(fb).toContainText("Tepat");
  await next();

  // 2. model
  const fill = async (v: string[]) => {
    let i = 0;
    for (const row of [1, 2]) for (const label of ["koefisien x", "koefisien y", "total"]) await page.getByLabel(`Persamaan ${row}: ${label}`).fill(v[i++]);
  };
  await fill(["1", "2", "11", "1", "1", "8"]);
  await check();
  await expect(fb).toContainText("tertukar");
  await expect(fb).toContainText("Bantuan tingkat 1");
  await check();
  await expect(fb).toContainText("Bantuan tingkat 2");
  await check();
  await expect(fb).toContainText("Bantuan tingkat 3");
  await fill(["2", "1", "11", "1", "1", "8"]);
  await check();
  await expect(fb).toContainText("sesuai dengan cerita");
  await expect(page.getByTestId("catatan-kerja")).toContainText("2x + y = 11");
  await next();

  // 3. rencana
  await pick("Variabel yang dieliminasi", "y");
  await pick("Operasi setelah koefisiennya sama", "Dikurangkan");
  await pick("Alasan memilih variabel itu", "Koefisiennya sudah sama besar");
  await check();
  await expect(fb).toContainText("masuk akal");
  await next();

  // 4. selesaikan (minta bantuan dulu)
  await act(tap, page.getByRole("button", { name: "Minta bantuan" }));
  await expect(fb).toContainText("Bantuan tingkat 1");
  await page.getByLabel("x =").fill("3");
  await page.getByLabel("y =").fill("5");
  await check();
  await expect(fb).toContainText("memenuhi kedua persamaan");
  await next();

  // 5. tafsirkan
  await page.getByLabel(/Jawaban cerita/).fill("19");
  await check();
  await expect(fb).toContainText("konteks cerita");
  await next();

  // 6. refleksi
  const done = page.getByRole("button", { name: "Selesaikan" });
  await expect(done).toBeDisabled();
  await pick("Tahap mana yang paling menantang bagimu?", "Membuat persamaan");
  await pick("Bagaimana kamu memastikan jawabanmu benar?", "Substitusi ke kedua persamaan");
  await pick("Untuk masalah lain, apa langkah pertamamu?", "Menentukan arti variabel");
  await act(tap, done);
  await expect(page.getByTestId("asisten-selesai")).toBeVisible();

  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(o.sw).toBeLessThanOrEqual(o.iw);
  expect(errors).toEqual([]);
}
