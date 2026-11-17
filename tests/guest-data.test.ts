import { describe, expect, it } from "vitest";
import { deriveLearningRecords, guestStorageStatus, isLearningEvent, pruneEvents } from "@/lib/storage/guest-data";
import type { RawEvent } from "@/lib/progress/types";

let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n + 20000).padStart(12, "0")}`;
const at = (i: number) => `2026-11-1${(i % 9) + 1}T08:00:00.000Z`;
const lessonOpen = (i: number): RawEvent => ({ id: uid(), at: at(i), type: "lesson_open", lessonId: "m1" });
const reflection = (i: number): RawEvent => ({ id: uid(), at: at(i), type: "reflection", context: "lab_elimination", refId: "elimination", responses: { keyakinan: 4 } });
const labLa = (i: number): RawEvent => ({ id: uid(), at: at(i), type: "lab", tool: "elimination", la: { ubah_rencana: 1 } });
const labPlain = (i: number): RawEvent => ({ id: uid(), at: at(i), type: "lab", tool: "checker" });

describe("data pembelajaran Guest Mode", () => {
  it("mengenali event pembelajaran", () => {
    expect(isLearningEvent(reflection(0))).toBe(true);
    expect(isLearningEvent(labLa(0))).toBe(true);
    expect(isLearningEvent(labPlain(0))).toBe(false);
    expect(isLearningEvent(lessonOpen(0))).toBe(false);
  });

  it("di bawah batas: daftar tidak diubah sama sekali (data lama utuh)", () => {
    const ev = [lessonOpen(0), reflection(1), labPlain(2)];
    expect(pruneEvents(ev, 10)).toBe(ev);
  });

  it("melebihi batas: event biasa tertua dibuang lebih dulu, event pembelajaran dipertahankan, urutan terjaga", () => {
    const old = lessonOpen(0);
    const refl = reflection(1);
    const la = labLa(2);
    const rest = Array.from({ length: 6 }, (_, i) => lessonOpen(3 + i));
    const all = [old, refl, la, ...rest];
    const out = pruneEvents(all, 5);
    expect(out).toHaveLength(5);
    expect(out).toContain(refl);
    expect(out).toContain(la);
    expect(out).not.toContain(old);
    expect(out.map((e) => e.id)).toEqual(all.filter((e) => out.includes(e)).map((e) => e.id)); // urutan sama
  });

  it("jika event pembelajaran sendiri melebihi batas, yang tertua yang dibuang", () => {
    const ev = [reflection(0), reflection(1), reflection(2), labLa(3)];
    const out = pruneEvents(ev, 2);
    expect(out).toEqual([ev[2], ev[3]]);
  });

  it("selalu menghasilkan tepat `max` event saat melebihi batas", () => {
    for (const total of [11, 25, 60]) {
      const ev = Array.from({ length: total }, (_, i) => (i % 4 === 0 ? reflection(i) : lessonOpen(i)));
      expect(pruneEvents(ev, 10)).toHaveLength(10);
    }
  });

  it("catatan pembelajaran dapat dibangun ulang dari event (untuk ekspor CSV)", () => {
    const events = [lessonOpen(0), labLa(1), reflection(2)];
    const learning = deriveLearningRecords(events);
    expect(learning.map((l) => l.kind).sort()).toEqual(["lab_la", "reflection"]);
    const refl = learning.find((l) => l.kind === "reflection")!;
    expect(refl.payload).toMatchObject({ context: "lab_elimination", responses: { keyakinan: 4 } });
    expect((learning.find((l) => l.kind === "lab_la")!.payload.metrics as Record<string, number>).ubah_rencana).toBe(1);
  });

  it("status penyimpanan: jumlah, ukuran, dan peringatan mendekati batas", () => {
    const ev = Array.from({ length: 95 }, (_, i) => lessonOpen(i));
    const s = guestStorageStatus(ev, 100);
    expect(s).toMatchObject({ events: 95, maxEvents: 100, nearLimit: true });
    expect(s.approxBytes).toBeGreaterThan(1000);
    expect(guestStorageStatus(ev.slice(0, 10), 100).nearLimit).toBe(false);
  });
});
