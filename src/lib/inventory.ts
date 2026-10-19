/* ============================================================
   Resonance inventory — ownership queries and item use.
   Keeps every cross-module effect in one place so the pull engine
   stays pure and the wallet store stays dumb.
   ============================================================ */
import { grantCache } from "./starlight.ts";
import { grantEnergy } from "./progress-state.ts";
import { EXCHANGE_OFFERS, itemById, type ItemDef, type ItemKind } from "./items.ts";
import {
  readResonanceOrDefault,
  saveResonance,
  spend,
  STARTER_OWNED,
  type ResonanceState,
} from "./resonance.ts";
import type { ThemeId } from "./themes.ts";

export type UseError = "unknown_item" | "not_owned" | "no_effect" | "insufficient" | "owned";

export interface UseOutcome {
  ok: boolean;
  error?: UseError;
  state: ResonanceState;
}

/** Items of one kind the wallet owns, richest first. */
export function ownedOf(state: ResonanceState, kind: ItemKind): ItemDef[] {
  return Object.entries(state.owned)
    .map(([id, count]) => ({ item: itemById(id), count }))
    .filter((entry): entry is { item: ItemDef; count: number } =>
      Boolean(entry.item && entry.item.kind === kind && entry.count > 0),
    )
    .sort((a, b) => b.item.rarity - a.item.rarity || a.item.nameAr.localeCompare(b.item.nameAr))
    .map((entry) => entry.item);
}

export function ownedThemes(state: ResonanceState): ThemeId[] {
  return ownedOf(state, "theme")
    .map((item) => item.themeId)
    .filter((id): id is ThemeId => Boolean(id));
}

/** Rarest owned card finish — applied automatically to study surfaces. */
export function bestOwnedStyle(state: ResonanceState): ItemDef | undefined {
  return ownedOf(state, "style")[0];
}

const STYLE_FINISH: Record<string, "ember" | "prism"> = {
  "style-ember": "ember",
  "style-prism": "prism",
};

/** The card-finish class for the rarest owned style, or null. */
export function styleFinish(state: ResonanceState): "ember" | "prism" | null {
  const best = bestOwnedStyle(state);
  return best ? (STYLE_FINISH[best.id] ?? null) : null;
}

export function equippedTitleDef(state: ResonanceState): ItemDef | undefined {
  const equipped = state.equippedTitle ? itemById(state.equippedTitle) : undefined;
  if (equipped && state.owned[equipped.id]) return equipped;
  return itemById(STARTER_OWNED[1]);
}

/** Equip an owned title; "" clears back to the default badge. */
export function equipTitle(uid: string, itemId: string): UseOutcome {
  const state = readResonanceOrDefault(uid);
  if (itemId !== "") {
    const item = itemById(itemId);
    if (!item || item.kind !== "title") {
      return { ok: false, error: "unknown_item", state };
    }
    if (!state.owned[itemId]) return { ok: false, error: "not_owned", state };
  }
  const next = { ...state, equippedTitle: itemId, updatedAt: Date.now() };
  saveResonance(uid, next);
  return { ok: true, state: next };
}

/** Consume one owned consumable and apply its effect. */
export function consumeItem(uid: string, itemId: string, now = Date.now()): UseOutcome {
  const state = readResonanceOrDefault(uid);
  const item = itemById(itemId);
  if (!item || item.kind !== "consumable") {
    return { ok: false, error: "unknown_item", state };
  }
  if (!item.effect) return { ok: false, error: "no_effect", state };
  if (!state.owned[itemId]) return { ok: false, error: "not_owned", state };

  const owned = { ...state.owned };
  if (owned[itemId] <= 1) delete owned[itemId];
  else owned[itemId] -= 1;

  if (item.effect.type === "energy") grantEnergy(uid, item.effect.amount, now);
  else if (item.effect.type === "cache") grantCache(uid, item.effect.amount, now);

  const next: ResonanceState = { ...state, owned, updatedAt: now };
  if (item.effect.type === "shards") next.shards += item.effect.amount;
  saveResonance(uid, next);
  return { ok: true, state: next };
}

/** Buy an exchange offer with shards; grants currency or the item. */
export function redeemOffer(uid: string, offerId: string, now = Date.now()): UseOutcome {
  const state = readResonanceOrDefault(uid);
  const offer = EXCHANGE_OFFERS.find((entry) => entry.id === offerId);
  if (!offer) return { ok: false, error: "unknown_item", state };
  if (offer.itemId && state.owned[offer.itemId]) {
    return { ok: false, error: "owned", state };
  }
  const paid = spend(state, "shards", offer.costShards);
  if (!paid.ok) return { ok: false, error: "insufficient", state };

  const next: ResonanceState = {
    ...paid.state,
    crystals: paid.state.crystals + (offer.grants?.crystals ?? 0),
    passes: paid.state.passes + (offer.grants?.passes ?? 0),
    shards: paid.state.shards + (offer.grants?.shards ?? 0),
    owned: offer.itemId
      ? { ...paid.state.owned, [offer.itemId]: (paid.state.owned[offer.itemId] ?? 0) + 1 }
      : paid.state.owned,
    updatedAt: now,
  };
  saveResonance(uid, next);
  return { ok: true, state: next };
}
