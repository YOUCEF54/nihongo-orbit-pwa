-- Migration: 0025_pitch_accent_dynamic.sql
-- Replace the hardcoded H/L pitch array with declarative accent metadata that
-- the app derives the pattern from at runtime via getPitchAccentPattern().

-- Accent class: which of the four Tokyo accent types the word belongs to.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accent_type_enum') THEN
    CREATE TYPE accent_type_enum AS ENUM ('heiban', 'atamadaka', 'nakadaka', 'odaka');
  END IF;
END $$;

ALTER TABLE vocabulary_items
  ADD COLUMN IF NOT EXISTS hiragana VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent_type accent_type_enum NOT NULL DEFAULT 'heiban',
  ADD COLUMN IF NOT EXISTS accent_nucleus INTEGER NOT NULL DEFAULT 0;

-- Backfill hiragana from the kana reading where empty.
UPDATE vocabulary_items
SET hiragana = reading_furigana
WHERE hiragana = '';

-- `pitch_pattern` is retained for backwards compatibility but is now derived
-- from (hiragana, accent_type, accent_nucleus) and can be dropped later.
