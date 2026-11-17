import { test } from "@playwright/test";
import { fullJourney } from "./journey-flow";

test("alur siswa awal–akhir (mobile, sentuhan): seluruh langkah sampai ekspor", async ({ page }) => {
  test.setTimeout(240_000);
  await fullJourney(page, true);
});
