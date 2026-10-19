/* ============================================================
   Resonance economy — the Resonance Terminal layer.
   · Resonance Crystals (بلورات المدار): hard currency, granted
     by high-tier achievements like completing sector campaigns.
   · Standard Passes (تذاكر الإشارة): pull currency for the
     Standard banner, accrued from sustained review activity.
   · Resonance Shards (شظايا الرنين): recycling dust produced by
     duplicate pulls, exchanged for passes and missing items.
   The whole account lives in one document per user so a
   server-backed adapter can replace the storage functions later
   without touching callers.
   ============================================================ */
import { isThemeId, resolveTheme } from "./themes.ts";
import type { Rarity } from "./items.ts";

export interface PityState {
  /** Pulls since the last 5★ drop. */
  count: number;
  /** When true the next 5★ is guaranteed to be the featured item. */
  guaranteed: boolean;
}

export interface PullRecord {
  at: number;
  bannerId: string;
  itemId: string;
  rarity: Rarity;
  isFeatured: boolean;
  /** True when the item was already owned and converted to shards. */
  dup: boolean;
  /** Shards granted by this pull (duplicates and dust bundles). */
  shards: number;
}

export type CurrencyKey = "crystals" | "passes" | "shards";

export interface ResonanceState {
  version: 1;
  crystals: number;
  passes: number;
  shards: number;
  /** Activity points toward the next Standard Pass. */
  passProgress: number;
  /** Equipped title item id, or "" for the default badge. */
  equippedTitle: string;
  pity: Record<string, PityState>;
  /** itemId → owned count (non-stackables cap at 1). */
  owned: Record<string, number>;
  /** Newest-last pull log, capped at HISTORY_MAX entries. */
  history: PullRecord[];
  updatedAt: number;
}

export const RESONANCE_VERSION = 1;

/** Activity points per Standard Pass (1 review = 1 point). */
export const REVIEWS_PER_PASS = 10;
/** An arcade solve contributes this many activity points. */
export const ARCADE_PASS_POINTS = 5;
/** One-time payout when a sector campaign is completed. */
export const SECTOR_CRYSTALS = 25;
export const SECTOR_PASSES = 3;
export const HISTORY_MAX = 100;

/** Items every new account starts with (see items.ts registry). */
export const STARTER_OWNED = ["theme-tactical", "title-explorer"] as const;

function clampInt(n: number, min = 0): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.round(n));
}

export function initResonance(starterOwned: readonly string[] = STARTER_OWNED): ResonanceState {
  const owned: Record<string, number> = {};
  for (const id of starterOwned) owned[id] = 1;
  return {
    version: RESONANCE_VERSION,
    crystals: 0,
    passes: 0,
    shards: 0,
    passProgress: 0,
    equippedTitle: "",
    pity: {},
    owned,
    history: [],
    updatedAt: 0,
  };
}

function normalizePity(value: unknown): Record<string, PityState> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, PityState> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const parsed = entry as { count?: unknown; guaranteed?: unknown };
    if (typeof parsed.count !== "number") continue;
    result[key] = {
      count: clampInt(parsed.count),
      guaranteed: parsed.guaranteed === true,
    };
  }
  return result;
}

function normalizeOwned(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== "number") continue;
    result[key] = clampInt(entry, 1);
  }
  return result;
}

function normalizeHistory(value: unknown): PullRecord[] {
  if (!Array.isArray(value)) return [];
  const records: PullRecord[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const parsed = entry as Partial<PullRecord>;
    if (
      typeof parsed.itemId !== "string" ||
      typeof parsed.bannerId !== "string" ||
      (parsed.rarity !== 3 && parsed.rarity !== 4 && parsed.rarity !== 5)
    ) {
      continue;
    }
    records.push({
      at: typeof parsed.at === "number" ? parsed.at : 0,
      bannerId: parsed.bannerId,
      itemId: parsed.itemId,
      rarity: parsed.rarity,
      isFeatured: parsed.isFeatured === true,
      dup: parsed.dup === true,
      shards: typeof parsed.shards === "number" ? clampInt(parsed.shards) : 0,
    });
  }
  return records.slice(-HISTORY_MAX);
}

/** Validate an untrusted parsed document; null when it is not usable. */
export function normalizeResonance(value: unknown): ResonanceState | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<ResonanceState>;
  if (parsed.version !== RESONANCE_VERSION) return null;
  if (
    typeof parsed.crystals !== "number" ||
    typeof parsed.passes !== "number" ||
    typeof parsed.shards !== "number"
  ) {
    return null;
  }
  return {
    version: RESONANCE_VERSION,
    crystals: clampInt(parsed.crystals),
    passes: clampInt(parsed.passes),
    shards: clampInt(parsed.shards),
    passProgress: typeof parsed.passProgress === "number" ? clampInt(parsed.passProgress) : 0,
    equippedTitle: typeof parsed.equippedTitle === "string" ? parsed.equippedTitle : "",
    pity: normalizePity(parsed.pity),
    owned: normalizeOwned(parsed.owned),
    history: normalizeHistory(parsed.history),
    updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
  };
}

// ---------------------------------------------------------------------------
// Pure reducers (no storage, safe to use inside the pull engine)
// ---------------------------------------------------------------------------

