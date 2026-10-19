import test from "node:test";
import assert from "node:assert/strict";
import { initResonance, RESONANCE_VERSION } from "./resonance.ts";
import {
  authoritativeResults,
  buildPullPayload,
  mapResonanceError,
  parsePullResults,
  snapshotFromRpcPayload,
  snapshotToState,
} from "./resonance-map.ts";
import type { PullResult } from "./gacha.ts";

function walletSnapshot(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    wallet: {
      crystals: 12,
      passes: 3,
      shards: 45,
      pass_progress: 7,
      equipped_title: "title-explorer",
    },
    owned: { "theme-tactical": 1, "title-explorer": 1 },
    pity: { standard: { count: 21, guaranteed: false } },
    history: [
      {
        at: 1_700_000_000_000,
        bannerId: "standard",
        itemId: "title-explorer",
        rarity: 3,
        isFeatured: false,
        dup: false,
        shards: 0,
      },
    ],
    ...overrides,
  };
}

test("mapResonanceError picks the code embedded in the plpgsql message", () => {
  assert.equal(
    mapResonanceError('new row violates check constraint\nDETAIL: insufficient passes'),
    "insufficient",
  );
  assert.equal(mapResonanceError("pity_violation: count mismatch"), "pity_violation");
  assert.equal(mapResonanceError("unknown"), "unknown");
  assert.equal(mapResonanceError(null), "unknown");
  assert.equal(mapResonanceError(undefined), "unknown");
  assert.equal(mapResonanceError("something entirely different"), "unknown");
});

test("snapshotToState maps the RPC snapshot onto the wallet document", () => {
  const state = snapshotToState(walletSnapshot());
  assert.ok(state);
  assert.equal(state.version, RESONANCE_VERSION);
  assert.equal(state.crystals, 12);
  assert.equal(state.passes, 3);
  assert.equal(state.shards, 45);
  assert.equal(state.passProgress, 7);
  assert.equal(state.equippedTitle, "title-explorer");
  assert.deepEqual(state.pity.standard, { count: 21, guaranteed: false });
  assert.equal(state.owned["theme-tactical"], 1);
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].itemId, "title-explorer");
});

test("snapshotToState clamps hostile numeric payloads instead of trusting them", () => {
  const state = snapshotToState(
    walletSnapshot({
      wallet: {
        crystals: -40,
        passes: 3,
        shards: 12.9,
        pass_progress: Number.NaN,
        equipped_title: 99,
      },
    }),
  );
  assert.ok(state);
  assert.equal(state.crystals, 0);
  assert.equal(state.passes, 3);
  assert.equal(state.shards, 13);
  assert.equal(state.passProgress, 0);
  assert.equal(state.equippedTitle, "");
});

test("snapshotToState fails closed when a currency is not a number", () => {
  const state = snapshotToState(
    walletSnapshot({
      wallet: {
        crystals: 1,
        passes: "many",
        shards: 2,
        pass_progress: 0,
        equipped_title: "",
      },
    }),
  );
  assert.equal(state, null);
});

test("snapshotToState rejects non-object and wallet-less payloads", () => {
  assert.equal(snapshotToState(null), null);
  assert.equal(snapshotToState("wallet"), null);
  assert.equal(snapshotToState([1, 2, 3]), null);
  assert.equal(snapshotToState({}), null);
  assert.equal(snapshotToState({ wallet: null }), null);
  assert.equal(snapshotToState({ wallet: "nope" }), null);
});

test("the mapper passes the server's owned map through (server is authoritative)", () => {
  const state = snapshotToState({
    wallet: {
      crystals: 0,
      passes: 0,
      shards: 0,
      pass_progress: 0,
      equipped_title: "",
    },
    owned: {},
    pity: {},
    history: [],
  });
  assert.ok(state);
  assert.deepEqual(state.owned, {});
});

test("buildPullPayload converts rolled pulls into the RPC argument shape", () => {
  const rolled: PullResult[] = [
    {
      itemId: "style-prism",
      rarity: 5,
      isFeatured: false,
      dup: false,
      shards: 0,
      wasGuarantee: false,
    },
    {
      itemId: "consumable-dust",
      rarity: 3,
      isFeatured: false,
      dup: true,
      shards: 15,
      wasGuarantee: true,
    },
  ];
  assert.deepEqual(buildPullPayload(rolled), [
    { id: "style-prism", rarity: 5, isFeatured: false, wasGuarantee: false },
    { id: "consumable-dust", rarity: 3, isFeatured: false, wasGuarantee: true },
  ]);
});

test("parsePullResults accepts well-formed rows and fills optional fields", () => {
  const parsed = parsePullResults([
    { itemId: "style-prism", rarity: 5, isFeatured: false },
    { itemId: "consumable-dust", rarity: 3, dup: true, shards: 15, wasGuarantee: true },
  ]);
  assert.ok(parsed);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], {
    itemId: "style-prism",
    rarity: 5,
    isFeatured: false,
    dup: false,
    shards: 0,
    wasGuarantee: false,
  });
  assert.equal(parsed[1].dup, true);
  assert.equal(parsed[1].shards, 15);
});

test("parsePullResults rejects malformed rows", () => {
  assert.equal(parsePullResults(null), null);
  assert.equal(parsePullResults({}), null);
  assert.equal(parsePullResults([{ itemId: "x", rarity: 2 }]), null);
  assert.equal(parsePullResults([{ itemId: 42, rarity: 3 }]), null);
  assert.equal(parsePullResults([{ rarity: 3 }]), null);
  assert.equal(parsePullResults(["style-prism"]), null);
});

test("authoritativeResults prefers the server copy only when lengths agree", () => {
  const rolled = buildPullPayload([
    { itemId: "a", rarity: 3, isFeatured: false, dup: false, shards: 0, wasGuarantee: false },
  ] as PullResult[]);
  const server = parsePullResults([
    { itemId: "a", rarity: 3, isFeatured: false, dup: true, shards: 5, wasGuarantee: false },
  ]);
  assert.ok(server);
  assert.deepEqual(authoritativeResults(server, rolled as unknown as PullResult[]), server);

  const mismatched = parsePullResults([{ itemId: "a", rarity: 3 }]);
  assert.ok(mismatched);
  const shorter = authoritativeResults(mismatched, [] as PullResult[]);
  assert.deepEqual(shorter, []);
});

test("snapshotFromRpcPayload accepts direct and wrapped RPC shapes", () => {
  const direct = snapshotFromRpcPayload(walletSnapshot());
  assert.ok(direct);
  assert.equal(direct.shards, 45);

  const wrapped = snapshotFromRpcPayload({ awarded: 1, throttled: false, state: walletSnapshot() });
  assert.ok(wrapped);
  assert.equal(wrapped.shards, 45);

  // apply_pull / consume embed extra meta next to the state.
  const pull = snapshotFromRpcPayload({ results: [], state: walletSnapshot() });
  assert.ok(pull);
  assert.equal(pull.passes, 3);

  assert.equal(snapshotFromRpcPayload(null), null);
  assert.equal(snapshotFromRpcPayload({ awarded: 1 }), null);
  assert.equal(snapshotFromRpcPayload({ state: null }), null);
});

test("initResonance stays the fallback used by useResonance", () => {
  const empty = initResonance();
  assert.equal(empty.crystals, 0);
  assert.equal(empty.passes, 0);
});
