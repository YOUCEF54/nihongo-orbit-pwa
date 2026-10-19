import test from "node:test";
import assert from "node:assert/strict";
import {
  bestOwnedStyle,
  equipTitle,
  equippedTitleDef,
  ownedOf,
  ownedThemes,
  redeemOffer,
  consumeItem,
} from "./inventory.ts";
import { initResonance, loadResonance, saveResonance } from "./resonance.ts";
import { initStarlight, loadStarlight, saveStarlight } from "./starlight.ts";
import { loadEnergy, saveEnergy } from "./progress-state.ts";

test("using an energy consumable tops up energy and spends one copy", () => {
  const uid = `inv-${Date.now()}-energy`;
  saveResonance(uid, { ...initResonance(), owned: { "consumable-energy": 2 } });
  saveEnergy(uid, { value: 50, updatedAt: Date.now() });

  const outcome = consumeItem(uid, "consumable-energy");
  assert.equal(outcome.ok, true);
  assert.equal(outcome.state.owned["consumable-energy"], 1);
  assert.equal(loadEnergy(uid)?.value, 90);

  const last = consumeItem(uid, "consumable-energy");
  assert.equal(last.ok, true);
  assert.equal(last.state.owned["consumable-energy"], undefined);
});

test("using a cache consumable tops up the recovery cache", () => {
  const uid = `inv-${Date.now()}-cache`;
  saveResonance(uid, { ...initResonance(), owned: { "consumable-cache": 1 } });
  saveStarlight(uid, initStarlight());

  const outcome = consumeItem(uid, "consumable-cache");
  assert.equal(outcome.ok, true);
  assert.equal(loadStarlight(uid)?.cache, 12);
  assert.equal(outcome.state.owned["consumable-cache"], undefined);
});

test("unowned or unknown items cannot be used", () => {
  const uid = `inv-${Date.now()}-guards`;
  saveResonance(uid, initResonance());
  assert.equal(consumeItem(uid, "consumable-energy").error, "not_owned");
  assert.equal(consumeItem(uid, "nope").error, "unknown_item");
  assert.equal(consumeItem(uid, "theme-tactical").error, "unknown_item");
});

test("equipping a title requires ownership and survives reload", () => {
  const uid = `inv-${Date.now()}-title`;
  saveResonance(uid, {
    ...initResonance(),
    owned: { "title-explorer": 1, "title-letter-lord": 1 },
  });

  assert.equal(equipTitle(uid, "title-orbit-master").error, "not_owned");
  assert.equal(equipTitle(uid, "consumable-energy").error, "unknown_item");

  const equipped = equipTitle(uid, "title-letter-lord");
  assert.equal(equipped.ok, true);
  assert.equal(loadResonance(uid)?.equippedTitle, "title-letter-lord");
  assert.equal(equippedTitleDef(equipped.state)?.id, "title-letter-lord");

  const cleared = equipTitle(uid, "");
  assert.equal(cleared.ok, true);
  assert.equal(equippedTitleDef(cleared.state)?.id, "title-explorer");
});

test("owned item queries sort by rarity and expose themes", () => {
  const state = {
    ...initResonance(),
    owned: {
      "style-ember": 1,
      "style-prism": 1,
      "theme-hybrid": 1,
      "title-explorer": 1,
    },
  };
  assert.equal(bestOwnedStyle(state)?.id, "style-prism");
  assert.deepEqual(ownedOf(state, "title").map((item) => item.id), ["title-explorer"]);
  assert.deepEqual(ownedThemes(state), ["hybrid"]);
});

test("exchange offers spend shards and grant their payload", () => {
  const uid = `inv-${Date.now()}-exchange`;
  saveResonance(uid, { ...initResonance(), shards: 200 });

  assert.equal(redeemOffer(uid, "nope").error, "unknown_item");

  const pass = redeemOffer(uid, "exchange-pass");
  assert.equal(pass.ok, true);
  assert.equal(pass.state.passes, 1);
  assert.equal(pass.state.shards, 160);

  const cloth = redeemOffer(uid, "exchange-style-ember");
  assert.equal(cloth.ok, true);
  assert.equal(cloth.state.owned["style-ember"], 1);
  assert.equal(cloth.state.shards, 40);

  const again = redeemOffer(uid, "exchange-style-ember");
  assert.equal(again.error, "owned");

  const funds = redeemOffer(uid, "exchange-crystals");
  assert.equal(funds.error, "insufficient");
});
