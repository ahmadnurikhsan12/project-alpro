/** Menjalankan E2E terhadap situs yang SUDAH online (bukan server lokal). Contoh: PUBLIC_URL=https://situs.vercel.app npx playwright test -c playwright.public.config.ts --grep-invert "pembatas laju" */
import { defineConfig, devices } from "@playwright/test";
const MOBILE = /(responsive|lab-mobile|stage4-mobile|stage5-mobile|journey-mobile)/;
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: { baseURL: process.env.PUBLIC_URL ?? "https://mathquest-puce.vercel.app", trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: MOBILE },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: MOBILE },
  ],
});
