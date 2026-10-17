import test from "node:test";
import assert from "node:assert/strict";
import {
  ENERGY_MAX,
  initEnergy,
  initStreak,
  toDateKey,
  type EnergyState,
  type StreakState,
} from "./gamification.ts";
import {
  PUZZLE_ENTRY_ENERGY_COST,
  REVIEW_ENERGY_COST,
  loadEnergy,
  loadStreak,
  notePuzzleEntry,
  noteReviewActivity,
  readEnergyOrDefault,
  readStreakOrDefault,
  saveEnergy,
  saveStreak,
} from "./progress-state.ts";

const DAY = 86_400_000;

test("energy + streak round-trip through storage", () => {
  const uid = "roundtrip";
  const energy: EnergyState = { value: 120, updatedAt: 12345 };
  const streak: StreakState = { current: 4, lastActiveDate: "2026-10-01" };
  assert.equal(loadEnergy(uid), null);
  assert.equal(loadStreak(uid), null);
  saveEnergy(uid, energy);
  saveStreak(uid, streak);
  assert.deepEqual(loadEnergy(uid), energy);
  assert.deepEqual(loadStreak(uid), streak);
});

test("read*OrDefault fills in the blank state", () => {
  const uid = "empty";
  assert.deepEqual(readEnergyOrDefault(uid, 1000), initEnergy(ENERGY_MAX, 1000));
  assert.deepEqual(readStreakOrDefault(uid), initStreak());
});

test("noteReviewActivity spends exactly one review's worth of energy", () => {
  const uid = "spend";
  const before = readEnergyOrDefault(uid, 2000);
  const first = noteReviewActivity(uid, 2000);
  assert.equal(first.energy.value, before.value - REVIEW_ENERGY_COST);
  assert.deepEqual(loadEnergy(uid), first.energy);
  const second = noteReviewActivity(uid, 2100);
  assert.equal(second.energy.value, first.energy.value - REVIEW_ENERGY_COST);
});

test("noteReviewActivity counts the review day into the streak once a day", () => {
  const uid = "streakday";
  const first = noteReviewActivity(uid, 5000);
  assert.ok(first.streak.current >= 1);
  assert.equal(first.streak.lastActiveDate, toDateKey(new Date(5000)));
  const sameDay = noteReviewActivity(uid, 6000);
  assert.equal(sameDay.streak.current, first.streak.current, "same-day reviews must not double the streak");
});

test("activity days grow the tally and never reset across a gap", () => {
  const uid = "daily";
  const start = Date.parse("2026-10-01T08:00:00Z");
  let streak = readStreakOrDefault(uid);
  for (let day = 0; day < 6; day += 1) {
    ({ streak } = noteReviewActivity(uid, start + day * DAY));
  }
  assert.equal(streak.current, 6);
  // Skip two weeks: the tally must keep growing, never restart from zero.
  const afterGap = noteReviewActivity(uid, start + 20 * DAY);
  assert.equal(afterGap.streak.current, 7);
});

test("notePuzzleEntry spends puzzle energy and records the day", () => {
  const uid = "puzzle";
  const before = readEnergyOrDefault(uid, 10000);
  const entry = notePuzzleEntry(uid, 10000);
  assert.ok(entry.ok);
  assert.equal(entry.energy.value, before.value - PUZZLE_ENTRY_ENERGY_COST);
  assert.equal(entry.streak.current, 1);
  assert.deepEqual(loadEnergy(uid), entry.energy);
});

test("notePuzzleEntry blocks entry when energy is insufficient", () => {
  const uid = "nopower";
  // Drain energy to zero
  const drained: import("./gamification.ts").EnergyState = { value: 0, updatedAt: 10000 };
  saveEnergy(uid, drained);
  const entry = notePuzzleEntry(uid, 10000);
  assert.equal(entry.ok, false);
  assert.equal(entry.energy.value, 0);
});