import test from "node:test";
import assert from "node:assert/strict";
import {
  FLOOD_GRID,
  FLOOD_MAX_MOVES,
  RADICAL_TOKENS,
  dealFlood,
  floodFill,
  isUnified,
  type FloodBoard,
} from "./radical-flood.ts";

function boardOf(id: number): FloodBoard {
  return Array.from({ length: FLOOD_GRID }, () =>
    Array.from({ length: FLOOD_GRID }, () => ({ id, depth: 0 })),
  );
}

test("tokens and budget are well-formed", () => {
  assert.equal(RADICAL_TOKENS.length, 5);
  assert.equal(new Set(RADICAL_TOKENS.map((token) => token.id)).size, 5);
  for (const token of RADICAL_TOKENS) {
    assert.ok(token.char.length > 0);
    assert.ok(token.meaningAr.length > 0);
  }
  assert.ok(FLOOD_MAX_MOVES > 0);
});

test("deals stay inside the grid and token range", () => {
  let state = 123456789;
  const rand = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  for (let i = 0; i < 5; i += 1) {
    const deal = dealFlood(rand);
    assert.equal(deal.board.length, FLOOD_GRID);
    for (const row of deal.board) {
      assert.equal(row.length, FLOOD_GRID);
      for (const cell of row) {
        assert.ok(cell.id >= 0 && cell.id < RADICAL_TOKENS.length, `bad token ${cell.id}`);
      }
    }
    assert.ok(deal.targetTokenId >= 0 && deal.targetTokenId < RADICAL_TOKENS.length);
  }
});

test("flood repaints exactly the connected region and ripples depth", () => {
  const board = boardOf(1);
  board[0][0] = { id: 0, depth: 0 };
  board[0][1] = { id: 0, depth: 0 };
  board[1][0] = { id: 2, depth: 0 };
  const next = floodFill(board, 0, 0, 3);
  assert.equal(next[0][0].id, 3);
  assert.equal(next[0][1].id, 3);
  assert.equal(next[1][0].id, 2, "different-colour neighbour must stay");
  assert.equal(next[5][5].id, 1, "distant cells must stay");
  assert.ok(next[0][1].depth >= next[0][0].depth, "BFS depth must not shrink outward");
});

test("repainting with the region's own colour is a no-op (fresh board returned)", () => {
  const board = boardOf(2);
  const next = floodFill(board, 4, 4, 2);
  assert.notEqual(next, board);
  assert.ok(isUnified(next, 2));
});

test("unification detects a single foreign tile", () => {
  const board = boardOf(0);
  assert.equal(isUnified(board, 0), true);
  board[9][9] = { id: 1, depth: 0 };
  assert.equal(isUnified(board, 0), false);
  const fixed = floodFill(board, 9, 9, 0);
  assert.equal(isUnified(fixed, 0), true);
});

test("a full-board repaint unifies from any cell", () => {
  const board = boardOf(4);
  const next = floodFill(board, 5, 5, 0);
  assert.equal(isUnified(next, 0), true);
  assert.equal(isUnified(next, 4), false);
});
