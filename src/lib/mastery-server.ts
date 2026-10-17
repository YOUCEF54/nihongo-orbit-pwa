/* ============================================================
   Server-side mastery loader — reads the user_mastery_states
   table through the auth'd Supabase client, degrading to an
   empty record when the table is missing (migration pending).
   ============================================================ */
import { createClient } from "@/lib/supabase/server";
import { toMasteryRecord } from "./mastery";
import type { UserMasteryState } from "@/types/learning";

interface MasteryRow {
  card_id: string;
  card_type: "kanji" | "vocab";
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: UserMasteryState["state"];
  last_review: string;
}

function rowToMastery(userId: string, row: MasteryRow): UserMasteryState {
  return {
    userId,
    cardId: row.card_id,
    cardType: row.card_type,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review,
  };
}

export async function loadMasteryServer(
  userId: string,
): Promise<Record<string, UserMasteryState>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_mastery_states")
      .select("card_id,card_type,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,state,last_review")
      .eq("user_id", userId);
    if (error) return {};
    return toMasteryRecord(
      (data ?? []).map((row) => rowToMastery(userId, row as unknown as MasteryRow)),
    );
  } catch {
    return {};
  }
}