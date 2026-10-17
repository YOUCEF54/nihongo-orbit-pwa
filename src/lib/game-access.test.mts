import test from "node:test";
import assert from "node:assert/strict";
import {
  TIER2_SEEN_THRESHOLD,
  isSeenWord,
  seenVocab,
  evaluateGameUnlocks,
  unlockProgress,
} from "./game-access.ts";
import { KANA_SEED } from "../data/kana.seed.ts";
import { STROKE_STARTERS } from "../data/stroke-starters.seed.ts";
import type { UserMasteryState } from "../types/learning.ts";

function mastery(reps: number): UserMasteryState {
  return {
    userId: "u1",
    cardId: "v1-001",
    cardType: "vocab",
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps,
    lapses: 0,
    state: reps > 0 ? "Review" : "New",
    lastReview: new Date(0).toISOString(),
  };
}

test("a word counts as seen only after at least one graded rep", () => {
  assert.equal(isSeenWord("v1-001", {}), false);
  assert.equal(isSeenWord("v1-001", { "v1-001": mastery(0) }), false);
  assert.equal(isSeenWord("v1-001", { "v1-001": mastery(1) }), true);
});

test("seenVocab keeps only reviewed words and never leaks fresh cards", () => {
  const pool = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const record: Record<string, UserMasteryState> = {
    a: mastery(2),
    b: mastery(0),
  };
  const seen = seenVocab(pool, record);
  assert.deepEqual(
    seen.map((item) => item.id),
    ["a"],
  );
});

test("tier 1 games are open on day one, higher tiers stay locked", () => {
  const fresh = evaluateGameUnlocks(0);
  for (const game of fresh) {
    if (game.tier === 1) assert.equal(game.isUnlocked, true, `${game.gameId} should be open`);
    else assert.equal(game.isUnlocked, false, `${game.gameId} should be locked`);
  }
});

test("tier 2 unlocks exactly at the seen threshold (5)", () => {
  const below = evaluateGameUnlocks(TIER2_SEEN_THRESHOLD - 1);
  assert.ok(below.filter((g) => g.tier === 2).every((g) => !g.isUnlocked));
  assert.ok(below.filter((g) => g.tier >= 3).every((g) => !g.isUnlocked));

  const at = evaluateGameUnlocks(TIER2_SEEN_THRESHOLD);
  assert.ok(at.filter((g) => g.tier <= 2).every((g) => g.isUnlocked));
  assert.ok(at.filter((g) => g.tier >= 3).every((g) => !g.isUnlocked));

  const echo = at.find((g) => g.gameId === "echo-link");
  assert.equal(echo?.currentSeenCount, TIER2_SEEN_THRESHOLD);
  assert.equal(echo?.requiredSeenCount, TIER2_SEEN_THRESHOLD);
});

test("tier 3 unlocks at 15 seen and tier 4 at 25", () => {
  const t2plus = evaluateGameUnlocks(14);
  assert.ok(!t2plus.find((g) => g.gameId === "sov-assembly")?.isUnlocked);

  const t3 = evaluateGameUnlocks(15);
  assert.ok(t3.find((g) => g.gameId === "sov-assembly")?.isUnlocked);
  assert.ok(!t3.find((g) => g.gameId === "grammar-core")?.isUnlocked);

  const t4 = evaluateGameUnlocks(25);
  assert.ok(t4.every((g) => g.isUnlocked));
});

test("unlock progress is bounded and complete when no words are required", () => {
  assert.equal(unlockProgress(0, 10), 0);
  assert.equal(unlockProgress(5, 10), 50);
  assert.equal(unlockProgress(10, 10), 100);
  assert.equal(unlockProgress(20, 10), 100);
  assert.equal(unlockProgress(3, 0), 100);
});

test("kana seed is well-formed: unique glyphs, valid scripts, groups with peers", () => {
  const seen = new Set<string>();
  const groupCounts = new Map<number, number>();

  for (const glyph of KANA_SEED) {
    assert.ok(glyph.glyph.length > 0, "glyph must not be empty");
    assert.ok(!seen.has(glyph.glyph), `duplicate glyph ${glyph.glyph}`);
    seen.add(glyph.glyph);

    const code = glyph.glyph.codePointAt(0) ?? 0;
    if (glyph.script === "hiragana") {
      assert.ok(code >= 0x3040 && code <= 0x309f, `${glyph.glyph} is not hiragana`);
    } else {
      assert.ok(code >= 0x30a0 && code <= 0x30ff, `${glyph.glyph} is not katakana`);
    }

    groupCounts.set(glyph.group, (groupCounts.get(glyph.group) ?? 0) + 1);
  }

  for (const [group, count] of groupCounts) {
    assert.ok(count >= 2, `confusability group ${group} needs at least 2 glyphs`);
  }
});

test("stroke starters are unique and non-empty", () => {
  const seen = new Set<string>();
  for (const starter of STROKE_STARTERS) {
    assert.equal(Array.from(starter.character).length, 1, `${starter.character} must be one char`);
    assert.ok(!seen.has(starter.character), `duplicate starter ${starter.character}`);
    assert.ok(starter.meaningAr.length > 0, "every starter needs an Arabic meaning");
    seen.add(starter.character);
  }
});
