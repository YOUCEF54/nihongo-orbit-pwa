import test from "node:test";
import assert from "node:assert/strict";
import { dist, pathLength, resampleUniform, sampleSvgPath, traceSvgPath } from "./svg-path.ts";

test("straight line M/L samples to both endpoints", () => {
  const pts = sampleSvgPath("M10,20 L90,50", 5);
  assert.equal(pts.length, 5);
  assert.ok(Math.abs(pts[0].x - 10) < 0.01 && Math.abs(pts[0].y - 20) < 0.01);
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last.x - 90) < 0.01 && Math.abs(last.y - 50) < 0.01);
  assert.ok(Math.abs(pathLength(pts) - Math.hypot(80, 30)) < 1e-6);
});

test("relative cubic command resolves to absolute points", () => {
  const pts = traceSvgPath("M0,0 c10,0 20,5 30,15");
  // cubic adds 16 segments; final point is (30,15)
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last.x - 30) < 1e-6 && Math.abs(last.y - 15) < 1e-6);
  assert.ok(pts.length >= 17);
});

test("implicit repeated commands continue the same operator", () => {
  const pts = sampleSvgPath("M5,5 25,25 45,45", 3);
  assert.equal(pts.length, 3);
  assert.deepEqual(pts[1], { x: 25, y: 25 });
  assert.deepEqual(pts[2], { x: 45, y: 45 });
});

test("quadratic and smooth commands (Q/S/T) do not throw and end correctly", () => {
  const q = traceSvgPath("M0,0 Q20,40 40,0");
  assert.ok(Math.abs(q[q.length - 1].x - 40) < 1e-6);
  const s = traceSvgPath("M0,0 C10,10 20,10 30,0 S50,-10 60,0");
  assert.ok(Math.abs(s[s.length - 1].x - 60) < 1e-6 && Math.abs(s[s.length - 1].y) < 1e-6);
  const t = traceSvgPath("M0,0 Q10,10 20,0 T40,0");
  assert.ok(Math.abs(t[t.length - 1].x - 40) < 1e-6);
});

test("close path Z returns to the subpath start", () => {
  const pts = traceSvgPath("M0,0 L10,0 L10,10 Z");
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last.x) < 1e-6 && Math.abs(last.y) < 1e-6);
});

test("horizontal/vertical lines handle signed values", () => {
  const h = traceSvgPath("M5,5 h20");
  assert.deepEqual(h[h.length - 1], { x: 25, y: 5 });
  const v = traceSvgPath("M5,5 v-10");
  assert.deepEqual(v[v.length - 1], { x: 5, y: -5 });
});

test("uniform resampling preserves overall geometry length", () => {
  const dense = traceSvgPath("M0,0 C30,40 70,-20 100,20");
  const denseLen = pathLength(dense);
  const uniform = resampleUniform(dense, 64);
  const uniformLen = pathLength(uniform);
  assert.ok(Math.abs(uniformLen - denseLen) / denseLen < 0.01);
});

test("samples from the embedded seed stroke (海 dot) stay near the authored endpoints", () => {
  // k1-002 first stroke median: M20.38,14.75 c...
  const d = "M20.38,14.75c3.31,1.47,8.54,6.05,9.37,8.34";
  const pts = sampleSvgPath(d, 48);
  assert.equal(pts.length, 48);
  assert.ok(dist(pts[0], { x: 20.38, y: 14.75 }) < 0.01);
  const last = pts[pts.length - 1];
  assert.ok(dist(last, { x: 29.75, y: 23.09 }) < 0.15);
});