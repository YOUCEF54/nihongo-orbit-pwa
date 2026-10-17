/* ============================================================
   Dojo carousel step registry — one fullscreen activity per
   step. Step 0 is the sector map (mission hub); selecting a
   sector jumps to Step 1. Terminal `#hash` shortcuts resolve
   to step indexes (no scroll anchors in carousel mode).
   ============================================================ */

export const DOJO_STEP_IDS = [
  "map",
  "strokes",
  "scramble",
  "review",
  "pitch",
  "matrix",
  "listen",
  "assemble",
  "grammar",
  "taiko",
] as const;

export type DojoStepId = (typeof DOJO_STEP_IDS)[number];

export interface DojoStepMeta {
  id: DojoStepId;
  titleAr: string;
}

export const DOJO_STEPS: DojoStepMeta[] = [
  { id: "map", titleAr: "خريطة القطاعات" },
  { id: "strokes", titleAr: "معايرة مسارات الكتابة" },
  { id: "scramble", titleAr: "قطار الجمل" },
  { id: "review", titleAr: "المراجعة الإيقاعية" },
  { id: "pitch", titleAr: "صدى المعاني" },
  { id: "matrix", titleAr: "سلسلة سكتات الكانجي" },
  { id: "listen", titleAr: "سباق السرعة الصوتي" },
  { id: "assemble", titleAr: "تركيب الجملة اليابانية" },
  { id: "grammar", titleAr: "مرجع الإعراب" },
  { id: "taiko", titleAr: "طبل المورا" },
];

export const DOJO_STEP_COUNT = DOJO_STEPS.length;

/** Terminal `#hash` shortcuts → carousel step index. */
export const DOJO_HASH_TO_STEP: Record<string, number> = Object.fromEntries(
  DOJO_STEPS.map((step, index) => [step.id, index]),
);

export function stepIndexForHash(hash: string): number | null {
  const key = hash.startsWith("#") ? hash.slice(1) : hash;
  const index = DOJO_HASH_TO_STEP[key];
  return typeof index === "number" ? index : null;
}
