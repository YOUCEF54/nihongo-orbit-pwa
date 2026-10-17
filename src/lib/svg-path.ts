/* ============================================================
   Minimal SVG path sampler — converts a path `d` string into
   evenly-spaced absolute points. Supports M/L/H/V/C/S/Q/T/Z and
   their relative forms, including implicit repeated commands and
   multi-coordinate runs. Arc (A) is approximated as a straight
   segment to its endpoint (KanjiVG medians never use arcs).
   ============================================================ */

export interface SvgPoint {
  x: number;
  y: number;
}

function tokenize(d: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < d.length) {
    const ch = d[i];
    if (ch === " " || ch === "," || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      tokens.push(ch);
      i += 1;
      continue;
    }
    const num = /^[+-]?(\d*\.?\d+)([eE][+-]?\d+)?/.exec(d.slice(i));
    if (num) {
      tokens.push(num[0]);
      i += num[0].length;
      continue;
    }
    throw new Error(`Unexpected character in SVG path: ${ch}`);
  }
  return tokens;
}

function readNumbers(tokens: string[], from: number, count: number): number[] {
  if (from + count > tokens.length) throw new Error("SVG path ended mid-command");
  const values: number[] = [];
  for (let k = 0; k < count; k += 1) values.push(parseFloat(tokens[from + k]));
  return values;
}

function cubic(
  x0: number, y0: number, x1: number, y1: number,
  x2: number, y2: number, x3: number, y3: number,
  out: SvgPoint[], steps: number,
): void {
  for (let s = 1; s <= steps; s += 1) {
    const t = s / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    });
  }
}

function quad(
  x0: number, y0: number, x1: number, y1: number,
  x2: number, y2: number, out: SvgPoint[], steps: number,
): void {
  for (let s = 1; s <= steps; s += 1) {
    const t = s / steps;
    const u = 1 - t;
    out.push({
      x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
      y: u * u * y0 + 2 * u * t * y1 + t * t * y2,
    });
  }
}

