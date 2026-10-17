import test from "node:test";
import assert from "node:assert/strict";
import {
  ENERGY_MAX,
  ENERGY_REGEN_MS,
  regenEnergy,
  initEnergy,
  spendEnergy,
  msUntilNextEnergy,
  scheduleReview,
  crossScriptPenalty,
  initStreak,
  recordActivity,
  toDateKey,
  daysBetween,
  type StreakState,
} from "./gamification.ts";

test("energy regenerates 1 unit per 8 minutes", () => {
  const state = { value: 0, updatedAt: 0 };
  assert.equal(regenEnergy(state, 2 * ENERGY_REGEN_MS).value, 2);
  assert.equal(regenEnergy(state, ENERGY_REGEN_MS - 1).value, 0);
});

test("energy caps at max", () => {
  const state = { value: ENERGY_MAX - 1, updatedAt: 0 };
  assert.equal(regenEnergy(state, 100 * ENERGY_REGEN_MS).value, ENERGY_MAX);
});

test("spend fails when insufficient, succeeds otherwise", () => {
  const fail = spendEnergy(initEnergy(10, 0), 20, 0);
  assert.equal(fail.ok, false);
  assert.equal(fail.state.value, 10);

  const ok = spendEnergy(initEnergy(50, 0), 20, 0);
  assert.equal(ok.ok, true);
  assert.equal(ok.state.value, 30);
});

test("msUntilNextEnergy counts down the current window", () => {
  const state = initEnergy(0, 0);
  assert.equal(msUntilNextEnergy(state, ENERGY_REGEN_MS / 2), ENERGY_REGEN_MS / 2);
  assert.equal(msUntilNextEnergy(initEnergy(ENERGY_MAX, 0), 0), 0);
});

test("grade 0 resets repetitions and interval", () => {
  const next = scheduleReview({ ease: 2.5, interval: 30, repetitions: 5 }, 0, "kana");
  assert.equal(next.repetitions, 0);
  assert.equal(next.interval, 1);
});

test("kanji carries a stronger cognitive penalty than kana", () => {
  assert.equal(crossScriptPenalty("kana"), 1);
  assert.equal(crossScriptPenalty("kanji"), 0.85);
  const card = { ease: 2.5, interval: 10, repetitions: 3 };
  assert.ok(scheduleReview(card, 2, "kanji").interval < scheduleReview(card, 2, "kana").interval);
});

test("consecutive days increment the tally", () => {
  const s1 = recordActivity(initStreak(), "2026-01-01").state;
  const s2 = recordActivity(s1, "2026-01-02");
  assert.equal(s2.state.current, 2);
  assert.equal(s2.newDay, true);
});

test("same-day activity does not double the tally", () => {
  const first = recordActivity(initStreak(), "2026-01-01");
  const again = recordActivity(first.state, "2026-01-01");
  assert.equal(again.state.current, 1);
  assert.equal(again.newDay, false);
});

test("a missed day never resets the tally", () => {
  const state: StreakState = { current: 9, lastActiveDate: "2026-01-01" };
  const result = recordActivity(state, "2026-01-05");
  assert.equal(result.state.current, 10);
  assert.equal(result.newDay, true);
  assert.equal(result.state.lastActiveDate, "2026-01-05");
});

test("date helpers compute whole days and ISO keys", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-03"), 2);
  assert.equal(toDateKey(new Date("2026-03-09T15:00:00Z")), "2026-03-09");
});
