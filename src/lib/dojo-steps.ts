/* ============================================================
   Dojo carousel step registry — one fullscreen activity per
   step. Step 0 is the sector map (mission hub); selecting a
   sector jumps to Step 1. Terminal `#hash` shortcuts resolve
   to step indexes (no scroll anchors in carousel mode).

   Each activity step renders an inline "brief" (desc/how-to)
   with a launch button; the activity itself only mounts once
   the user launches it.
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

/** Icon key resolved to a component by the UI (keeps this registry pure). */
export type DojoStepIcon =
  | "orbit"
  | "spark"
  | "archive"
  | "wave"
  | "trophy"
  | "volume"
  | "chart"
  | "bolt";

export interface DojoStepMeta {
  id: DojoStepId;
  titleAr: string;
  /** One-line summary of what the activity trains. */
  descAr: string;
  /** Short usage instructions shown on the pre-launch brief. */
  howToAr: string;
  /** Label for the brief's primary launch button. */
  ctaAr: string;
  icon: DojoStepIcon;
}

export const DOJO_STEPS: DojoStepMeta[] = [
  {
    id: "map",
    titleAr: "خريطة القطاعات",
    descAr: "حملاتك الميدانية موزّعة على قطاعات — اختر قطاعًا ثم ابدأ تدريباته.",
    howToAr: "اضغط على قطاع لبدء حملته والانتقال إلى أول تدريب.",
    ctaAr: "ابدأ الحملة",
    icon: "orbit",
  },
  {
    id: "strokes",
    titleAr: "معايرة مسارات الكتابة",
    descAr: "تدريب على رسم سكتات الكانجي بترتيبها الصحيح لتثبيت الشكل الحركي للحرف.",
    howToAr: "تتبّع المسار المضيء لكل سكتة بالترتيب، والانحراف البسيط لا يُعاقَب.",
    ctaAr: "ابدأ الكتابة",
    icon: "spark",
  },
  {
    id: "scramble",
    titleAr: "قطار الجمل",
    descAr: "رتّب الكلمات لبناء جملة يابانية صحيحة المعنى والترتيب.",
    howToAr: "اختر مبتدئًا أو متقدمًا، ثم رتّب الكلمات: فاعل ← مفعول ← فعل.",
    ctaAr: "ابدأ الترتيب",
    icon: "orbit",
  },
  {
    id: "review",
    titleAr: "المراجعة الإيقاعية",
    descAr: "راجع بطاقات مفردات القطاع وفق جدول FSRS وقيّم مدى تذكّرك.",
    howToAr: "اقرأ البطاقة واكشف معناها ثم اختر تقييمك: لم أتذكّر، صعب، جيد، سهل.",
    ctaAr: "ابدأ المراجعة",
    icon: "archive",
  },
  {
    id: "pitch",
    titleAr: "صدى المعاني",
    descAr: "استمع إلى الكلمة اليابانية واختر معناها العربي الصحيح.",
    howToAr: "تُشغَّل الكلمة تلقائيًا عند بدء الجولة؛ اختر المعنى الصحيح لتزيد نقاطك.",
    ctaAr: "ابدأ الاستماع",
    icon: "wave",
  },
  {
    id: "matrix",
    titleAr: "سلسلة سكتات الكانجي",
    descAr: "تتبّع سكتات كانجي مختار بالترتيب لتثبيت شكله الذهني.",
    howToAr: "اختر كانجي من الشريط ثم تتبّع كل سكتة بالترتيب.",
    ctaAr: "ابدأ التتبّع",
    icon: "trophy",
  },
  {
    id: "listen",
    titleAr: "سباق السرعة الصوتي",
    descAr: "ترفع سرعة معالجة السمع وربط الكلمة المسموعة بمعناها.",
    howToAr: "اختر سرعة التشغيل والنمط، ثم اختر الترجمة قبل نهاية الموجة.",
    ctaAr: "ابدأ السباق",
    icon: "volume",
  },
  {
    id: "assemble",
    titleAr: "تركيب الجملة اليابانية",
    descAr: "تركيب الجملة بربط الأدوار النحوية بترتيب الفاعل والمفعول والفعل.",
    howToAr: "اسحب الكتل إلى الخانات النحوية ثم اضغط تحقّق.",
    ctaAr: "ابدأ التركيب",
    icon: "chart",
  },
  {
    id: "grammar",
    titleAr: "مرجع الإعراب",
    descAr: "مرجع متقدّم لأدوات الجملة وربطها بالإعراب العربي.",
    howToAr: "تصفّح المدخلات المرجعية — للقراءة والاستئناس لا للتقييم.",
    ctaAr: "افتح المرجع",
    icon: "archive",
  },
  {
    id: "taiko",
    titleAr: "طبل المورا",
    descAr: "تثبيت إيقاع المورا (المقاطع والشدة والمد) بالضرب على الطبل.",
    howToAr: "اضرب مركز الطبل للنغمة العالية والحافة للمنخفضة مع الإيقاع.",
    ctaAr: "ابدأ الإيقاع",
    icon: "bolt",
  },
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
