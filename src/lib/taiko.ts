/* ============================================================
   Mora Taiko — pure rhythm-drill logic (no browser APIs).
   Builds a beatmap from a vocabulary item's accent metadata and
   judges taps by timing window + correct High/Low zone.
   ============================================================ */
import type { PitchState } from "@/types/learning";
import { kanaToMorae } from "./japanese-phono.ts";
import { getPitchAccentPattern, type AccentWord } from "./pitch.ts";

/** Tap zone: High-tone morae strike the center, Low-tone the rim. */
export type TaikoZone = "center" | "rim";

export type TaikoJudgment = "perfect" | "great" | "miss";

export interface TaikoNote {
  /** Display kana for this beat (a combined sound like しょ is one note). */
  mora: string;
  pitch: PitchState;
  zone: TaikoZone;
  /** Scheduled strike time in ms from the round start. */
  timeMs: number;
}

export interface TaikoBeatmap {
  itemId: string;
  audioUrl: string | null;
  beatMs: number;
  leadMs: number;
  notes: TaikoNote[];
}

export interface TaikoWord extends AccentWord {
  id: string;
  audioUrl?: string | null;
}

/** Fixed metronome grid: one mora per beat (word MP3 plays as the prompt). */
export const DEFAULT_BEAT_MS = 500;
/** Silence before the first note so the prompt can start. */
export const DEFAULT_LEAD_MS = 1200;

/** |dt| <= this is PERFECT. */
export const PERFECT_WINDOW_MS = 90;
/** |dt| <= this (and zone correct) is GREAT. */
export const GREAT_WINDOW_MS = 180;

/** Points per judgment; perfects scale with the live combo. */
export function scoreFor(judgment: TaikoJudgment, combo: number): number {
  if (judgment === "perfect") return 100 + combo * 10;
  if (judgment === "great") return 50;
  return 0;
}

/**
 * Build a beatmap from a vocab item. Morae come from `kanaToMorae`, pitch
 * from the universal accent engine. A trailing long-vowel mark (ー) becomes
 * its own elongated note carrying its stem's pitch, per the Taiko spec.
 */
export function buildBeatmap(
  item: TaikoWord,
  beatMs: number = DEFAULT_BEAT_MS,
  leadMs: number = DEFAULT_LEAD_MS,
): TaikoBeatmap {
  const hiragana = item.hiragana ?? item.readingFurigana;
  const { pattern } = getPitchAccentPattern(hiragana, item.accent_type, item.accent_nucleus);
  const morae = kanaToMorae(hiragana).map((mora) => mora.text);

  const notes: TaikoNote[] = [];
  morae.forEach((text, index) => {
    const pitch = pattern[index] ?? "L";
    // Peel trailing ー marks into standalone elongated beats.
    let stem = text;
    const tails: string[] = [];
    while (stem.endsWith("ー") && stem.length > 1) {
      tails.unshift("ー");
      stem = stem.slice(0, -1);
    }
    const beats = stem ? [stem, ...tails] : tails;
    for (const mora of beats) {
      notes.push({
        mora,
        pitch,
        zone: pitch === "H" ? "center" : "rim",
        timeMs: leadMs + notes.length * beatMs,
      });
    }
  });

  return {
    itemId: item.id,
    audioUrl: item.audioUrl ?? null,
    beatMs,
    leadMs,
    notes,
  };
}

/**
 * Judge a tap against a note's scheduled time. The zone must be correct;
 * a wrong zone is always a MISS no matter how tight the timing is.
 */
export function judgeTap(
  noteTimeMs: number,
  tapTimeMs: number,
  zoneCorrect: boolean,
): TaikoJudgment {
  if (!zoneCorrect) return "miss";
  const delta = Math.abs(tapTimeMs - noteTimeMs);
  if (delta <= PERFECT_WINDOW_MS) return "perfect";
  if (delta <= GREAT_WINDOW_MS) return "great";
  return "miss";
}

/** Accuracy as a 0–100 percentage (perfect = 1, great = 0.5, miss = 0). */
export function accuracyOf(counts: Record<TaikoJudgment, number>): number {
  const total = counts.perfect + counts.great + counts.miss;
  if (total === 0) return 0;
  return Math.round(((counts.perfect + counts.great * 0.5) / total) * 100);
}
