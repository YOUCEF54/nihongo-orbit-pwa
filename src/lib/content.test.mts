import test from "node:test";
import assert from "node:assert/strict";
import { VOCAB_SEED } from "../data/vocab.seed.ts";
import { KANJI_SEED, type SeedKanjiNode } from "../data/kanji.seed.ts";
import { IRAB_SEED } from "../data/grammar.seed.ts";
import { SENTENCE_SLOTS } from "../data/sentences.seed.ts";
import { SECTORS } from "./curriculum.ts";
import { getPitchAccentPattern } from "./pitch.ts";

const VALID_SECTOR_IDS = new Set(SECTORS.map((sector) => sector.id));

function moraCount(kana: string): number {
  let count = 0;
  for (const char of kana) {
    if ("ゃゅょャュョ".includes(char)) continue;
    count += 1;
  }
  return count;
}

function uniqueChars(items: SeedKanjiNode[]): Map<string, number> {
  const seen = new Map<string, number>();
  for (const node of items) {
    seen.set(node.character, (seen.get(node.character) ?? 0) + 1);
  }
  return seen;
}

test("vocab seed ids are globally unique", () => {
  const ids = VOCAB_SEED.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("vocab seed belongs to registered sectors", () => {
  for (const item of VOCAB_SEED) {
    assert.ok(VALID_SECTOR_IDS.has(item.sector), `${item.id} → bad sector ${item.sector}`);
  }
});

test("vocab seed has whole content + matching pitch tables", () => {
  for (const item of VOCAB_SEED) {
    assert.ok(item.japaneseText.length > 0, `${item.id} empty japaneseText`);
    assert.ok(item.readingFurigana.length > 0, `${item.id} empty furigana`);
    assert.ok(item.romaji.length > 0, `${item.id} empty romaji`);
    assert.ok(item.arabicTranslation.length > 0, `${item.id} empty translation`);
    assert.ok(item.partOfSpeechAr.length > 0, `${item.id} empty partOfSpeech`);
    assert.ok(item.exampleSentenceJp.length > 0, `${item.id} empty jp example`);
    assert.ok(item.exampleSentenceRomaji.length > 0, `${item.id} empty romaji example`);
    assert.ok(item.exampleSentenceAr.length > 0, `${item.id} empty ar example`);
    const { pattern } = getPitchAccentPattern(
      item.hiragana ?? item.readingFurigana,
      item.accent_type,
      item.accent_nucleus,
    );
    assert.equal(
      pattern.length,
      moraCount(item.readingFurigana),
      `${item.id} pitch size ${pattern.length} ≠ mora count of ${item.readingFurigana}`,
    );
    for (const tone of pattern) {
      assert.ok(tone === "H" || tone === "L", `${item.id} bad tone ${tone}`);
    }
  }
});

test("kanji seed characters are unique", () => {
  for (const [char, count] of uniqueChars(KANJI_SEED)) {
    assert.equal(count, 1, `duplicate kanji ${char} appeared ${count}×`);
  }
});

test("kanji seed has coherent metadata + codepoints", () => {
  for (const node of KANJI_SEED) {
    assert.equal([...node.character].length, 1, `${node.id} not a single character`);
    const hex = node.character.codePointAt(0)!.toString(16).padStart(4, "0");
    assert.equal(node.unicode, hex, `${node.id} unicode mismatch (got ${node.unicode}, want ${hex})`);
    assert.ok(VALID_SECTOR_IDS.has(node.sector), `${node.id} → bad sector ${node.sector}`);
    assert.ok(node.strokeCount > 0, `${node.id} missing strokeCount`);
    assert.ok(node.semanticRootAr.length > 0, `${node.id} empty semanticRootAr`);
    assert.ok(node.arabicMeanings.length > 0, `${node.id} empty arabicMeanings`);
    assert.ok(node.radicals.length > 0, `${node.id} missing radicals`);
    for (const radical of node.radicals) {
      assert.ok(radical.symbol.length > 0 && radical.arabicName.length > 0, `${node.id} hollow radical`);
    }
  }
});

test("embedded kanji strokes match their strokeCount", () => {
  for (const node of KANJI_SEED) {
    if (node.strokes && node.strokes.length > 0) {
      assert.equal(node.strokes.length, node.strokeCount, `${node.id} strokes ≠ strokeCount`);
      for (const stroke of node.strokes) {
        assert.ok(stroke.d.trim().startsWith("M"), `${node.id} stroke path not absolute`);
      }
    }
  }
});

test("sector-1 launch content meets the curated batch targets", () => {
  const vocab1 = VOCAB_SEED.filter((item) => item.sector === "sector-1");
  const kanji1 = KANJI_SEED.filter((node) => node.sector === "sector-1");
  assert.ok(vocab1.length >= 30, `sector-1 vocab ${vocab1.length} < 30`);
  assert.ok(kanji1.length >= 25, `sector-1 kanji ${kanji1.length} < 25`);
});

test("sector-1 vocab has id continuity (v1-001 … v1-030)", () => {
  const vocab1 = VOCAB_SEED.filter((item) => item.sector === "sector-1").sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  vocab1.forEach((item, index) => {
    assert.equal(item.id, `v1-${String(index + 1).padStart(3, "0")}`);
  });
});

test("sentence slots carry latin romaji readings", () => {
  for (const [id, slots] of Object.entries(SENTENCE_SLOTS)) {
    for (const entry of slots) {
      assert.ok(entry.romaji.length > 0, `${id} slot "${entry.jp}" missing romaji`);
      assert.ok(
        !/[\u3040-\u30ff\u4e00-\u9fff]/.test(entry.romaji),
        `${id} slot "${entry.jp}" romaji is not latin (${entry.romaji})`,
      );
    }
  }
});

test("grammar seed entries are well-formed particles", () => {
  const ids = IRAB_SEED.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate grammar ids");
  const particles = IRAB_SEED.map((entry) => entry.particle);
  assert.equal(new Set(particles).size, particles.length, "duplicate particles");
  for (const entry of IRAB_SEED) {
    assert.ok(["は", "が", "を", "に", "で", "の"].includes(entry.particle), `${entry.id} unknown particle`);
    assert.ok(entry.roleAr.length > 0, `${entry.id} empty role`);
    assert.ok(entry.functionAr.length > 0, `${entry.id} empty function`);
    assert.ok(entry.exampleJp.length > 0, `${entry.id} empty example`);
    assert.ok(entry.exampleRomaji.length > 0, `${entry.id} empty example romaji`);
    assert.ok(entry.exampleAr.length > 0, `${entry.id} empty translation`);
  }
});