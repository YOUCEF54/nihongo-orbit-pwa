export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type PitchState = "H" | "L";

/** Tokyo Japanese accent class. `accent_nucleus` is the 1-based mora where the
    voice drops (0 for heiban; for odaka it sits just past the final mora). */
export type AccentType = "heiban" | "atamadaka" | "nakadaka" | "odaka";

export interface KanjiRadicalNode {
  id: string;
  symbol: string;
  arabicName: string;
  meaningAr: string;
  strokeCount: number;
}

export interface KanjiNode {
  id: string;
  character: string;
  unicode: string;
  jlpt: JLPTLevel;
  onyomi: string[];
  kunyomi: string[];
  arabicMeanings: string[];
  semanticRootAr: string;
  strokeCount: number;
  radicals: KanjiRadicalNode[];
  svgPathData: string[];
}

/** A pre-tokenized chunk of a sentence for SOV assembly, with its
    Arabic grammatical role (I'rab) label so learners map particles
    directly to native case intuition. */
export interface SentenceSlot {
  /** Japanese chunk including its particle, e.g. "花を". */
  jp: string;
  /** Lexeme without the trailing particle, e.g. "花". */
  chunk: string;
  /** Trailing particle (は/が/を/に/で/へ/の…) if any. */
  particle?: string;
  /** Arabic case-role label, e.g. "الفاعل" / "المفعول به" / "حرف جر" / "المبتدأ" / "الفعل" / "الخبر". */
  caseAr: string;
  /** Machine-readable role used by the game to order/color slots. */
  caseEn: "subject" | "object" | "verb" | "goal" | "predicate";
  /** Expected index in the assembled sentence (0-based), e.g. subject-first SOV. */
  position: number;
}

export interface VocabularyItem {
  id: string;
  japaneseText: string;
  readingFurigana: string;
  /** Phonetic hiragana used as the beat-by-beat source for pitch accent. */
  hiragana: string;
  romaji: string;
  arabicTranslation: string;
  partOfSpeechAr: string;
  /** Accent class; drives the computed pitch pattern. */
  accent_type: AccentType;
  /** 1-based mora index where the voice drops (0 for heiban). */
  accent_nucleus: number;
  /** Derived at load time from `hiragana` + `accent_type` + `accent_nucleus`
      via `getPitchAccentPattern`; kept for audio/TTS and rendering. */
  pitchAccentPattern: PitchState[];
  exampleSentenceJp: string;
  exampleSentenceAr: string;
  audioUrl: string | null;
  /** SOV-assembly slots tagged with Arabic case markers (populated for
      sentences that decompose cleanly). */
  slots_ar?: SentenceSlot[];
}

export type CardState = "New" | "Learning" | "Review" | "Relearning";

export interface UserMasteryState {
  userId: string;
  cardId: string;
  cardType: "kanji" | "vocab";
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: string;
}