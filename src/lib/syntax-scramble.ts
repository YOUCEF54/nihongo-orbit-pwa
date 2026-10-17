/* ============================================================
   Syntax Scramble pure logic — deterministic round building and
   order validation (no DOM, no audio).
   ============================================================ */
import { SYNTAX_SCRAMBLE_TASKS, type ScrambleTask } from "../data/syntax-scramble.seed.ts";
import { hash, makeRandom, shuffle } from "./random.ts";

export const SCRAMBLE_ROUNDS = 5;

export interface ScrambleRound {
  task: ScrambleTask;
  /** Shuffled part ids forming the starting word bank. */
  bank: string[];
}

export function partById(task: ScrambleTask, id: string) {
  return task.parts.find((part) => part.id === id) ?? null;
}

export function buildScrambleRounds(seed: number): ScrambleRound[] {
  const rand = makeRandom(seed);
  return shuffle([...SYNTAX_SCRAMBLE_TASKS], rand)
    .slice(0, SCRAMBLE_ROUNDS)
    .map((task) => ({
      task,
      bank: shuffle(
        task.parts.map((part) => part.id),
        makeRandom(hash(`${seed}:${task.id}`)),
      ),
    }));
}

/** Slots hold part ids (null = empty). Correct when every slot matches. */
export function isScrambleCorrect(
  task: ScrambleTask,
  slots: (string | null)[],
): boolean {
  if (slots.length !== task.correctOrderIds.length) return false;
  return task.correctOrderIds.every((id, index) => slots[index] === id);
}

export function readingOf(task: ScrambleTask, id: string): string {
  return partById(task, id)?.reading ?? "";
}

/** Continuous kana reading (no spacing) for the offline synth fallback. */
export function fullReading(task: ScrambleTask): string {
  return task.correctOrderIds.map((id) => readingOf(task, id)).join("");
}
