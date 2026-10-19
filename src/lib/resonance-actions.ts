"use server";
/* ============================================================
   Resonance server actions — every wallet mutation goes through
   here so the Supabase row is authoritative and the local store is
   only a rendered mirror.

   · pull      → roll gacha.ts locally (one rate source), then let
                 resonance_apply_pull re-validate and apply atomically
   · equip/use/redeem/adopt → thin RPC wrappers
   · earn  (review / arcade / sector) → rate-limited RPCs

   Failures never return a state: the client keeps its current
   mirror instead of overwriting it with an empty starter wallet.
   ============================================================ */
import { createClient } from "@/lib/supabase/server";
import { isThemeId } from "./themes.ts";
import { EXCHANGE_OFFERS } from "./items.ts";
import { bannerById, pityFor, rollPulls, secureRandom, type PullResult } from "./gacha.ts";
import {
  authoritativeResults,
  buildPullPayload,
  mapResonanceError,
  parsePullResults,
  snapshotFromRpcPayload,
  type ResonanceErrorCode,
} from "./resonance-map";
import type { ResonanceState } from "./resonance.ts";

export interface ResonanceOutcome {
  ok: boolean;
  error?: ResonanceErrorCode;
  state?: ResonanceState;
  results?: PullResult[];
  effect?: { type: string; amount: number };
  awarded?: number;
  throttled?: boolean;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function authed(): Promise<{ supabase: Supabase; uid: string } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { supabase, uid: user.id };
  } catch {
    return null;
  }
}

function fail(error: ResonanceErrorCode): ResonanceOutcome {
  return { ok: false, error };
}

async function rpcState(supabase: Supabase, fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false as const, error: mapResonanceError(error.message) };
  const payload = data as Record<string, unknown> | null;
  const state = snapshotFromRpcPayload(payload);
  if (!state) return { ok: false as const, error: "unavailable" as ResonanceErrorCode };
  return { ok: true as const, state, payload };
}

export async function pullAction(bannerId: string, count: number): Promise<ResonanceOutcome> {
  const session = await authed();
  if (!session) return fail("unauthorized");
  const { supabase } = session;

  const banner = bannerById(bannerId);
  if (!banner) return fail("unknown_banner");
  if (!Number.isFinite(count) || count < 1 || count > 10) return fail("invalid_count");
  const pulls = Math.floor(count);

  const current = await rpcState(supabase, "resonance_ensure_wallet", {});
  if (!current.ok) return { ok: false, error: current.error };

  const rolled = rollPulls(current.state, banner, pulls, secureRandom);
  if (!rolled.ok) return { ok: false, error: "insufficient" };

  const pity = pityFor(rolled.state, banner.id);
  const applied = await rpcState(supabase, "resonance_apply_pull", {
    p_banner_id: banner.id,
    p_count: pulls,
    p_results: buildPullPayload(rolled.results),
    p_pity_count: pity.count,
    p_pity_guaranteed: pity.guaranteed,
  });
  if (!applied.ok) return { ok: false, error: applied.error };

  const authoritative = parsePullResults(applied.payload?.results);
  return {
    ok: true,
    state: applied.state,
    results: authoritative ? authoritativeResults(authoritative, rolled.results) : rolled.results,
  };
}

export async function equipTitleAction(itemId: string): Promise<ResonanceOutcome> {
  const session = await authed();
  if (!session) return fail("unauthorized");

  const result = await rpcState(session.supabase, "resonance_equip_title", {
    p_item_id: typeof itemId === "string" ? itemId : "",
  });
  return result.ok ? { ok: true, state: result.state } : { ok: false, error: result.error };
}

export async function consumeItemAction(itemId: string): Promise<ResonanceOutcome> {
  const session = await authed();
  if (!session) return fail("unauthorized");

  const result = await rpcState(session.supabase, "resonance_consume", {
    p_item_id: typeof itemId === "string" ? itemId : "",
  });
  if (!result.ok) return { ok: false, error: result.error };

  const effect = result.payload?.effect as { type: string; amount: number } | undefined;
  return { ok: true, state: result.state, effect };
}

export async function redeemOfferAction(offerId: string): Promise<ResonanceOutcome> {
  const session = await authed();
  if (!session) return fail("unauthorized");
  if (!EXCHANGE_OFFERS.some((offer) => offer.id === offerId)) return fail("unknown_item");

  const result = await rpcState(session.supabase, "resonance_redeem", { p_offer_id: offerId });
  return result.ok ? { ok: true, state: result.state } : { ok: false, error: result.error };
}

export async function adoptThemeAction(themeId: string): Promise<ResonanceOutcome> {
  const session = await authed();
  if (!session) return fail("unauthorized");
  if (!isThemeId(themeId)) return fail("unknown_item");

  const result = await rpcState(session.supabase, "resonance_adopt_theme", {
    p_item_id: `theme-${themeId}`,
  });
  return result.ok ? { ok: true, state: result.state } : { ok: false, error: result.error };
}

export async function awardActivityAction(
  kind: "review" | "arcade",
  points: number,
): Promise<ResonanceOutcome> {
  const session = await authed();
  if (!session) return fail("unauthorized");

  const result = await rpcState(session.supabase, "resonance_award_activity", {
    p_kind: kind,
    p_points: Number.isFinite(points) ? Math.floor(points) : 1,
  });
  if (!result.ok) return { ok: false, error: result.error };

  const awarded = result.payload?.awarded;
  return {
    ok: true,
    state: result.state,
    awarded: typeof awarded === "number" ? awarded : 0,
    throttled: result.payload?.throttled === true,
  };
}

export async function completeSectorAction(sectorId: string): Promise<ResonanceOutcome> {
  const session = await authed();
  if (!session) return fail("unauthorized");
  if (typeof sectorId !== "string" || sectorId.trim().length === 0) return fail("unknown_sector");

  const result = await rpcState(session.supabase, "resonance_complete_sector", {
    p_sector_id: sectorId,
  });
  return result.ok
    ? { ok: true, state: result.state, awarded: result.payload?.awarded === true ? 1 : 0 }
    : { ok: false, error: result.error };
}
