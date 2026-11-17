import { createInitialState } from "@/lib/progress/engine";
import { replayEvents } from "@/lib/progress/replay";
import type { LearningRecord, RawEvent } from "@/lib/progress/types";

/**
 * DATA PEMBELAJARAN DI GUEST MODE
 *
 * Guest Mode TIDAK memerlukan sistem baru. `GuestData.events` (localStorage, kunci
 * `mathquest.guest.v1`) sudah menyimpan setiap event yang diterima — termasuk metrik proses
 * (`la`) dan jawaban refleksi (hanya pilihan/skala) — sehingga bertahan setelah browser ditutup.
 * Catatan pembelajaran terperinci (`LearningRecord`) dapat dibangun ulang kapan saja dari event
 * itu dengan mesin yang sama (`replayEvents`), tanpa server, login, atau biaya.
 *
 * Berkas ini hanya menambahkan tiga hal, semuanya aditif (format penyimpanan tidak berubah dan
 * data lama tidak diubah/dihapus):
 *  1. `pruneEvents`: saat batas jumlah event tercapai, event pembelajaran (refleksi, metrik proses)
 *     dipertahankan lebih lama daripada event biasa.
 *  2. `deriveLearningRecords`: membangun catatan pembelajaran dari event (untuk ekspor CSV Tahap 5).
 *  3. `guestStorageStatus`: ukuran & kapasitas, agar pengguna dapat diberi tahu sebelum penuh.
 */

/** Event yang membawa data analisis pembelajaran. */
export function isLearningEvent(e: RawEvent): boolean {
  if (e.type === "reflection") return true;
  if ((e.type === "lab" || e.type === "game") && "la" in e && !!e.la) return true;
  return false;
}

/**
 * Memangkas daftar event ke `max`. Jika melebihi batas, event BIASA tertua dibuang lebih dulu;
 * event pembelajaran hanya dibuang jika jumlahnya sendiri melebihi batas (yang tertua lebih dulu).
 * Urutan semula dipertahankan.
 */
export function pruneEvents(events: RawEvent[], max: number): RawEvent[] {
  if (events.length <= max) return events;
  const learningCount = events.filter(isLearningEvent).length;
  let dropOrdinary = Math.min(events.length - max, events.length - learningCount);
  let dropLearning = events.length - max - dropOrdinary;
  return events.filter((e) => {
    if (isLearningEvent(e)) {
      if (dropLearning > 0) {
        dropLearning--;
        return false;
      }
      return true;
    }
    if (dropOrdinary > 0) {
      dropOrdinary--;
      return false;
    }
    return true;
  });
}

/** Membangun catatan pembelajaran (refleksi, metrik Lab/game) dari event Guest. */
export function deriveLearningRecords(events: RawEvent[], now = new Date().toISOString()): LearningRecord[] {
  const r = replayEvents(createInitialState(), events, new Set(), {}, now);
  return r.delta.learning;
}

export interface GuestStorageStatus {
  events: number;
  learningEvents: number;
  maxEvents: number;
  /** Perkiraan ukuran data Guest dalam byte (karakter UTF-16 dihitung 2 byte, seperti localStorage browser). */
  approxBytes: number;
  /** Pemakaian batas jumlah event, 0–1. */
  fill: number;
  nearLimit: boolean;
}

export function guestStorageStatus(events: RawEvent[], maxEvents: number, serialized?: string): GuestStorageStatus {
  const fill = Math.min(1, events.length / maxEvents);
  return {
    events: events.length,
    learningEvents: events.filter(isLearningEvent).length,
    maxEvents,
    approxBytes: (serialized ?? JSON.stringify(events)).length * 2,
    fill,
    nearLimit: fill >= 0.9,
  };
}
