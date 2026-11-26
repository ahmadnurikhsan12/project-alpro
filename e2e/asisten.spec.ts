import { test } from "@playwright/test";
import { asistenFlow } from "./asisten-flow";

test("Asisten Belajar: soal cerita bertahap, bantuan bertingkat, sampai refleksi", async ({ page }) => {
  await asistenFlow(page, false);
});
