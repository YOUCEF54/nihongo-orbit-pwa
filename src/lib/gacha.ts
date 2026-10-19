/* ============================================================
   Resonance Terminal — the pull engine.
   Pure math over an injected RNG so banner rates, soft pity and
   guarantees are deterministic under test. Every write happens
   through the resonance store; nothing here touches the DOM.
   Pity model (per plan001, corrected):
   · base 5★ rate until the soft-pity floor,
   · linear ramp per pull after the floor, capped at 1,
   · hard guarantee at the cap,
   · optional 50/50 featured split with a carry-over guarantee,
   · every 10-pull contains at least one 4★+ item.
   ============================================================ */
import { DUP_SHARDS, itemById, type Rarity } from "./items.ts";
import {
  HISTORY_MAX,
  readResonanceOrDefault,
  saveResonance,
  spend,
  type PityState,
  type PullRecord,
  type ResonanceState,
} from "./resonance.ts";

export interface BannerPityConfig {
  /** Base 5★ probability before the soft floor. */
  base5: number;
  /** First pity count where the ramp applies. */
  softStart: number;
  /** Guaranteed 5★ at this pity count. */
  hardCap: number;
  /** Probability added per pull inside the ramp. */
  softStep: number;
  /** 5★ featured share (event banners: 0.5). */
  featuredRateUp: number;
}

export interface BannerDef {
  id: string;
  titleAr: string;
  jp: string;
  descAr: string;
  costCurrency: "passes" | "crystals";
  costPerPull: number;
  featured5: string | null;
  pool: { 5: string[]; 4: string[]; 3: string[] };
  pity: BannerPityConfig;
}

/** Marginal 4★ rate after the 5★ roll misses (plan001: 7.8%). */
export const BASE_4_RATE = 0.078;

/**
 * Server-side RNG for real pulls (32 bits of entropy per roll is far
 * beyond what a 1.2% gacha needs). Tests inject their own RNG instead.
 */
export function secureRandom(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] / 0x100000000;
}

export const STANDARD_BANNER: BannerDef = {
  id: "standard",
  titleAr: "المستكشف القياسي",
  jp: "標準共鳴",
  descAr: "الرنين الدائم — يمنح سمات وألقابًا وأنماطًا وشحنات من مخزون المحطة.",
  costCurrency: "passes",
  costPerPull: 1,
  featured5: null,
  pool: {
    5: ["style-prism", "title-orbit-master"],
    4: ["theme-hybrid", "theme-minimal", "style-ember", "title-letter-lord", "title-signal-ace"],
    3: ["consumable-energy", "consumable-cache", "consumable-dust"],
  },
  pity: {
    base5: 0.012,
    softStart: 50,
    hardCap: 60,
    softStep: 0.1,
    featuredRateUp: 0.5,
  },
};

export const BANNERS: BannerDef[] = [STANDARD_BANNER];

export function bannerById(id: string): BannerDef | undefined {
  return BANNERS.find((banner) => banner.id === id);
}

export interface PullResult {
  itemId: string;
  rarity: Rarity;
  isFeatured: boolean;
  /** The item was already owned and converted into shards. */
  dup: boolean;
  /** Shards produced by this pull. */
  shards: number;
  /** True when this pull resolved the 10-pull 4★+ guarantee. */
  wasGuarantee: boolean;
}

export interface PullOutcome {
  ok: boolean;
  error?: "unknown_banner" | "insufficient";
  results: PullResult[];
  state: ResonanceState;
}

/**
 * 5★ probability at a given pity count. Mirrors plan001's ramp but
 * clamps the ramp at 1 so the hard pity is a real, reachable floor.
 */
export function fiveStarRate(pityCount: number, pity: BannerPityConfig): number {
  if (pityCount >= pity.hardCap) return 1;
  if (pityCount < pity.softStart) return pity.base5;
  return Math.min(1, pity.base5 + pity.softStep * (pityCount - pity.softStart + 1));
}

export function pityFor(state: ResonanceState, bannerId: string): PityState {
  return state.pity[bannerId] ?? { count: 0, guaranteed: false };
}

