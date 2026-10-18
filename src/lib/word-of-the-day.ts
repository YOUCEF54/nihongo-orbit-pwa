/* ============================================================
   Word of the day — a deterministic daily pick from the bundled
   vocabulary seed. Fully offline: no API key, no network. The
   daily index is date-derived, and the "new word" action simply
   advances through the pool.
   ============================================================ */
import { VOCAB_SEED, type SeedVocabularyItem } from "@/data/vocab.seed";
import { sectorById } from "@/lib/curriculum";

export interface DailyWord {
  id: string;
  japaneseText: string;
  furigana: string;
  romaji: string;
  arabicTranslation: string;
  /** Part of speech, e.g. "تحية" or "اسم". */
  categoryAr: string;
  /** Sector/JLPT chip, e.g. "القطاع 1 · N5". */
  sectorLabelAr: string;
  example: { jp: string; romaji: string; ar: string };
  audioUrl: string | null;
  /** Optional illustrative art (emoji) when the word has a clear visual. */
  art: string | null;
}

const POOL: SeedVocabularyItem[] = VOCAB_SEED;

/** Curated illustrations for words that map to a clear visual concept.
    Words absent here (greetings, abstract adjectives…) fall back to the
    decorative glyph header. */
const WORD_ART: Record<string, string> = {
  "v0-001": "👋",
  "v0-002": "🙏",
  "v0-003": "🙇",
  "v0-005": "✅",
  "v0-006": "❌",
  "v0-007": "🌅",
  "v0-008": "🏫",
  "v0-009": "🧑🏫",
  "v0-010": "✏️",
  "v1-001": "💧",
  "v1-002": "🌊",
  "v1-003": "🌸",
  "v1-004": "🏞️",
  "v1-005": "🗻",
  "v1-006": "🌧️",
  "v1-007": "🍽️",
  "v1-008": "🚆",
  "v1-009": "☁️",
  "v1-010": "⭐",
  "v1-011": "📖",
  "v1-012": "🗾",
  "v1-014": "🧑🎓",
  "v1-018": "🚶",
  "v1-020": "👀",
  "v1-021": "👂",
  "v1-022": "🎵",
  "v1-023": "❤️",
  "v1-024": "🐟",
  "v1-025": "🥩",
  "v1-026": "🥬",
  "v1-027": "🛒",
  "v1-028": "🏘️",
  "v1-029": "🏠",
  "v1-030": "⛅",
};

function toDailyWord(item: SeedVocabularyItem): DailyWord {
  const sector = sectorById(item.sector);
  return {
    id: item.id,
    japaneseText: item.japaneseText,
    furigana: item.readingFurigana,
    romaji: item.romaji,
    arabicTranslation: item.arabicTranslation,
    categoryAr: item.partOfSpeechAr,
    sectorLabelAr: `القطاع ${sector.order + 1} · ${sector.jlpt}`,
    example: {
      jp: item.exampleSentenceJp,
      romaji: item.exampleSentenceRomaji,
      ar: item.exampleSentenceAr,
    },
    audioUrl: item.audioUrl ?? null,
    art: WORD_ART[item.id] ?? null,
  };
}

export function dailyWordIndex(date: Date = new Date()): number {
  const key = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return parseInt(key, 10) % POOL.length;
}

export function wordAt(index: number): DailyWord {
  const wrapped = ((index % POOL.length) + POOL.length) % POOL.length;
  return toDailyWord(POOL[wrapped]);
}

/** Every word in the pool, in seed order (used by the admin panel). */
export function allDailyWords(): DailyWord[] {
  return POOL.map(toDailyWord);
}
