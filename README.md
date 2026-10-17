# تعلّم اليابانية — Japanese for Arabic Speakers

A gamified study companion web app for the Instagram page
[@learnjapanese.words](https://instagram.com/learnjapanese.words).
Arabic-first (RTL, Modern Standard Arabic) dark UI, Duolingo-style XP and streak
mechanics, built as a lean MVP.

## Stack

- **Next.js 16** (App Router, `proxy.ts`) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** — Postgres, Auth (email/password), Realtime
- Fonts: **Tajawal** (Arabic) + **Noto Sans JP** (Japanese), self-hosted via `next/font`
- Deployment target: **Vercel** (Hobby tier)

## MVP Features

1. **Flashcards + XP** — flip a card (kanji + hiragana → romaji + Arabic meaning),
   self-mark known/unknown. Wrong cards re-queue; getting them right on the
   comeback pass earns retry XP.
2. **Daily streak** — any XP-earning action marks the day as active; a missed
   day resets the streak. Profile shows a 30-day activity calendar.
3. **Mini-games hub** — three games under `/games`:
   - **تطابق الأضداد** (antonym memory-match, the 8 seed words)
   - **مطابقة الأمثال الرباعية** (yojijukugo ↔ Arabic proverbs memory-match)
   - **اختبار الخمس ثوانٍ** (Speed Kanji: 10 questions × 5s, +2 XP per correct)
   Plus Japanese praise phrases (正解! / 素晴らしい!) with optional
   text-to-speech, and best time/score per game.
4. **Weekly leaderboard** — rolling 7-day XP window, top 20 + your own rank,
   live-updating via Supabase Realtime.
5. **Home dashboard** — greeting, streak + today's XP counter, level
   progress, word of the day (from the words table), and a modules grid.

### Screens

| Route | Screen |
| --- | --- |
| `/` | Home dashboard |
| `/flashcards` | Flashcard review sessions |
| `/games` | Mini-games hub (game cards, best times, coming-soon teasers) |
| `/games/antonym-match` | Antonym matching game |
| `/games/kotowaza-match` | Yojijukugo ↔ Arabic proverbs matching game |
| `/games/speed-kanji` | 5-second kanji quiz |
| `/leaderboard` | Weekly live leaderboard |
| `/profile` | Level, streak, 30-day activity calendar, logout |
| `/login` | Email/password + Google sign-in |
| `/auth/callback` | OAuth code exchange |

Bottom navigation (mobile-first, 5 tabs):
الرئيسية · البطاقات · الألعاب · المتصدّرون · حسابي

All XP awards are **server-validated** in Postgres functions — the client can
never choose its own XP amount.

### XP rules

| Action                    | XP                  |
| ------------------------- | ------------------- |
| Daily login               | +10 (once per day)  |
| Flashcard correct (1st try) | +5                |
| Flashcard correct (retry)  | +2                |
| Complete a match mini-game (antonym / kotowaza) | +20 |
| Game speed bonus          | +1 per 5s under 60s (max +10) |
| Speed Kanji correct answer | +2 each, max +20 per session |
| Streak milestone          | +50 (7d), +200 (30d), +500 (100d) |

Levels are linear: **100 XP per level** (`level = floor(total XP / 100) + 1`).

## Setup

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier works).
2. In **Authentication → Providers**, make sure **Email** is enabled.
   For friction-free MVP testing you can disable
   **"Confirm email"** under Authentication → Sign In / Up — then signups
   log straight in. If you leave confirmations on, new users get a
   confirmation email before their first login.
3. Note your project URL and `anon` key
   (Settings → API). The `anon` key is safe to expose to the browser; access
   control is enforced by Row Level Security. New projects also show
   "publishable" keys — the legacy `anon` JWT and the publishable key both
   work with `@supabase/ssr`.
4. Optional — **Google sign-in** (the login page shows the button when the
   provider is enabled):
   - In Supabase: **Authentication → Providers → Google** — add your Google
     Client ID and Client Secret.
   - In [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     (OAuth Client ID → Authorized redirect URIs) add:
     `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   - In Supabase: **Authentication → URL Configuration** — set the **Site URL**
     to your app URL (e.g. `http://localhost:3000` for dev, your Vercel URL for
     prod) and add `http://localhost:3000/auth/callback` and
     `https://YOUR-APP.vercel.app/auth/callback` to **Redirect URLs**.
   - The app exchanges the OAuth code in `/auth/callback` (already wired).

