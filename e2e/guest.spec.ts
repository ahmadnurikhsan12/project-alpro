import { expect, test, type Page } from "@playwright/test";

/** Mengumpulkan error runtime agar test gagal jika ada error JS di halaman. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const guestXp = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.guest.v1") ?? "{}")?.state?.xp ?? 0);

test("landing → dashboard dalam Guest Mode tanpa login", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("SPLDV");
  await page.getByRole("link", { name: "Mulai Belajar" }).first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Guest Mode").first()).toBeVisible();
  await expect(page.getByText("Halo, Pelajar!")).toBeVisible();
  expect(errors).toEqual([]);
});

test("materi: buka modul, kerjakan mini quiz, progres tersimpan & bertahan setelah reload", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/materi/persamaan-linear-dua-variabel");
  await expect(page.getByRole("heading", { name: "Persamaan Linear Dua Variabel", level: 1 })).toBeVisible();
  await expect.poll(() => guestXp(page)).toBe(5); // XP membuka modul

  const quiz = page.locator("#quiz");
  // Soal 1: pilihan B
  await quiz.getByRole("radio", { name: /3x − 4y = 12/ }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await expect(quiz.getByText("Benar! Kerja bagus.")).toBeVisible();
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();
  // Soal 2: -5
  await quiz.getByLabel("Jawaban").fill("-5");
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await expect(quiz.getByText("Benar! Kerja bagus.")).toBeVisible();
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();
  // Soal 3: Benar
  await quiz.getByRole("radio", { name: "Benar" }).click();
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await quiz.getByRole("button", { name: "Soal Berikutnya" }).click();
  // Soal 4: salah dengan sengaja → umpan balik + pembahasan
  await quiz.getByLabel("Jawaban").fill("4");
  await quiz.getByRole("button", { name: "Periksa Jawaban" }).click();
  await expect(quiz.getByText("Belum tepat.")).toBeVisible();
  await expect(quiz.getByText("Pembahasan")).toBeVisible();
  await quiz.getByRole("button", { name: "Lihat Hasil" }).click();
  await expect(quiz.getByText("Mini quiz selesai!")).toBeVisible();
  await expect(quiz.getByText("75", { exact: true })).toBeVisible();

  // 5 (buka) + 3×5 (soal benar) + 40 (selesai) + 20 (pencapaian) = 80
  await expect.poll(() => guestXp(page)).toBe(80);
  await page.reload();
  await page.goto("/materi");
  await expect(page.getByText("Selesai · 75")).toBeVisible();
  await page.goto("/pencapaian");
  await expect(page.getByText(/Diperoleh .* \+20 XP/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("lab: simulasi eliminasi langkah demi langkah sampai himpunan penyelesaian", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/lab?tab=elimination");
  await page.getByRole("button", { name: /Sudah tersusun/ }).click();
  await page.getByRole("button", { name: /^x Koefisien: 2 dan 3/ }).click();
  // pengali salah dulu → umpan balik
  await page.getByLabel("Persamaan (1) ×").fill("2");
  await page.getByLabel("Persamaan (2) ×").fill("2");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(page.getByText(/belum sama besar/)).toBeVisible();
  await page.getByRole("button", { name: /Petunjuk 1\/3/ }).click();
  await expect(page.getByText(/Petunjuk 1:/)).toBeVisible();
  await page.getByLabel("Persamaan (1) ×").fill("3");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await expect(page.getByText(/Tepat! Koefisien x menjadi 6/)).toBeVisible();
  await page.getByRole("button", { name: /Kalikan persamaan/ }).click();
  await page.getByRole("button", { name: /Pilih operasi/ }).click();
  await page.getByRole("button", { name: "Jumlahkan (+)" }).click();
  await expect(page.getByText(/tidak hilang/)).toBeVisible();
  await page.getByRole("button", { name: "Kurangkan (−)" }).click();
  await expect(page.getByText(/bertanda sama, jadi dikurangkan/)).toBeVisible();
  await page.getByRole("button", { name: /Lakukan eliminasi/ }).click();
  await page.getByLabel("y =").fill("2");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Cari x/ }).click();
  await page.getByLabel("x =").fill("3");
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await page.getByRole("button", { name: /Periksa jawaban/ }).click();
  await expect(page.getByText("{(3, 2)}")).toBeVisible();

  // Uji pasangan
  await page.getByRole("tab", { name: /Uji Pasangan/ }).click();
  await page.getByLabel("Nilai x").fill("4");
  await page.getByLabel("Nilai y").fill("3");
  await page.getByRole("button", { name: "Uji Pasangan" }).click();
  await expect(page.getByText(/adalah penyelesaian SPLDV ini/)).toBeVisible();

  // Grafik
  await page.getByRole("tab", { name: /Grafik/ }).click();
  await expect(page.getByText("Berpotongan di satu titik → tepat satu penyelesaian")).toBeVisible();
  await expect(page.getByText("(4, 3)", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("latihan: sesi lengkap dengan petunjuk & ringkasan", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/latihan");
  await page.getByRole("button", { name: /Mulai Latihan/ }).click();
  for (let i = 0; i < 5; i++) {
    const radio = page.getByRole("radio").first();
    if (await radio.isVisible().catch(() => false)) await radio.click();
    else {
      const inputs = page.locator("main input");
      const n = await inputs.count();
      for (let k = 0; k < n; k++) await inputs.nth(k).fill("1");
    }
    await page.getByRole("button", { name: "Periksa Jawaban" }).click();
    await expect(page.getByText("Pembahasan")).toBeVisible();
    await page.getByRole("button", { name: i < 4 ? "Soal Berikutnya" : "Lihat Hasil" }).click();
  }
  await expect(page.getByText("Latihan Mudah selesai!")).toBeVisible();
  await page.goto("/riwayat");
  await expect(page.getByRole("cell", { name: "Latihan Mudah" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("evaluasi: soal tanpa kunci, kumpulkan, nilai & pembahasan muncul", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/evaluasi");
  await page.getByRole("radio", { name: "10", exact: true }).click();
  await page.getByRole("radio", { name: "Tanpa timer" }).click();
  const qResp = page.waitForResponse((r) => r.url().includes("/api/evaluation/questions"));
  await page.getByRole("button", { name: /Mulai Evaluasi/ }).click();
  const body = await (await qResp).json();
  expect(body.questions).toHaveLength(10);
  for (const q of body.questions) expect(q).not.toHaveProperty("answer");
  await expect(page.getByText("0 dari 10 soal terjawab")).toBeVisible();
  await expect(page.getByText("Pembahasan")).toHaveCount(0);
  await page.getByRole("button", { name: "Kumpulkan Jawaban" }).click();
  await expect(page.getByText(/belum dijawab/)).toBeVisible();
  await page.getByRole("button", { name: "Ya, kumpulkan" }).click();
  await expect(page.getByText("Hasil Evaluasi Akhir")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pembahasan" })).toBeVisible();
  expect(errors).toEqual([]);
});

const GAMES = [
  "detektif-variabel",
  "misi-belanja",
  "eliminasi-kilat",
  "pasangkan-istilah",
  "tantangan-spldv",
  "susun-langkah",
  "tebak-nilai",
];

for (const g of GAMES) {
  test(`game ${g}: dapat dimulai dan dimainkan`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/games/${g}`);
    await page.getByRole("button", { name: "Mulai Main" }).click();
    await expect(page.getByText(/Skor/).first()).toBeVisible();
    if (g === "tebak-nilai") {
      // mainkan sampai habis: 3 ronde × 8 tebakan salah
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 8; k++) {
          await page.getByLabel("Tebak x").fill(String(100 + k));
          await page.getByLabel("Tebak y").fill("100");
          await page.getByRole("button", { name: "Tebak", exact: true }).click();
        }
        await page.getByRole("button", { name: r < 2 ? "Ronde berikutnya" : "Lihat hasil akhir" }).click();
      }
      await expect(page.getByText("Permainan selesai!")).toBeVisible();
      await expect(page.getByText(/\+\d+ XP/)).toBeVisible();
    } else if (g === "pasangkan-istilah") {
      await page.locator("main button[aria-pressed]").first().click();
      await expect(page.getByText(/Pilih pengertian untuk/)).toBeVisible();
    } else if (g === "susun-langkah") {
      await page.getByRole("button", { name: "Turunkan langkah 1" }).click();
      await page.getByRole("button", { name: "Periksa Urutan" }).click();
    } else if (g === "eliminasi-kilat") {
      await page.locator("main .grid button").first().click();
    } else if (g === "detektif-variabel") {
      await page.getByRole("button", { name: /Buka petunjuk 1/ }).click();
      await page.getByRole("button", { name: "Menyerah" }).click();
      await expect(page.getByText(/Jawabannya adalah/)).toBeVisible();
    } else if (g === "misi-belanja") {
      await page.getByLabel(/^1 .* \(Rp\)$/).first().fill("1000");
      await page.getByLabel(/^1 .* \(Rp\)$/).nth(1).fill("1000");
      await page.getByRole("button", { name: "Cek harga" }).click();
    } else if (g === "tantangan-spldv") {
      await page.getByLabel("x =").fill("999");
      await page.getByLabel("y =").fill("999");
      await page.getByRole("button", { name: "Jawab" }).click();
      await expect(page.getByText(/Nyawa −1/)).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("profil: ubah nama panggilan tersimpan lokal", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/profil");
  await page.getByLabel("Nama panggilan").fill("Rani");
  await page.getByRole("button", { name: "Simpan nama" }).click();
  await page.goto("/dashboard");
  await expect(page.getByText("Halo, Rani!")).toBeVisible();
  await page.goto("/masuk");
  await expect(page.getByText("Penyimpanan online belum diaktifkan")).toBeVisible();
  expect(errors).toEqual([]);
});
