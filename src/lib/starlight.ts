/* ============================================================
   Momentum economy — the anti-burnout layer.
   · Momentum Multiplier (الزخم): soft-decays on missed
     days instead of resetting like a streak.
   · Recovery Cache (مخزون التعافي): missed study days accrue a
     forgiveness backlog; each review clears one cache item and
     awards bonus Jade.
   · Jade (اليشم): currency earned per review, scaled by the live
     multiplier.
   ============================================================ */
import { daysBetween, toDateKey } from "./gamification.ts";

export interface StarlightState {
  /** Live multiplier in [STARLIGHT_MIN, STARLIGHT_MAX]. */
  level: number;
  /** Accumulated Jade currency. */
  jade: number;
  /** Number of missed-day backlog items waiting for forgiveness. */
  cache: number;
  /** ISO date key (YYYY-MM-DD) of the last review day. */
  lastActiveDate: string | null;
  updatedAt: number;
}

export const STARLIGHT_MIN = 0.5;
export const STARLIGHT_MAX = 2.5;
export const STARLIGHT_STEP = 0.05;   // gained per active day
export const STARLIGHT_DECAY = 0.15;  // decayed per missed day
export const JADE_PER_REVIEW = 10;    // base jade per graded review
export const CACHE_JADE_BONUS = 5;    // bonus jade per cache-cleared review
export const CACHE_PER_MISS_DAY = 4;  // backlog accrual per missed day
export const CACHE_MAX = 50;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function initStarlight(): StarlightState {
  return { level: 1.0, jade: 0, cache: 0, lastActiveDate: null, updatedAt: 0 };
}

/**
 * Advance the Starlight level to a new active day. Same-day calls are
 * no-ops (steps apply once per day). Missed days softly decay the
 * multiplier and fill the Return Cache — never a hard reset.
 */
export function applyStarlightDay(
  state: StarlightState,
  todayKey: string,
  now = Date.now(),
): { state: StarlightState; newDay: boolean; missedDays: number } {
  if (state.lastActiveDate === todayKey) {
    return { state, newDay: false, missedDays: 0 };
  }
  const missedDays = state.lastActiveDate
    ? Math.max(0, daysBetween(state.lastActiveDate, todayKey) - 1)
    : 0;
  const level = state.lastActiveDate === null
    ? 1.0 + STARLIGHT_STEP                        // first-ever activity day
    : clamp(
        state.level + STARLIGHT_STEP - missedDays * STARLIGHT_DECAY,
        STARLIGHT_MIN,
        STARLIGHT_MAX,
      );
  const cache = clamp(state.cache + missedDays * CACHE_PER_MISS_DAY, 0, CACHE_MAX);
  return {
    newDay: true,
    missedDays,
    state: { ...state, level, cache, lastActiveDate: todayKey, updatedAt: now },
  };
}

// ---------------------------------------------------------------------------
// Persistence (localStorage, with in-memory fallback for tests/private tabs)
// ---------------------------------------------------------------------------

const STARLIGHT_KEY = (uid: string) => `learnjp:starlight:${uid}`;
const memoryStorage = new Map<string, string>();

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

export function loadStarlight(uid: string): StarlightState | null {
  const raw = storageGet(STARLIGHT_KEY(uid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StarlightState;
    if (
      typeof parsed.level !== "number" ||
      typeof parsed.jade !== "number" ||
      typeof parsed.cache !== "number" ||
      (parsed.lastActiveDate !== null && typeof parsed.lastActiveDate !== "string")
    ) {
      return null;
    }
    return {
      level: parsed.level,
      jade: parsed.jade,
      cache: parsed.cache,
      lastActiveDate: parsed.lastActiveDate,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function saveStarlight(uid: string, state: StarlightState): void {
  try {
    storageSet(STARLIGHT_KEY(uid), JSON.stringify(state));
  } catch {
    // best-effort persistence
  }
}

export function readStarlightOrDefault(uid: string): StarlightState {
  return loadStarlight(uid) ?? initStarlight();
}

/**
 * One arcade solve: applies the day's multiplier step (once) and awards a
 * flat Jade prize. Unlike reviews, arcade play costs no energy and never
 * services the Return Cache — cache forgiveness stays review-shaped.
 */
export function awardArcadeJade(
  uid: string,
  amount: number,
  now = Date.now(),
): StarlightState {
  const todayKey = toDateKey(new Date(now));
  const afterDay = applyStarlightDay(readStarlightOrDefault(uid), todayKey, now);
  const state: StarlightState = {
    ...afterDay.state,
    jade: afterDay.state.jade + Math.max(0, Math.round(amount)),
    updatedAt: now,
  };
  saveStarlight(uid, state);
  return state;
}

/**
 * One graded review: applies the day's multiplier step (once), earns Jade
 * at the live multiplier, and services one Return Cache item for a bonus.
 */
export function noteStarlightReview(uid: string, now = Date.now()): StarlightState {
  const todayKey = toDateKey(new Date(now));
  const afterDay = applyStarlightDay(readStarlightOrDefault(uid), todayKey, now);
  let state = afterDay.state;

  let jade = state.jade + Math.round(JADE_PER_REVIEW * state.level);
  let cache = state.cache;
  if (!afterDay.newDay && cache > 0) {
    jade += CACHE_JADE_BONUS;
    cache -= 1;
  }
  state = { ...state, jade, cache, updatedAt: now };
  saveStarlight(uid, state);
  return state;
}

/** Consumable effect: top up the Return Cache (clamped to its ceiling). */
export function grantCache(uid: string, amount: number, now = Date.now()): StarlightState {
  const state = readStarlightOrDefault(uid);
  const cache = clamp(state.cache + Math.max(0, Math.round(amount)), 0, CACHE_MAX);
  const next = { ...state, cache, updatedAt: now };
  saveStarlight(uid, next);
  return next;
}
