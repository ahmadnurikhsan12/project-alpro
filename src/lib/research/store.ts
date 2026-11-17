"use client";

import { backupUnreadable, unreadableReason } from "@/lib/storage/backup";
import type { AssessmentKind, AssessmentSkill, FormId } from "@/lib/assessment/blueprint";

/**
 * PENYIMPANAN DATA UJI COBA (lokal, Guest Mode).
 *
 * Kunci localStorage TERPISAH (`mathquest.research.v1`) dari progres (`mathquest.guest.v1`):
 * format penyimpanan lama tidak diubah dan tidak ada data lama yang dihapus. Berisi hanya:
 * kode peserta anonim, ID perangkat acak, dan hasil pretest/posttest. Tidak ada nama, email, atau teks bebas.
 */
const KEY = "mathquest.research.v1";

export interface AssessmentItemRecord {
  id: string;
  slot: number;
  skill: AssessmentSkill;
  difficulty: string;
  type: string;
  /** Jawaban yang diketik/dipilih siswa (maks. 60 karakter, sudah divalidasi server). */
  answer: string;
  correct: 0 | 1;
  answered: 0 | 1;
}

export interface AssessmentRecord {
  id: string;
  kind: AssessmentKind;
  form: FormId;
  completedAt: string;
  /** Durasi total (detik) sejak soal dimuat sampai dikirim; waktu tab tidak aktif ikut terhitung. */
  durationSec: number;
  correct: number;
  total: number;
  score: number;
  items: AssessmentItemRecord[];
  bySkill: Record<AssessmentSkill, { correct: number; total: number }>;
}

export interface ParticipantInfo {
  code: string;
  cohort: string;
  auto: boolean;
  createdAt: string;
}

export interface ResearchData {
  version: 1;
  deviceId: string;
  participant: ParticipantInfo | null;
  assessments: AssessmentRecord[];
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function fresh(): ResearchData {
  return { version: 1, deviceId: uuid(), participant: null, assessments: [] };
}

export function loadResearch(): ResearchData {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as ResearchData;
      if (d && d.version === 1 && typeof d.deviceId === "string" && Array.isArray(d.assessments)) return { ...d, participant: d.participant ?? null };
    }
  } catch {
    /* rusak/diblokir: lihat di bawah */
  }
  // Data ada tetapi tidak dapat dipakai (rusak/versi lain): salin ke cadangan SEBELUM ditimpa, lalu beri peringatan.
  if (raw) backupUnreadable(KEY, raw, unreadableReason(raw));
  const d = fresh();
  saveResearch(d); // ID perangkat harus tetap sama pada pemuatan berikutnya
  return d;
}

export function saveResearch(d: ResearchData): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

/** Mengatur kode peserta. Ditolak jika asesmen sudah tercatat (kode tidak boleh berubah di tengah uji coba). */
export function setParticipant(code: string, cohort: string, auto: boolean): { ok: boolean; message?: string } {
  const d = loadResearch();
  if (d.assessments.length > 0 && d.participant && d.participant.code !== code) {
    return { ok: false, message: "Kode tidak dapat diganti setelah pretest/posttest tercatat." };
  }
  d.participant = { code, cohort, auto, createdAt: d.participant?.createdAt ?? new Date().toISOString() };
  return saveResearch(d) ? { ok: true } : { ok: false, message: "Penyimpanan browser penuh atau diblokir." };
}

export function hasAssessment(d: ResearchData, kind: AssessmentKind): boolean {
  return d.assessments.some((a) => a.kind === kind);
}

/** Menambah hasil asesmen. Setiap jenis hanya sekali (satu pretest, satu posttest per peserta/perangkat). */
export function addAssessment(rec: AssessmentRecord): { ok: boolean; message?: string } {
  const d = loadResearch();
  if (hasAssessment(d, rec.kind)) return { ok: false, message: "Asesmen ini sudah dikerjakan di perangkat ini." };
  d.assessments.push(rec);
  return saveResearch(d) ? { ok: true } : { ok: false, message: "Penyimpanan browser penuh atau diblokir; hasil belum tersimpan." };
}

export function newRecordId(): string {
  return uuid();
}
