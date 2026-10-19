import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DUP_SHARDS, EXCHANGE_OFFERS, ITEMS } from "./items.ts";
import { STANDARD_BANNER } from "./gacha.ts";
import {
  REVIEWS_PER_PASS,
  SECTOR_CRYSTALS,
  SECTOR_PASSES,
  STARTER_OWNED,
} from "./resonance.ts";

/* Drift guard: 0026_resonance_wallet.sql seeds its own copy of the item
   registry, dup payouts, banner pool and exchange offers so the RPCs can
   validate without trusting the client. If either side changes alone the
   wallet rejects payloads the app keeps producing — this test fails first. */

const sql = readFileSync(
  new URL("../../supabase/migrations/0026_resonance_wallet.sql", import.meta.url),
  "utf8",
);

function sliceBetween(start: string, end: string): string {
  const from = sql.indexOf(start);
  assert.ok(from >= 0, `migration is missing: ${start}`);
  const to = sql.indexOf(end, from + start.length);
  assert.ok(to > from, `migration is missing "${end}" after "${start}"`);
  return sql.slice(from, to);
}

function collect(pattern: RegExp, text: string): RegExpExecArray[] {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  const rows: RegExpExecArray[] = [];
  let match = re.exec(text);
  while (match) {
    rows.push(match);
    match = re.exec(text);
  }
  return rows;
}

test("migration seeds exactly the TS item registry (id, kind, rarity, stackable, effect)", () => {
  const block = sliceBetween("insert into public.resonance_items", "on conflict");
  const rows = collect(
    /\(\s*'([a-z0-9-]+)'\s*,\s*'(theme|style|title|consumable)'\s*,\s*(\d+)\s*,\s*(true|false)\s*,\s*(null|'(?:[^']|'')*')\s*(?:::jsonb)?\s*\)/,
    block,
  );
  assert.equal(rows.length, ITEMS.length, "row count differs from ITEMS");

  const seeded = new Map(rows.map((row) => [row[1], row]));
  for (const item of ITEMS) {
    const row = seeded.get(item.id);
    assert.ok(row, `migration is missing item ${item.id}`);
    assert.equal(row[2], item.kind, `kind drift on ${item.id}`);
    assert.equal(Number(row[3]), item.rarity, `rarity drift on ${item.id}`);
    assert.equal(row[4] === "true", item.stackable, `stackable drift on ${item.id}`);
    if (item.effect) {
      const effect = JSON.parse(row[5].slice(1, -1).replace(/''/g, "'")) as {
        type: string;
        amount: number;
      };
      assert.deepEqual(effect, item.effect, `effect drift on ${item.id}`);
    } else {
      assert.equal(row[5], "null", `unexpected effect on ${item.id}`);
    }
  }
});

test("migration dup payouts match DUP_SHARDS", () => {
  const block = sliceBetween("insert into public.resonance_dup_shards", "on conflict");
  const rows = collect(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/, block);
  const seeded = Object.fromEntries(rows.map((row) => [Number(row[1]), Number(row[2])]));
  assert.deepEqual(seeded, DUP_SHARDS);
});

test("migration standard banner mirrors STANDARD_BANNER", () => {
  const block = sliceBetween("insert into public.resonance_banners", "on conflict");
  const head = collect(/'([a-z]+)'\s*,\s*'([a-z]+)'\s*,\s*(\d+)\s*,\s*(null|'[a-z-]+')\s*,/, block);
  assert.equal(head.length, 1);
  const [, id, currency, cost, featured] = head[0];
  assert.equal(id, STANDARD_BANNER.id);
  assert.equal(currency, STANDARD_BANNER.costCurrency);
  assert.equal(Number(cost), STANDARD_BANNER.costPerPull);
  assert.equal(featured, "null");
  assert.equal(STANDARD_BANNER.featured5, null);

  const poolMatch = /'(\{[\s\S]*?\})'::jsonb/.exec(block);
  assert.ok(poolMatch, "banner pool jsonb not found");
  const pool = JSON.parse(poolMatch[1]) as Record<string, string[]>;
  for (const rarity of ["5", "4", "3"] as const) {
    assert.deepEqual(
      [...pool[rarity]].sort(),
      [...STANDARD_BANNER.pool[rarity]].sort(),
      `pool drift on rarity ${rarity}`,
    );
  }

  const capMatch = /,\s*(\d+)\s*\)\s*$/.exec(block.trimEnd());
  assert.ok(capMatch, "hard cap not found");
  assert.equal(Number(capMatch[1]), STANDARD_BANNER.pity.hardCap);
});

