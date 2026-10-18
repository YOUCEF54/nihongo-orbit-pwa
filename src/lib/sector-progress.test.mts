import test from "node:test";
import assert from "node:assert/strict";
import { progressForSector, SECTOR_COMPLETION_RATIO } from "./sector-progress.ts";
import type { SectorId } from "../types/curriculum.ts";
import type { UserMasteryState } from "../types/learning.ts";

const NOW = new Date("2026-01-10T00:00:00Z");

function vocabUnit(id: string, sector: SectorId = "sector-1") {
  return { id, sector };
}

function state(
  id: string,
  overrides: Partial<UserMasteryState> = {},
): UserMasteryState {
  return {
    userId: "u1",
    cardId: id,
    cardType: "vocab",
    stability: 5,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 5,
    reps: 1,
    lapses: 0,
    state: "Learning",
    lastReview: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

test("a sector is complete at exactly the completion ratio", () => {
  const units = [1, 2, 3, 4, 5].map((n) => vocabUnit(`v${n}`));
  const atThreshold: Record<string, UserMasteryState> = {};
  for (const n of [1, 2, 3, 4]) atThreshold[`v${n}`] = state(`v${n}`);
  const four = progressForSector(units, "sector-1", atThreshold, NOW);
  assert.equal(four.reviewed, 4);
  assert.equal(four.total, 5);
  assert.equal(four.reviewPct, 80);
  assert.ok(SECTOR_COMPLETION_RATIO === 0.8);
  assert.equal(four.isComplete, true);

  const below: Record<string, UserMasteryState> = {};
  for (const n of [1, 2, 3]) below[`v${n}`] = state(`v${n}`);
  const three = progressForSector(units, "sector-1", below, NOW);
  assert.equal(three.reviewPct, 60);
  assert.equal(three.isComplete, false);
});

test("counts reviewed, mastered, due and fresh units", () => {
  const units = [1, 2, 3, 4].map((n) => vocabUnit(`v${n}`));
  const mastery: Record<string, UserMasteryState> = {
    v1: state("v1", { state: "Review", lastReview: "2026-02-01T00:00:00Z" }),
    v2: state("v2", { state: "Learning", lastReview: "2026-01-01T00:00:00Z" }),
    v3: state("v3", { reps: 0, state: "New" }),
  };
  const progress = progressForSector(units, "sector-1", mastery, NOW);
  assert.equal(progress.total, 4);
  assert.equal(progress.reviewed, 2);
  assert.equal(progress.mastered, 1);
  assert.equal(progress.fresh, 2);
  assert.equal(progress.due, 1);
});

test("sectors without vocabulary are never eligible or complete", () => {
  const units = [vocabUnit("v1", "sector-1")];
  const progress = progressForSector(units, "sector-2", {}, NOW);
  assert.equal(progress.total, 0);
  assert.equal(progress.eligible, false);
  assert.equal(progress.isComplete, false);
  assert.equal(progress.reviewPct, 0);
});

test("vocabulary is scoped to the requested sector", () => {
  const units = [
    vocabUnit("a", "sector-0"),
    vocabUnit("b", "sector-1"),
    vocabUnit("c", "sector-1"),
  ];
  const progress = progressForSector(units, "sector-1", {}, NOW);
  assert.equal(progress.total, 2);
});
