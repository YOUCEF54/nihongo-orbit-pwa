import test from "node:test";
import assert from "node:assert/strict";
import {
  DOJO_STEP_COUNT,
  DOJO_STEPS,
  stepIndexForHash,
} from "./dojo-steps.ts";

test("steps are unique, ordered, and start with stroke starters", () => {
  assert.equal(DOJO_STEP_COUNT, 9);
  assert.equal(DOJO_STEPS[0].id, "strokes");
  assert.equal(DOJO_STEPS[DOJO_STEP_COUNT - 1].id, "taiko");
  assert.equal(new Set(DOJO_STEPS.map((step) => step.id)).size, DOJO_STEP_COUNT);
  for (const step of DOJO_STEPS) {
    assert.ok(step.titleAr.length > 0, `${step.id} titleAr`);
    assert.ok(step.descAr.length > 0, `${step.id} descAr`);
    assert.ok(step.howToAr.length > 0, `${step.id} howToAr`);
    assert.ok(step.ctaAr.length > 0, `${step.id} ctaAr`);
    assert.ok(step.icon.length > 0, `${step.id} icon`);
  }
});

test("every terminal anchor resolves to a carousel step", () => {
  for (const hash of ["#review", "#pitch", "#matrix", "#listen", "#assemble", "#grammar", "#taiko"]) {
    const index = stepIndexForHash(hash);
    assert.ok(typeof index === "number" && index >= 0 && index < DOJO_STEP_COUNT, hash);
  }
  assert.equal(stepIndexForHash("#nope"), null);
  assert.equal(stepIndexForHash(""), null);
});
