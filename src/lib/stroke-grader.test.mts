import test from "node:test";
import assert from "node:assert/strict";
import { gradeDrawnPolyline, targetPoints, type StrokeGradeOptions } from "./stroke-grader.ts";

const TARGET = () => straightTarget(48);
const RELAXED: StrokeGradeOptions = { endTolerance: 18, passRadius: 9 };

function straightTarget(samples: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k < samples; k += 1) {
    const t = k / (samples - 1);
    out.push({ x: 10 + t * 80, y: 10 });
  }
  return out;
}

function line(from: { x: number; y: number }, to: { x: number; y: number }, steps = 32) {
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k <= steps; k += 1) {
    const t = k / steps;
    out.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return out;
}

test("a faithful trace of the median passes", () => {
  const grade = gradeDrawnPolyline(line({ x: 10, y: 10 }, { x: 90, y: 10 }), TARGET(), RELAXED);
  assert.equal(grade.pass, true);
  assert.equal(grade.reason, "ok");
  assert.ok(grade.score >= 80, `score was ${grade.score}`);
});

test("a human-ish wavy trace still passes", () => {
  const drawn = TARGET().map((p, index) => ({
    x: p.x,
    y: p.y + 3 * Math.sin(index * 0.9),
  }));
  const grade = gradeDrawnPolyline(drawn, TARGET(), RELAXED);
  assert.equal(grade.pass, true);
});

test("drawing the stroke in reverse fails direction", () => {
  const grade = gradeDrawnPolyline(line({ x: 90, y: 10 }, { x: 10, y: 10 }), TARGET(), RELAXED);
  assert.equal(grade.pass, false);
  assert.equal(grade.reason, "direction");
});

test("a single click (tap) never completes a stroke", () => {
  const tap = [
    { x: 40, y: 9.9 },
    { x: 40.2, y: 10.1 },
  ];
  const grade = gradeDrawnPolyline(tap, TARGET(), RELAXED);
  assert.equal(grade.pass, false);
  assert.equal(grade.reason, "short");
});

test("a short flick is rejected as short", () => {
  const flick = line({ x: 42, y: 10 }, { x: 48, y: 10 }, 6); // 6 of 80 target length
  const grade = gradeDrawnPolyline(flick, TARGET(), RELAXED);
  assert.equal(grade.pass, false);
  assert.equal(grade.reason, "short");
});

test("a drawing that wanders far off the median is rejected as drift", () => {
  const drawn = [
    ...line({ x: 10, y: 10 }, { x: 10, y: 70 }, 8),
    ...line({ x: 10, y: 70 }, { x: 90, y: 70 }, 16),
    ...line({ x: 90, y: 70 }, { x: 90, y: 10 }, 8),
  ];
  const grade = gradeDrawnPolyline(drawn, TARGET(), RELAXED);
  assert.equal(grade.pass, false);
  assert.equal(grade.reason, "drift");
});

test("covering only the ends of the target fails coverage", () => {
  const drawn = [
    ...line({ x: 10, y: 10 }, { x: 20, y: 10 }, 4),
    { x: 20, y: 10 },
    ...line({ x: 80, y: 10 }, { x: 90, y: 10 }, 4),
  ];
  const grade = gradeDrawnPolyline(drawn, TARGET(), RELAXED);
  assert.equal(grade.pass, false);
  assert.equal(grade.reason, "coverage");
});

test("whole-chain sanity on a real embedded median (海 dot)", () => {
  const d = "M20.38,14.75c3.31,1.47,8.54,6.05,9.37,8.34";
  const target = targetPoints(d, 48);
  const drawn = line({ x: 20.38, y: 14.75 }, { x: 29.75, y: 23.09 }, 24);
  const grade = gradeDrawnPolyline(drawn, target, RELAXED);
  assert.equal(grade.pass, true, JSON.stringify(grade));
  const reversed = line({ x: 29.75, y: 23.09 }, { x: 20.38, y: 14.75 }, 24);
  const rev = gradeDrawnPolyline(reversed, target, RELAXED);
  assert.equal(rev.pass, false);
});