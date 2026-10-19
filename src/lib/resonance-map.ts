/* ============================================================
   Resonance wire format — the boundary between the Supabase
   wallet (snake_case rows, one JSON snapshot per RPC) and the
   ResonanceState document the UI already knows.

   Everything here is pure so it can be unit-tested without a
   database; resonance-server.ts and resonance-actions.ts only
   move these values across the wire.
   ============================================================ */
import { normalizeResonance, type PityState, type PullRecord, type ResonanceState } from "./resonance.ts";
import type { PullResult } from "./gacha.ts";

/** Shape returned by the resonance_* RPCs (see 0026 migration). */
export interface ResonanceSnapshot {
  wallet: {
    crystals: number;
    passes: number;
    shards: number;
    pass_progress: number;
    equipped_title: string;
  } | null;
  owned: Record<string, number>;
  pity: Record<string, PityState>;
  history: PullRecord[];
}

export type ResonanceErrorCode =
  | "unauthorized"
  | "unknown_banner"
  | "unknown_item"
  | "unknown_kind"
  | "unknown_sector"
  | "invalid_count"
  | "invalid_results"
  | "item_not_in_pool"
  | "pity_violation"
  | "guarantee_violation"
  | "insufficient"
  | "not_owned"
  | "owned"
  | "no_effect"
  | "unavailable"
  | "unknown";

const KNOWN_ERRORS: readonly ResonanceErrorCode[] = [
  "unauthorized",
  "unknown_banner",
  "unknown_item",
  "unknown_kind",
  "unknown_sector",
  "invalid_count",
  "invalid_results",
  "item_not_in_pool",
  "pity_violation",
  "guarantee_violation",
  "insufficient",
  "not_owned",
  "owned",
  "no_effect",
  "unavailable",
];

/** PostgREST surfaces plpgsql `raise exception 'code'` as error.message. */
export function mapResonanceError(message: string | null | undefined): ResonanceErrorCode {
  if (!message) return "unknown";
  const direct = KNOWN_ERRORS.find((code) => message.includes(code));
  return direct ?? "unknown";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Parse an untrusted RPC snapshot into a ResonanceState, or null. */
export function snapshotToState(value: unknown): ResonanceState | null {
  if (!isObject(value)) return null;
  const wallet = value.wallet;
  if (!isObject(wallet)) return null;
  return normalizeResonance({
    version: 1,
    crystals: wallet.crystals,
    passes: wallet.passes,
    shards: wallet.shards,
    passProgress: wallet.pass_progress,
    equippedTitle: wallet.equipped_title,
    pity: value.pity,
    owned: value.owned,
    history: value.history,
    updatedAt: Date.now(),
  });
}

/**
 * Some RPCs return the snapshot directly; the mutating ones wrap it as
 * `{ ...meta, state: snapshot }` (results/effect/awarded). Accept both.
 */
export function snapshotFromRpcPayload(value: unknown): ResonanceState | null {
  if (!isObject(value)) return null;
  if (isObject(value.wallet)) return snapshotToState(value);
  return snapshotToState(value.state);
}

/** Rolled pulls → the `p_results` argument of resonance_apply_pull. */
export function buildPullPayload(results: PullResult[]): Array<{
  id: string;
  rarity: number;
  isFeatured: boolean;
  wasGuarantee: boolean;
}> {
  return results.map((result) => ({
    id: result.itemId,
    rarity: result.rarity,
    isFeatured: result.isFeatured,
    wasGuarantee: result.wasGuarantee,
  }));
}

/** Parse the authoritative per-pull results returned by apply_pull. */
export function parsePullResults(value: unknown): PullResult[] | null {
  if (!Array.isArray(value)) return null;
  const results: PullResult[] = [];
  for (const entry of value) {
    if (!isObject(entry)) return null;
    const rarity = entry.rarity;
    const itemId = entry.itemId;
    if (typeof itemId !== "string" || (rarity !== 3 && rarity !== 4 && rarity !== 5)) return null;
    results.push({
      itemId,
      rarity,
      isFeatured: entry.isFeatured === true,
      dup: entry.dup === true,
      shards: typeof entry.shards === "number" ? entry.shards : 0,
      wasGuarantee: entry.wasGuarantee === true,
    });
  }
  return results;
}

/**
 * The server recomputes dup/shard payouts; when it disagrees with the
 * local roll the server wins, so the reveal matches the wallet.
 */
export function authoritativeResults(
  authoritative: PullResult[],
  rolled: PullResult[],
): PullResult[] {
  return authoritative.length === rolled.length ? authoritative : rolled;
}
