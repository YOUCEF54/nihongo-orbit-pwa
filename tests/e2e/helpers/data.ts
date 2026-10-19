/* Service-role REST helpers so specs can arrange server state directly
   (wallet rows, mastery rows) and assert the authoritative outcome. */
import { DUP_SHARDS } from "../../../src/lib/items.ts";
import type { Rarity } from "../../../src/lib/items.ts";
import { adminHeaders } from "./auth";
import { SUPABASE_URL } from "./env";

const REST = `${SUPABASE_URL}/rest/v1`;

async function request<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...adminHeaders(), ...(init.headers as Record<string, string>) };
  if (init.prefer) headers.Prefer = init.prefer;
  const response = await fetch(`${REST}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export interface WalletRow {
  crystals: number;
  passes: number;
  shards: number;
  pass_progress: number;
  equipped_title: string;
}

export interface PullRow {
  rarity: Rarity;
  item_id: string;
  dup: boolean;
  shards: number;
}

export async function seedWallet(
  userId: string,
  wallet: Partial<WalletRow>,
): Promise<void> {
  await request("/resonance_wallets?on_conflict=user_id", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, ...wallet }),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function readWallet(userId: string): Promise<WalletRow> {
  const rows = await request<WalletRow[]>(
    `/resonance_wallets?user_id=eq.${userId}&select=crystals,passes,shards,pass_progress,equipped_title`,
  );
  if (!rows || rows.length === 0) throw new Error("wallet row missing");
  return rows[0];
}

export async function grantOwned(
  userId: string,
  items: Record<string, number>,
): Promise<void> {
  const rows = Object.entries(items).map(([item_id, count]) => ({ user_id: userId, item_id, count }));
  await request("/resonance_owned?on_conflict=user_id,item_id", {
    method: "POST",
    body: JSON.stringify(rows),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function readOwned(userId: string): Promise<Record<string, number>> {
  const rows = await request<Array<{ item_id: string; count: number }>>(
    `/resonance_owned?user_id=eq.${userId}&select=item_id,count`,
  );
  return Object.fromEntries((rows ?? []).map((row) => [row.item_id, row.count]));
}

export async function readPity(
  userId: string,
  bannerId = "standard",
): Promise<{ count: number; guaranteed: boolean }> {
  const rows = await request<Array<{ count: number; guaranteed: boolean }>>(
    `/resonance_pity?user_id=eq.${userId}&banner_id=eq.${bannerId}&select=count,guaranteed`,
  );
  return rows?.[0] ?? { count: 0, guaranteed: false };
}

export async function readPulls(userId: string): Promise<PullRow[]> {
  return (
    (await request<PullRow[]>(
      `/resonance_pulls?user_id=eq.${userId}&select=rarity,item_id,dup,shards&order=id.desc`,
    )) ?? []
  );
}

export async function readSectorAwards(userId: string): Promise<string[]> {
  const rows = await request<Array<{ sector_id: string }>>(
    `/resonance_sector_awards?user_id=eq.${userId}&select=sector_id`,
  );
  return (rows ?? []).map((row) => row.sector_id);
}

/** Recompute the shard balance the pull log implies (excluding exchange). */
export function expectedShardsFromPulls(initialShards: number, pulls: PullRow[]): number {
  let total = initialShards;
  for (const pull of pulls) {
    if (pull.dup) total += DUP_SHARDS[pull.rarity];
    else if (pull.item_id === "consumable-dust") total += 15;
  }
  return total;
}

export interface MasteryRow {
  card_id: string;
  card_type: "kanji" | "vocab";
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: "New" | "Learning" | "Review" | "Relearning";
  last_review: string;
}

export async function seedMastery(userId: string, rows: MasteryRow[]): Promise<void> {
  await request("/user_mastery_states?on_conflict=user_id,card_id", {
    method: "POST",
    body: JSON.stringify(rows.map((row) => ({ user_id: userId, ...row }))),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}
