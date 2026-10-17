/* ============================================================
   Stroke-order grader — decides whether a user-drawn polyline
   reproduces a KanjiVG median stroke. Works in the 0–109
   viewBox coordinate space of the rendered matrix.
   ============================================================ */
import { dist, nearestDist, pathLength, sampleSvgPath, type SvgPoint } from "./svg-path.ts";

export interface StrokeGradeOptions {
  /** Max distance between the drawn start/end and the target start/end. */
  endTolerance?: number;
  /** Max distance a target sample may sit from the nearest drawn point. */
  passRadius?: number;
  /** Fraction of target samples that must be within passRadius. */
  minCoverage?: number;
  /** Mean distance from drawn points back to the target path (scribble guard). */
  maxDeviation?: number;
  /** Min drawn length as a fraction of the target length (tap guard). */
  minLengthRatio?: number;
}

export type StrokeFailReason = "short" | "direction" | "drift" | "coverage" | "ok";

export interface StrokeGrade {
  pass: boolean;
  score: number;
  reason: StrokeFailReason;
}

export const STROKE_GRADE_DEFAULTS: Required<StrokeGradeOptions> = {
  endTolerance: 18,
  passRadius: 9,
  minCoverage: 0.55,
  maxDeviation: 10,
  minLengthRatio: 0.25,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function gradeDrawnPolyline(
  drawn: SvgPoint[],
  target: SvgPoint[],
  options: StrokeGradeOptions = {},
): StrokeGrade {
  const opts = { ...STROKE_GRADE_DEFAULTS, ...options };

  if (drawn.length < 3) return { pass: false, score: 0, reason: "short" };

  const targetLength = pathLength(target);
  if (targetLength <= 0) return { pass: false, score: 0, reason: "short" };

  // Tap / flick guard — a click moves too little and can never count as a stroke.
  if (pathLength(drawn) < targetLength * opts.minLengthRatio) {
    return { pass: false, score: 0, reason: "short" };
  }

  // Direction — the user must start near the authored start and finish near its end.
  // Tolerance scales with stroke length so short strokes aren't trivially reversible.
  const endTol = Math.min(opts.endTolerance, targetLength * 0.4);
  const startDist = dist(drawn[0], target[0]);
  const endDist = dist(drawn[drawn.length - 1], target[target.length - 1]);
  if (startDist > endTol || endDist > endTol) {
    return { pass: false, score: 0, reason: "direction" };
  }

  // Scribble guard — how far the drawn line wanders off the target.
  let deviationSum = 0;
  for (const point of drawn) deviationSum += nearestDist(point, target);
  const deviation = deviationSum / drawn.length;
  if (deviation > opts.maxDeviation) {
    return { pass: false, score: 0, reason: "drift" };
  }

  // Coverage — how much of the target the drawn stroke actually reproduces.
  let covered = 0;
  for (const point of target) {
    if (nearestDist(point, drawn) <= opts.passRadius) covered += 1;
  }
  const coverage = covered / target.length;
  if (coverage < opts.minCoverage) {
    return { pass: false, score: 0, reason: "coverage" };
  }

  const ends =
    0.5 * (1 - clamp(startDist / endTol, 0, 1)) +
    0.5 * (1 - clamp(endDist / endTol, 0, 1));
  const score = clamp(
    Math.round(
      100 *
        (0.55 * coverage +
          0.25 * (1 - clamp(deviation / opts.maxDeviation, 0, 1)) +
          0.2 * ends),
    ),
    0,
    100,
  );
  return { pass: true, score, reason: "ok" };
}

/** Convenience: sample a stroke's `d` into the grading point cloud. */
export function targetPoints(d: string, samples = 48): SvgPoint[] {
  return sampleSvgPath(d, samples);
}