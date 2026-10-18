/* ============================================================
   Sector campaign progress — pure derivation from FSRS mastery.

   A sector is "complete" once at least 80% of its vocabulary has
   been reviewed at least once. Sectors without vocabulary are never
   completable (kanji-only and roadmap sectors), which keeps the
   hub honest until their content batch lands.
   ============================================================ */
import { dueInDays, masteryToCard } from "./fsrs.ts";
import type { SectorId } from "@/types/curriculum";
import type { UserMasteryState } from "@/types/learning";

/** Share of a sector's vocabulary that must be reviewed to complete it. */
export const SECTOR_COMPLETION_RATIO = 0.8;

export interface SectorProgress {
  /** Vocabulary units in the sector. */
  total: number;
  /** Units graded at least once. */
  reviewed: number;
  /** Units currently in the FSRS Review state. */
  mastered: number;
  /** Reviewed units due today (or overdue). */
  due: number;
  /** Units never seen. */
  fresh: number;
  /** reviewed / total, rounded to a percentage (0 when empty). */
  reviewPct: number;
  /** True when the sector has vocabulary and crosses the completion ratio. */
  isComplete: boolean;
  /** True when the sector carries enough content to run a review campaign. */
  eligible: boolean;
}

export interface SectorUnit {
  id: string;
  sector: SectorId;
}

export function progressForSector(
  units: SectorUnit[],
  sector: SectorId,
  mastery: Record<string, UserMasteryState>,
  now: Date = new Date(),
): SectorProgress {
  const items = units.filter((unit) => unit.sector === sector);
  let reviewed = 0;
  let mastered = 0;
  let due = 0;
  for (const item of items) {
    const state = mastery[item.id];
    if (!state || state.reps <= 0) continue;
    reviewed += 1;
    if (state.state === "Review") mastered += 1;
    if (dueInDays(masteryToCard(state), now) <= 0) due += 1;
  }
  const total = items.length;
  return {
    total,
    reviewed,
    mastered,
    due,
    fresh: total - reviewed,
    reviewPct: total > 0 ? Math.round((reviewed / total) * 100) : 0,
    isComplete: total > 0 && reviewed / total >= SECTOR_COMPLETION_RATIO,
    eligible: total > 0,
  };
}
