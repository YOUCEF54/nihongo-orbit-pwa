# Resonance Terminal — economy implementation

Status of the gacha/economy layer built from `External code/plan001.md` (the
blueprint). **Shipped local-first**: all state lives in `localStorage` behind a
single storage seam so a server-backed adapter can replace it later without
touching callers. No Supabase tables yet (Phase E, deferred).

## 1. Modules

| File | Role |
| --- | --- |
| `src/lib/resonance.ts` | Wallet store: currencies, pity, inventory, history; storage + subscription. `learnjp:resonance:<uid>` |
| `src/lib/items.ts` | Registry of 12 items (themes/styles/titles/consumables), `DUP_SHARDS`, `EXCHANGE_OFFERS` |
| `src/lib/gacha.ts` | Pure pull engine: `fiveStarRate`, `rollPulls` (injected RNG), `executePull` (persisted), `BANNERS` |
| `src/lib/inventory.ts` | Ownership queries (`ownedOf`, `ownedThemes`, `bestOwnedStyle`, `styleFinish`), actions (`equipTitle`, `consumeItem`, `redeemOffer`) |
| `src/lib/use-resonance.ts` | `useSyncExternalStore` hook over the wallet snapshot |

Tests: `resonance.test.mts` (7) · `items.test.mts` (7) · `gacha.test.mts` (14) ·
`inventory.test.mts` (6). Pull engine is tested both boundary-deterministic and
statistically (seeded 20k).

## 2. Currencies & earning rates

| Currency | Arabic | Source |
| --- | --- | --- |
| Jade | اليشم | unchanged — arcade solves, reviews, sector completion (`starlight.ts`) |
| Resonance Crystals | بلورات المدار | sector completion +25; exchange 60 shards → 10 |
| Standard Passes | تذاكر الإشارة | **1 pass / 10 activity points**: reviews +1, arcade solve +5, sector completion +3; exchange 40 shards → 1 |
| Resonance Shards | شظايا الرنين | duplicate pulls (3★ 5 / 4★ 20 / 5★ 100); dust bundle +15 |

Constants live in `resonance.ts`: `REVIEWS_PER_PASS=10`, `ARCADE_PASS_POINTS=5`,
`SECTOR_CRYSTALS=25`, `SECTOR_PASSES=3`, `HISTORY_MAX=100`.

Wiring: `noteReviewActivity` (`progress-state.ts`) credits pass progress;
the three arcade games credit on solve; `dojo-content.tsx` credits + pays the
completion modal (`crystalPayout`/`passPayout` in `RewardModal.tsx`).

Deliberately dropped from plan001: event passes (single currency surface),
server pity sync, pull-log table.

## 3. Pull engine

Standard banner `standard` — cost 1 pass/pull, no featured item (50/50 carry-over
code path exists for future event banners).

- 5★ base **1.2%**, 4★ marginal **7.8%** (`BASE_4_RATE`).
- Soft pity from pull **50**, +10%/pull, hard cap **60** (rate clamps at 1 —
  plan001's version never reached its own hard pity).
- Every 10-pull contains at least one 4★+ (forced on the last pull).
- Duplicates → shards; `consumable-dust` converts +15 on acquisition.
- Pity resets only on 5★; `guaranteed` flips when a featured 50/50 is lost.

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
| Locker / operator pill / gating | `AppShell.tsx` (`userId` prop), `ThemeToggle.tsx` (`owned`), `StarlightPanel.tsx` chips |

Item effects: themes gate `ThemeToggle` (cycling restricted to owned themes; a
non-owned active theme falls back to the first owned one), titles render as the
HUD pill code (default `EXP`), styles apply automatically to `SRFlashcard`
(finish `ember`/`prism`, CSS `.card-finish-*` in `globals.css`), consumables:
energy +40 / cache +12 / shard dust +15.

## 5. Deferred — Phase E (server-backed wallet)

Swap points (already isolated): `loadResonance`/`saveResonance` in
`resonance.ts` and the action wrappers in `inventory.ts`. No caller touches
storage directly.

Design constraints learned from the blueprint (avoid repeating):

1. **RLS on every table** (`resonance_wallets`, `resonance_items`,
   `resonance_pulls`) with `auth.uid() = user_id`.
2. Pity + spend + inventory writes belong in **one RPC** (`resonance_pull`)
   executed inside a transaction — client-side multi-statement pulls race.
3. `upsert(..., { onConflict: "user_id,banner_id" })` for pity rows.
4. Write the pull log (currently `wallet.history`) server-side for auditing.
5. Wallet provisioning on first use (server default row or lazy upsert).

Until then, all awards are best-effort local and idempotent per call site
(arcade solves are ref-guarded, sector completion is one-time via
`sector-state.ts`).
