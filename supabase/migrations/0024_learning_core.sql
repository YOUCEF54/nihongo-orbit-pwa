-- Migration: 0024_learning_core.sql
-- Learning content tables + FSRS mastery state, with RLS.

CREATE TYPE jlpt_level_enum AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');
CREATE TYPE card_state_enum AS ENUM ('New', 'Learning', 'Review', 'Relearning');

-- ---- Lesson content: kanji nodes (radical metadata + KanjiVG stroke paths) ----
CREATE TABLE kanji_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character VARCHAR(4) NOT NULL UNIQUE,
    unicode_hex VARCHAR(10) NOT NULL,
    jlpt jlpt_level_enum NOT NULL DEFAULT 'N5',
    onyomi TEXT[] NOT NULL DEFAULT '{}',
    kunyomi TEXT[] NOT NULL DEFAULT '{}',
    arabic_meanings TEXT[] NOT NULL DEFAULT '{}',
    semantic_root_ar TEXT NOT NULL,
    stroke_count INT NOT NULL,
    svg_path_data TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Lesson content: vocabulary items (pitch pattern + bilingual examples) ----
CREATE TABLE vocabulary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    japanese_text VARCHAR(100) NOT NULL,
    reading_furigana VARCHAR(100) NOT NULL,
    romaji VARCHAR(100) NOT NULL,
    arabic_translation TEXT NOT NULL,
    part_of_speech_ar VARCHAR(50) NOT NULL,
    pitch_pattern VARCHAR(20)[] NOT NULL, -- e.g. ARRAY['L', 'H', 'H']
    example_jp TEXT NOT NULL,
    example_ar TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- FSRS spaced-repetition mastery state (one row per user per card) ----
CREATE TABLE user_mastery_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL, -- app-stable ids like 'v1-001' / 'k1-002'
    card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('kanji', 'vocab')),
    stability REAL NOT NULL DEFAULT 0.1,
    difficulty REAL NOT NULL DEFAULT 5.0,
    elapsed_days INT NOT NULL DEFAULT 0,
    scheduled_days INT NOT NULL DEFAULT 0,
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    state card_state_enum NOT NULL DEFAULT 'New',
    last_review TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_card UNIQUE(user_id, card_id)
);

CREATE INDEX idx_mastery_review ON user_mastery_states(user_id, scheduled_days, state);

-- ---- Row-Level Security ----
-- Content: authenticated users may read; no direct writes.
ALTER TABLE kanji_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_kanji_nodes" ON kanji_nodes FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_vocabulary_items" ON vocabulary_items FOR SELECT USING (auth.role() = 'authenticated');

-- Mastery: users manage only their own rows.
ALTER TABLE user_mastery_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_mastery" ON user_mastery_states
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);