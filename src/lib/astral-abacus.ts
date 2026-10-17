/* ============================================================
   Astral Abacus — hex-ring rotation logic (pure, side-effect free).

   A 19-hex board (2 rings around the center) holds radical "coins".
   Choosing a fully-surrounded pivot and rotating moves every coin
   sitting on that pivot's 6-neighbour ring one step clockwise or
   counter-clockwise. A level is solved when every target socket
   holds its required coin — teaching kanji composition from
   radicals (木+口=杏, 日+月=明, …).
   ============================================================ */

export interface AbacusAxial {
  id: number;
  q: number;
  r: number;
}

export interface AbacusNode extends AbacusAxial {
  x: number;
  y: number;
}

export interface AbacusToken {
  id: string;
  char: string;
  nodeId: number;
  isBlock: boolean;
}

export interface AbacusTarget {
  nodeId: number;
  char: string;
  romaji: string;
  meaning: string;
  isBlock?: boolean;
}

export interface AbacusLevel {
  levelNum: number;
  kanji: string;
  romaji: string;
  meaning: string;
  targets: AbacusTarget[];
  start: AbacusToken[];
}

/** Hexagon circumradius in board units. */
export const ABACUS_GRID = 48;
export const ABACUS_HALF_HEIGHT = (ABACUS_GRID * Math.sqrt(3)) / 2;

const RAW_NODES: AbacusAxial[] = [
  { id: 0, q: 0, r: 0 },
  { id: 1, q: 1, r: -1 },
  { id: 2, q: 1, r: 0 },
  { id: 3, q: 0, r: 1 },
  { id: 4, q: -1, r: 1 },
  { id: 5, q: -1, r: 0 },
  { id: 6, q: 0, r: -1 },
  { id: 7, q: 2, r: -2 },
  { id: 8, q: 2, r: -1 },
  { id: 9, q: 2, r: 0 },
  { id: 10, q: 1, r: 1 },
  { id: 11, q: 0, r: 2 },
  { id: 12, q: -1, r: 2 },
  { id: 13, q: -2, r: 2 },
  { id: 14, q: -2, r: 1 },
  { id: 15, q: -2, r: 0 },
  { id: 16, q: -1, r: -1 },
  { id: 17, q: 0, r: -2 },
  { id: 18, q: 1, r: -2 },
];

const GAP_FACTOR = 1.05;

function axialToPixel(q: number, r: number): { x: number; y: number } {
  return {
    x: ABACUS_GRID * ((3 / 2) * q) * GAP_FACTOR,
    y: ABACUS_GRID * Math.sqrt(3) * (r + q / 2) * GAP_FACTOR,
  };
}

/** Flat-topped hex board nodes with pixel coordinates. */
export const BOARD_NODES: AbacusNode[] = RAW_NODES.map((node) => ({
  ...node,
  ...axialToPixel(node.q, node.r),
}));

/** Axial neighbours (distance 1) of a node on the 19-hex board. */
export function getNeighbors(nodeId: number): AbacusNode[] {
  const node = BOARD_NODES.find((entry) => entry.id === nodeId);
  if (!node) return [];
  return BOARD_NODES.filter((entry) => {
    const dq = entry.q - node.q;
    const dr = entry.r - node.r;
    return (
      Math.abs(dq) <= 1 && Math.abs(dr) <= 1 && Math.abs(dq + dr) <= 1 && entry.id !== node.id
    );
  });
}

/** Only fully-surrounded hexagons (6 neighbours) may act as pivots. */
export const VALID_PIVOTS: number[] = BOARD_NODES.filter(
  (node) => getNeighbors(node.id).length === 6,
).map((node) => node.id);

/** Neighbour ids around a pivot, sorted clockwise by angle. */
export function ringOrder(pivotId: number): number[] {
  const pivot = BOARD_NODES.find((entry) => entry.id === pivotId);
  if (!pivot) return [];
  return getNeighbors(pivotId)
    .slice()
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      return angleA - angleB;
    })
    .map((entry) => entry.id);
}

/**
 * Rotate every token sitting on the pivot's ring one step.
 * `direction` is +1 (clockwise) or -1 (counter-clockwise).
 * Tokens off the ring are untouched; unknown pivots are no-ops.
 */
export function rotateRing(
  tokens: AbacusToken[],
  pivotId: number,
  direction: 1 | -1,
): AbacusToken[] {
  const ring = ringOrder(pivotId);
  if (ring.length === 0) return tokens;
  return tokens.map((token) => {
    const ringIndex = ring.indexOf(token.nodeId);
    if (ringIndex === -1) return token;
    const nextIndex = (ringIndex + direction + ring.length) % ring.length;
    return { ...token, nodeId: ring[nextIndex] };
  });
}

/** Solved when every target socket holds its required coin. */
export function isLevelSolved(tokens: AbacusToken[], targets: AbacusTarget[]): boolean {
  return targets.every((target) =>
    tokens.some((token) => token.nodeId === target.nodeId && token.char === target.char),
  );
}

const BLOCK = "⎔";

export const ABACUS_LEVELS: AbacusLevel[] = [
  {
    levelNum: 1,
    kanji: "杏",
    romaji: "Anzu / Kyou",
    meaning: "مشمش",
    targets: [
      { nodeId: 4, char: "木", romaji: "Ki", meaning: "شجرة" },
      { nodeId: 9, char: "口", romaji: "Kuchi", meaning: "فم" },
      { nodeId: 6, char: BLOCK, romaji: "حاجز", meaning: "حاجز", isBlock: true },
    ],
    start: [
      { id: "t1", char: "木", nodeId: 10, isBlock: false },
      { id: "t2", char: "口", nodeId: 0, isBlock: false },
      { id: "t3", char: BLOCK, nodeId: 12, isBlock: true },
    ],
  },
  {
    levelNum: 2,
    kanji: "明",
    romaji: "Mei / Akarui",
    meaning: "ساطع",
    targets: [
      { nodeId: 3, char: "日", romaji: "Hi / Nichi", meaning: "شمس" },
      { nodeId: 10, char: "月", romaji: "Tsuki", meaning: "قمر" },
      { nodeId: 5, char: BLOCK, romaji: "حاجز", meaning: "حاجز", isBlock: true },
    ],
    start: [
      { id: "t1", char: "日", nodeId: 8, isBlock: false },
      { id: "t2", char: "月", nodeId: 2, isBlock: false },
      { id: "t3", char: BLOCK, nodeId: 1, isBlock: true },
    ],
  },
  {
    levelNum: 3,
    kanji: "湖",
    romaji: "Ko / Mizuumi",
    meaning: "بحيرة",
    targets: [
      { nodeId: 3, char: "氵", romaji: "Sanzui", meaning: "ماء" },
      { nodeId: 0, char: "古", romaji: "Furu(i)", meaning: "قديم" },
      { nodeId: 1, char: "月", romaji: "Tsuki", meaning: "قمر" },
    ],
    start: [
      { id: "t1", char: "氵", nodeId: 9, isBlock: false },
      { id: "t2", char: "古", nodeId: 6, isBlock: false },
      { id: "t3", char: "月", nodeId: 11, isBlock: false },
    ],
  },
];
