import test from "node:test";
import assert from "node:assert/strict";
import { SECTOR_SKINS, sectorSkin, sectorStyle } from "./sector-skins.ts";
import { SECTORS } from "./curriculum.ts";
import type { SectorId } from "../types/curriculum.ts";

test("every sector has a skin", () => {
  const ids = SECTORS.map((sector) => sector.id);
  for (const id of ids) {
    const skin = SECTOR_SKINS[id];
    assert.ok(skin, `missing skin for ${id}`);
    assert.match(skin.accent, /^#[0-9a-f]{6}$/i, `${id} accent must be a hex colour`);
    assert.ok(skin.emblem.length > 0, `${id} needs an emblem`);
  }
  assert.equal(new Set(ids).size, ids.length, "duplicate sector ids");
});

test("sector accents are unique and none reuse the old duplicates", () => {
  const accents = SECTORS.map((sector) => SECTOR_SKINS[sector.id].accent.toLowerCase());
  assert.equal(new Set(accents).size, accents.length, "sector accents must be distinct");
});

test("sectorSkin returns the registry entry", () => {
  assert.deepEqual(sectorSkin("sector-1"), SECTOR_SKINS["sector-1"]);
});

test("sectorStyle sets the accent var and optional art", () => {
  const plain = sectorStyle("sector-2") as Record<string, string>;
  assert.equal(plain["--sector-accent"], SECTOR_SKINS["sector-2"].accent);
  assert.equal(plain["--sector-art"], undefined);
  assert.ok(plain["--chamfer-edge"].includes(SECTOR_SKINS["sector-2"].accent));

  const withArt = sectorStyle("sector-3", "/sectors/sector-3.webp") as Record<string, string>;
  assert.equal(withArt["--sector-art"], 'url("/sectors/sector-3.webp")');
});

test("sector ids are stable across the curriculum", () => {
  const ids: SectorId[] = SECTORS.map((sector) => sector.id);
  assert.deepEqual(ids, [
    "sector-0",
    "sector-1",
    "sector-2",
    "sector-3",
    "sector-4",
    "sector-5",
  ]);
});
