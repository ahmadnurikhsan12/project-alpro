import { test } from "@playwright/test";
import { asistenFlow } from "./asisten-flow";

test("mobile: Asisten Belajar dengan sentuhan, tanpa scroll horizontal", async ({ page }) => {
  await asistenFlow(page, true);
});
