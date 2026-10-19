import test from "node:test";
import assert from "node:assert/strict";
import { DUP_SHARDS, EXCHANGE_OFFERS, ITEMS, itemById } from "./items.ts";
import { THEME_IDS, type ThemeId } from "./themes.ts";

test("item ids are unique and registry lookups agree", () => {
  const ids = ITEMS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, /^[a-z0-9-]+$/);
    assert.equal(itemById(id)?.id, id);
  }
  assert.equal(itemById("nope"), undefined);
});

test("every registry item has real content", () => {
  for (const item of ITEMS) {
    assert.ok(item.nameAr.length > 0, item.id);
    assert.ok(item.descAr.length > 0, item.id);
    assert.ok([3, 4, 5].includes(item.rarity), item.id);
    if (item.kind === "consumable") {
      assert.ok(item.effect, `consumable ${item.id} needs an effect`);
    }
  }
});

test("theme items map to known themes exactly once", () => {
  const themed = ITEMS.filter((item) => item.kind === "theme");
  const seen = new Set<ThemeId>();
  for (const item of themed) {
    assert.ok(item.themeId, item.id);
    assert.ok((THEME_IDS as readonly string[]).includes(item.themeId!), item.id);
    assert.ok(!seen.has(item.themeId!), `duplicate theme mapping ${item.themeId}`);
    seen.add(item.themeId!);
    assert.equal(item.stackable, false);
  }
  assert.equal(seen.size, THEME_IDS.length);
});

test("titles carry unique latin badge codes", () => {
  const titles = ITEMS.filter((item) => item.kind === "title");
  const codes = titles.map((item) => item.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const title of titles) {
    assert.match(title.code ?? "", /^[A-Z]{2,4}$/);
  }
  assert.ok(titles.some((item) => item.id === "title-explorer"));
});

test("stackable consumables grant positive effects; dust bundles auto-convert", () => {
  for (const item of ITEMS) {
    if (item.effect) {
      assert.ok(item.effect.amount > 0, item.id);
    }
  }
  const dust = ITEMS.filter((item) => item.effect?.type === "shards");
  assert.ok(dust.length >= 1);
  for (const item of dust) assert.equal(item.stackable, false);
});

test("duplicate shard values rise with rarity", () => {
  assert.ok(DUP_SHARDS[3] < DUP_SHARDS[4]);
  assert.ok(DUP_SHARDS[4] < DUP_SHARDS[5]);
  assert.ok(DUP_SHARDS[3] > 0);
});

test("exchange offers are well-formed and reference real items", () => {
  const ids = EXCHANGE_OFFERS.map((offer) => offer.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const offer of EXCHANGE_OFFERS) {
    assert.ok(offer.costShards > 0, offer.id);
    assert.ok(offer.grants || offer.itemId, offer.id);
    if (offer.itemId) {
      assert.ok(itemById(offer.itemId), `${offer.id} sells unknown ${offer.itemId}`);
    }
    if (offer.grants) {
      for (const amount of Object.values(offer.grants)) {
        assert.ok(typeof amount === "number" && amount > 0, offer.id);
      }
    }
  }
});
