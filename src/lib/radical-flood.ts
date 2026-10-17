/* ============================================================
   Radical Confluence — flood-fill unification logic (pure,
   side-effect free). A 10×10 matrix of radical tiles must be
   unified to a single target radical within a move budget.
   Clicking a tile repaints its whole connected region to the
   equipped radical; `depth` records the BFS wave order so the
   UI can ripple the repaint outward.
   ============================================================ */

export interface RadicalToken {
  id: number;
  char: string;
  name: string;
  /** Hiragana reading of the radical (used for its spoken preview). */
  reading: string;
  meaningAr: string;
  hex: string;
}

export const RADICAL_TOKENS: RadicalToken[] = [
  { id: 0, char: "氵", name: "sanzui", reading: "さんずい", meaningAr: "ماء", hex: "#8cd6f5" },
  { id: 1, char: "火", name: "ka / hi", reading: "ひ", meaningAr: "نار", hex: "#f77563" },
  { id: 2, char: "木", name: "moku / ki", reading: "き", meaningAr: "شجرة", hex: "#7ce3b6" },
  { id: 3, char: "囗", name: "kamae", reading: "くにがまえ", meaningAr: "إحاطة", hex: "#f5d67a" },
  { id: 4, char: "日", name: "nichi / hi", reading: "ひ", meaningAr: "شمس", hex: "#cc92f5" },
];

export const FLOOD_GRID = 10;
export const FLOOD_MAX_MOVES = 22;

export interface FloodCell {
  id: number;
  depth: number;
}

export type FloodBoard = FloodCell[][];

export interface FloodDeal {
  board: FloodBoard;
  targetTokenId: number;
}

/** Deal a board + target from an injected RNG (seeded in the UI). */
export function dealFlood(rand: () => number): FloodDeal {
  const board: FloodBoard = [];
  for (let r = 0; r < FLOOD_GRID; r += 1) {
    const row: FloodCell[] = [];
    for (let c = 0; c < FLOOD_GRID; c += 1) {
      row.push({ id: Math.floor(rand() * RADICAL_TOKENS.length), depth: 0 });
    }
    board.push(row);
  }
  return { board, targetTokenId: Math.floor(rand() * RADICAL_TOKENS.length) };
}

/**
 * Repaint the connected region containing (startR, startC) to
 * `toolId`. Returns a fresh board; repainting with the region's
 * own colour is a no-op returning an equal board.
 */
export function floodFill(
  board: FloodBoard,
  startR: number,
  startC: number,
  toolId: number,
): FloodBoard {
  const targetId = board[startR]?.[startC]?.id;
  if (targetId === undefined || targetId === toolId) {
    return board.map((row) => row.map((cell) => ({ ...cell })));
  }
  const next: FloodBoard = board.map((row) => row.map((cell) => ({ ...cell, depth: 0 })));
  const seen = new Set<string>([`${startR},${startC}`]);
  const queue: Array<[number, number]> = [[startR, startC]];
  while (queue.length > 0) {
    const [r, c] = queue.shift() as [number, number];
    const depth = next[r][c].depth;
    next[r][c].id = toolId;
    const neighbours: Array<[number, number]> = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbours) {
      if (nr < 0 || nr >= FLOOD_GRID || nc < 0 || nc >= FLOOD_GRID) continue;
      if (board[nr][nc].id !== targetId || seen.has(`${nr},${nc}`)) continue;
      seen.add(`${nr},${nc}`);
      next[nr][nc].depth = depth + 1;
      queue.push([nr, nc]);
    }
  }
  return next;
}

/** Unified when every tile carries the target radical. */
export function isUnified(board: FloodBoard, targetId: number): boolean {
  for (let r = 0; r < FLOOD_GRID; r += 1) {
    for (let c = 0; c < FLOOD_GRID; c += 1) {
      if (board[r][c].id !== targetId) return false;
    }
  }
  return true;
}