test("migration exchange offers mirror EXCHANGE_OFFERS", () => {
  const block = sliceBetween("insert into public.resonance_exchange_offers", "on conflict");
  const rows = collect(
    /\(\s*'([a-z-]+)'\s*,\s*(\d+)\s*,\s*'(\{[\s\S]*?\})'::jsonb\s*,\s*(null|'[a-z-]+')\s*\)/,
    block,
  );
  assert.equal(rows.length, EXCHANGE_OFFERS.length, "offer count differs");

  const seeded = new Map(rows.map((row) => [row[1], row]));
  for (const offer of EXCHANGE_OFFERS) {
    const row = seeded.get(offer.id);
    assert.ok(row, `migration is missing offer ${offer.id}`);
    assert.equal(Number(row[2]), offer.costShards, `cost drift on ${offer.id}`);
    const grants = JSON.parse(row[3]) as Record<string, number>;
    assert.deepEqual(grants, offer.grants ?? {}, `grants drift on ${offer.id}`);
    const itemId = row[4] === "null" ? undefined : row[4].slice(1, -1);
    assert.equal(itemId, offer.itemId, `item drift on ${offer.id}`);
  }
});

test("migration starter items match STARTER_OWNED", () => {
  const block = sliceBetween("create or replace function public.resonance_seed_starter", "$$;");
  for (const itemId of STARTER_OWNED) {
    assert.ok(block.includes(`'${itemId}'`), `starter seed is missing ${itemId}`);
  }
});

test("migration sector payout matches SECTOR_CRYSTALS / SECTOR_PASSES", () => {
  const block = sliceBetween("create or replace function public.resonance_complete_sector", "$$;");
  assert.ok(block.includes(`crystals = crystals + ${SECTOR_CRYSTALS}`), "crystal payout drift");
  assert.ok(block.includes(`passes = passes + ${SECTOR_PASSES}`), "pass payout drift");
});

test("migration pass progress matches REVIEWS_PER_PASS", () => {
  const block = sliceBetween("create or replace function public.resonance_award_activity", "$$;");
  assert.ok(block.includes(`gained / ${REVIEWS_PER_PASS}`), "pass conversion drift");
  assert.ok(block.includes(`gained % ${REVIEWS_PER_PASS}`), "pass remainder drift");
});

test("migration activity rate limits stay within the documented policy", () => {
  const block = sliceBetween("create or replace function public.resonance_award_activity", "$$;");
  assert.ok(block.includes("interval '1 second'"), "review gap drift");
  assert.ok(block.includes("daily_cap := 400"), "review daily cap drift");
  assert.ok(block.includes("interval '5 seconds'"), "arcade gap drift");
  assert.ok(block.includes("daily_cap := 150"), "arcade daily cap drift");
});

test("snapshot shape exposes the snake_case keys the wire mapper reads", () => {
  const block = sliceBetween("create or replace function public.resonance_snapshot", "$$;");
  for (const key of ["'pass_progress'", "'equipped_title'", "'owned'", "'pity'", "'history'"]) {
    assert.ok(block.includes(key), `snapshot is missing ${key}`);
  }
});

test("snapshot helper stays revoked from every client role", () => {
  assert.ok(
    sql.includes(
      "revoke all on function public.resonance_snapshot(uuid) from public, anon, authenticated",
    ),
    "resonance_snapshot must never be callable by clients",
  );
});
