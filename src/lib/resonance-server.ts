/* ============================================================
   Server-side wallet loader — the Phase E source of truth.
   Provisions the wallet if needed and folds the rows into one
   ResonanceState (see resonance-map.ts).

   Returns null when the tables are missing (migration pending) or
   the request is unauthenticated, so callers can fall back to the
   local document instead of crashing.
   ============================================================ */
import { createClient } from "@/lib/supabase/server";
import { snapshotToState } from "./resonance-map";
import type { ResonanceState } from "./resonance.ts";

export async function loadResonanceServer(userId: string): Promise<ResonanceState | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return null;

    const { data, error } = await supabase.rpc("resonance_ensure_wallet");
    if (error) return null;
    return snapshotToState(data);
  } catch {
    return null;
  }
}
