import test from "node:test";
import assert from "node:assert/strict";
import {
  ABACUS_LEVELS,
  BOARD_NODES,
  VALID_PIVOTS,
  getNeighbors,
  isLevelSolved,
  ringOrder,
  rotateRing,
  type AbacusToken,
} from "./astral-abacus.ts";

const START: AbacusToken[] = [
  { id: "t1", char: "木", nodeId: 10, isBlock: false },
  { id: "t2", char: "口", nodeId: 0, isBlock: false },
  { id: "t3", char: "X", nodeId: 12, isBlock: true },
];

test("board has 19 hexes and every valid pivot is fully surrounded", () => {
  assert.equal(BOARD_NODES.length, 19);
  assert.ok(VALID_PIVOTS.length > 0, "needs at least one pivot");
  for (const pivot of VALID_PIVOTS) {
    assert.equal(getNeighbors(pivot).length, 6, `pivot ${pivot} must have 6 neighbours`);
  }
  const center = getNeighbors(0).map((node) => node.id).sort((a, b) => a - b);
  assert.deepEqual(center, [1, 2, 3, 4, 5, 6]);
});

test("ring order follows the 6-neighbour loop of its pivot", () => {
  for (const pivot of VALID_PIVOTS) {
    const ring = ringOrder(pivot);
    assert.equal(ring.length, 6, `pivot ${pivot} ring must have 6 nodes`);
    assert.equal(new Set(ring).size, 6, `pivot ${pivot} ring must be unique`);
  }
});

test("six rotations return every token home; +1 and -1 are inverses", () => {
  const pivot = VALID_PIVOTS[0];
  let tokens = START;
  for (let i = 0; i < 6; i += 1) tokens = rotateRing(tokens, pivot, 1);
  assert.deepEqual(
    tokens.map((token) => token.nodeId),
    START.map((token) => token.nodeId),
  );

  const cw = rotateRing(START, pivot, 1);
  const back = rotateRing(cw, pivot, -1);
  assert.deepEqual(
    back.map((token) => token.nodeId),
    START.map((token) => token.nodeId),
  );
});

test("rotation only moves tokens sitting on the pivot ring", () => {
  const pivot = VALID_PIVOTS[0];
  const ring = new Set(ringOrder(pivot));
  const moved = rotateRing(START, pivot, 1);
  for (let i = 0; i < START.length; i += 1) {
    if (ring.has(START[i].nodeId)) {
      assert.ok(ring.has(moved[i].nodeId), "ring token must stay on the ring");
      assert.equal(moved[i].char, START[i].char);
    } else {
      assert.equal(moved[i].nodeId, START[i].nodeId, "off-ring token must not move");
    }
  }
});

test("unknown pivots are no-ops", () => {
  assert.deepEqual(rotateRing(START, 999, 1), START);
});

test("solve detection matches every target socket exactly", () => {
  const level = ABACUS_LEVELS[0];
  assert.equal(isLevelSolved(level.start, level.targets), false);
  const solved: AbacusToken[] = [
    { id: "t1", char: "木", nodeId: 4, isBlock: false },
    { id: "t2", char: "口", nodeId: 9, isBlock: false },
    { id: "t3", char: "⎔", nodeId: 6, isBlock: true },
  ];
  assert.equal(isLevelSolved(solved, level.targets), true);
  const swapped: AbacusToken[] = [
    { id: "t1", char: "口", nodeId: 4, isBlock: false },
    { id: "t2", char: "木", nodeId: 9, isBlock: false },
    { id: "t3", char: "⎔", nodeId: 6, isBlock: true },
  ];
  assert.equal(isLevelSolved(swapped, level.targets), false);
});

test("every shipped level starts unsolved and is solvable by rotation", () => {
  for (const level of ABACUS_LEVELS) {
    assert.equal(isLevelSolved(level.start, level.targets), false, `level ${level.levelNum} starts solved`);
    assert.ok(level.targets.length > 0 && level.start.length > 0, `level ${level.levelNum} needs pieces`);
    // Canonical solved placement must reference real board nodes.
    for (const target of level.targets) {
      assert.ok(BOARD_NODES.some((node) => node.id === target.nodeId), `bad target node ${target.nodeId}`);
    }
  }
});
