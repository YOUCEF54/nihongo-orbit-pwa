/* ============================================================
   Zero-vocabulary kana dataset for visual discrimination drills.
   Glyphs are grouped by visual confusability (e.g. さ/き, シ/ツ,
   あ/お) — the game asks the learner to calibrate onto the exact
   matching glyph, no vocabulary required.
   ============================================================ */

export type KanaScript = "hiragana" | "katakana";

export interface KanaGlyph {
  glyph: string;
  romaji: string;
  script: KanaScript;
  /** Visual-confusability group; glyphs sharing a group look alike. */
  group: number;
}

export const KANA_SEED: KanaGlyph[] = [
  // group 0 · round loop family
  { glyph: "あ", romaji: "a", script: "hiragana", group: 0 },
  { glyph: "お", romaji: "o", script: "hiragana", group: 0 },
  { glyph: "ぬ", romaji: "nu", script: "hiragana", group: 0 },
  { glyph: "め", romaji: "me", script: "hiragana", group: 0 },
  { glyph: "わ", romaji: "wa", script: "hiragana", group: 0 },
  // group 1 · s/k loop family
  { glyph: "さ", romaji: "sa", script: "hiragana", group: 1 },
  { glyph: "き", romaji: "ki", script: "hiragana", group: 1 },
  { glyph: "ち", romaji: "chi", script: "hiragana", group: 1 },
  { glyph: "ら", romaji: "ra", script: "hiragana", group: 1 },
  // group 2 · re/ne/ru/ro
  { glyph: "れ", romaji: "re", script: "hiragana", group: 2 },
  { glyph: "ね", romaji: "ne", script: "hiragana", group: 2 },
  { glyph: "る", romaji: "ru", script: "hiragana", group: 2 },
  { glyph: "ろ", romaji: "ro", script: "hiragana", group: 2 },
  // group 3 · h/m family
  { glyph: "は", romaji: "ha", script: "hiragana", group: 3 },
  { glyph: "ほ", romaji: "ho", script: "hiragana", group: 3 },
  { glyph: "ま", romaji: "ma", script: "hiragana", group: 3 },
  { glyph: "ば", romaji: "ba", script: "hiragana", group: 3 },
  // group 4 · katakana sh/ts/so/n
  { glyph: "シ", romaji: "shi", script: "katakana", group: 4 },
  { glyph: "ツ", romaji: "tsu", script: "katakana", group: 4 },
  { glyph: "ソ", romaji: "so", script: "katakana", group: 4 },
  { glyph: "ン", romaji: "n", script: "katakana", group: 4 },
  // group 5 · katakana ku/wa/fu/u
  { glyph: "ク", romaji: "ku", script: "katakana", group: 5 },
  { glyph: "ワ", romaji: "wa", script: "katakana", group: 5 },
  { glyph: "フ", romaji: "fu", script: "katakana", group: 5 },
  { glyph: "ウ", romaji: "u", script: "katakana", group: 5 },
  // group 6 · i/ri across scripts
  { glyph: "い", romaji: "i", script: "hiragana", group: 6 },
  { glyph: "り", romaji: "ri", script: "hiragana", group: 6 },
  { glyph: "イ", romaji: "i", script: "katakana", group: 6 },
  { glyph: "リ", romaji: "ri", script: "katakana", group: 6 },
  // group 7 · ta/na/da
  { glyph: "た", romaji: "ta", script: "hiragana", group: 7 },
  { glyph: "な", romaji: "na", script: "hiragana", group: 7 },
  { glyph: "だ", romaji: "da", script: "hiragana", group: 7 },
  // group 8 · small loops
  { glyph: "こ", romaji: "ko", script: "hiragana", group: 8 },
  { glyph: "に", romaji: "ni", script: "hiragana", group: 8 },
  { glyph: "し", romaji: "shi", script: "hiragana", group: 8 },
  // group 9 · katakana diagonals
  { glyph: "ア", romaji: "a", script: "katakana", group: 9 },
  { glyph: "マ", romaji: "ma", script: "katakana", group: 9 },
  { glyph: "ム", romaji: "mu", script: "katakana", group: 9 },
  { glyph: "ヌ", romaji: "nu", script: "katakana", group: 9 },
  { glyph: "メ", romaji: "me", script: "katakana", group: 9 },
  // group 10 · katakana strokes
  { glyph: "エ", romaji: "e", script: "katakana", group: 10 },
  { glyph: "ユ", romaji: "yu", script: "katakana", group: 10 },
  { glyph: "ヨ", romaji: "yo", script: "katakana", group: 10 },
  { glyph: "コ", romaji: "ko", script: "katakana", group: 10 },
];

/** All glyphs that look like the given one (same confusability group). */
export function confusablesFor(glyph: KanaGlyph): KanaGlyph[] {
  return KANA_SEED.filter((entry) => entry.group === glyph.group);
}
