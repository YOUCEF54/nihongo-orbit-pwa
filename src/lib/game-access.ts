/* ============================================================
   Mini-game access rules.

   Vocabulary-based games stay locked until the learner has
   actually encoded enough words in the active sector, and they
   only ever draw from words marked as "seen" (graded at least
   once) — never fresh cards, so the learner is never forced to
   guess.

   Tiers (per active sector, seen-word counts):
     Tier 1 @ 0  — zero-vocab drills (kana radar, stroke starters, mora pulse)
     Tier 2 @ 5  — echo link (vocab/listening) + audio sprint (listening drills)
     Tier 3 @ 15 — SOV sentence assembly (I'rab case mapping)
     Tier 4 @ 25 — advanced grammar reference (I'rab core)
   ============================================================ */
import type { UserMasteryState } from "@/types/learning";

export const TIER2_SEEN = 5;
export const TIER3_SEEN = 15;
export const TIER4_SEEN = 25;

/** @deprecated kept for import compatibility */
export const TIER2_SEEN_THRESHOLD = TIER2_SEEN;

/** A word is "seen" once its FSRS card has been graded at least once. */
export function isSeenWord(
  id: string,
  mastery: Record<string, UserMasteryState>,
): boolean {
  const state = mastery[id];
  return Boolean(state) && state.reps > 0;
}

/** Keep only words the learner has already encountered. */
export function seenVocab<T extends { id: string }>(
  pool: T[],
  mastery: Record<string, UserMasteryState>,
): T[] {
  return pool.filter((item) => isSeenWord(item.id, mastery));
}

export type GameTier = 1 | 2 | 3 | 4;

export interface GameUnlockDef {
  gameId: string;
  titleAr: string;
  requiredSeenCount: number;
  tier: GameTier;
}

export interface GameUnlockStatus extends GameUnlockDef {
  isUnlocked: boolean;
  currentSeenCount: number;
}

export const GAME_UNLOCKS: GameUnlockDef[] = [
  { gameId: "syntax-scramble", titleAr: "قطار الجمل", requiredSeenCount: 0, tier: 1 },
  { gameId: "stroke-starters", titleAr: "معايرة مسارات الكتابة", requiredSeenCount: 0, tier: 1 },
  { gameId: "astral-abacus", titleAr: "المعداد المداري", requiredSeenCount: 0, tier: 1 },
  { gameId: "radical-confluence", titleAr: "توحيد الجذور", requiredSeenCount: 0, tier: 1 },
  {
    gameId: "echo-link",
    titleAr: "صدى المعاني",
    requiredSeenCount: TIER2_SEEN,
    tier: 2,
  },
  {
    gameId: "listening-lab",
    titleAr: "سباق السرعة الصوتي",
    requiredSeenCount: TIER2_SEEN,
    tier: 2,
  },
  {
    gameId: "taiko-mora",
    titleAr: "طبل المورا",
    requiredSeenCount: TIER2_SEEN,
    tier: 2,
  },
  {
    gameId: "sov-assembly",
    titleAr: "تركيب الجملة اليابانية",
    requiredSeenCount: TIER3_SEEN,
    tier: 3,
  },
  {
    gameId: "grammar-core",
    titleAr: "النحو المتقدم — جوهر الإعراب",
    requiredSeenCount: TIER4_SEEN,
    tier: 4,
  },
];

export function evaluateGameUnlocks(seenCount: number): GameUnlockStatus[] {
  return GAME_UNLOCKS.map((def) => ({
    ...def,
    isUnlocked: seenCount >= def.requiredSeenCount,
    currentSeenCount: seenCount,
  }));
}

export function unlockProgress(seenCount: number, required: number): number {
  if (required <= 0) return 100;
  return Math.min(100, Math.round((seenCount / required) * 100));
}
