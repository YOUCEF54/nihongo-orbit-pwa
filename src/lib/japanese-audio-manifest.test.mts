import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PHRASE_AUDIO, phraseAudioUrl } from "./japanese-audio-manifest.ts";
import { RADICAL_TOKENS } from "./radical-flood.ts";
import { SYNTAX_SCRAMBLE_TASKS } from "../data/syntax-scramble.seed.ts";

test("every voice-less phrase ships audio", () => {
  for (const token of RADICAL_TOKENS) {
    assert.ok(phraseAudioUrl(token.reading), `radical ${token.reading}`);
  }
  for (const task of SYNTAX_SCRAMBLE_TASKS) {
    assert.ok(phraseAudioUrl(task.fullJapanese), `sentence ${task.fullJapanese}`);
    for (const part of task.parts) {
      assert.ok(phraseAudioUrl(part.reading), `part ${part.reading}`);
    }
  }
});

test("manifest urls point at shipped mp3 files", () => {
  for (const url of Object.values(PHRASE_AUDIO)) {
    assert.match(url, /^\/audio\/[a-z]+\/[a-z0-9-]+\.mp3$/);
    const file = fileURLToPath(new URL(`../../public${url}`, import.meta.url));
    assert.ok(existsSync(file), `missing ${url}`);
  }
});

test("blank phrases resolve to null", () => {
  assert.equal(phraseAudioUrl(null), null);
  assert.equal(phraseAudioUrl(undefined), null);
  assert.equal(phraseAudioUrl(""), null);
  assert.equal(phraseAudioUrl("未知の語"), null);
});
