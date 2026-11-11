"use client";

import { createInitialState } from "@/lib/progress/engine";
import type { ProgressState, RawEvent } from "@/lib/progress/types";

const GUEST_KEY = "mathquest.guest.v1";
const PENDING_KEY = "mathquest.pending.v1";
const CLOUD_KEY = "mathquest.cloud.v1";
export const MAX_LOCAL_EVENTS = 1000;

export interface GuestData {
  state: ProgressState;
  events: RawEvent[];
  displayName: string;
}

export interface CloudCache {
  userId: string;
  email: string | null;
  displayName: string;
  state: ProgressState;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // penyimpanan penuh / diblokir (mode privat)
  }
}

function isValidState(s: unknown): s is ProgressState {
  return !!s && typeof s === "object" && (s as ProgressState).version === 1 && typeof (s as ProgressState).xp === "number";
}

export function loadGuest(): GuestData {
  const data = read<GuestData>(GUEST_KEY);
  if (data && isValidState(data.state)) {
    // isi field baru jika versi data lama
    const fresh = createInitialState();
    return {
      state: { ...fresh, ...data.state, counters: { ...fresh.counters, ...data.state.counters } },
      events: Array.isArray(data.events) ? data.events : [],
      displayName: typeof data.displayName === "string" ? data.displayName : "",
    };
  }
  return { state: createInitialState(), events: [], displayName: "" };
}

export function saveGuest(data: GuestData): boolean {
  return write(GUEST_KEY, { ...data, events: data.events.slice(-MAX_LOCAL_EVENTS) });
}

export function clearGuest() {
  try {
    window.localStorage.removeItem(GUEST_KEY);
  } catch {
    /* abaikan */
  }
}

export function hasGuestProgress(): boolean {
  const g = read<GuestData>(GUEST_KEY);
  return !!g && Array.isArray(g.events) && g.events.length > 0;
}

export function loadPending(userId: string): RawEvent[] {
  const p = read<{ userId: string; events: RawEvent[] }>(PENDING_KEY);
  return p && p.userId === userId && Array.isArray(p.events) ? p.events : [];
}

export function savePending(userId: string, events: RawEvent[]) {
  if (events.length === 0) {
    try {
      window.localStorage.removeItem(PENDING_KEY);
    } catch {
      /* abaikan */
    }
    return;
  }
  write(PENDING_KEY, { userId, events: events.slice(-MAX_LOCAL_EVENTS) });
}

export function loadCloudCache(userId: string): CloudCache | null {
  const c = read<CloudCache>(CLOUD_KEY);
  return c && c.userId === userId && isValidState(c.state) ? c : null;
}

export function saveCloudCache(c: CloudCache) {
  write(CLOUD_KEY, c);
}

export function clearCloudCache() {
  try {
    window.localStorage.removeItem(CLOUD_KEY);
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* abaikan */
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // cadangan untuk browser lama (format UUID v4)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