### 2. Run the SQL migrations

Run the three files in `supabase/migrations/` **in order**, in the Supabase
Dashboard → **SQL Editor** (paste each file and run):

```
supabase/migrations/0001_schema.sql      tables, indexes, RLS, signup trigger
supabase/migrations/0002_functions.sql   XP/streak RPCs, leaderboard, realtime
supabase/migrations/0003_seed_words.sql  49 JLPT N5 words (incl. the game's 8)
supabase/migrations/0004_phase1_games.sql generalized complete_game + speed kanji RPC
```

(If you use the Supabase CLI you can instead run `supabase db push`.)

### 3. Configure environment

Copy the example file and fill in your project values:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY
```

> ⚠️ **Never put the `sb_secret_` (service_role) key in this file.**
> `NEXT_PUBLIC_*` values are inlined into the browser bundle. The key here must
> be the **publishable/anon** key (from Settings → API Keys). Supabase rejects
> secret keys used from a browser with a 401, and server-side they silently
> bypass all RLS policies. The app includes a guard (`assertBrowserSafeKey`)
> that fails loudly if it detects a secret key in this variable.

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Create an
account and start learning.

## Deployment (Vercel)

1. Push this repo to GitHub and import it in Vercel.
2. Add the two environment variables above in Vercel project settings.
3. Deploy. No extra configuration needed — the Next.js version pinned in
   `package.json` is used.

## ⚠️ Supabase free-tier auto-pause

> **Supabase free-tier projects auto-pause after 7 days of inactivity.**
> During testing with low traffic, set up a simple daily cron ping to keep the
> project active.

This repo ships a lightweight keep-alive endpoint: **`GET /api/ping`** — it
performs a tiny database query and returns `{"ok": true}`. Point a free
external cron service (e.g. [cron-job.org](https://cron-job.org)) at your
deployment once a day:

```
https://YOUR-APP.vercel.app/api/ping
```

Do this for both your **Vercel URL** and any preview environment you care
about — the ping touches Supabase, which is what prevents the pause.

## Troubleshooting auth

The login form surfaces the real Supabase error message. If auth fails, open
DevTools → Network, find the failed request (it starts with `/auth/v1/` or
`/rest/v1/`) and check its response body:

| Response body / symptom | Cause | Fix |
| --- | --- | --- |
| `Forbidden use of secret API key in browser` | The **secret/service key** was pasted into `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Replace with the publishable/anon key (Settings → API Keys), **regenerate the exposed secret key**, restart the dev server |
| `{"error":"Invalid API key"}` | Wrong values in `.env.local` | Copy URL + key again from Settings → API; restart `npm run dev` |
| `Database error saving new user` | Signup trigger exists but its tables don't (migration 0001 missing or partial) | Run `supabase/migrations/0001_schema.sql` in the SQL Editor |
| `Email not confirmed` on login | "Confirm email" is on and the account isn't verified | Verify via the emailed link, or disable confirmations while testing |
| `Signups not allowed` | Email provider disabled | Re-enable Email under Authentication → Providers |
| 401 on `GET /auth/v1/user` for anonymous visitors | Expected noise from older versions of this app | None — the proxy now uses an optimistic cookie check, so anonymous requests no longer hit the auth API |

## Data model

```
profiles    (id → auth.users, display_name, avatar_url, created_at)
words       (id, kanji, hiragana, romaji, meaning_ar, jlpt_level, category)
xp_log      (id, user_id, action_type, xp_amount, created_at)   -- append-only
streaks     (user_id PK, current_streak, longest_streak, last_active_date)
game_scores (id, user_id, game_type, score, duration_seconds, created_at)
```

`xp_log` is the single source of truth: weekly leaderboards
(`get_weekly_leaderboard()`), totals (`get_user_stats()`) and the activity
calendar (`get_activity_days()`) are all computed from it, so future features
(badges, leagues, history charts) can be derived without schema changes.

## Roadmap (schema-ready, not built)

Leagues/clans, shareable profile cards, an admin CMS for words, and more
mini-games (the `game_scores.game_type` column and `words` categories are
already in place) are intentionally out of scope for this MVP.
