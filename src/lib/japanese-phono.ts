/* ============================================================
   Japanese phonology helpers (pure, no browser APIs).
   Converts kana readings into morae, then morae into a timed
   phoneme phrase that the Web Audio synthesizer can render.
   ============================================================ */

export type PitchState = "H" | "L";

export type MoraKind = "syllable" | "geminate" | "nasal";

export interface Mora {
  /** Source kana for this mora, e.g. "しゃ", "っ", "ん". */
  text: string;
  kind: MoraKind;
  /** Base consonant token ("k", "sh", "ts"…) or "" for a bare vowel. */
  consonant: string;
  /** Palatal glide from a small ゃ/ゅ/ょ, otherwise null. */
  glide: "y" | null;
  /** Vowel token ("a","i","u","e","o") or null for っ/ん. */
  vowel: string | null;
}

const PHONEME: Record<string, string> = {
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
  "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
  "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
  "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
  "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
  "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
  "や": "ya", "ゆ": "yu", "よ": "yo",
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
  "わ": "wa", "を": "o", "ゐ": "i", "ゑ": "e",
};

const SMALL_VOWEL: Record<string, string> = {
  "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o",
  "ゃ": "a", "ゅ": "u", "ょ": "o", "ゎ": "a",
};

const GLIDE_KANA = new Set(["ゃ", "ゅ", "ょ"]);

function katakanaToHiragana(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // Katakana block U+30A1–U+30F6 → Hiragana U+3041–U+3096
    if (code >= 0x30a1 && code <= 0x30f6) out += String.fromCodePoint(code - 0x60);
    else out += ch;
  }
  return out;
}

/** Split a kana reading into morae. Small kana merge; っ and ん are their own mora. */
export function kanaToMorae(reading: string): Mora[] {
  const src = katakanaToHiragana(reading);
  const morae: Mora[] = [];
  const chars = Array.from(src);

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];

    if (ch === "っ") {
      morae.push({ text: "っ", kind: "geminate", consonant: "", glide: null, vowel: null });
      continue;
    }
    if (ch === "ん") {
      morae.push({ text: "ん", kind: "nasal", consonant: "", glide: null, vowel: null });
      continue;
    }
    if (ch === "ー") {
      // Long-vowel mark: attach to the previous mora (prolongation).
      const prev = morae[morae.length - 1];
      if (prev) prev.text += "ー";
      continue;
    }

    const phoneme = PHONEME[ch];
    if (!phoneme) {
      // Unknown symbol — emit a neutral vowel so timing stays predictable.
      morae.push({ text: ch, kind: "syllable", consonant: "", glide: null, vowel: "a" });
      continue;
    }

    const consonant = phoneme.slice(0, -1);
    let vowel = phoneme.slice(-1);
    let glide: "y" | null = null;

    let text = ch;
    const next = chars[i + 1];
    if (next && SMALL_VOWEL[next]) {
      text += next;
      vowel = SMALL_VOWEL[next];
      glide = GLIDE_KANA.has(next) ? "y" : glide;
      i += 1;
    }

    morae.push({
      text,
      kind: "syllable",
      consonant,
      glide,
      vowel,
    });
  }

  return morae;
}

export const PITCH_LOW_HZ = 128;
export const PITCH_HIGH_HZ = 205;

export function pitchF0For(state: PitchState | undefined): number {
  return state === "H" ? PITCH_HIGH_HZ : PITCH_LOW_HZ;
}

export interface PhraseSegment {
  kind: "vowel" | "consonant" | "silence";
  /** Start time in seconds from phrase origin. */
  start: number;
  duration: number;
  /** Fundamental frequency to target (Hz). 0 for silence. */
  f0: number;
  /** Vowel token for vowel segments. */
  vowel: string | null;
  /** Base consonant token for consonant segments. */
  consonant: string | null;
  /** Palatal glide flag. */
  glide: boolean;
  moraIndex: number;
}

export interface PlanOptions {
  /** Base duration of one mora in seconds. */
  moraDuration?: number;
  /** Leading consonant share of a mora (0–0.5). */
  consonantRatio?: number;
}

/** Build a deterministic, evenly-timed phoneme phrase (no Web Audio). */
export function planPhrase(
  reading: string,
  pattern: PitchState[],
  options: PlanOptions = {},
): PhraseSegment[] {
  const moraDuration = options.moraDuration ?? 0.18;
  const consonantRatio = options.consonantRatio ?? 0.28;
  const morae = kanaToMorae(reading);
  const segments: PhraseSegment[] = [];
  let cursor = 0;

  morae.forEach((mora, moraIndex) => {
    const f0 = pitchF0For(pattern[moraIndex]);

    if (mora.kind === "geminate") {
      segments.push({
        kind: "silence",
        start: cursor,
        duration: moraDuration,
        f0: 0,
        vowel: null,
        consonant: null,
        glide: false,
        moraIndex,
      });
      cursor += moraDuration;
      return;
    }

    if (mora.kind === "nasal") {
      segments.push({
        kind: "vowel",
        start: cursor,
        duration: moraDuration,
        f0,
        vowel: "n",
        consonant: null,
        glide: false,
        moraIndex,
      });
      cursor += moraDuration;
      return;
    }

    const hasConsonant = mora.consonant.length > 0;
    const consonantDuration = hasConsonant ? moraDuration * consonantRatio : 0;
    const vowelDuration = moraDuration - consonantDuration;

    if (hasConsonant) {
      segments.push({
        kind: "consonant",
        start: cursor,
        duration: consonantDuration,
        f0,
        vowel: null,
        consonant: mora.consonant,
        glide: mora.glide === "y",
        moraIndex,
      });
      cursor += consonantDuration;
    }

    segments.push({
      kind: "vowel",
      start: cursor,
      duration: vowelDuration,
      f0,
      vowel: mora.vowel ?? "a",
      consonant: null,
      glide: false,
      moraIndex,
    });
    cursor += vowelDuration;
  });

  return segments;
}
