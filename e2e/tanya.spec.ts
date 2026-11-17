import { expect, test } from "@playwright/test";
import { tanyaFlow } from "./tanya-flow";

test("Tanya Tutor AI: tanpa kunci server, fitur nonaktif dengan pesan ramah dan fitur lain tetap berjalan", async ({ page }) => {
  await page.goto("/tanya");
  await expect(page.getByTestId("tanya-disabled")).toBeVisible();
  await expect(page.getByTestId("tanya-chat")).toHaveCount(0);
  const r = await page.request.post("/api/tanya", { data: { question: "apa itu eliminasi?" } });
  expect(r.status()).toBe(503);
  expect((await r.json()).code).toBe("disabled");
  await page.goto("/latihan");
  await expect(page.getByRole("button", { name: /Mulai Latihan/ })).toBeVisible();
});

test("Tanya Tutor AI (layanan dipalsukan): persetujuan, tolak data pribadi, jawaban + rujukan, tanpa menyimpan percakapan", async ({ page }) => {
  await tanyaFlow(page, false);
});
