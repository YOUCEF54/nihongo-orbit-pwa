import test from "node:test";
import assert from "node:assert/strict";
import {
  BANNERS,
  bannerById,
  BASE_4_RATE,
  executePull,
  fiveStarRate,
  pityFor,
  rollPulls,
  STANDARD_BANNER,
  type BannerDef,
} from "./gacha.ts";
import { itemById } from "./items.ts";
import { initResonance, saveResonance, type PityState, type ResonanceState } from "./resonance.ts";
import { makeRandom } from "./random.ts";

function wallet(over: Partial<ResonanceState> = {}): ResonanceState {
  return { ...initResonance(), ...over };
}

function withPity(
  pity: PityState,
  over: Partial<ResonanceState> = {},
  bannerId = STANDARD_BANNER.id,
): ResonanceState {
  return wallet({ pity: { [bannerId]: pity }, ...over });
}

test("every banner pool is populated with real items", () => {
  for (const banner of BANNERS) {
    assert.ok(bannerById(banner.id) === banner);
    for (const rarity of [5, 4, 3] as const) {
      const pool = banner.pool[rarity];
      assert.ok(pool.length > 0, `${banner.id} ${rarity}★ pool empty`);
      for (const id of pool) {
        assert.ok(itemById(id), `${banner.id} ${rarity}★ references unknown ${id}`);
      }
    }
    assert.ok(banner.costPerPull > 0);
    if (banner.featured5) {
      assert.ok(itemById(banner.featured5));
      assert.ok(banner.pool[5].includes(banner.featured5));
    }
  }
  assert.equal(bannerById("nope"), undefined);
});

test("five-star rate stays flat, ramps at the soft floor, and caps", () => {
  const pity = STANDARD_BANNER.pity;
  assert.equal(fiveStarRate(1, pity), pity.base5);
  assert.equal(fiveStarRate(49, pity), pity.base5);
  assert.ok(Math.abs(fiveStarRate(50, pity) - (pity.base5 + pity.softStep)) < 1e-9);
  assert.equal(fiveStarRate(59, pity), 1);
  assert.equal(fiveStarRate(60, pity), 1);
  assert.equal(fiveStarRate(200, pity), 1);
  let previous = 0;
  for (let count = 0; count <= 70; count += 1) {
    const rate = fiveStarRate(count, pity);
    assert.ok(rate >= previous, `rate dipped at ${count}`);
    assert.ok(rate <= 1);
    previous = rate;
  }
});

test("a pull without funds fails and leaves the wallet untouched", () => {
  const before = wallet({ passes: 0 });
  const outcome = rollPulls(before, STANDARD_BANNER, 1, () => 0.5);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, "insufficient");
  assert.equal(outcome.state, before);
  assert.equal(outcome.results.length, 0);
});

test("costs scale with count and honor the banner currency", () => {
  const ten = rollPulls(wallet({ passes: 10 }), STANDARD_BANNER, 10, makeRandom(7));
  assert.equal(ten.ok, true);
  assert.equal(ten.state.passes, 0);
  assert.equal(ten.results.length, 10);

  const crystalBanner: BannerDef = {
    ...STANDARD_BANNER,
    id: "crystal-test",
    costCurrency: "crystals",
    costPerPull: 160,
  };
  const broke = rollPulls(wallet({ crystals: 159 }), crystalBanner, 1, makeRandom(1));
  assert.equal(broke.ok, false);
  const paid = rollPulls(wallet({ crystals: 160 }), crystalBanner, 1, makeRandom(1));
  assert.equal(paid.ok, true);
  assert.equal(paid.state.crystals, 0);
});

test("soft pity: pull 50 uses the ramped rate instead of the base rate", () => {
  const early = rollPulls(withPity({ count: 40, guaranteed: false }, { passes: 1 }), STANDARD_BANNER, 1, () => 0.05);
  assert.equal(early.results[0].rarity, 4); // 0.05 < 0.012 base → miss 5★, inside the 4★ band

  const soft = rollPulls(withPity({ count: 49, guaranteed: false }, { passes: 1 }), STANDARD_BANNER, 1, () => 0.05);
  assert.equal(soft.results[0].rarity, 5); // 0.05 < 0.112 ramped rate
  assert.equal(pityFor(soft.state, STANDARD_BANNER.id).count, 0);
});

test("hard pity forces a 5★ on the 60th pull", () => {
  const outcome = rollPulls(
    withPity({ count: STANDARD_BANNER.pity.hardCap - 1, guaranteed: false }, { passes: 1 }),
    STANDARD_BANNER,
    1,
    () => 0.999,
  );
  assert.equal(outcome.results[0].rarity, 5);
  assert.equal(pityFor(outcome.state, STANDARD_BANNER.id).count, 0);
});

test("a 10-pull always contains at least one 4★+ item", () => {
  const outcome = rollPulls(wallet({ passes: 10 }), STANDARD_BANNER, 10, () => 0.999);
  assert.equal(outcome.ok, true);
  const fourPlus = outcome.results.filter((result) => result.rarity >= 4);
  assert.equal(fourPlus.length, 1);
  assert.equal(fourPlus[0].wasGuarantee, true);
  assert.equal(outcome.results[9].rarity, 4);
  assert.equal(outcome.results.slice(0, 9).every((result) => result.rarity === 3), true);
});

