"use client";

import { useSyncExternalStore } from "react";
import {
  initResonance,
  snapshotResonance,
  subscribeResonance,
  type ResonanceState,
} from "./resonance.ts";

/** Live wallet subscription — re-renders on every saveResonance commit. */
export function useResonance(uid: string | undefined): ResonanceState {
  return useSyncExternalStore(
    (listener) => (uid ? subscribeResonance(uid, listener) : () => {}),
    () => (uid ? snapshotResonance(uid) : EMPTY),
    () => EMPTY,
  );
}

const EMPTY: ResonanceState = initResonance();
