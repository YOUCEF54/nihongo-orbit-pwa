"use client";

/* ============================================================
   Sector campaign state — the active sector and which campaigns
   have been completed. Persisted per user in localStorage (with an
   in-memory fallback for private tabs/tests) and exposed as a
   `useSyncExternalStore` hook so the hub and the drill stay in sync
   without effect-driven state writes.
   ============================================================ */
import { useCallback, useSyncExternalStore } from "react";
import { SECTORS } from "./curriculum.ts";
import type { SectorId } from "@/types/curriculum";

/** One-time Jade prize granted the first time a sector is completed. */
export const SECTOR_JADE_REWARD = 50;

export interface SectorCompletion {
  /** Epoch ms of the first completion. */
  at: number;
}

export interface SectorState {
  active: SectorId;
  completed: Partial<Record<SectorId, SectorCompletion>>;
}

const ACTIVE_KEY = (uid: string) => `learnjp:sector:${uid}`;
const DONE_KEY = (uid: string) => `learnjp:sector-complete:${uid}`;

const SECTOR_IDS = new Set<string>(SECTORS.map((sector) => sector.id));
const DEFAULT_STATE: SectorState = { active: "sector-0", completed: {} };

const cache = new Map<string, SectorState>();
const listeners = new Map<string, Set<() => void>>();
const memory = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      return globalThis.localStorage.getItem(key);
    }
  } catch {
    // fall through to memory storage
  }
  return memory.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fall through to memory storage
  }
  memory.set(key, value);
}

function readCompleted(uid: string): Partial<Record<SectorId, SectorCompletion>> {
  const raw = storageGet(DONE_KEY(uid));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, { at?: unknown }>;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Partial<Record<SectorId, SectorCompletion>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!SECTOR_IDS.has(key)) continue;
      const at = value && typeof value.at === "number" ? value.at : 0;
      result[key as SectorId] = { at };
    }
    return result;
  } catch {
    return {};
  }
}

function readState(uid: string): SectorState {
  const rawActive = storageGet(ACTIVE_KEY(uid));
  const active =
    rawActive && SECTOR_IDS.has(rawActive) ? (rawActive as SectorId) : DEFAULT_STATE.active;
  return { active, completed: readCompleted(uid) };
}

function snapshot(uid: string): SectorState {
  const cached = cache.get(uid);
  if (cached) return cached;
  const loaded = readState(uid);
  cache.set(uid, loaded);
  return loaded;
}

function emit(uid: string): void {
  listeners.get(uid)?.forEach((listener) => listener());
}

function commit(uid: string, next: SectorState): void {
  cache.set(uid, next);
  emit(uid);
}

function subscribe(uid: string, listener: () => void): () => void {
  const set = listeners.get(uid) ?? new Set<() => void>();
  set.add(listener);
  listeners.set(uid, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(uid);
  };
}

export function setActiveSector(uid: string, sector: SectorId): void {
  const current = snapshot(uid);
  if (current.active === sector) return;
  storageSet(ACTIVE_KEY(uid), sector);
  commit(uid, { ...current, active: sector });
}

/** Mark a sector complete; returns true only on the first completion so the
    caller can grant the one-time reward exactly once. */
export function markSectorComplete(uid: string, sector: SectorId, at = Date.now()): boolean {
  const current = snapshot(uid);
  if (current.completed[sector]) return false;
  const completed = { ...current.completed, [sector]: { at } };
  storageSet(DONE_KEY(uid), JSON.stringify(completed));
  commit(uid, { ...current, completed });
  return true;
}

export interface SectorStateApi extends SectorState {
  setActive: (sector: SectorId) => void;
  markComplete: (sector: SectorId) => boolean;
}

export function useSectorState(uid: string): SectorStateApi {
  const subscribeFn = useCallback((listener: () => void) => subscribe(uid, listener), [uid]);
  const getSnapshot = useCallback(() => snapshot(uid), [uid]);
  const state = useSyncExternalStore(subscribeFn, getSnapshot, () => DEFAULT_STATE);

  const setActive = useCallback((sector: SectorId) => setActiveSector(uid, sector), [uid]);
  const markComplete = useCallback((sector: SectorId) => markSectorComplete(uid, sector), [uid]);

  return { active: state.active, completed: state.completed, setActive, markComplete };
}
