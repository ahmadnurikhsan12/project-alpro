import { expect, test, type Page } from "@playwright/test";
import { completeAssessment, createAutoCode, noOverflow, readZip, researchData } from "./stage5-helpers";

/** Tahap 5 pada tampilan ponsel (Pixel 7): ketukan, tata letak, dan unduhan. */
async function controlsReachable(page: Page, where: string) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    const vw = window.innerWidth;
    document.querySelectorAll<HTMLElement>("main button, main input:not([type=file]), main select, main [role=radio]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const label = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30);
      if (r.height < 32) out.push(`terlalu pendek (${Math.round(r.height)}px): ${label}`);
      if (r.left < -1 || r.right > vw + 1) out.push(`keluar layar: ${label}`);
    });
    return out;
  });
  expect(bad, where).toEqual([]);
}

test("mobile: kode peserta, pretest, posttest dengan ketukan", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/asesmen");
  await noOverflow(page, "menu asesmen");
  await controlsReachable(page, "menu asesmen");
  const code = await createAutoCode(page, true);
  await noOverflow(page, "kode dibuat");

  // lihat satu soal dari dekat: tata letak halaman pengerjaan
  await page.getByTestId("asesmen-pretest").getByRole("button", { name: /^Mulai/ }).tap();
  await expect(page.getByTestId("asesmen-running")).toBeVisible();
  await noOverflow(page, "pengerjaan");
  await controlsReachable(page, "pengerjaan soal 1");
  await page.goto("/asesmen"); // keluar tanpa mengirim: tidak ada data tersimpan
  expect((await researchData(page)).assessments).toHaveLength(0);

  await completeAssessment(page, code, "pretest", { wrongSlots: [3], tap: true });
  await noOverflow(page, "pretest selesai");
  await completeAssessment(page, code, "posttest", { tap: true });
  await expect(page.getByTestId("posttest-score")).toHaveText("100");
  await expect(page.getByTestId("result-delta")).toHaveText("+8");
  await noOverflow(page, "posttest selesai (tabel kompetensi)");
  await controlsReachable(page, "posttest selesai");
  const d = await researchData(page);
  expect(d.assessments.map((a) => a.score)).toEqual([92, 100]);
  expect(errors).toEqual([]);
});

test("mobile: halaman ekspor, unduhan ZIP, dan alat gabung", async ({ page }) => {
  await page.goto("/asesmen");
  const code = await createAutoCode(page, true);
  await completeAssessment(page, code, "pretest", { tap: true });

  await page.goto("/ekspor");
  await noOverflow(page, "ekspor");
  await controlsReachable(page, "ekspor");
  await expect(page.getByTestId("merge-card")).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Unduh semua (.zip)" }).tap()]);
  const fs = await import("node:fs/promises");
  const files = readZip(Buffer.from(await fs.readFile((await dl.path())!)));
  expect(Object.keys(files)).toHaveLength(7);
  expect(files["1_ringkasan_peserta.csv"].toString("utf8")).toContain(code);
  await noOverflow(page, "setelah unduh");
});
