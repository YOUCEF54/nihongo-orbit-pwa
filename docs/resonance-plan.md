# Resonance Terminal — economy implementation

Status of the gacha/economy layer built from `External code/plan001.md` (the
blueprint). **Shipped server-backed (Phase E)**: the Supabase row is
authoritative; the local `localStorage` document is now only a rendered mirror
(hydrated from the server on every page load). See §5 for the wire contract.

## 1. Modules

| File | Role |
| --- | --- |
| `src/lib/resonance.ts` | Wallet document + storage mirror: currencies, pity, inventory, history; `learnjp:resonance:<uid>`; `hydrateResonance` |
| `src/lib/items.ts` | Registry of 12 items (themes/styles/titles/consumables), `DUP_SHARDS`, `EXCHANGE_OFFERS` |
| `src/lib/gacha.ts` | Pure pull engine: `fiveStarRate`, `rollPulls` (injected RNG), `secureRandom` (server RNG), `BANNERS` |
| `src/lib/inventory.ts` | Ownership queries (`ownedOf`, `ownedThemes`, `bestOwnedStyle`, `styleFinish`) |
| `src/lib/resonance-actions.ts` | Server actions: `pullAction`, `equipTitleAction`, `consumeItemAction`, `redeemOfferAction`, `adoptThemeAction`, `awardActivityAction`, `completeSectorAction` |
| `src/lib/resonance-map.ts` | Wire mapper: snapshot → state, error codes, pull payloads |
| `src/lib/resonance-server.ts` | `loadResonanceServer(uid)` for AppShell hydration (null = offline) |
| `src/lib/resonance-client.ts` | `mirrorOutcome`, `awardActivityInBackground` |
| `src/lib/use-resonance.ts` | `useSyncExternalStore` hook over the wallet mirror |

Tests: `resonance.test.mts` (7) · `items.test.mts` (7) · `gacha.test.mts` (14) ·
`inventory.test.mts` (6) · `resonance-map.test.mts` (11) ·
`resonance-sql-sync.test.mts` (10). The SQL-sync guard parses the migration and
fails if its seeded registries drift from `items.ts`/`gacha.ts`.

## 2. Currencies & earning rates

| Currency | Arabic | Source |
| --- | --- | --- |
| Jade | اليشم | unchanged — arcade solves, reviews, sector completion (`starlight.ts`, local) |
| Resonance Crystals | بلورات المدار | sector completion +25; exchange 60 shards → 10 |
| Standard Passes | تذاكر الإشارة | **1 pass / 10 activity points**: reviews +1, arcade solve +5, sector completion +3; exchange 40 shards → 1 |
| Resonance Shards | شظايا الرنين | duplicate pulls (3★ 5 / 4★ 20 / 5★ 100); dust bundle +15 |

Constants live in `resonance.ts`: `REVIEWS_PER_PASS=10`, `ARCADE_PASS_POINTS=5`,
`SECTOR_CRYSTALS=25`, `SECTOR_PASSES=3`, `HISTORY_MAX=100` (mirrored in SQL,
checked by `resonance-sql-sync.test.mts`).

Earning is **server-authoritative**: reviews (`dojo-content.tsx`), arcade
solves (the three games), and sector completion go through
`awardActivityAction` / `completeSectorAction`; the RPC rate-limits
(review: 1s gap, 400 pts/day; arcade: 5s gap, 150 pts/day) and owns pass math.
Sector completion is additionally idempotent server-side via
`resonance_sector_awards`.

Honest limits: mastery writes and arcade scores are still produced client-side,
so a determined user can script the earn calls; the server-side caps bound the
damage (≤400 + ≤150 points/day ≈ 55 passes/day worst case). Full anti-cheat
(server replay of scoring) is out of scope.

## 3. Pull engine

Standard banner `standard` — cost 1 pass/pull, no featured item (50/50 carry-over
code path exists for future event banners).

