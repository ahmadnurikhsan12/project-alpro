import { expect, type Locator, type Page } from "@playwright/test";
import { predictTebak } from "./helpers";

/** Alur uji Tahap 4 yang dipakai bersama oleh tampilan desktop dan mobile (tap = true → sentuhan). */
const act = (tap: boolean, l: Locator) => (tap ? l.tap() : l.click());

export const guestData = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.guest.v1") ?? "{}") as { state: { counters: { reflections: number; reflectionsSkipped: number }; xp: number }; events: Record<string, unknown>[] });

export async function noPageOverflow(page: Page, where: string) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(o.sw, `scroll horizontal pada: ${where}`).toBeLessThanOrEqual(o.iw);
}

export async function lessonFlow(page: Page, tap: boolean, slug: string, checks: { thinkWrong: string; thinkRight: RegExp; plotText: string }) {
  await page.goto(`/materi/${slug}`);
  const think = page.getByTestId("think-block");
  await expect(think.first()).toBeVisible();
  // prediksi salah → penjelasan beralasan, bukan sekadar "salah"
  await think.first().scrollIntoViewIfNeeded();
  await act(tap, think.first().getByRole("radio", { name: checks.thinkWrong, exact: true }));
  await expect(think.first().getByTestId("think-feedback")).toContainText("Belum sesuai");
  await act(tap, think.nth(1).getByRole("radio", { name: checks.thinkRight }));
  await expect(think.nth(1).getByTestId("think-feedback")).toContainText("Prediksimu sesuai");
  // representasi saling terhubung: tabel + grafik
  await expect(page.getByTestId("lesson-table").first()).toBeVisible();
  const plot = page.getByTestId("coordinate-plot").first();
  await plot.scrollIntoViewIfNeeded();
  await expect(plot.locator("svg")).toContainText(checks.plotText);
  await noPageOverflow(page, `materi ${slug}`);
  // refleksi (0 XP)
  const xpBefore = (await guestData(page)).state.xp;
  const form = page.locator("#refleksi");
  await form.scrollIntoViewIfNeeded();
  await act(tap, form.getByRole("radiogroup", { name: /Bagian mana dari materi ini/ }).getByRole("radio", { name: "Memahami konsepnya" }));
  await act(tap, form.getByRole("radio", { name: "4 dari 5" }));
  await act(tap, form.getByRole("button", { name: "Kirim refleksi" }));
  await expect(page.getByTestId("lesson-reflection-done")).toContainText("tersimpan");
  const d = await guestData(page);
  expect(d.state.counters.reflections).toBeGreaterThanOrEqual(1);
  expect(d.state.xp - xpBefore).toBeLessThanOrEqual(5); // hanya XP buka materi; refleksi sendiri 0 XP
  const refl = d.events.filter((e) => e.type === "reflection" && e.context === "lesson").pop() as { responses: Record<string, unknown>; refId: string };
  expect(refl.responses).toMatchObject({ bagian_sulit: "konsep", keyakinan: 4 });
  expect(refl.refId).toMatch(/^m[456]$/);
}

