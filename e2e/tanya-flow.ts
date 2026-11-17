import { expect, type Locator, type Page } from "@playwright/test";

const act = (tap: boolean, l: Locator) => (tap ? l.tap() : l.click());

/** Tanya Tutor AI dengan layanan dipalsukan di jaringan (tanpa memanggil AI sungguhan). */
export async function tanyaFlow(page: Page, tap: boolean) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  const posts: { question: string; history?: unknown[] }[] = [];
  await page.route("**/api/tanya", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ json: { enabled: true } });
    const body = req.postDataJSON() as { question: string; history?: unknown[] };
    posts.push(body);
    if (/budi@/.test(body.question)) return route.fulfill({ status: 422, json: { error: "Pertanyaan tampaknya memuat data pribadi.", code: "invalid" } });
    return route.fulfill({ json: { answer: "Coba bandingkan koefisien y pada kedua persamaan. Apa yang kamu lihat?", sources: [{ title: "Metode Eliminasi", href: "/materi/konsep-metode-eliminasi" }] } });
  });

  await page.goto("/tanya");
  await expect(page.getByText("Jangan menulis nama, sekolah, nomor, atau data pribadi")).toBeVisible();
  // persetujuan dulu
  await expect(page.getByTestId("tanya-chat")).toHaveCount(0);
  await act(tap, page.getByRole("button", { name: "Saya mengerti, lanjut" }));
  await expect(page.getByTestId("tanya-chat")).toBeVisible();

  // data pribadi ditolak dengan pesan, pertanyaan dikembalikan ke kotak
  await page.getByLabel("Pertanyaanmu").fill("hubungi budi@gmail.com soal eliminasi");
  await act(tap, page.getByRole("button", { name: "Kirim" }));
  await expect(page.getByRole("alert").filter({ hasText: "data pribadi" })).toBeVisible();
  await expect(page.getByLabel("Pertanyaanmu")).toHaveValue("hubungi budi@gmail.com soal eliminasi");

  // pertanyaan normal → jawaban + rujukan materi
  await page.getByLabel("Pertanyaanmu").fill("Bagaimana memilih variabel yang dieliminasi?");
  await act(tap, page.getByRole("button", { name: "Kirim" }));
  await expect(page.getByTestId("tanya-assistant")).toContainText("bandingkan koefisien y");
  await expect(page.getByTestId("tanya-assistant").getByRole("link", { name: "Metode Eliminasi" })).toHaveAttribute("href", "/materi/konsep-metode-eliminasi");
  await expect(page.getByTestId("tanya-assistant")).toContainText("Jawaban AI dapat keliru");

  // riwayat percakapan dikirim terbatas pada pertanyaan berikutnya
  await page.getByLabel("Pertanyaanmu").fill("Lalu apa langkah berikutnya?");
  await act(tap, page.getByRole("button", { name: "Kirim" }));
  await expect(page.getByTestId("tanya-assistant")).toHaveCount(2);
  expect(posts.at(-1)!.history).toHaveLength(2);

  // privasi: percakapan tidak disimpan di perangkat; hanya persetujuan
  const keys = await page.evaluate(() => Object.entries(localStorage).filter(([, v]) => /eliminasi|koefisien/i.test(v)).map(([k]) => k));
  expect(keys).toEqual([]);
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(o.sw).toBeLessThanOrEqual(o.iw);
  expect(errors).toEqual([]);
}
