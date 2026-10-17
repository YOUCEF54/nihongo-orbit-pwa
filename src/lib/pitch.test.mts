import test from "node:test";
import assert from "node:assert/strict";
import { getPitchAccentPattern } from "./pitch.ts";
import type { AccentType, PitchState } from "../types/learning.ts";

function patternOf(hiragana: string, accentType: AccentType, nucleus: number): PitchState[] {
  return getPitchAccentPattern(hiragana, accentType, nucleus).pattern;
}

test("atamadaka — first mora High, the rest Low", () => {
  // 箸 はし · chopsticks
  const { morae, pattern } = getPitchAccentPattern("はし", "atamadaka", 1);
  assert.deepEqual(morae, ["は", "し"]);
  assert.deepEqual(pattern, ["H", "L"]);
});

test("odaka — first mora Low, word stays High (particle drops)", () => {
  // 橋 はし · bridge
  assert.deepEqual(patternOf("はし", "odaka", 2), ["L", "H"]);
});

test("heiban — first mora Low, the rest High", () => {
  assert.deepEqual(patternOf("はし", "heiban", 0), ["L", "H"]);
  assert.deepEqual(patternOf("こんにちは", "heiban", 0), ["L", "H", "H", "H", "H"]);
});

test("nakadaka — High up to the drop, then Low to the end", () => {
  // nucleus 3 (1-based) → drop lands on the 3rd mora.
  assert.deepEqual(patternOf("あたま", "nakadaka", 3), ["L", "H", "L"]);
  // 4-mora word dropping on the 4th.
  assert.deepEqual(patternOf("たまごや", "nakadaka", 4), ["L", "H", "H", "L"]);
});

test("Rule 1 — the 1st and 2nd morae always have opposite pitches", () => {
  const cases: [string, AccentType, number][] = [
    ["はし", "atamadaka", 1],
    ["はし", "heiban", 0],
    ["はし", "odaka", 2],
    ["あたま", "nakadaka", 3],
    ["たまごや", "nakadaka", 4],
    ["そら", "heiban", 0],
  ];
  for (const [kana, type, nucleus] of cases) {
    const [first, second] = patternOf(kana, type, nucleus);
    assert.notEqual(first, second, `${kana}/${type}: morae 1 & 2 matched (${first})`);
  }
});

test("Rule 2 — one downstep at most, never rising again", () => {
  const cases: [string, AccentType, number][] = [
    ["ありがとう", "atamadaka", 1],
    ["こんにちは", "heiban", 0],
    ["あたま", "nakadaka", 3],
    ["たまごや", "nakadaka", 4],
  ];
  for (const [kana, type, nucleus] of cases) {
    const pattern = patternOf(kana, type, nucleus);
    let dropped = false;
    for (let i = 1; i < pattern.length; i += 1) {
      if (pattern[i - 1] === "H" && pattern[i] === "L") {
        assert.equal(dropped, false, `${kana}: more than one downstep`);
        dropped = true;
      } else if (pattern[i - 1] === "L" && pattern[i] === "H") {
        assert.equal(dropped, false, `${kana}: rose again after dropping`);
      }
    }
  }
});

test("combined small-kana sounds count as a single mora/beat", () => {
  // しょ = one mora, きょう = two (きょ + う), しゃしん = three (しゃ + し + ん)
  assert.equal(getPitchAccentPattern("しょ", "heiban", 0).morae.length, 1);
  assert.deepEqual(getPitchAccentPattern("きょう", "heiban", 0).morae, ["きょ", "う"]);
  assert.deepEqual(getPitchAccentPattern("しゃしん", "heiban", 0).morae, ["しゃ", "し", "ん"]);
  assert.deepEqual(patternOf("しゃしん", "heiban", 0), ["L", "H", "H"]);
});

test("pattern length always equals the mora count", () => {
  const words = ["こんにちは", "ありがとう", "そら", "にほん", "しゃしん", "がっこう"];
  for (const kana of words) {
    const { morae, pattern } = getPitchAccentPattern(kana, "heiban", 0);
    assert.equal(pattern.length, morae.length, `${kana}: length mismatch`);
  }
});

test("empty input yields empty results", () => {
  const { morae, pattern } = getPitchAccentPattern("", "heiban", 0);
  assert.deepEqual(morae, []);
  assert.deepEqual(pattern, []);
});