export async function tebakFlow(page: Page, tap: boolean) {
  await page.goto("/games/tebak-nilai");
  await act(tap, page.getByRole("button", { name: "Mulai Main" }));
  const guessBtn = page.getByRole("button", { name: "Tebak", exact: true });
  // WAJIB prediksi + alasan sebelum mencoba
  await page.getByLabel("Tebak x").fill("100");
  await page.getByLabel("Tebak y").fill("100");
  await expect(guessBtn).toBeDisabled();
  await act(tap, page.getByRole("radiogroup", { name: "Prediksi Persamaan (1)" }).getByRole("radio", { name: "Terlalu besar", exact: true }));
  await act(tap, page.getByRole("radiogroup", { name: "Prediksi Persamaan (2)" }).getByRole("radio", { name: "Terlalu besar", exact: true }));
  await expect(guessBtn).toBeDisabled(); // alasan belum dipilih
  await act(tap, page.getByRole("radiogroup", { name: "Alasan tebakan" }).getByRole("radio", { name: "Saya menghitung ruas kiri dengan substitusi" }));
  await expect(guessBtn).toBeEnabled();
  await noPageOverflow(page, "tebak nilai: prediksi");
  await act(tap, guessBtn);
  await expect(page.getByTestId("tebak-compare")).toBeVisible();
  await expect(page.getByText(/prediksi [✓✗]/).first()).toBeVisible();
  // prediksi & alasan harus diisi ulang untuk tebakan berikutnya
  await page.getByLabel("Tebak x").fill("101");
  await page.getByLabel("Tebak y").fill("100");
  await expect(guessBtn).toBeDisabled();
  await predictTebak(page, "Terlalu besar", "Terlalu besar", "Saya menebak dulu");
  await act(tap, guessBtn);

  // habiskan sisa tebakan dan ronde
  for (let r = 0; r < 3; r++) {
    const already = r === 0 ? 2 : 0;
    for (let k = already; k < 8; k++) {
      await page.getByLabel("Tebak x").fill(String(100 + k));
      await page.getByLabel("Tebak y").fill("100");
      await predictTebak(page, "Terlalu besar", "Terlalu besar", "Saya menyesuaikan dari sinyal tebakan sebelumnya");
      await act(tap, guessBtn);
    }
    await act(tap, page.getByRole("button", { name: r < 2 ? "Ronde berikutnya" : "Lihat hasil akhir" }));
  }
  await expect(page.getByText("Permainan selesai!")).toBeVisible();
  const reflection = page.getByTestId("game-reflection");
  await reflection.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("game-mirror")).toContainText("memprediksi dengan tepat");
  await act(tap, reflection.getByRole("radiogroup", { name: /Strategi apa yang paling sering/ }).getByRole("radio", { name: "Menghitung dengan substitusi" }));
  await act(tap, reflection.getByRole("radio", { name: "3 dari 5" }));
  await act(tap, reflection.getByRole("button", { name: "Kirim refleksi" }));
  await expect(page.getByTestId("game-reflection-done")).toContainText("tersimpan");
  await noPageOverflow(page, "tebak nilai: hasil");

  const d = await guestData(page);
  const game = d.events.filter((e) => e.type === "game" && e.gameId === "tebak-nilai").pop() as { la: Record<string, number>; score: number };
  expect(game.la).toMatchObject({ tebakan_total: 24, prediksi_total: 48, alasan_substitusi: 1, alasan_menebak: 1, alasan_sinyal: 22, ronde_main: 3, ronde_selesai: 0 });
  expect(game.score).toBe(0); // prediksi tidak mengubah skor: 0 poin karena tidak ada pasangan yang ditemukan
  const refl = d.events.filter((e) => e.type === "reflection" && e.context === "tebak_nilai").pop() as { responses: Record<string, unknown> };
  expect(refl.responses).toMatchObject({ strategi: "substitusi", keyakinan: 3 });
}

export async function kilatFlow(page: Page, tap: boolean) {
  await page.clock.install();
  await page.goto("/games/eliminasi-kilat");
  await act(tap, page.getByRole("button", { name: "Mulai Main" }));
  await expect(page.getByRole("timer")).toBeVisible();
  // jawab satu soal (benar atau salah); jika salah, penjelasan matematisnya muncul
  await act(tap, page.locator("main .grid button").first());
  await page.clock.runFor(100);
  const why = page.getByTestId("kilat-why");
  if (await why.count()) await expect(why).toContainText("Salah! Waktu berkurang 3 detik.");
  await page.clock.fastForward(120_000); // habiskan waktu permainan
  await expect(page.getByText("Permainan selesai!")).toBeVisible();
  const reflection = page.getByTestId("game-reflection");
  await reflection.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("game-mirror")).toContainText("Akurasimu");
  await act(tap, reflection.getByRole("radiogroup", { name: /mana yang lebih kamu utamakan/ }).getByRole("radio", { name: "Keduanya seimbang" }));
  await act(tap, reflection.getByRole("radiogroup", { name: /apa penyebab yang paling mungkin/ }).getByRole("radio", { name: "Terburu-buru" }));
  await act(tap, reflection.getByRole("radio", { name: "4 dari 5" }));
  await act(tap, reflection.getByRole("button", { name: "Kirim refleksi" }));
  await expect(page.getByTestId("game-reflection-done")).toContainText("tersimpan");
  await noPageOverflow(page, "eliminasi kilat: hasil");

  const d = await guestData(page);
  const game = d.events.filter((e) => e.type === "game" && e.gameId === "eliminasi-kilat").pop() as { la: Record<string, number> };
  expect(Object.keys(game.la).sort()).toEqual(["akurasi", "benar", "combo_maks", "jawaban_total", "salah", "waktu_rata_x10"]);
  expect(game.la.benar + game.la.salah).toBe(game.la.jawaban_total);
  const refl = d.events.filter((e) => e.type === "reflection" && e.context === "eliminasi_kilat").pop() as { responses: Record<string, unknown> };
  expect(refl.responses).toMatchObject({ prioritas: "seimbang", penyebab_salah: "terburu", keyakinan: 4 });
}
