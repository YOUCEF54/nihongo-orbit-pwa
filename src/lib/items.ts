/* ============================================================
   Resonance item registry — everything a banner can grant.
   Each item maps to a real effect in the app:
   · theme      → unlocks a terminal theme in ThemeToggle
   · style      → unlocks a study-card finish in StudyCard
   · title      → unlocks an operator badge in the AppShell pill
   · consumable → usable from the terminal inventory
   ============================================================ */
import type { ThemeId } from "./themes.ts";

export type Rarity = 3 | 4 | 5;
export type ItemKind = "theme" | "style" | "consumable" | "title";
export type ItemIconKey = "theme" | "spark" | "shield" | "energy" | "cache" | "dust" | "title";

export type ItemEffect =
  | { type: "energy"; amount: number }
  | { type: "cache"; amount: number }
  /** Dust bundle: converts to shards the moment it is acquired. */
  | { type: "shards"; amount: number };

export interface ItemDef {
  id: string;
  kind: ItemKind;
  rarity: Rarity;
  nameAr: string;
  descAr: string;
  icon: ItemIconKey;
  /** Consumables stack; cosmetics cap at one copy. */
  stackable: boolean;
  effect?: ItemEffect;
  /** theme items only */
  themeId?: ThemeId;
  /** title items only: latin badge code shown in the HUD pill */
  code?: string;
}

export const ITEMS: ItemDef[] = [
  // --- Themes (4★) -------------------------------------------------------
  {
    id: "theme-tactical",
    kind: "theme",
    rarity: 4,
    nameAr: "الوضع التكتيكي",
    descAr: "واجهة السيان الافتراضية للمحطة.",
    icon: "theme",
    stackable: false,
    themeId: "tactical",
  },
  {
    id: "theme-hybrid",
    kind: "theme",
    rarity: 4,
    nameAr: "الوضع الذهبي",
    descAr: "سمة ذهبية دافئة للمحطة.",
    icon: "theme",
    stackable: false,
    themeId: "hybrid",
  },
  {
    id: "theme-minimal",
    kind: "theme",
    rarity: 4,
    nameAr: "وضع الحد الأدنى",
    descAr: "سمة هادئة بأزرق سماوي مطفأ.",
    icon: "theme",
    stackable: false,
    themeId: "minimal",
  },

  // --- Study-card finishes -----------------------------------------------
  {
    id: "style-ember",
    kind: "style",
    rarity: 4,
    nameAr: "نمط الجَمر",
    descAr: "حدود متوهجة بلون الجمر على بطاقات الدراسة.",
    icon: "spark",
    stackable: false,
  },
  {
    id: "style-prism",
    kind: "style",
    rarity: 5,
    nameAr: "نمط المنشور",
    descAr: "قوس طيفي كامل يغمر حافة بطاقات الدراسة.",
    icon: "spark",
    stackable: false,
  },

  // --- Titles -------------------------------------------------------------
  {
    id: "title-explorer",
    kind: "title",
    rarity: 3,
    nameAr: "مستكشف",
    descAr: "اللقب الافتراضي لكل مرافق جديد.",
    icon: "title",
    stackable: false,
    code: "EXP",
  },
  {
    id: "title-letter-lord",
    kind: "title",
    rarity: 4,
    nameAr: "سيد الحروف",
    descAr: "لقب لأرباب الخط والأشكال.",
    icon: "title",
    stackable: false,
    code: "HRF",
  },
  {
    id: "title-signal-ace",
    kind: "title",
    rarity: 4,
    nameAr: "بطل الإشارة",
    descAr: "لقب لصائدي الرنين السريع.",
    icon: "title",
    stackable: false,
    code: "SIG",
  },
  {
    id: "title-orbit-master",
    kind: "title",
    rarity: 5,
    nameAr: "سيد المدار",
    descAr: "أرفع الألقاب في المحطة — لمن دار الفلك كاملًا.",
    icon: "title",
    stackable: false,
    code: "ORB",
  },

  // --- Consumables --------------------------------------------------------
  {
    id: "consumable-energy",
    kind: "consumable",
    rarity: 3,
    nameAr: "شحنة صفاء",
    descAr: "تستعيد ٤٠ نقطة طاقة فور الاستخدام.",
    icon: "energy",
    stackable: true,
    effect: { type: "energy", amount: 40 },
  },
  {
    id: "consumable-cache",
    kind: "consumable",
    rarity: 3,
    nameAr: "صندوق تعافي",
    descAr: "يضيف ١٢ عنصرًا إلى مخزون التعافي.",
    icon: "cache",
    stackable: true,
    effect: { type: "cache", amount: 12 },
  },
  {
    id: "consumable-dust",
    kind: "consumable",
    rarity: 3,
    nameAr: "بذرة رنين",
    descAr: "تتحول إلى ١٥ شظية رنين فور سحبها.",
    icon: "dust",
    stackable: false,
    effect: { type: "shards", amount: 15 },
  },
];

const ITEM_INDEX = new Map(ITEMS.map((item) => [item.id, item]));

export function itemById(id: string): ItemDef | undefined {
  return ITEM_INDEX.get(id);
}

/** Shards granted when a pull repeats an already-owned cosmetic. */
export const DUP_SHARDS: Record<Rarity, number> = { 3: 5, 4: 20, 5: 100 };

export interface ExchangeOffer {
  id: string;
  nameAr: string;
  descAr: string;
  costShards: number;
  grants?: Partial<Record<"passes" | "crystals" | "shards", number>>;
  /** When set, the offer sells a specific item at a fixed rarity. */
  itemId?: string;
}

export const EXCHANGE_OFFERS: ExchangeOffer[] = [
  {
    id: "exchange-pass",
    nameAr: "تذكرة إشارة",
    descAr: "حوّل الشظايا الزائدة إلى تذكرة سحب قياسية.",
    costShards: 40,
    grants: { passes: 1 },
  },
  {
    id: "exchange-crystals",
    nameAr: "بلورات مدار",
    descAr: "حوّل الشظايا إلى ١٠ بلورات مدار.",
    costShards: 60,
    grants: { crystals: 10 },
  },
  {
    id: "exchange-style-ember",
    nameAr: "نمط الجَمر",
    descAr: "اشترِ نمط بطاقة الجمر مباشرة عند عجزه عن السحب.",
    costShards: 120,
    itemId: "style-ember",
  },
];