export function credit(
  state: ResonanceState,
  delta: Partial<Record<CurrencyKey, number>>,
  now = Date.now(),
): ResonanceState {
  return {
    ...state,
    crystals: state.crystals + clampInt(delta.crystals ?? 0),
    passes: state.passes + clampInt(delta.passes ?? 0),
    shards: state.shards + clampInt(delta.shards ?? 0),
    updatedAt: now,
  };
}

export function spend(
  state: ResonanceState,
  currency: CurrencyKey,
  amount: number,
): { state: ResonanceState; ok: boolean } {
  const cost = clampInt(amount);
  if (cost <= 0 || state[currency] < cost) return { state, ok: false };
  return { state: { ...state, [currency]: state[currency] - cost }, ok: true };
}

/** Add activity points; each full REVIEWS_PER_PASS block yields one pass. */
export function addPassProgress(
  state: ResonanceState,
  points: number,
  now = Date.now(),
): { state: ResonanceState; awarded: number } {
  const gained = state.passProgress + clampInt(points);
  const awarded = Math.floor(gained / REVIEWS_PER_PASS);
  return {
    awarded,
    state: {
      ...state,
      passes: state.passes + awarded,
      passProgress: gained % REVIEWS_PER_PASS,
      updatedAt: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Persistence (localStorage, with in-memory fallback for tests/private tabs)
// ---------------------------------------------------------------------------

const RESONANCE_KEY = (uid: string) => `learnjp:resonance:${uid}`;
const memoryStorage = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
/** Stable per-uid snapshot for `useSyncExternalStore` consumers. */
const snapshotCache = new Map<string, ResonanceState>();

function storageGet(key: string): string | null {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      return globalThis.localStorage.getItem(key);
    }
  } catch {
    // fall through to memory storage
  }
  return memoryStorage.get(key) ?? null;
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
  memoryStorage.set(key, value);
}

export function subscribeResonance(uid: string, listener: () => void): () => void {
  const set = listeners.get(uid) ?? new Set<() => void>();
  set.add(listener);
  listeners.set(uid, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(uid);
  };
}

function emit(uid: string): void {
  listeners.get(uid)?.forEach((listener) => listener());
}

export function loadResonance(uid: string): ResonanceState | null {
  const raw = storageGet(RESONANCE_KEY(uid));
  if (!raw) return null;
  try {
    return normalizeResonance(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveResonance(uid: string, state: ResonanceState): void {
  try {
    storageSet(RESONANCE_KEY(uid), JSON.stringify(state));
  } catch {
    // best-effort persistence
  }
  snapshotCache.set(uid, state);
  emit(uid);
}

/**
 * Install the server wallet (Phase E source of truth) as the rendered
 * snapshot and refresh the local mirror. Notifies subscribers so
 * consumers re-render once the server value lands.
 */
export function hydrateResonance(uid: string, state: ResonanceState): void {
  try {
    storageSet(RESONANCE_KEY(uid), JSON.stringify(state));
  } catch {
    // best-effort mirror
  }
  snapshotCache.set(uid, state);
  emit(uid);
}

const THEME_ADOPT_KEY = (uid: string, themeId: string) =>
  `learnjp:resonance-adopted:${uid}:${themeId}`;

/** True when the one-time starter grace already ran for this theme. */
export function hasAdoptedTheme(uid: string, themeId: string): boolean {
  return storageGet(THEME_ADOPT_KEY(uid, themeId)) === "1";
}

export function markThemeAdopted(uid: string, themeId: string): void {
  storageSet(THEME_ADOPT_KEY(uid, themeId), "1");
}

/** Referentially stable wallet for React subscribers. */
export function snapshotResonance(uid: string): ResonanceState {
  const cached = snapshotCache.get(uid);
  if (cached) return cached;
  const loaded = loadResonance(uid) ?? createStarterWallet();
  snapshotCache.set(uid, loaded);
  return loaded;
}

/**
 * Fresh-wallet seeding: the starter set plus whichever theme the
 * browser already uses, so the terminal never takes away a look the
 * user is currently enjoying.
 */
export function createStarterWallet(): ResonanceState {
  const starter: string[] = [...STARTER_OWNED];
  const storedTheme = storageGet("learnjp:theme");
  if (isThemeId(storedTheme)) {
    const themeItem = `theme-${resolveTheme(storedTheme)}`;
    if (!starter.includes(themeItem)) starter.push(themeItem);
  }
  return initResonance(starter);
}

export function readResonanceOrDefault(uid: string): ResonanceState {
  return loadResonance(uid) ?? createStarterWallet();
}

/** Persisted credit: load, add, save, notify subscribers. */
export function awardResonance(
  uid: string,
  delta: Partial<Record<CurrencyKey, number>>,
  now = Date.now(),
): ResonanceState {
  const state = credit(readResonanceOrDefault(uid), delta, now);
  saveResonance(uid, state);
  return state;
}

/** Persisted activity points (reviews / arcade); returns pass progress. */
export function noteResonanceActivity(
  uid: string,
  points: number,
  now = Date.now(),
): { state: ResonanceState; awarded: number } {
  const result = addPassProgress(readResonanceOrDefault(uid), points, now);
  saveResonance(uid, result.state);
  return result;
}
