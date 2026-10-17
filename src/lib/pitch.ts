/* ============================================================
   Pitch-accent helpers — the universal accent engine plus the
   learner-friendly Arabic labels, arrows and short legend so the
   pattern is understandable without Japanese terminology.
   ============================================================ */
import type { AccentType, PitchState } from "@/types/learning";
import { kanaToMorae } from "./japanese-phono.ts";

export interface PitchLabel {
  ar: string;
  arrow: string;
}

export interface PitchAccentResult {
  /** Segmented morae; a combined sound (しょ, ちゃ, ぴょ…) is one beat. */
  morae: string[];
  /** High/Low state per mora, mapping 1:1 with `morae`. */
  pattern: PitchState[];
}

/**
 * Compute the Tokyo Japanese pitch-accent pattern from a word's hiragana and
 * its linguistic metadata, following the two standard laws:
 *
 *   Rule 1 — the 1st and 2nd morae always have opposite pitches.
 *   Rule 2 — a word downsteps (High → Low) at most once and never rises again.
 *
 * Accent classes:
 *   atamadaka — index 0 High, every later mora Low.            (nucleus = 1)
 *   heiban    — index 0 Low,  every later mora High.           (nucleus = 0)
 *   odaka     — index 0 Low,  later morae High (word-internal;
 *               an attached particle is what drops).            (nucleus = n)
 *   nakadaka  — index 0 Low, High up to the drop at `nucleus`
 *               (1-based), then Low to the end.
 *
 * @param hiragana     Phonetic hiragana of the word, e.g. "はし".
 * @param accentType   One of the four accent classes.
 * @param nucleus      1-based mora index where the voice drops (0 for heiban).
 */
export function getPitchAccentPattern(
  hiragana: string,
  accentType: AccentType,
  nucleus: number,
): PitchAccentResult {
  const morae = kanaToMorae(hiragana).map((mora) => mora.text);
  const n = morae.length;
  const pattern: PitchState[] = new Array(n).fill("L");

  switch (accentType) {
    case "atamadaka":
      if (n > 0) pattern[0] = "H";
      break;
    case "heiban":
    case "odaka":
      if (n > 1) pattern.fill("H", 1);
      break;
    case "nakadaka": {
      // `nucleus` is 1-based; the drop lands on 0-based index nucleus - 1.
      const dropAt = Math.max(1, Math.min(n, nucleus));
      const lowStart = dropAt - 1;
      if (lowStart > 1) pattern.fill("H", 1, lowStart);
      break;
    }
  }

  // Rule 1 — the first two morae must differ (guards degenerate nakadaka).
  if (n >= 2 && pattern[0] === pattern[1]) {
    pattern[1] = pattern[0] === "H" ? "L" : "H";
  }

  return { morae, pattern };
}

/** Any record carrying the accent metadata — e.g. a seed vocabulary row. */
export interface AccentWord {
  hiragana?: string;
  readingFurigana: string;
  accent_type: AccentType;
  accent_nucleus: number;
}

/** Convenience: derive just the H/L pattern for a seed/word-shaped record. */
export function pitchPatternOf(word: AccentWord): PitchState[] {
  return getPitchAccentPattern(
    word.hiragana ?? word.readingFurigana,
    word.accent_type,
    word.accent_nucleus,
  ).pattern;
}

export const PITCH_LEGEND_AR = "مرتفع: نبرة أعلى · منخفض: نبرة أهدأ.";

export function pitchLabel(state: PitchState): PitchLabel {
  return state === "H"
    ? { ar: "مرتفع", arrow: "↑" }
    : { ar: "منخفض", arrow: "↓" };
}

export function pitchToArabic(pattern: PitchState[]): string {
  return pattern.map((state) => pitchLabel(state).ar).join(" · ");
}

export function pitchToArrows(pattern: PitchState[]): string {
  return pattern.map((state) => pitchLabel(state).arrow).join(" ");
}
