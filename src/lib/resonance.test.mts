import test from "node:test";
import assert from "node:assert/strict";
import {
  addPassProgress,
  awardResonance,
  createStarterWallet,
  initResonance,
  loadResonance,
  normalizeResonance,
  readResonanceOrDefault,
  RESONANCE_VERSION,
  REVIEWS_PER_PASS,
  saveResonance,
  spend,
  STARTER_OWNED,
} from "./resonance.ts";

test("a fresh wallet starts empty with the starter items owned", () => {
  const wallet = initResonance();
  assert.equal(wallet.version, RESONANCE_VERSION);
  assert.equal(wallet.crystals, 0);
  assert.equal(wallet.passes, 0);
  assert.equal(wallet.shards, 0);
  assert.equal(wallet.passProgress, 0);
  assert.deepEqual(Object.keys(wallet.owned).sort(), [...STARTER_OWNED].sort());
  assert.equal(wallet.equippedTitle, "");
});

test("wallet round-trips through storage", () => {
  const uid = `res-${Date.now()}-a`;
  const wallet = { ...initResonance(), crystals: 12, passes: 3, shards: 45, passProgress: 7 };
  saveResonance(uid, wallet);
  const loaded = loadResonance(uid);
  assert.ok(loaded);
  assert.equal(loaded.crystals, 12);
  assert.equal(loaded.passes, 3);
  assert.equal(loaded.shards, 45);
  assert.equal(loaded.passProgress, 7);
});

test("corrupt or foreign-version documents are rejected", () => {
  assert.equal(normalizeResonance(null), null);
  assert.equal(normalizeResonance("junk"), null);
  assert.equal(normalizeResonance({ version: 99 }), null);
  assert.equal(normalizeResonance({ version: RESONANCE_VERSION, crystals: "x" }), null);

  const recovered = normalizeResonance({
    version: RESONANCE_VERSION,
    crystals: -5,
    passes: 2.4,
    shards: Number.NaN,
    pity: { standard: { count: 3.9, guaranteed: "yes" } },
    owned: { "theme-tactical": 1, bad: "x" },
    history: [{ itemId: "a", bannerId: "standard", rarity: 9 }, "nope"],
  });
  assert.ok(recovered);
  assert.equal(recovered.crystals, 0);
  assert.equal(recovered.passes, 2);
  assert.equal(recovered.shards, 0);
  assert.deepEqual(recovered.pity.standard, { count: 4, guaranteed: false });
  assert.deepEqual(recovered.owned, { "theme-tactical": 1 });
  assert.equal(recovered.history.length, 0);
});

test("credits clamp to non-negative and spend never overdrafts", () => {
  const start = initResonance();
  const credited = awardResonance(`res-${Date.now()}-b`, { crystals: 10, passes: -4, shards: 5 });
  assert.equal(credited.crystals, 10);
  assert.equal(credited.passes, 0);
  assert.equal(credited.shards, 5);

  const denied = spend(start, "passes", 1);
  assert.equal(denied.ok, false);
  assert.equal(denied.state.passes, 0);

  const funded = { ...start, passes: 2 };
  const paid = spend(funded, "passes", 2);
  assert.equal(paid.ok, true);
  assert.equal(paid.state.passes, 0);
});

test("activity points award one pass per REVIEWS_PER_PASS block", () => {
  let state = initResonance();

  let result = addPassProgress(state, 9);
  state = result.state;
  assert.equal(result.awarded, 0);
  assert.equal(state.passes, 0);
  assert.equal(state.passProgress, 9);

  result = addPassProgress(state, 5);
  state = result.state;
  assert.equal(result.awarded, 1);
  assert.equal(state.passes, 1);
  assert.equal(state.passProgress, 4);

  result = addPassProgress(state, REVIEWS_PER_PASS * 3);
  assert.equal(result.awarded, 3);
  assert.equal(result.state.passes, 4);
});

test("a fresh wallet keeps whichever theme the browser already uses", () => {
  const store = new Map<string, string>([["learnjp:theme", "hybrid"]]);
  const fake = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true });
  try {
    const wallet = createStarterWallet();
    assert.equal(wallet.owned["theme-hybrid"], 1);
    assert.equal(wallet.owned["theme-tactical"], 1);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});

test("readResonanceOrDefault returns a starter wallet when nothing is stored", () => {
  const wallet = readResonanceOrDefault(`res-${Date.now()}-c`);
  assert.equal(wallet.version, RESONANCE_VERSION);
  assert.equal(wallet.passes, 0);
  assert.ok(wallet.owned["theme-tactical"]);
});
