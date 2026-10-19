/* ============================================================
   Persisted progress state — mental-clarity energy + daily
   streak, keyed per user. Writes prefer localStorage; when it
   is unavailable (node tests, private tabs) a module-level Map
   keeps the round-trip intact.
   ============================================================ */
import {
  ENERGY_MAX,
  initEnergy,
  initStreak,
  recordActivity,
  regenEnergy,
  spendEnergy,
  toDateKey,
  type EnergyState,
  type StreakState,
} from "./gamification.ts";
import { awardArcadeJade, noteStarlightReview, type StarlightState } from "./starlight.ts";
import { noteResonanceActivity } from "./resonance.ts";

const ENERGY_KEY = (uid: string) => `learnjp:energy:${uid}`;
const STREAK_KEY = (uid: string) => `learnjp:streak:${uid}`;
export const REVIEW_ENERGY_COST = 10;
export const PUZZLE_ENTRY_ENERGY_COST = 15;
export const ARCADE_JADE_REWARD = 15;

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

export function loadEnergy(uid: string): EnergyState | null {
  const raw = storageGet(ENERGY_KEY(uid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EnergyState;
    if (
      typeof parsed.value !== "number" ||
      typeof parsed.updatedAt !== "number" ||
      Number.isNaN(parsed.value) ||
      Number.isNaN(parsed.updatedAt)
    ) {
      return null;
    }
    return { value: parsed.value, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function saveEnergy(uid: string, state: EnergyState): void {
  try {
    storageSet(ENERGY_KEY(uid), JSON.stringify(state));
  } catch {
    // best-effort persistence
  }
}

export function loadStreak(uid: string): StreakState | null {
  const raw = storageGet(STREAK_KEY(uid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StreakState;
    if (
      typeof parsed.current !== "number" ||
      (parsed.lastActiveDate !== null && typeof parsed.lastActiveDate !== "string")
    ) {
      return null;
    }
    return {
      current: parsed.current,
      lastActiveDate: parsed.lastActiveDate,
    };
  } catch {
    return null;
  }
}

export function saveStreak(uid: string, state: StreakState): void {
  try {
    storageSet(STREAK_KEY(uid), JSON.stringify(state));
  } catch {
    // best-effort persistence
  }
}

export function readEnergyOrDefault(uid: string, now = Date.now()): EnergyState {
  return loadEnergy(uid) ?? initEnergy(ENERGY_MAX, now);
}

export function readStreakOrDefault(uid: string): StreakState {
  return loadStreak(uid) ?? initStreak();
}

/** One graded review costs energy, counts as a day of activity, and
    advances the Momentum economy (multiplier, jade, recovery cache).
    It also feeds Standard Pass progress in the Resonance economy. */
export function noteReviewActivity(
  uid: string,
  now = Date.now(),
): { energy: EnergyState; streak: StreakState; starlight: StarlightState } {
  const energy = spendEnergy(readEnergyOrDefault(uid, now), REVIEW_ENERGY_COST, now).state;
  const streak = recordActivity(readStreakOrDefault(uid), toDateKey(new Date(now))).state;
  const starlight = noteStarlightReview(uid, now);
  noteResonanceActivity(uid, 1, now);
  saveEnergy(uid, energy);
  saveStreak(uid, streak);
  return { energy, streak, starlight };
}

/** Consumable effect: top up mental-clarity energy (clamped to the cap). */
export function grantEnergy(uid: string, amount: number, now = Date.now()): EnergyState {
  const current = regenEnergy(readEnergyOrDefault(uid, now), now);
  const value = Math.min(ENERGY_MAX, current.value + Math.max(0, Math.round(amount)));
  const next = { value, updatedAt: now };
  saveEnergy(uid, next);
  return next;
}

/** One arcade solve: counts as a day of activity and awards Jade.
    Arcade play never costs energy — it is reward-only by design. */
export function noteArcadeActivity(
  uid: string,
  jadeAmount = ARCADE_JADE_REWARD,
  now = Date.now(),
): { streak: StreakState; starlight: StarlightState } {
  const streak = recordActivity(readStreakOrDefault(uid), toDateKey(new Date(now))).state;
  const starlight = awardArcadeJade(uid, jadeAmount, now);
  saveStreak(uid, streak);
  return { streak, starlight };
}

/** One puzzle entry: spends Waveplate energy and counts as a day of activity.
    Returns ok=false when energy is insufficient, blocking entry. */
export function notePuzzleEntry(
  uid: string,
  now = Date.now(),
): { energy: EnergyState; streak: StreakState; ok: boolean } {
  const result = spendEnergy(readEnergyOrDefault(uid, now), PUZZLE_ENTRY_ENERGY_COST, now);
  if (!result.ok) {
    return { energy: result.state, streak: readStreakOrDefault(uid), ok: false };
  }
  saveEnergy(uid, result.state);
  const streak = recordActivity(readStreakOrDefault(uid), toDateKey(new Date(now))).state;
  saveStreak(uid, streak);
  return { energy: result.state, streak, ok: true };
}