/** Trace the path into a dense, possibly uneven point cloud. */
export function traceSvgPath(d: string): SvgPoint[] {
  const tokens = tokenize(d);
  const pts: SvgPoint[] = [];
  let i = 0;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "";
  let lastCubic: SvgPoint | null = null;
  let lastQuad: SvgPoint | null = null;
  let prevCommand: string | null = null;

  const abs = (value: number, base: number, rel: boolean) => (rel ? base + value : value);

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[A-Za-z]$/.test(tok)) {
      cmd = tok;
      i += 1;
    } else if (cmd === "") {
      break;
    }

    const lower = cmd.toLowerCase();
    const relative = cmd === lower;
    const nextTok = tokens[i];

    switch (lower) {
      case "m": {
        const [dx, dy] = readNumbers(tokens, i, 2);
        i += 2;
        x = abs(dx, x, relative);
        y = abs(dy, y, relative);
        sx = x;
        sy = y;
        pts.push({ x, y });
        prevCommand = "M";
        if (i < tokens.length && !/^[A-Za-z]$/.test(tokens[i])) cmd = relative ? "l" : "L";
        else cmd = "";
        continue;
      }
      case "l": {
        const [dx, dy] = readNumbers(tokens, i, 2);
        i += 2;
        x = abs(dx, x, relative);
        y = abs(dy, y, relative);
        pts.push({ x, y });
        prevCommand = "L";
        continue;
      }
      case "h": {
        const [dx] = readNumbers(tokens, i, 1);
        i += 1;
        x = abs(dx, x, relative);
        pts.push({ x, y });
        prevCommand = "H";
        continue;
      }
      case "v": {
        const [dy] = readNumbers(tokens, i, 1);
        i += 1;
        y = abs(dy, y, relative);
        pts.push({ x, y });
        prevCommand = "V";
        continue;
      }
      case "c": {
        const [a, b, c, dE, e, f] = readNumbers(tokens, i, 6);
        i += 6;
        const x1 = abs(a, x, relative);
        const y1 = abs(b, y, relative);
        const x2 = abs(c, x, relative);
        const y2 = abs(dE, y, relative);
        const x3 = abs(e, x, relative);
        const y3 = abs(f, y, relative);
        cubic(x, y, x1, y1, x2, y2, x3, y3, pts, 16);
        x = x3;
        y = y3;
        lastCubic = { x: x2, y: y2 };
        prevCommand = "C";
        continue;
      }
      case "s": {
        const [c, dE, e, f] = readNumbers(tokens, i, 4);
        i += 4;
        let x1: number;
        let y1: number;
        if (prevCommand === "C" || prevCommand === "S") {
          x1 = 2 * x - (lastCubic?.x ?? x);
          y1 = 2 * y - (lastCubic?.y ?? y);
        } else {
          x1 = x;
          y1 = y;
        }
        const x2 = abs(c, x, relative);
        const y2 = abs(dE, y, relative);
        const x3 = abs(e, x, relative);
        const y3 = abs(f, y, relative);
        cubic(x, y, x1, y1, x2, y2, x3, y3, pts, 16);
        x = x3;
        y = y3;
        lastCubic = { x: x2, y: y2 };
        prevCommand = "S";
        continue;
      }
      case "q": {
        const [c, dE, e, f] = readNumbers(tokens, i, 4);
        i += 4;
        const x1 = abs(c, x, relative);
        const y1 = abs(dE, y, relative);
        const x2 = abs(e, x, relative);
        const y2 = abs(f, y, relative);
        quad(x, y, x1, y1, x2, y2, pts, 8);
        x = x2;
        y = y2;
        lastQuad = { x: x1, y: y1 };
        prevCommand = "Q";
        continue;
      }
      case "t": {
        const [e, f] = readNumbers(tokens, i, 2);
        i += 2;
        let x1: number;
        let y1: number;
        if (prevCommand === "Q" || prevCommand === "T") {
          x1 = 2 * x - (lastQuad?.x ?? x);
          y1 = 2 * y - (lastQuad?.y ?? y);
        } else {
          x1 = x;
          y1 = y;
        }
        const x2 = abs(e, x, relative);
        const y2 = abs(f, y, relative);
        quad(x, y, x1, y1, x2, y2, pts, 8);
        x = x2;
        y = y2;
        lastQuad = { x: x1, y: y1 };
        prevCommand = "T";
        continue;
      }
      case "z": {
        pts.push({ x: sx, y: sy });
        x = sx;
        y = sy;
        prevCommand = "Z";
        continue;
      }
      case "a": {
        // Approximated as a straight segment to the endpoint.
        const [rx, ry, rot, laf, sf, e, f] = readNumbers(tokens, i, 7);
        void rx; void ry; void rot; void laf; void sf;
        i += 7;
        x = abs(e, x, relative);
        y = abs(f, y, relative);
        pts.push({ x, y });
        prevCommand = "A";
        continue;
      }
      default: {
        if (nextTok === undefined) break;
        throw new Error(`Unsupported SVG path command: ${cmd}`);
      }
    }
  }

  return pts;
}

/** Resample a dense point cloud to `count` evenly-spaced points. */
export function resampleUniform(points: SvgPoint[], count: number): SvgPoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0] }];
  if (count < 2) count = 2;

  const cumulative: number[] = [0];
  let total = 0;
  for (let k = 1; k < points.length; k += 1) {
    const dx = points[k].x - points[k - 1].x;
    const dy = points[k].y - points[k - 1].y;
    total += Math.hypot(dx, dy);
    cumulative.push(total);
  }
  if (total <= 0) return [{ ...points[0] }, { ...points[points.length - 1] }];

  const out: SvgPoint[] = [];
  for (let s = 0; s < count; s += 1) {
    const target = (total * s) / (count - 1);
    let low = 0;
    let high = cumulative.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (cumulative[mid] <= target) low = mid;
      else high = mid;
    }
    const segLen = cumulative[high] - cumulative[low];
    const t = segLen > 0 ? (target - cumulative[low]) / segLen : 0;
    out.push({
      x: points[low].x + (points[high].x - points[low].x) * t,
      y: points[low].y + (points[high].y - points[low].y) * t,
    });
  }
  return out;
}

/** Sample an SVG path `d` into `samples` evenly spaced absolute points. */
export function sampleSvgPath(d: string, samples = 48): SvgPoint[] {
  return resampleUniform(traceSvgPath(d), samples);
}

export function pathLength(points: SvgPoint[]): number {
  let total = 0;
  for (let k = 1; k < points.length; k += 1) {
    total += Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y);
  }
  return total;
}

export function dist(a: SvgPoint, b: SvgPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestDist(point: SvgPoint, cloud: SvgPoint[]): number {
  let best = Infinity;
  for (const other of cloud) {
    const d = dist(point, other);
    if (d < best) best = d;
  }
  return best;
}