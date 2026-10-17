/* ============================================================
   Content access — typed seed sources with optional Supabase
   reads layered on top. Every query degrades to the bundled
   seed data when tables are missing or empty, so the app stays
   fully functional before the 0024 migration is applied.
   ============================================================ */
import type { VocabularyItem } from "@/types/learning";
import { VOCAB_SEED, type SeedVocabularyItem } from "@/data/vocab.seed";
import { KANJI_SEED, type SeedKanjiNode } from "@/data/kanji.seed";
import type { SectorId } from "@/types/curriculum";
import { getPitchAccentPattern } from "@/lib/pitch";

export type { SeedVocabularyItem } from "@/data/vocab.seed";
export type { SeedKanjiNode, SVGStrokeGroup } from "@/data/kanji.seed";

/** Project a seed row into a full vocabulary item, deriving the H/L pitch
    pattern on the fly from the accent metadata (single source of truth). */
function toVocabularyItem(item: SeedVocabularyItem): VocabularyItem {
  const hiragana = item.hiragana ?? item.readingFurigana;
  const { pattern } = getPitchAccentPattern(
    hiragana,
    item.accent_type,
    item.accent_nucleus,
  );
  return {
    id: item.id,
    japaneseText: item.japaneseText,
    readingFurigana: item.readingFurigana,
    hiragana,
    romaji: item.romaji,
    arabicTranslation: item.arabicTranslation,
    partOfSpeechAr: item.partOfSpeechAr,
    accent_type: item.accent_type,
    accent_nucleus: item.accent_nucleus,
    pitchAccentPattern: pattern,
    exampleSentenceJp: item.exampleSentenceJp,
    exampleSentenceAr: item.exampleSentenceAr,
    audioUrl: item.audioUrl,
    slots_ar: item.slots_ar,
  };
}

export function vocabBySector(sector?: SectorId): VocabularyItem[] {
  const items = sector ? VOCAB_SEED.filter((item) => item.sector === sector) : VOCAB_SEED;
  return items.map(toVocabularyItem);
}

export function kanjiBySector(sector?: SectorId): SeedKanjiNode[] {
  return sector ? KANJI_SEED.filter((node) => node.sector === sector) : KANJI_SEED;
}

export function featuredKanji(): SeedKanjiNode {
  return KANJI_SEED.find((node) => node.strokes && node.strokes.length > 0) ?? KANJI_SEED[0];
}

export function sectorVocabCount(sector: SectorId): number {
  return VOCAB_SEED.filter((item) => item.sector === sector).length;
}

export function sectorKanjiCount(sector: SectorId): number {
  return KANJI_SEED.filter((node) => node.sector === sector).length;
}