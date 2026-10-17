/* ============================================================
   Gamification engine — pure TypeScript, no side effects.
   · Mental Clarity Energy Pool
   · Modified SM-2 with cross-script cognitive penalty
   · Streak Protection Engine (Rest-Day Buffers)
   ============================================================ */

export const ENERGY_MAX = 180;
export const ENERGY_REGEN_MS = 8 * 60 * 1000;
export const MAX_REST_BUFFERS = 3;
export const BUFFER_EARN_STREAK = 7;

export interface EnergyState {
  value: number;
  updatedAt: number;
}

export function initEnergy(value = ENERGY_MAX, now = Date.now()): EnergyState {
  return { value: clamp(value, 0, ENERGY_MAX), updatedAt: now };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function regenEnergy(state: EnergyState, now = Date.now()): EnergyState {
  if (state.value >= ENERGY_MAX) return { value: ENERGY_MAX, updatedAt: now };
  const elapsed = Math.max(0, now - state.updatedAt);
  const gained = Math.floor(elapsed / ENERGY_REGEN_MS);
  if (gained <= 0) return state;
  const value = Math.min(ENERGY_MAX, state.value + gained);
  const applied = value - state.value;
  return { value, updatedAt: state.updatedAt + applied * ENERGY_REGEN_MS };
}

export function spendEnergy(
  state: EnergyState,
  amount: number,
  now = Date.now(),
): { state: EnergyState; ok: boolean } {
  const current = regenEnergy(state, now);
  if (amount < 0 || current.value < amount) return { state: current, ok: false };
  return { state: { value: current.value - amount, updatedAt: current.updatedAt }, ok: true };
}

export function msUntilNextEnergy(state: EnergyState, now = Date.now()): number {
  if (state.value >= ENERGY_MAX) return 0;
  const current = regenEnergy(state, now);
  if (current.value >= ENERGY_MAX) return 0;
  const elapsed = Math.max(0, now - current.updatedAt);
  return ENERGY_REGEN_MS - (elapsed % ENERGY_REGEN_MS);
}

export const REVIEW_GRADES = [0, 1, 2, 3] as const;
export type ReviewGrade = (typeof REVIEW_GRADES)[number];

export type ScriptType = "kanji" | "kana";

export const CROSS_SCRIPT_PENALTY: Record<ScriptType, number> = {
  kanji: 0.85,
  kana: 1.0,
};

export function crossScriptPenalty(script: ScriptType): number {
  return CROSS_SCRIPT_PENALTY[script];
}

export interface SrsCardState {
  ease: number;
  interval: number;
  repetitions: number;
}

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;

const GRADE_QUALITY: Record<ReviewGrade, number> = { 0: 1, 1: 3, 2: 4, 3: 5 };

export function initSrsCard(): SrsCardState {
  return { ease: DEFAULT_EASE, interval: 0, repetitions: 0 };
}

export function scheduleReview(
  card: SrsCardState,
  grade: ReviewGrade,
  script: ScriptType,
): SrsCardState {
  const mu = crossScriptPenalty(script);
  const q = GRADE_QUALITY[grade];
  const ease = Math.max(
    MIN_EASE,
    card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  let repetitions: number;
  let interval: number;

  if (grade === 0) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = card.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(card.interval * ease);
  }

  interval = Math.max(1, Math.round(interval * mu));
  return { ease, interval, repetitions };
}

export type GradeToken = "crimson" | "hazard" | "cyan" | "amethyst";

export interface GradeMeta {
  grade: ReviewGrade;
  ar: string;
  token: GradeToken;
}

export const GRADE_META: GradeMeta[] = [
  { grade: 0, ar: "لم أتذكّر", token: "crimson" },
  { grade: 1, ar: "صعب", token: "hazard" },
  { grade: 2, ar: "جيد", token: "cyan" },
  { grade: 3, ar: "سهل", token: "amethyst" },
];

export function formatInterval(days: number): string {
  if (days <= 0) return "الآن";
  if (days === 1) return "غدًا";
  if (days < 30) return `بعد ${days} يومًا`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "بعد شهر" : `بعد ${months} أشهر`;
  const years = Math.round(days / 365);
  return years === 1 ? "بعد سنة" : `بعد ${years} سنوات`;
}

export interface StreakState {
  current: number;
  longest: number;
  buffers: number;
  lastActiveDate: string | null;
}

export function initStreak(): StreakState {
  return { current: 0, longest: 0, buffers: 0, lastActiveDate: null };
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export interface StreakResult {
  state: StreakState;
  usedBuffer: boolean;
  broken: boolean;
}

export function recordActivity(
  state: StreakState,
  todayKey: string,
): StreakResult {
  if (state.lastActiveDate === null) {
    return {
      state: { ...state, current: 1, longest: Math.max(state.longest, 1), lastActiveDate: todayKey },
      usedBuffer: false,
      broken: false,
    };
  }

  const gap = daysBetween(state.lastActiveDate, todayKey);

  if (gap <= 0) {
    return { state, usedBuffer: false, broken: false };
  }

  if (gap === 1) {
    return {
      state: grantIfEarned({ ...state, current: state.current + 1, longest: Math.max(state.longest, state.current + 1), lastActiveDate: todayKey }),
      usedBuffer: false,
      broken: false,
    };
  }

  const missed = gap - 1;
  const covered = Math.min(state.buffers, missed);
  const broken = covered < missed;

  if (broken) {
    return {
      state: { ...state, current: 1, longest: Math.max(state.longest, 1), buffers: state.buffers - covered, lastActiveDate: todayKey },
      usedBuffer: covered > 0,
      broken: true,
    };
  }

  return {
    state: grantIfEarned({
      ...state,
      current: state.current + 1,
      longest: Math.max(state.longest, state.current + 1),
      buffers: state.buffers - covered,
      lastActiveDate: todayKey,
    }),
    usedBuffer: covered > 0,
    broken: false,
  };
}

function grantIfEarned(state: StreakState): StreakState {
  if (state.current > 0 && state.current % BUFFER_EARN_STREAK === 0) {
    return { ...state, buffers: Math.min(MAX_REST_BUFFERS, state.buffers + 1) };
  }
  return state;
}
