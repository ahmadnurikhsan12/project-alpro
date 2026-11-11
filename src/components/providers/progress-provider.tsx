"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ACHIEVEMENT_BY_ID, levelFromXp } from "@/lib/progress/gamification";
import { applyEvent, createInitialState } from "@/lib/progress/engine";
import { EventValidationError, gradeEvent } from "@/lib/progress/grading";
import type { EventOutcome, ProgressState, RawEvent } from "@/lib/progress/types";
import {
  clearCloudCache,
  clearGuest,
  loadCloudCache,
  loadGuest,
  loadPending,
  MAX_LOCAL_EVENTS,
  newId,
  saveCloudCache,
  saveGuest,
  savePending,
  type GuestData,
} from "@/lib/storage/local";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useToast } from "./toast-provider";

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<RawEvent, "id" | "at">;

export interface MigrationSummary {
  imported: number;
  skipped: number;
  rejected: number;
  xpGained: number;
}

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

interface ProgressContextValue {
  ready: boolean;
  mode: "guest" | "email";
  supabaseEnabled: boolean;
  user: { id: string; email: string | null } | null;
  displayName: string;
  state: ProgressState;
  sync: SyncStatus;
  syncError: string | null;
  pendingCount: number;
  migration: MigrationSummary | null;
  dismissMigration: () => void;
  record: (event: NewEvent) => Promise<EventOutcome>;
  applyServerResult: (state: ProgressState, outcome: EventOutcome) => void;
  setDisplayName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  retrySync: () => Promise<void>;
  resetGuestProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (body as { error?: string }).error ?? `Permintaan gagal (${res.status})`);
  return body as T;
}