- 5★ base **1.2%**, 4★ marginal **7.8%** (`BASE_4_RATE`).
- Soft pity from pull **50**, +10%/pull, hard cap **60** (rate clamps at 1 —
  plan001's version never reached its own hard pity).
- Every 10-pull contains at least one 4★+ (forced on the last pull).
- Duplicates → shards; `consumable-dust` converts +15 on acquisition.
- Pity resets only on 5★; `guaranteed` flips when a featured 50/50 is lost.

Applied flow: the action rolls locally with `secureRandom` (single rate source
in `gacha.ts`), then `resonance_apply_pull` re-validates pool membership, pity
counters, guarantee flag, and the 10-pull floor, recomputes dup/shard payouts,
and writes wallet + inventory + pity + pull log atomically.

Invariants tested: initial/marginal rates, soft-ramp boundary (p49/p50/p51),
reachable hard pity, guarantee, featured carry, dup conversion, history cap.

## 4. UI

| Surface | File |
| --- | --- |
| `/resonance` route (4th dock tab «الرنين») | `src/app/(dashboard)/resonance/page.tsx` |
| Terminal (chips, pity bar, ×1/×10, sections) | `src/components/resonance/ResonanceTerminal.tsx` |
| Reveal overlay | `src/components/resonance/PullReveal.tsx` |
| Collection (locker: equip titles, use consumables) | `src/components/resonance/CollectionPanel.tsx` |
| Exchange (shards shop) | `src/components/resonance/ExchangePanel.tsx` |
| Pull history | `src/components/resonance/HistoryPanel.tsx` |
| Locker / operator pill / gating | `AppShell.tsx` (`userId` + `initialWallet`), `ThemeToggle.tsx` (`owned`), `StarlightPanel.tsx` chips |

Item effects: themes gate `ThemeToggle` (cycling restricted to owned themes; a
non-owned active theme falls back to the first owned one), titles render as the
HUD pill code (default `EXP`), styles apply automatically to `SRFlashcard`
(finish `ember`/`prism`, CSS `.card-finish-*` in `globals.css`), consumables:
energy +40 / cache +12 / shard dust +15.

Offline behavior: when `loadResonanceServer` returns null (migration not
applied, or Supabase unreachable) the terminal shows «المحطة غير متصلة» and
disables pulls; the rest of the app keeps working against the local mirror.

## 5. Server-backed wallet (Phase E) — implemented

Migration `supabase/migrations/0026_resonance_wallet.sql`:

- Tables: `resonance_wallets`, `resonance_owned` (FK → `resonance_items`),
  `resonance_pity`, `resonance_pulls` (audit log), `resonance_sector_awards`,
  `resonance_activity`; config mirrors: `resonance_items`, `resonance_dup_shards`,
  `resonance_banners`, `resonance_exchange_offers`. RLS `auth.uid() = user_id`
  on every user table.
- RPCs (all SECURITY DEFINER, `auth.uid()` checked): `resonance_ensure_wallet`,
  `resonance_adopt_theme`, `resonance_apply_pull`, `resonance_equip_title`,
  `resonance_consume`, `resonance_redeem`, `resonance_award_activity`,
  `resonance_complete_sector`. `resonance_snapshot` + `resonance_seed_starter`
  are internal helpers revoked from public/anon/authenticated.
- Lazy provisioning: every entry point runs `resonance_seed_starter`
  (wallet row + starter items), matching `STARTER_OWNED`.
- Starter-theme grace: on first load after migration, `AppShell` adopts the
  browser's active theme once via `resonance_adopt_theme` (flag
  `learnjp:resonance-adopted:<uid>:<theme>`), so no user loses their look.

Local mirror contract: server state hydrates the local doc; local mutations
never happen anymore except consumable side effects (energy/cache are still
local-only by scope decision) and UI-only sector state.

Wire quirk worth knowing: read-style RPCs (`ensure_wallet`, `equip_title`,
`redeem`, `adopt_theme`) return the snapshot directly, while mutating ones
(`apply_pull`, `consume`, `award_activity`, `complete_sector`) wrap it as
`{ ...meta, state }` — `snapshotFromRpcPayload` accepts both shapes.

Verification: `npm run test` (191 unit) · `npm run test:e2e` (Playwright:
`tests/e2e/{resonance,sector-hub,sector-skins,icon-rewire}.spec.ts` — each spec
creates a throwaway user via the Auth admin API and deletes it on teardown;
pull outcomes are server-random so assertions are DB invariants).
