import test from "node:test";
import assert from "node:assert/strict";
import { kanaToMorae, planPhrase, pitchF0For } from "./japanese-phono.ts";
import { VOCAB_SEED } from "../data/vocab.seed.ts";
import { pitchPatternOf } from "./pitch.ts";

test("merges small kana into a single mora", () => {
  const morae = kanaToMorae("でんしゃ");
  assert.equal(morae.length, 3);
  assert.deepEqual(morae.map((m) => m.text), ["で", "ん", "しゃ"]);
  assert.equal(morae[2].consonant, "sh");
  assert.equal(morae[2].glide, "y");
  assert.equal(morae[2].vowel, "a");
});

test("counts っ as its own mora and ん as nasal", () => {
  const morae = kanaToMorae("がっこう");
  assert.equal(morae.length, 4);
  assert.equal(morae[1].kind, "geminate");
  const gakko = kanaToMorae("がっこう");
  assert.deepEqual(gakko.map((m) => m.kind), ["syllable", "geminate", "syllable", "syllable"]);
  const sen = kanaToMorae("せんせい");
  assert.equal(sen[1].kind, "nasal");
});

test("katakana readings fold to hiragana", () => {
  const a = kanaToMorae("テスト");
  const b = kanaToMorae("てすと");
  assert.deepEqual(a.map((m) => m.text), b.map((m) => m.text));
});

test("pitch mapping is monotone: L low, H high", () => {
  assert.equal(pitchF0For("L"), 128);
  assert.equal(pitchF0For("H"), 205);
  assert.ok(pitchF0For("H") > pitchF0For("L"));
  assert.equal(pitchF0For(undefined), 128);
});

test("planPhrase times segments sequentially and carries the pattern", () => {
  const segments = planPhrase("でんしゃ", ["L", "H", "H"], { moraDuration: 0.2 });
  assert.ok(segments.length >= 3);
  // first segment starts at 0
  assert.equal(segments[0].start, 0);
  // the vowel of mora 0 is low, morae 1 & 2 are high
  const vowelF0 = (i: number) => segments.filter((s) => s.kind === "vowel" && s.moraIndex === i)[0].f0;
  assert.equal(vowelF0(0), 128);
  assert.equal(vowelF0(1), 205);
  assert.equal(vowelF0(2), 205);
  // no overlaps
  for (let k = 1; k < segments.length; k += 1) {
    const prev = segments[k - 1];
    assert.ok(segments[k].start >= prev.start + prev.duration - 1e-9);
  }
});

test("geminate mora becomes a silence gap", () => {
  const segments = planPhrase("がっこう", ["L", "H", "H", "H"]);
  assert.ok(segments.some((s) => s.kind === "silence"));
});

test("corpus invariant: every reading decodes to the pitch pattern length", () => {
  assert.ok(VOCAB_SEED.length >= 40);
  for (const item of VOCAB_SEED) {
    const morae = kanaToMorae(item.readingFurigana);
    const pattern = pitchPatternOf(item);
    assert.equal(
      morae.length,
      pattern.length,
      `mismatch for ${item.id} "${item.readingFurigana}": ${morae.length} morae vs pattern ${pattern.length}`,
    );
    const segments = planPhrase(item.readingFurigana, pattern);
    assert.ok(segments.length > 0, `no segments for ${item.id}`);
    for (const seg of segments) {
      assert.ok(Number.isFinite(seg.start) && seg.start >= 0);
      assert.ok(Number.isFinite(seg.duration) && seg.duration > 0);
    }
  }
});