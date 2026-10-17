/* ============================================================
   FSRS mastery persistence. Writes prefer the Supabase
   user_mastery_states table (RLS per-user); when the table is
   missing or the write fails, state degrades to localStorage so
   progress survives reloads.
   ============================================================ */
import type { UserMasteryState } from "@/types/learning";

export const MASTERY_LOCAL_KEY = (userId: string) => `learnjp:mastery:${userId}`;

export function loadMasteryLocal(userId: string): Record<string, UserMasteryState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MASTERY_LOCAL_KEY(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, UserMasteryState>;
  } catch {
    return {};
  }
}

export function saveMasteryLocal(
  userId: string,
  record: Record<string, UserMasteryState>,
): void {
  try {
    window.localStorage.setItem(MASTERY_LOCAL_KEY(userId), JSON.stringify(record));
  } catch {
    // storage unavailable — session-only state remains
  }
}

export function toMasteryRecord(list: UserMasteryState[]): Record<string, UserMasteryState> {
  return Object.fromEntries(list.map((item) => [item.cardId, item]));
}