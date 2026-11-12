/**
 * Membuat ikon PNG aplikasi (PWA) dari logo MathQuest.
 * Jalankan: npm run icons:generate   (butuh: npx playwright install chromium)
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const mark = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#2546ea"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs>
  <rect width="40" height="40" rx="${pad ? 0 : 9}" fill="url(#g)"/>
  <g transform="translate(20 20) scale(${pad ? 0.62 : 0.9}) translate(-20 -20)">
    <path d="M8 29 L32 11" stroke="white" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M8 13 L32 27" stroke="#fde68a" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="20.3" cy="20" r="4.2" fill="#34d399" stroke="white" stroke-width="2"/>
  </g>
</svg>`;

// [nama file, ukuran, maskable(padding aman untuk ikon bulat Android)]
const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, true],
];

mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, maskable] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${mark(maskable)}</body></html>`);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  console.log("dibuat", name);
}
await browser.close();
