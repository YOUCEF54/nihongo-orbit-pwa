import test from "node:test";
import assert from "node:assert/strict";
import {
  initStarlight,
  applyStarlightDay,
  awardArcadeJade,
  noteStarlightReview,
  loadStarlight,
  STARLIGHT_MIN,
  STARLIGHT_MAX,
  CACHE_MAX,
  JADE_PER_REVIEW,
  CACHE_JADE_BONUS,
} from "./starlight.ts";

const DAY = 86_400_000;
const T0 = Date.parse("2026-01-01T12:00:00Z");

function approx(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
}

test("starlight starts neutral and first review applies the first day step", () => {
  const uid = "star-a";
  const state = noteStarlightReview(uid, T0);
  approx(state.level, 1.05);
  assert.equal(state.cache, 0);
  assert.equal(state.jade, Math.round(JADE_PER_REVIEW * 1.05));
  assert.equal(state.lastActiveDate, "2026-01-01");
});

test("same-day extra reviews award jade but do not re-apply the day step", () => {
  const uid = "star-b";
  const first = noteStarlightReview(uid, T0);
  const second = noteStarlightReview(uid, T0 + 3_600_000);
  approx(second.level, first.level);
  assert.equal(second.jade, first.jade + Math.round(JADE_PER_REVIEW * first.level));
});

test("consecutive days raise the multiplier, missed days decay — never reset", () => {
  const uid = "star-c";
  noteStarlightReview(uid, T0);
  noteStarlightReview(uid, T0 + DAY);
  noteStarlightReview(uid, T0 + 2 * DAY);
  const tuned = noteStarlightReview(uid, T0 + 3 * DAY); // 4 active days → 1.20
  approx(tuned.level, 1.2);
  assert.equal(tuned.cache, 0);

  // Skip 3 days (gap of 4 days) → soft decay -0.45 and cache +12
  const back = noteStarlightReview(uid, T0 + 7 * DAY);
  approx(back.level, 1.2 + 0.05 - 3 * 0.15);
  assert.equal(back.cache, 12);
  assert.ok(back.level > STARLIGHT_MIN, "soft decay must not hit the floor immediately");
});

test("return cache services one bonus per review until empty", () => {
  const uid = "star-d";
  noteStarlightReview(uid, T0);
  const afterGap = noteStarlightReview(uid, T0 + 3 * DAY); // 2 missed days → cache 8? (gap-1)*4
  assert.equal(afterGap.cache, 8);

  const jadeBefore = afterGap.jade;
  const next = noteStarlightReview(uid, T0 + 3 * DAY + 60_000);
  approx(next.level, afterGap.level);
  assert.equal(next.cache, 7);
  assert.equal(
    next.jade,
    jadeBefore + Math.round(JADE_PER_REVIEW * next.level) + CACHE_JADE_BONUS,
  );
});

test("multiplier floor and cache ceiling hold under long absence", () => {
  const uid = "star-e";
  noteStarlightReview(uid, T0);
  const after = noteStarlightReview(uid, T0 + 20 * DAY); // 19 missed days
  approx(after.level, STARLIGHT_MIN);
  assert.equal(after.cache, Math.min(CACHE_MAX, 19 * 4));
  assert.ok(after.jade > 0);
});

test("applyStarlightDay handles the very first shell call safely", () => {
  const { state, newDay, missedDays } = applyStarlightDay(initStarlight(), "2026-02-10", 1);
  assert.equal(newDay, true);
  assert.equal(missedDays, 0);
  approx(state.level, 1.05);
  assert.equal(state.updatedAt, 1);
});

test("state persists round-trip through storage", () => {
  const uid = "star-f";
  const state = noteStarlightReview(uid, T0);
  const loaded = loadStarlight(uid);
  assert.ok(loaded);
  approx(loaded!.level, state.level);
  assert.equal(loaded!.jade, state.jade);
  assert.equal(loaded!.lastActiveDate, state.lastActiveDate);
});

test("arcade award adds flat jade and applies the first-day step once", () => {
  const uid = "star-arc-a";
  const first = awardArcadeJade(uid, 15, T0);
  approx(first.level, 1.05);
  assert.equal(first.jade, 15);
  assert.equal(first.cache, 0, "arcade must not touch the return cache");
  assert.equal(first.lastActiveDate, "2026-01-01");

  const second = awardArcadeJade(uid, 15, T0 + 3_600_000);
  approx(second.level, first.level);
  assert.equal(second.jade, 30);
});

test("arcade award never goes negative and persists round-trip", () => {
  const uid = "star-arc-b";
  const state = awardArcadeJade(uid, -50, T0);
  assert.equal(state.jade, 0);
  const loaded = loadStarlight(uid);
  assert.ok(loaded);
  assert.equal(loaded!.jade, 0);
  assert.equal(loaded!.lastActiveDate, "2026-01-01");
});

test("applyStarlightDay never exceeds the cap", () => {
  const uid = "star-g";
  let now = T0;
  noteStarlightReview(uid, now);
  for (let i = 1; i < 40; i += 1) {
    now += DAY;
    noteStarlightReview(uid, now);
  }
  const loaded = loadStarlight(uid)!;
  approx(loaded.level, STARLIGHT_MAX);
  assert.equal(loaded.cache, 0);
});
