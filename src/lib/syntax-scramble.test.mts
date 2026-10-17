import test from "node:test";
import assert from "node:assert/strict";
import {
  SCRAMBLE_ROUNDS,
  buildScrambleRounds,
  fullReading,
  isScrambleCorrect,
  partById,
} from "./syntax-scramble.ts";
import { SYNTAX_SCRAMBLE_TASKS } from "../data/syntax-scramble.seed.ts";

test("rounds are deterministic per seed and cover every task once", () => {
  const first = buildScrambleRounds(7);
  const second = buildScrambleRounds(7);
  assert.equal(first.length, SCRAMBLE_ROUNDS);
  assert.deepEqual(
    first.map((round) => round.task.id),
    second.map((round) => round.task.id),
  );
  assert.deepEqual(
    first.map((round) => round.bank),
    second.map((round) => round.bank),
  );
  assert.equal(new Set(first.map((round) => round.task.id)).size, first.length);
});

test("every bank holds each part id exactly once", () => {
  for (const round of buildScrambleRounds(42)) {
    assert.deepEqual(
      [...round.bank].sort(),
      round.task.parts.map((part) => part.id).sort(),
    );
  }
});

test("correct order validates, anything else fails", () => {
  const task = SYNTAX_SCRAMBLE_TASKS[0];
  assert.equal(isScrambleCorrect(task, [...task.correctOrderIds]), true);
  assert.equal(
    isScrambleCorrect(task, [...task.correctOrderIds].reverse()),
    task.correctOrderIds.length <= 1,
  );
  const swapped = [...task.correctOrderIds];
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  assert.equal(isScrambleCorrect(task, swapped), false);
  assert.equal(
    isScrambleCorrect(task, task.correctOrderIds.slice(1)),
    false,
    "partial fills must not validate",
  );
  assert.equal(
    isScrambleCorrect(task, [...task.correctOrderIds.slice(1), null]),
    false,
    "trailing empty slots must not validate",
  );
});

test("seed tasks are well-formed: ids, readings, and order ids all resolve", () => {
  for (const task of SYNTAX_SCRAMBLE_TASKS) {
    assert.ok(task.translationAr.length > 0);
    assert.deepEqual(
      task.correctOrderIds.length,
      task.parts.length,
      `${task.id} order must cover every part`,
    );
    for (const id of task.correctOrderIds) {
      const part = partById(task, id);
      assert.ok(part, `${task.id} references missing part ${id}`);
      assert.ok(part!.reading.length > 0, `${task.id}/${id} needs a reading`);
      assert.ok(part!.meaningAr.length > 0, `${task.id}/${id} needs an Arabic gloss`);
    }
    assert.ok(fullReading(task).length > 0);
  }
});
