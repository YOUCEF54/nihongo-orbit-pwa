import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  cardToMastery,
  createFsrsCard,
  dueInDays,
  gradeToRating,
  masteryToCard,
  scheduleFsrs,
} from "./fsrs.ts";
import { Rating } from "ts-fsrs";

describe("grade mapping", () => {
  test("maps our 4 grades onto FSRS ratings", () => {
    assert.equal(gradeToRating(0), Rating.Again);
    assert.equal(gradeToRating(1), Rating.Hard);
    assert.equal(gradeToRating(2), Rating.Good);
    assert.equal(gradeToRating(3), Rating.Easy);
  });
});

describe("scheduling from New", () => {
  test("Easy advances furthest, Again stays shortest", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const base = createFsrsCard(now);
    const again = scheduleFsrs(base, 0, now);
    const hard = scheduleFsrs(base, 1, now);
    const good = scheduleFsrs(base, 2, now);
    const easy = scheduleFsrs(base, 3, now);

    assert.ok(dueInDays(easy, now) >= dueInDays(good, now));
    assert.ok(dueInDays(good, now) >= dueInDays(hard, now));
    assert.ok(dueInDays(hard, now) >= dueInDays(again, now));
    assert.ok(dueInDays(easy, now) >= 1, "Easy should push past the first day");
  });

  test("Again keeps the card inside learning, not review", () => {
    const now = new Date("2026-03-01T08:00:00Z");
    const card = createFsrsCard(now);
    const next = scheduleFsrs(card, 0, now);
    assert.equal(next.state, 1, "learning state");
    assert.equal(next.reps, 1);
  });
});

describe("mastery conversion", () => {
  test("cardToMastery mirrors every scheduler field", () => {
    const now = new Date("2026-05-10T00:00:00Z");
    const card = scheduleFsrs(createFsrsCard(now), 3, now);
    const mastery = cardToMastery("u1", "kanji-001", "kanji", card);
    assert.equal(mastery.userId, "u1");
    assert.equal(mastery.cardId, "kanji-001");
    assert.equal(mastery.stability, card.stability);
    assert.equal(mastery.difficulty, card.difficulty);
    assert.equal(mastery.reps, card.reps);
    assert.equal(mastery.scheduledDays, card.scheduled_days);
    assert.equal(
      mastery.lastReview,
      card.last_review ? card.last_review.toISOString() : "",
    );
  });

  test("masteryToCard reconstructs a schedulable card", () => {
    const mastery = {
      userId: "u1",
      cardId: "v1",
      cardType: "vocab" as const,
      stability: 8.2956,
      difficulty: 1,
      elapsedDays: 0,
      scheduledDays: 8,
      reps: 1,
      lapses: 0,
      state: "Review" as const,
      lastReview: "2026-01-01T00:00:00.000Z",
    };
    const card = masteryToCard(mastery);
    assert.equal(card.state, 2, "Review");
    assert.equal(card.stability, 8.2956);
    assert.equal(card.scheduled_days, 8);
  });
});