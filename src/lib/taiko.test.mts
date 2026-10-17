import test from "node:test";
import assert from "node:assert/strict";
import {
  accuracyOf,
  buildBeatmap,
  judgeTap,
  scoreFor,
  type TaikoWord,
} from "./taiko.ts";

function word(overrides: Partial<TaikoWord> & { hiragana: string }): TaikoWord {
  return {
    id: "w-test",
    readingFurigana: overrides.hiragana,
    accent_type: "heiban",
    accent_nucleus: 0,
    audioUrl: null,
    ...overrides,
  };
}

test("きっさてん derives 5 equal beats with the geminate independent", () => {
  const map = buildBeatmap(word({ hiragana: "きっさてん" }), 500, 1200);
  assert.deepEqual(
    map.notes.map((note) => note.mora),
    ["き", "っ", "さ", "て", "ん"],
  );
  assert.deepEqual(
    map.notes.map((note) => note.timeMs),
    [1200, 1700, 2200, 2700, 3200],
  );
  // heiban: first Low, rest High → rim then centers.
  assert.deepEqual(
    map.notes.map((note) => note.zone),
    ["rim", "center", "center", "center", "center"],
  );
});

test("はし maps accent classes to zones", () => {
  const atama = buildBeatmap(
    word({ hiragana: "はし", accent_type: "atamadaka", accent_nucleus: 1 }),
  );
  assert.deepEqual(atama.notes.map((note) => note.zone), ["center", "rim"]);
  const odaka = buildBeatmap(
    word({ hiragana: "はし", accent_type: "odaka", accent_nucleus: 2 }),
  );
  assert.deepEqual(odaka.notes.map((note) => note.zone), ["rim", "center"]);
});

test("trailing ー becomes its own elongated note with the stem pitch", () => {
  // Katakana normalizes to hiragana inside the segmenter.
  const map = buildBeatmap(word({ hiragana: "コーヒー" }));
  assert.deepEqual(
    map.notes.map((note) => note.mora),
    ["こ", "ー", "ひ", "ー"],
  );
  // heiban コーヒー: stem pitches L, H → ー notes inherit them.
  assert.deepEqual(
    map.notes.map((note) => note.pitch),
    ["L", "L", "H", "H"],
  );
  assert.equal(map.notes[3].timeMs - map.notes[0].timeMs, 1500);
});

test("combined small-kana sounds stay a single note", () => {
  const map = buildBeatmap(word({ hiragana: "しゃしん" }));
  assert.deepEqual(
    map.notes.map((note) => note.mora),
    ["しゃ", "し", "ん"],
  );
});

test("judge windows honor timing and zone correctness", () => {
  assert.equal(judgeTap(1000, 1000, true), "perfect");
  assert.equal(judgeTap(1000, 1090, true), "perfect");
  assert.equal(judgeTap(1000, 1091, true), "great");
  assert.equal(judgeTap(1000, 1180, true), "great");
  assert.equal(judgeTap(1000, 1181, true), "miss");
  assert.equal(judgeTap(1000, 820, true), "great");
  assert.equal(judgeTap(1000, 1000, false), "miss");
});

test("scoring scales perfects with combo, accuracy weights greats", () => {
  assert.equal(scoreFor("perfect", 0), 100);
  assert.equal(scoreFor("perfect", 5), 150);
  assert.equal(scoreFor("great", 9), 50);
  assert.equal(scoreFor("miss", 9), 0);
  assert.equal(accuracyOf({ perfect: 3, great: 1, miss: 1 }), 70);
  assert.equal(accuracyOf({ perfect: 0, great: 0, miss: 0 }), 0);
});