function pick(list: string[], rng: () => number): string | null {
  if (list.length === 0) return null;
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

/** Any pool item as an emergency fallback for malformed banner pools. */
function anyPoolItem(banner: BannerDef, rng: () => number): string | null {
  return pick([...banner.pool[5], ...banner.pool[4], ...banner.pool[3]], rng);
}

function acquire(
  state: ResonanceState,
  itemId: string,
  rarity: Rarity,
  isFeatured: boolean,
  wasGuarantee: boolean,
): { state: ResonanceState; result: PullResult } {
  const item = itemById(itemId);
  const base: PullResult = {
    itemId,
    rarity,
    isFeatured,
    dup: false,
    shards: 0,
    wasGuarantee,
  };

  // Unknown id: degrade to a rarity-appropriate dust payout.
  if (!item) {
    const shards = DUP_SHARDS[rarity];
    return { state: { ...state, shards: state.shards + shards }, result: { ...base, dup: true, shards } };
  }

  // Dust bundles convert on acquisition.
  if (item.effect?.type === "shards") {
    return {
      state: { ...state, shards: state.shards + item.effect.amount },
      result: { ...base, shards: item.effect.amount },
    };
  }

  // Stackable consumables never duplicate; cosmetics convert.
  if (!item.stackable && state.owned[itemId]) {
    const shards = DUP_SHARDS[rarity];
    return { state: { ...state, shards: state.shards + shards }, result: { ...base, dup: true, shards } };
  }

  return {
    state: { ...state, owned: { ...state.owned, [itemId]: (state.owned[itemId] ?? 0) + 1 } },
    result: base,
  };
}

/**
 * Roll `count` pulls on a banner. Pure: the returned state contains
 * every mutation (currency, pity, inventory, history) and the caller
 * persists it.
 */
export function rollPulls(
  state: ResonanceState,
  banner: BannerDef,
  count: number,
  rng: () => number = Math.random,
  now = Date.now(),
): PullOutcome {
  const pulls = Math.max(1, Math.floor(count));
  const cost = banner.costPerPull * pulls;
  const paid = spend(state, banner.costCurrency, cost);
  if (!paid.ok) return { ok: false, error: "insufficient", results: [], state };

  let working = paid.state;
  const results: PullResult[] = [];
  let pity = pityFor(working, banner.id);
  let hitFourPlus = false;

  for (let index = 0; index < pulls; index += 1) {
    pity = { ...pity, count: pity.count + 1 };
    const p5 = fiveStarRate(pity.count, banner.pity);
    const roll = rng();

    let rarity: Rarity;
    let isGuarantee = false;
    if (roll < p5 || p5 >= 1) {
      rarity = 5;
    } else if (roll < p5 + BASE_4_RATE) {
      rarity = 4;
    } else {
      rarity = 3;
    }

    // Last pull of a 10-pull with no 4★+ yet → force the guarantee.
    const isLast = index === pulls - 1;
    if (pulls === 10 && isLast && !hitFourPlus && rarity === 3) {
      rarity = pity.count >= banner.pity.hardCap || p5 >= 1 ? 5 : 4;
      isGuarantee = true;
    }
    if (rarity >= 4) hitFourPlus = true;

    let itemId: string | null = null;
    let isFeatured = false;

    if (rarity === 5) {
      pity = { ...pity, count: 0 };
      if (banner.featured5) {
        const featuredRoll = pity.guaranteed || rng() < banner.pity.featuredRateUp;
        if (featuredRoll) {
          itemId = banner.featured5;
          isFeatured = true;
          pity = { ...pity, guaranteed: false };
        } else {
          itemId = pick(banner.pool[5].filter((id) => id !== banner.featured5), rng);
          pity = { ...pity, guaranteed: true };
        }
      }
    }

    if (!itemId) {
      const pool = rarity === 5 ? banner.pool[5] : rarity === 4 ? banner.pool[4] : banner.pool[3];
      itemId = pick(pool, rng) ?? anyPoolItem(banner, rng) ?? "";
    }

    const acquired = acquire(working, itemId, rarity, isFeatured, isGuarantee);
    working = acquired.state;
    results.push(acquired.result);
  }

  working = {
    ...working,
    pity: { ...working.pity, [banner.id]: pity },
    history: [
      ...working.history,
      ...results.map(
        (result): PullRecord => ({
          at: now,
          bannerId: banner.id,
          itemId: result.itemId,
          rarity: result.rarity,
          isFeatured: result.isFeatured,
          dup: result.dup,
          shards: result.shards,
        }),
      ),
    ].slice(-HISTORY_MAX),
    updatedAt: now,
  };

  return { ok: true, results, state: working };
}

/** Persisted pull: load → roll → save → notify subscribers. */
export function executePull(
  uid: string,
  bannerId: string,
  count: number,
  rng: () => number = Math.random,
  now = Date.now(),
): PullOutcome {
  const banner = bannerById(bannerId);
  if (!banner) {
    return { ok: false, error: "unknown_banner", results: [], state: readResonanceOrDefault(uid) };
  }
  const outcome = rollPulls(readResonanceOrDefault(uid), banner, count, rng, now);
  if (outcome.ok) saveResonance(uid, outcome.state);
  return outcome;
}
