"use client";
/* ============================================================
   Client-side glue for the resonance server actions.
   The Supabase row is authoritative; these helpers keep the local
   mirror (used by useResonance consumers) in step with whatever
   the server just returned.
   ============================================================ */
import { saveResonance } from "./resonance.ts";
import { awardActivityAction, type ResonanceOutcome } from "./resonance-actions.ts";

/** Mirror a successful action onto the local store; failures keep it as-is. */
export function mirrorOutcome(uid: string | undefined, outcome: ResonanceOutcome): ResonanceOutcome {
  if (uid && outcome.ok && outcome.state) saveResonance(uid, outcome.state);
  return outcome;
}

/** Fire-and-forget pass progress for reviews and arcade solves. */
export function awardActivityInBackground(
  uid: string | undefined,
  kind: "review" | "arcade",
  points: number,
): void {
  if (!uid) return;
  void awardActivityAction(kind, points)
    .then((outcome) => mirrorOutcome(uid, outcome))
    .catch(() => {
      // Best-effort: pass progress is not worth blocking the study loop.
    });
}
