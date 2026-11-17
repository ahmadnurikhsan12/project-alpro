import { expect, type Locator, type Page } from "@playwright/test";
import { formsFor, type AssessmentKind, type FormId } from "../src/lib/assessment/blueprint";

/**
 * Kunci pretest/posttest untuk UJI E2E saja (kunci sebenarnya hanya ada di server).
 * Disalin dari src/server/assessment-bank.ts; tes unit (tests/assessment.test.ts) menjaga kebenaran bank,
 * sedangkan E2E ini memastikan skor yang tersimpan sesuai dengan jawaban yang dikirim.
 */
export const KEYS: Record<FormId, Record<number, string>> = {
  A: { 1: "b", 2: "d", 3: "3", 4: "a", 5: "24", 6: "2", 7: "4,2", 8: "3,-1", 9: "true", 10: "false", 11: "c", 12: "b" },
  B: { 1: "b", 2: "d", 3: "2", 4: "a", 5: "32", 6: "3", 7: "5,3", 8: "-2,4", 9: "true", 10: "false", 11: "c", 12: "b" },
};

const act = (tap: boolean, l: Locator) => (tap ? l.tap() : l.click());

export const researchData = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("mathquest.research.v1") ?? "{}") as { deviceId: string; participant: { code: string; cohort: string; auto: boolean } | null; assessments: { kind: string; form: string; score: number; correct: number; durationSec: number; items: { id: string; slot: number; correct: number; answer: string }[] }[] });

export async function createAutoCode(page: Page, tap = false): Promise<string> {
  await act(tap, page.getByRole("button", { name: "Buat kode otomatis" }));
  const code = (await page.getByTestId("participant-code").textContent())!.trim();
  expect(code).toMatch(/^MQ-[A-HJ-KM-NP-Z2-9]{6}$/);
  return code;
}

export async function setTeacherCode(page: Page, code: string, tap = false) {
  await page.getByLabel(/Pilihan 2: kode dari guru/).fill(code);
  await act(tap, page.getByRole("button", { name: "Pakai kode ini" }));
  await expect(page.getByTestId("participant-code")).toHaveText(code);
}

/** Mengisi satu butir pada halaman asesmen. */
async function answerItem(page: Page, answer: string, tap: boolean) {
  const run = page.getByTestId("asesmen-running");
  if (/^[a-d]$/.test(answer)) return act(tap, run.getByRole("radio").nth("abcd".indexOf(answer)));
  if (answer === "true" || answer === "false") return act(tap, run.getByRole("radio", { name: answer === "true" ? "Benar" : "Salah", exact: true }));
  if (answer.includes(",")) {
    const [x, y] = answer.split(",");
    await run.getByLabel("x =").fill(x);
    await run.getByLabel("y =").fill(y);
    return;
  }
  await run.getByLabel("Jawaban").fill(answer);
}

/** Menyelesaikan satu asesmen. `wrongSlots`: nomor butir yang sengaja dijawab salah; `skipSlots`: dikosongkan. */
export async function completeAssessment(page: Page, code: string, kind: AssessmentKind, opts: { wrongSlots?: number[]; skipSlots?: number[]; tap?: boolean } = {}) {
  const { wrongSlots = [], skipSlots = [], tap = false } = opts;
  const form = formsFor(code)[kind];
  await page.goto("/asesmen");
  await act(tap, page.getByTestId(`asesmen-${kind}`).getByRole("button", { name: /^Mulai/ }));
  await expect(page.getByTestId("asesmen-running")).toBeVisible();
  for (let slot = 1; slot <= 12; slot++) {
    if (!skipSlots.includes(slot)) {
      let answer = KEYS[form][slot];
      if (wrongSlots.includes(slot)) answer = /^[a-d]$/.test(answer) ? (answer === "a" ? "b" : "a") : answer === "true" ? "false" : answer === "false" ? "true" : answer.includes(",") ? "99,99" : "999";
      await answerItem(page, answer, tap);
    }
    if (slot < 12) await act(tap, page.getByRole("button", { name: "Berikutnya" }));
  }
  const send = page.getByRole("button", { name: "Kirim jawaban" });
  await act(tap, send);
  if (skipSlots.length) {
    await expect(page.getByRole("alert").filter({ hasText: "belum terjawab" })).toBeVisible();
    await act(tap, send);
  }
  await expect(page.getByTestId("asesmen-done")).toBeVisible();
  return form;
}

/** Pembaca ZIP minimal (store) untuk memeriksa berkas unduhan. */
export function readZip(buf: Buffer): Record<string, Buffer> {
  const eocd = buf.length - 22;
  if (buf.readUInt32LE(eocd) !== 0x06054b50) throw new Error("bukan ZIP valid");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: Record<string, Buffer> = {};
  for (let i = 0; i < count; i++) {
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = off + 30 + buf.readUInt16LE(off + 26);
    out[name] = buf.subarray(start, start + size);
    p += 46 + nameLen;
  }
  return out;
}

export async function noOverflow(page: Page, where: string) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(o.sw, `scroll horizontal pada: ${where}`).toBeLessThanOrEqual(o.iw);
}
