import { test } from "@playwright/test";
import { fullJourney } from "./journey-flow";

test("alur siswa awal–akhir (desktop): profil → pretest → materi → latihan → lab → game → evaluasi → posttest → ekspor", async ({ page }) => {
  test.setTimeout(240_000);
  await fullJourney(page, false);
});