function outcomeFrom(r: ReturnType<typeof applyEvent>): EventOutcome {
  return {
    accepted: r.accepted,
    xpGained: r.xpGained,
    levelUp: r.levelAfter > r.levelBefore,
    levelAfter: r.levelAfter,
    newAchievements: r.newAchievements,
    message: r.message,
  };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();
  const supabaseEnabled = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [displayName, setDisplayNameState] = useState("");
  const [state, setState] = useState<ProgressState>(() => createInitialState("1970-01-01T00:00:00.000Z"));
  const [sync, setSync] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [migration, setMigration] = useState<MigrationSummary | null>(null);

  const guestRef = useRef<GuestData | null>(null);
  const userRef = useRef<{ id: string; email: string | null } | null>(null);
  const stateRef = useRef(state);
  const nameRef = useRef(displayName);
  const pendingRef = useRef<RawEvent[]>([]);
  stateRef.current = state;
  nameRef.current = displayName;

  const notify = useCallback(
    (o: EventOutcome, extra?: string) => {
      if (o.xpGained > 0) push({ tone: "xp", title: `+${o.xpGained} XP`, description: extra });
      else if (extra) push({ tone: "info", title: extra });
      for (const id of o.newAchievements) {
        const a = ACHIEVEMENT_BY_ID[id];
        if (a) push({ tone: "achievement", title: `Pencapaian baru: ${a.title}`, description: a.description });
      }
      if (o.levelUp) push({ tone: "success", title: `Naik ke Level ${o.levelAfter}!`, description: levelFromXp(stateRef.current.xp).title });
      if (o.message) push({ tone: o.accepted ? "info" : "warn", title: o.message });
    },
    [push],
  );

  const setCloudState = useCallback((u: { id: string; email: string | null }, s: ProgressState, name: string) => {
    setState(s);
    setDisplayNameState(name);
    saveCloudCache({ userId: u.id, email: u.email, displayName: name, state: s });
  }, []);

  /** Mengirim event lokal (guest + antrean offline) ke server, atau sekadar memuat progres online. */
  const syncWithServer = useCallback(
    async (u: { id: string; email: string | null }) => {
      setSync("syncing");
      setSyncError(null);
      const guest = loadGuest();
      const pending = loadPending(u.id);
      const events = [...guest.events, ...pending].slice(-MAX_LOCAL_EVENTS);
      try {
        if (events.length) {
          const res = await api<{
            state: ProgressState;
            profile: { displayName: string | null };
            summary: MigrationSummary;
          }>("/api/progress/migrate", {
            method: "POST",
            body: JSON.stringify({ events, displayName: guest.displayName || undefined }),
          });
          if (userRef.current?.id !== u.id) return;
          if (guest.events.length) {
            setMigration(res.summary);
            clearGuest();
            guestRef.current = null;
          }
          pendingRef.current = [];
          savePending(u.id, []);
          setPendingCount(0);
          setCloudState(u, res.state, res.profile.displayName ?? "");
        } else {
          const res = await api<{ state: ProgressState; profile: { displayName: string | null } }>("/api/progress");
          if (userRef.current?.id !== u.id) return;
          setCloudState(u, res.state, res.profile.displayName ?? "");
        }
        setSync("idle");
      } catch (err) {
        setSync(err instanceof HttpError ? "error" : "offline");
        setSyncError(err instanceof Error ? err.message : "Gagal terhubung ke server.");
      }
    },
    [setCloudState],
  );

  const enterEmail = useCallback(
    (u: { id: string; email: string | null }) => {
      if (userRef.current?.id === u.id) return;
      userRef.current = u;
      setUser(u);
      const cache = loadCloudCache(u.id);
      setState(cache?.state ?? createInitialState());
      setDisplayNameState(cache?.displayName ?? "");
      pendingRef.current = loadPending(u.id);
      setPendingCount(pendingRef.current.length);
      setReady(true);
      void syncWithServer(u);
    },
    [syncWithServer],
  );

  const enterGuest = useCallback(() => {
    userRef.current = null;
    setUser(null);
    setSync("idle");
    setSyncError(null);
    const guest = loadGuest();
    guestRef.current = guest;
    setState(guest.state);
    setDisplayNameState(guest.displayName);
    setReady(true);
  }, []);

  // Inisialisasi: Guest Mode langsung siap; jika ada sesi Supabase, beralih ke Email Mode.
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      enterGuest();
      return;
    }
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      // Jangan memanggil Supabase langsung di dalam callback ini (dianjurkan oleh dokumentasi).
      setTimeout(() => {
        if (session?.user) enterEmail({ id: session.user.id, email: session.user.email ?? null });
        else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
          if (userRef.current) clearCloudCache();
          enterGuest();
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [enterEmail, enterGuest]);

  // Kirim antrean offline ketika koneksi kembali.
  useEffect(() => {
    const onOnline = () => {
      if (userRef.current && pendingRef.current.length) void syncWithServer(userRef.current);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncWithServer]);

  const applyLocally = useCallback((ev: RawEvent) => {
    const base = userRef.current ? stateRef.current : (guestRef.current ?? loadGuest()).state;
    return applyEvent(base, gradeEvent(ev));
  }, []);

  const record = useCallback(
    async (input: NewEvent): Promise<EventOutcome> => {
      const ev = { ...input, id: newId(), at: new Date().toISOString() } as RawEvent;
      const u = userRef.current;

      if (!u) {
        // ---------------- Guest Mode: dinilai & disimpan di perangkat
        try {
          const guest = guestRef.current ?? loadGuest();
          const r = applyLocally(ev);
          if (r.accepted) {
            const next: GuestData = { ...guest, state: r.state, events: [...guest.events, ev].slice(-MAX_LOCAL_EVENTS) };
            guestRef.current = next;
            if (!saveGuest(next)) push({ tone: "warn", title: "Penyimpanan browser penuh atau diblokir. Progres mungkin tidak tersimpan." });
            setState(r.state);
          }
          const o = outcomeFrom(r);
          notify(o);
          return o;
        } catch (err) {
          const msg = err instanceof EventValidationError ? err.message : "Gagal menyimpan progres.";
          push({ tone: "warn", title: msg });
          return { accepted: false, xpGained: 0, levelUp: false, levelAfter: levelFromXp(stateRef.current.xp).level, newAchievements: [], message: msg };
        }
      }

      // ---------------- Email Mode: dinilai & disimpan server
      try {
        const res = await api<{ state: ProgressState; outcome: EventOutcome }>("/api/progress/event", {
          method: "POST",
          body: JSON.stringify(ev),
        });
        setCloudState(u, res.state, nameRef.current);
        notify(res.outcome);
        return res.outcome;
      } catch (err) {
        if (err instanceof HttpError && err.status >= 400 && err.status < 500 && err.status !== 401) {
          push({ tone: "warn", title: err.message });
          return { accepted: false, xpGained: 0, levelUp: false, levelAfter: levelFromXp(stateRef.current.xp).level, newAchievements: [], message: err.message };
        }
        // Server/jaringan bermasalah → simpan sementara di perangkat, sinkron nanti.
        try {
          const r = applyLocally(ev);
          if (r.accepted) {
            pendingRef.current = [...pendingRef.current, ev];
            savePending(u.id, pendingRef.current);
            setPendingCount(pendingRef.current.length);
            setCloudState(u, r.state, nameRef.current);
          }
          setSync("offline");
          const o = outcomeFrom(r);
          notify(o, "Tersimpan sementara di perangkat — akan disinkronkan otomatis.");
          return o;
        } catch {
          return { accepted: false, xpGained: 0, levelUp: false, levelAfter: 1, newAchievements: [] };
        }
      }
    },
    [applyLocally, notify, push, setCloudState],
  );

  const applyServerResult = useCallback(
    (s: ProgressState, outcome: EventOutcome) => {
      const u = userRef.current;
      if (u) setCloudState(u, s, nameRef.current);
      notify(outcome);
    },
    [notify, setCloudState],
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      const clean = name.trim().slice(0, 40);
      const u = userRef.current;
      if (!u) {
        const guest = guestRef.current ?? loadGuest();
        const next = { ...guest, displayName: clean };
        guestRef.current = next;
        saveGuest(next);
        setDisplayNameState(clean);
        return;
      }
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ displayName: clean }) });
      setCloudState(u, stateRef.current, clean);
    },
    [setCloudState],
  );

  const signOut = useCallback(async () => {
    const sb = getBrowserSupabase();
    clearCloudCache();
    if (sb) await sb.auth.signOut();
    enterGuest();
  }, [enterGuest]);

  const retrySync = useCallback(async () => {
    if (userRef.current) await syncWithServer(userRef.current);
  }, [syncWithServer]);

  const resetGuestProgress = useCallback(() => {
    clearGuest();
    const fresh: GuestData = { state: createInitialState(), events: [], displayName: guestRef.current?.displayName ?? "" };
    guestRef.current = fresh;
    saveGuest(fresh);
    if (!userRef.current) setState(fresh.state);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ready,
      mode: user ? "email" : "guest",
      supabaseEnabled,
      user,
      displayName,
      state,
      sync,
      syncError,
      pendingCount,
      migration,
      dismissMigration: () => setMigration(null),
      record,
      applyServerResult,
      setDisplayName,
      signOut,
      retrySync,
      resetGuestProgress,
    }),
    [ready, user, supabaseEnabled, displayName, state, sync, syncError, pendingCount, migration, record, applyServerResult, setDisplayName, signOut, retrySync, resetGuestProgress],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress harus dipakai di dalam ProgressProvider");
  return ctx;
}
