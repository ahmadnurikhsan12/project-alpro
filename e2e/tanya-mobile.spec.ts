import { test } from "@playwright/test";
import { tanyaFlow } from "./tanya-flow";

test("mobile: Tanya Tutor AI (sentuhan) tanpa scroll horizontal", async ({ page }) => {
  await tanyaFlow(page, true);
});
