# MASTER SYSTEM PROMPT: Gamified Japanese Learning Web App (Arabic / RTL)

## 1. Project Overview & Context
You are an expert Full-Stack Software Engineer building a gamified Japanese learning web app for Arabic speakers. The app serves as a companion platform for the Instagram handle `@learnjapanese.words`. 

### Key Mandates
- **Language & UI:** 100% Modern Standard Arabic (فصحى) for all user-facing copy. Modern, minimalist, and fully **Right-to-Left (RTL)** layout.
- **Brand Identity:**
  - Dark Theme Default: Background `#0c0c0e`, Surface `#16161a`, Border `#26262b`, Text `#f3f1ea`.
  - Primary Accent: Gold `#e8b923` (Hover: `#d4a71c`).
  - Footer Branding: `@learnjapanese.words` in all bottom layout regions.
  - Logo Component (`<BrandLogo />`): A bordered rounded square containing a small gold circle and vertical Japanese text "日本語".

---

## 2. Tech Stack & Dependencies
- **Framework:** Next.js 14+ (App Router), TypeScript, Tailwind CSS.
- **Backend & Database:** Supabase (Postgres, Auth, Realtime).
- **Fonts:** `Tajawal` (Arabic) & `Noto Sans JP` (Japanese) via `next/font/google`.
- **Audio & Animations:** Web Speech API (Browser TTS for Japanese praise), `hanzi-writer` (Lazy-loaded for stroke order tracing), `html2canvas` / `canvas` for 1080x1920 Story Card generation.
- **Deployment Target:** Vercel.

---

## 3. Database Architecture & Migrations

Execute the following database migration script on Supabase:

```sql
-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Words Deck
CREATE TABLE public.words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kanji TEXT NOT NULL,
  hiragana TEXT NOT NULL,
  romaji TEXT NOT NULL,
  meaning_ar TEXT NOT NULL,
  jlpt_level TEXT DEFAULT 'N5' NOT NULL,
  category TEXT DEFAULT 'general' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. XP Audit Log
CREATE TABLE public.xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'daily_login', 'flashcard_correct', 'flashcard_retry', 'game_completion', 'daily_quiz'
  xp_amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Streaks
CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0 NOT NULL,
  longest_streak INT DEFAULT 0 NOT NULL,
  mizu_freezes INT DEFAULT 0 NOT NULL, -- Mizu (水) protection tokens
  last_active_date DATE NOT NULL
);

-- 5. Game Scores
CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL, -- 'antonym', 'speed_kanji', 'kotowaza'
  score INT NOT NULL,
  duration_seconds INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Daily Instagram Quiz
CREATE TABLE public.daily_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_ar TEXT NOT NULL,
  options JSONB NOT NULL, -- ARRAY of strings
  correct_option_index INT NOT NULL,
  active_date DATE DEFAULT CURRENT_DATE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated words access" ON public.words FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "User XP access" ON public.xp_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User streaks access" ON public.streaks FOR SELECT USING (auth.uid() = user_id);

-- Weekly Rolling Leaderboard View (7-Day Window)
CREATE OR REPLACE VIEW public.weekly_leaderboard AS
SELECT 
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(SUM(x.xp_amount), 0)::INT AS weekly_xp
FROM public.profiles p
LEFT JOIN public.xp_log x 
  ON p.id = x.user_id 
  AND x.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.display_name, p.avatar_url
ORDER BY weekly_xp DESC;