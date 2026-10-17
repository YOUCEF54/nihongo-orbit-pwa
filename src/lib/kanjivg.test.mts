import test from "node:test";
import assert from "node:assert/strict";
import {
  extractStrokePaths,
  fetchKanjivgStrokes,
  kanjiToStrokeFileHex,
  readStrokeCache,
  resolveStrokes,
  writeStrokeCache,
} from "./kanjivg.ts";

const SVG_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 109">
  <g id="kvg:05c71" kvg:element="山">
    <path id="kvg:05c71-s1" d="M52.49,15.5c1.38,1.38,2.26,3.5,2.26,5.75c0,0.75-0.22,58.3-0.25,59.25"/>
    <path id="kvg:05c71-s2" d="M21.49,54.5c0.88,0.88,1.39,2.25,1.26,3.75"/>
    <path id="kvg:05c71-s3" d="M89.24,49c0.94,0.94,1.64,2.38,1.51,4.25"/>
  </g>
</svg>`;

function stubFetch(svgText: string) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(svgText, { status: 200, headers: { "content-type": "image/svg+xml" } })) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test("kanjiToStrokeFileHex maps codepoints to 5-digit KanjiVG filenames", () => {
  assert.equal(kanjiToStrokeFileHex("山"), "05c71");
  assert.equal(kanjiToStrokeFileHex("海"), "06d77");
  assert.equal(kanjiToStrokeFileHex("学"), "05b66");
  assert.equal(kanjiToStrokeFileHex("駅"), "099c5");
});

test("extractStrokePaths returns paths in document (stroke) order", () => {
  const paths = extractStrokePaths(SVG_FIXTURE);
  assert.equal(paths.length, 3);
  assert.ok(paths[0].startsWith("M52.49"));
  assert.ok(paths[1].startsWith("M21.49"));
  assert.ok(paths[2].startsWith("M89.24"));
});

test("extractStrokePaths tolerates attribute order and single quotes", () => {
  const svg = `<svg><path opacity="0.5" d='M1,2L3,4'/><path d="M5 6"/></svg>`;
  assert.deepEqual(extractStrokePaths(svg), ["M1,2L3,4", "M5 6"]);
  assert.deepEqual(extractStrokePaths("<svg></svg>"), []);
});

test("cache write/read round-trips stroke paths", () => {
  writeStrokeCache("山", ["M1", "M2"]);
  assert.deepEqual(readStrokeCache("山"), ["M1", "M2"]);
  assert.equal(readStrokeCache("海"), null);
});

test("resolveStrokes prefers embedded over cache", async () => {
  const restore = stubFetch(SVG_FIXTURE);
  try {
    const result = await resolveStrokes("山", ["M-embedded"]);
    assert.deepEqual(result, ["M-embedded"]);
  } finally {
    restore();
  }
});

test("resolveStrokes skips fetch when cache is warm", async () => {
  writeStrokeCache("学", ["M-cached"]);
  const failing = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;
  const original = globalThis.fetch;
  globalThis.fetch = failing;
  try {
    const result = await resolveStrokes("学");
    assert.deepEqual(result, ["M-cached"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("fetchKanjivgStrokes parses SVG and leaves the cache untouched", async () => {
  writeStrokeCache("山", ["M-seeded"]);
  const restore = stubFetch(SVG_FIXTURE);
  try {
    const paths = await fetchKanjivgStrokes("山");
    assert.equal(paths.length, 3);
    assert.deepEqual(readStrokeCache("山"), ["M-seeded"]);
  } finally {
    restore();
  }
});

test("resolveStrokes fetches and stores on a cold cache", async () => {
  const restore = stubFetch(SVG_FIXTURE);
  try {
    const paths = await resolveStrokes("海");
    assert.equal(paths.length, 3);
    assert.deepEqual(readStrokeCache("海"), paths);
  } finally {
    restore();
  }
});

test("resolveStrokes rejects when nothing is available", async () => {
  const failing = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;
  const original = globalThis.fetch;
  globalThis.fetch = failing;
  try {
    await assert.rejects(() => resolveStrokes("玄"));
  } finally {
    globalThis.fetch = original;
  }
});

test("fetchKanjivgStrokes surfaces non-OK responses", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("nope", { status: 404 })) as typeof fetch;
  try {
    await assert.rejects(() => fetchKanjivgStrokes("山"), /HTTP 404/);
  } finally {
    globalThis.fetch = original;
  }
});