test("featured 50/50: a lost roll carries the guarantee to the next 5★", () => {
  const event: BannerDef = {
    ...STANDARD_BANNER,
    id: "event-test",
    featured5: "title-orbit-master",
    pool: { ...STANDARD_BANNER.pool, 5: ["title-orbit-master", "style-prism"] },
  };
  const queue = [0.5, 0.9, 0.0];
  let index = 0;
  const rng = () => queue[index++] ?? 0;
  const lost = rollPulls(
    withPity({ count: 59, guaranteed: false }, { passes: 1 }, event.id),
    event,
    1,
    rng,
  );
  assert.equal(lost.results[0].rarity, 5);
  assert.equal(lost.results[0].isFeatured, false);
  assert.equal(lost.results[0].itemId, "style-prism");
  assert.equal(pityFor(lost.state, event.id).guaranteed, true);

  const won = rollPulls(
    withPity({ count: 59, guaranteed: true }, { passes: 1 }, event.id),
    event,
    1,
    () => 0.5,
  );
  assert.equal(won.results[0].isFeatured, true);
  assert.equal(won.results[0].itemId, "title-orbit-master");
  assert.equal(pityFor(won.state, event.id).guaranteed, false);
});

test("duplicate cosmetics convert to rarity-scaled shards", () => {
  const first = rollPulls(wallet({ passes: 2 }), STANDARD_BANNER, 1, () => 0);
  assert.equal(first.results[0].rarity, 5);
  assert.equal(first.results[0].itemId, "style-prism");
  assert.equal(first.results[0].dup, false);
  assert.equal(first.state.owned["style-prism"], 1);
  assert.equal(first.state.shards, 0);

  const second = rollPulls(first.state, STANDARD_BANNER, 1, () => 0);
  assert.equal(second.results[0].dup, true);
  assert.equal(second.results[0].shards, 100);
  assert.equal(second.state.owned["style-prism"], 1);
  assert.equal(second.state.shards, 100);
});

test("dust bundles convert on acquisition without entering the inventory", () => {
  const outcome = rollPulls(wallet({ passes: 1 }), STANDARD_BANNER, 1, () => 0.999);
  assert.equal(outcome.results[0].itemId, "consumable-dust");
  assert.equal(outcome.results[0].shards, 15);
  assert.equal(outcome.state.shards, 15);
  assert.equal(outcome.state.owned["consumable-dust"], undefined);
});

test("seed-stable pulls are deterministic", () => {
  const a = rollPulls(wallet({ passes: 30 }), STANDARD_BANNER, 30, makeRandom(2026));
  const b = rollPulls(wallet({ passes: 30 }), STANDARD_BANNER, 30, makeRandom(2026));
  assert.deepEqual(a.results, b.results);

  const uid = `gacha-${Date.now()}-det`;
  saveResonance(uid, wallet({ passes: 1 }));
  const stored = executePull(uid, STANDARD_BANNER.id, 1, makeRandom(5));
  assert.equal(stored.ok, true);
  const storedAgain = executePull(uid, STANDARD_BANNER.id, 1, makeRandom(5));
  assert.equal(storedAgain.ok, false); // one pass was spent by the first pull
});

test("rates hold under a long seeded run", () => {
  const pulls = 20000;
  const outcome = rollPulls(wallet({ passes: pulls }), STANDARD_BANNER, pulls, makeRandom(42));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.results.length, pulls);
  assert.equal(outcome.state.passes, 0);

  let five = 0;
  let four = 0;
  for (const result of outcome.results) {
    if (result.rarity === 5) five += 1;
    else if (result.rarity === 4) four += 1;
    assert.ok(itemById(result.itemId), `unknown item ${result.itemId}`);
  }
  const fiveShare = five / pulls;
  const fourShare = four / pulls;
  assert.ok(fiveShare > 0.015 && fiveShare < 0.05, `5★ share ${fiveShare}`);
  assert.ok(fourShare > 0.04 && fourShare < 0.12, `4★ share ${fourShare}`);
  assert.ok(BASE_4_RATE > 0);
});

test("pull history logs every pull and caps at the limit", () => {
  const outcome = rollPulls(wallet({ passes: 110 }), STANDARD_BANNER, 110, makeRandom(9));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.state.history.length, 100);
  assert.equal(outcome.state.history.every((record) => record.bannerId === "standard"), true);
  assert.equal(outcome.state.history.at(-1)?.itemId, outcome.results.at(-1)?.itemId);
});

test("executePull rejects unknown banners and persists successful pulls", () => {
  const uid = `gacha-${Date.now()}-exec`;
  const unknown = executePull(uid, "does-not-exist", 1, makeRandom(1));
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error, "unknown_banner");

  saveResonance(uid, wallet({ passes: 1 }));
  const first = executePull(uid, STANDARD_BANNER.id, 1, () => 0);
  assert.equal(first.ok, true);
  assert.equal(first.state.owned["style-prism"], 1);
  assert.equal(first.state.passes, 0);
});
