import { expect, test, type Page } from "@playwright/test";

/** Modul 4 (soal tetap): q-m4-1 (PG, a), q-m4-2 (PG, b), q-m4-3 (B/S, benar), q-m4-4 (isian, 14). */
const guestState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.guest.v1") ?? "{}").state);

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test("pendamping belajar: diagnosis, tangga petunjuk L1–L4, percobaan ulang, XP 100%/50%/0%", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/materi/konsep-metode-eliminasi");
  const quiz = page.locator("#quiz");
  await expect(quiz.getByText(/Agar y tereliminasi/).first()).toBeVisible();
  // pengaman regresi: kunci React kembar pernah membuat soal tampil berganda
  await expect(quiz.getByRole("radiogroup")).toHaveCount(1);

  // ---------------------------------------------------------------- Soal 1 (PG): salah → diagnosis → alasan → petunjuk → benar di percobaan ke-2
  await quiz.getByRole("radio", { name: "B Dikurangkan" }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  const mediator = quiz.getByTestId("mediator-message");
  await expect(mediator).toContainText("Belum tepat. Percobaan 1 dari 2");
  await expect(mediator).toContainText("Pilihan operasi"); // pola dikenali: salah operasi
  await expect(mediator).toContainText("koefisien y: 2 dan −2");
  await expect(quiz.getByText("Pembahasan", { exact: true })).toHaveCount(0); // satu kesalahan ≠ jawaban dibuka
  await expect(quiz.getByText(/Jawaban yang benar/)).toHaveCount(0);

  // pilihan ganda: pilihan salah terkunci, dan alasan wajib dipilih sebelum mencoba lagi
  const gate = quiz.getByTestId("reason-gate");
  await expect(gate).toBeVisible();
  await expect(quiz.getByRole("button", { name: "Periksa Lagi" })).toBeDisabled();
  await gate.getByRole("radio", { name: /kurang teliti/ }).click();
  await expect(gate).toHaveCount(0);
  await expect(quiz.getByRole("radio", { name: "B Dikurangkan" })).toBeDisabled();

  // tangga petunjuk dibuka berurutan dan setiap petunjuk menyebut tujuannya
  const ladder = quiz.getByTestId("hint-ladder");
  const openedHints = ladder.getByRole("list", { name: "Petunjuk yang sudah dibuka" });
  const openHint = () => ladder.getByRole("button", { name: /Butuh petunjuk|Petunjuk berikutnya/ }).click();
  await openHint();
  await expect(ladder).toContainText("Petunjuk 1: Pertanyaan pengarah");
  await expect(ladder).toContainText("Tujuan: memusatkan perhatianmu");
  await expect(openedHints).not.toContainText("Petunjuk 2"); // petunjuk 2 belum dibuka
  await openHint();
  await expect(ladder).toContainText("Petunjuk 2: Petunjuk strategi");
  await openHint();
  await expect(ladder).toContainText("Petunjuk 3: Petunjuk langkah");
  await expect(openedHints).not.toContainText("Contoh serupa"); // contoh (L4) baru muncul setelah L1–L3
  await openHint();
  await expect(ladder).toContainText("Petunjuk 4: Contoh serupa");
  await expect(ladder).toContainText("Ini contoh soal lain dengan angka berbeda");
  await expect(ladder.getByRole("button", { name: /Petunjuk berikutnya/ })).toHaveCount(0); // sudah L4

  await quiz.getByRole("radio", { name: "A Dijumlahkan" }).click();
  await quiz.getByRole("button", { name: "Periksa Lagi" }).click();
  await expect(quiz.getByText("Benar! Kamu menemukannya pada percobaan ke-2.")).toBeVisible();
  await expect(quiz.getByTestId("xp-note")).toContainText("XP soal ini: 50%");
  // pertanyaan transfer (aturan umum): opsional, tidak dinilai
  const transfer = quiz.getByTestId("transfer-card");
  await expect(transfer).toContainText("Aturan umum");
  await transfer.getByRole("radio").first().click();
  await expect(transfer.getByRole("status")).toContainText("Variabel hilang jika koefisiennya menjadi 0");
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();

  // ---------------------------------------------------------------- Soal 2 (PG): benar langsung → 100%
  await quiz.getByRole("radio", { name: "B Dikurangkan" }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await expect(quiz.getByText("Benar! Kerja bagus.")).toBeVisible();
  await expect(quiz.getByTestId("xp-note")).toContainText("XP soal ini: 100%");
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();

  // ---------------------------------------------------------------- Soal 3 (B/S): satu kesempatan, pembahasan ditahan di balik tombol
  await quiz.getByRole("radio", { name: "Salah" }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await expect(quiz.getByTestId("mediator-message")).toContainText("Belum tepat.");
  await expect(quiz.getByTestId("mediator-message")).toContainText("dapat diuji dengan angka");
  await expect(quiz.getByText("Pembahasan", { exact: true })).toHaveCount(0);
  await expect(quiz.getByRole("button", { name: "Periksa Lagi" })).toHaveCount(0); // tidak ada percobaan ulang pada B/S
  await quiz.getByRole("button", { name: "Lihat pembahasan" }).click();
  await expect(quiz.getByText("Pembahasan", { exact: true })).toBeVisible();
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();

  // ---------------------------------------------------------------- Soal 4 (isian): salah dikenali → salah tidak dikenali → benar di percobaan ke-3
  await quiz.getByLabel("Jawaban").fill("10");
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await expect(quiz.getByTestId("mediator-message")).toContainText("Pilihan operasi");
  await expect(quiz.getByTestId("mediator-message")).toContainText("koefisien y: 1 dan −1"); // variabel yang dieliminasi, bukan x
  await quiz.getByLabel("Jawaban").fill("999");
  await quiz.getByRole("button", { name: "Periksa Lagi" }).click();
  await expect(quiz.getByTestId("mediator-message")).toContainText("belum dapat dikenali"); // jujur, tidak mengarang
  await expect(quiz.getByTestId("mediator-message")).toContainText("belum membuka petunjuk"); // menyesuaikan penggunaan petunjuk
  await expect(quiz.getByRole("button", { name: /Lewati dan lihat pembahasan/ })).toBeVisible();
  await quiz.getByLabel("Jawaban").fill("14");
  await quiz.getByRole("button", { name: "Periksa Lagi" }).click();
  await expect(quiz.getByText("Benar! Kamu menemukannya pada percobaan ke-3.")).toBeVisible();
  await expect(quiz.getByTestId("xp-note")).toContainText("Tidak ada XP tambahan");
  await quiz.getByRole("button", { name: "Lihat Hasil" }).click();

  await expect(quiz.getByText("Mini quiz selesai!")).toBeVisible();
  await expect(quiz.getByText("75", { exact: true })).toBeVisible(); // 3 dari 4 benar (nilai akhir)
  await expect(quiz.getByText(/Mandiri:\s*1\s*dari 4 soal/)).toBeVisible(); // hanya soal 2 benar tanpa petunjuk di percobaan 1

  // ---------------------------------------------------------------- XP & data tersimpan sesuai kebijakan
  // 5 (buka modul) + 3 (soal 1, 50%) + 5 (soal 2, 100%) + 0 + 0 + 40 (modul selesai) + 20 (badge Pemula SPLDV)
  await expect.poll(async () => (await guestState(page)).xp).toBe(73);
  const stats = (await guestState(page)).counters.questionStats;
  expect(stats["lesson:q-m4-1"]).toMatchObject({ attempts: 2, solvedAt: 2, xp: 3, hints: 4, independent: false });
  expect(stats["lesson:q-m4-2"]).toMatchObject({ attempts: 1, solvedAt: 1, xp: 5, hints: 0, independent: true });
  expect(stats["lesson:q-m4-3"]).toMatchObject({ attempts: 1, solvedAt: null, xp: 0 });
  expect(stats["lesson:q-m4-4"]).toMatchObject({ attempts: 3, solvedAt: 3, xp: 0 });
  const attempt = (await guestState(page)).attempts[0];
  expect(attempt).toMatchObject({ kind: "lesson_quiz", score: 75, firstTry: 25 });

  await page.reload();
  await page.goto("/materi");
  await expect(page.getByText("Selesai · 75")).toBeVisible();
  expect(errors).toEqual([]);
});

test("petunjuk dapat dipakai hanya dengan keyboard dan tidak membuka jawaban", async ({ page }) => {
  await page.goto("/materi/konsep-metode-eliminasi");
  const quiz = page.locator("#quiz");
  const ladder = quiz.getByTestId("hint-ladder");
  const button = ladder.getByRole("button", { name: "Butuh petunjuk?" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(ladder).toContainText("Petunjuk 1: Pertanyaan pengarah");
  await expect(quiz.getByText("Pembahasan", { exact: true })).toHaveCount(0);
  // pilihan dapat dijangkau dengan Tab dan dipilih dengan Spasi
  await quiz.getByRole("radio", { name: "A Dijumlahkan" }).focus();
  await page.keyboard.press("Space");
  await expect(quiz.getByRole("radio", { name: "A Dijumlahkan" })).toHaveAttribute("aria-checked", "true");
});

test("Evaluasi Akhir tidak memiliki petunjuk, percobaan ulang, atau pendamping", async ({ page }) => {
  await page.goto("/evaluasi");
  await page.getByRole("radio", { name: "10", exact: true }).click();
  await page.getByRole("radio", { name: "Tanpa timer" }).click();
  await page.getByRole("button", { name: /Mulai Evaluasi/ }).click();
  await expect(page.getByText(/soal terjawab/)).toBeVisible();
  await expect(page.getByTestId("hint-ladder")).toHaveCount(0);
  await expect(page.getByTestId("mediator-message")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /petunjuk/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Periksa (Jawaban|Lagi)/ })).toHaveCount(0);
});
