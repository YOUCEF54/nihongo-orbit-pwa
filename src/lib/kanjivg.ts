/* ============================================================
   KanjiVG stroke-order engine (hybrid fetch + cache + fallback).

   Data source: KanjiVG — Copyright (C) 2009/2010/2011 Ulrich Apel.
   Distributed under the Creative Commons Attribution-Share Alike
   3.0 Licence (CC-BY-SA 3.0). KanjiVG: https://kanjivg.tagaini.net

   Each kanji file (kanji/<5-hex>.svg) is a single <svg> whose
   <path d="..."> elements are ordered by stroke number. We pull
   those "d" values verbatim (viewBox 0 0 109 109, absolute coords)
   and cache them locally so offline sessions reuse known strokes.

   Resolution order per character: a bundled copy in
   `public/kanjivg/<5-hex>.svg` (see `kanjivg-local-manifest.ts`,
   refreshed by `npm run gen:kanjivg`) → localStorage cache → CDN.
   ============================================================ */
import { kanjivgLocalUrl } from "./kanjivg-local-manifest.ts";
export const KANJIVG_BASE_URL =
  "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji";

const SVG_ACCEPT = "image/svg+xml,text/xml,text/plain;q=0.8,*/*;q=0.5";

const CACHE_PREFIX = "learnjp:kanjivg:";
const CACHE_VERSION = 1;
const MAX_CACHE_ENTRIES = 500;

/* In-memory storage used when localStorage is unavailable (node tests,
   private tabs). The browser path prefers real localStorage. */
const memoryStorage = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      return globalThis.localStorage.getItem(key);
    }
  } catch {
    // quota / security — fall through to memory storage
  }
  return memoryStorage.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // quota / security — fall through to memory storage
  }
  memoryStorage.set(key, value);
}

/** "山" -> "05c71" (KanjiVG filenames use 5-digit hex codes). */
export function kanjiToStrokeFileHex(character: string): string {
  const code = character.codePointAt(0);
  if (code === undefined || code === 0) {
    throw new Error("kanjivg: empty character");
  }
  return code.toString(16).padStart(5, "0");
}

/** Extract every <path d="..."> in document order (stroke order). */
export function extractStrokePaths(svgText: string): string[] {
  const paths: string[] = [];
  const pathRe = /<path\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = pathRe.exec(svgText)) !== null) {
    const attrs = (match[1] ?? "").match(/\sd=["']([^"']*)["']/i);
    const d = attrs ? attrs[1] : null;
    if (d && d.trim().length > 0) paths.push(d.trim());
  }
  return paths;
}

export function readStrokeCache(character: string): string[] | null {
  const raw = storageGet(`${CACHE_PREFIX}${character}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: number; d?: string[] };
    if (parsed.v !== CACHE_VERSION || !Array.isArray(parsed.d)) return null;
    return parsed.d.filter((entry) => typeof entry === "string");
  } catch {
    return null;
  }
}

export function writeStrokeCache(character: string, paths: string[]): void {
  if (paths.length === 0) return;
  try {
    storageSet(
      `${CACHE_PREFIX}${character}`,
      JSON.stringify({ v: CACHE_VERSION, d: paths }),
    );
    trimCache();
  } catch {
    // storage full — caching is best-effort
  }
}

function trimCache(): void {
  if (typeof globalThis.localStorage === "undefined") {
    if (memoryStorage.size <= MAX_CACHE_ENTRIES) return;
    for (const key of [...memoryStorage.keys()].slice(0, MAX_CACHE_ENTRIES / 2)) {
      memoryStorage.delete(key);
    }
    return;
  }
  const keys: string[] = [];
  try {
    for (let i = 0; i < globalThis.localStorage.length; i += 1) {
      const key = globalThis.localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) keys.push(key);
    }
  } catch {
    return;
  }
  if (keys.length <= MAX_CACHE_ENTRIES) return;
  for (const key of keys.slice(0, MAX_CACHE_ENTRIES / 2)) {
    try {
      globalThis.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** Best-effort read of a bundled (same-origin) stroke file — a miss never throws. */
async function readBundledStrokes(
  url: string,
  signal?: AbortSignal,
): Promise<string[] | null> {
  try {
    const response = await fetch(url, {
      signal,
      headers: { accept: SVG_ACCEPT },
    });
    if (!response.ok) return null;
    const paths = extractStrokePaths(await response.text());
    return paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
}

/**
 * Fetch strokes for a character. The bundled offline copy in
 * `public/kanjivg/<hex>.svg` wins when present; otherwise the KanjiVG CDN
 * is used. Throws only when neither source yields strokes.
 */
export async function fetchKanjivgStrokes(
  character: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const hex = kanjiToStrokeFileHex(character);

  const bundled = kanjivgLocalUrl(hex);
  if (bundled) {
    const local = await readBundledStrokes(bundled, signal);
    if (local) return local;
  }

  const response = await fetch(`${KANJIVG_BASE_URL}/${hex}.svg`, {
    signal,
    headers: { accept: SVG_ACCEPT },
  });
  if (!response.ok) throw new Error(`kanjivg: HTTP ${response.status} for ${character}`);
  const text = await response.text();
  const paths = extractStrokePaths(text);
  if (paths.length === 0) throw new Error(`kanjivg: no strokes parsed for ${character}`);
  return paths;
}

/**
 * Hybrid resolver — embedded strokes win, then cached, then CDN fetch
 * (written back into the cache for offline reuse).
 */
export async function resolveStrokes(
  character: string,
  embedded?: string[],
  signal?: AbortSignal,
): Promise<string[]> {
  if (embedded && embedded.length > 0) return embedded;
  const cached = readStrokeCache(character);
  if (cached && cached.length > 0) return cached;
  const fetched = await fetchKanjivgStrokes(character, signal);
  writeStrokeCache(character, fetched);
  return fetched;
}