import type { Sector, SectorId } from "@/types/curriculum";

export const SECTORS: Sector[] = [
  {
    id: "sector-0",
    order: 0,
    jlpt: "Pre-N5",
    titleAr: "ساحل الكانا",
    taglineAr: "المرفأ الأول — الكانا ومخارج الصوت",
    targetKanji: 0,
    targetVocab: 200,
    focusAr: "ضبط المقاطع الصوتية ونقاء الحركات والكتابة بالخطّين",
    themeAr: "رصيف الانطلاق · حبر الفضاء",
    accent: "cyan",
  },
  {
    id: "sector-1",
    order: 1,
    jlpt: "N5",
    titleAr: "سهول الجمل",
    taglineAr: "أساس الجملة وحروف الأداء (は/が/を/に)",
    targetKanji: 100,
    targetVocab: 800,
    focusAr: "تركيب الجملة SOV وحروف الأداء (は/が/を/に)",
    themeAr: "زجاج الصقيع الجليدي · سماوي",
    accent: "frequency",
  },
  {
    id: "sector-2",
    order: 2,
    jlpt: "N4",
    titleAr: "مدى الأفعال",
    taglineAr: "الصيغ وعائلات الجذور المعنوية",
    targetKanji: 300,
    targetVocab: 1500,
    focusAr: "تصريف الأفعال (صيغة التيه) وعائلات الجذور المعنوية",
    themeAr: "المرتفعات الذهبية · زخارف ذهبية",
    accent: "gold",
  },
  {
    id: "sector-3",
    order: 3,
    jlpt: "N3",
    titleAr: "سديم المركّبات",
    taglineAr: "الكانجي المركّب وحروف التأثير",
    targetKanji: 650,
    targetVocab: 3700,
    focusAr: "الكانجي المركّب (جوكوغو) وحروف التعبير الانفعالي",
    themeAr: "سديم بنفسجي · هولوغرام",
    accent: "amethyst",
  },
  {
    id: "sector-4",
    order: 4,
    jlpt: "N2",
    titleAr: "حزام النغمة",
    taglineAr: "مطبّ القواعد — التردد والتنغيم",
    targetKanji: 1000,
    targetVocab: 6000,
    focusAr: "قواعد دقيقة وضبط طبقة الصوت (بِتش أكسنت)",
    themeAr: "واجهة التردد التشغيلي · موجة",
    accent: "frequency",
  },
  {
    id: "sector-5",
    order: 5,
    jlpt: "N1",
    titleAr: "عمق الكلاسيكيات",
    taglineAr: "الأدب والفصوص الكلاسيكية",
    targetKanji: 2136,
    targetVocab: 10000,
    focusAr: "الأدب المتقدّم وشذرات النصوص الكلاسيكية",
    themeAr: "سبج العدم ورقائق الذهب الخالص",
    accent: "void",
  },
];

const SECTOR_BY_ID: Record<SectorId, Sector> = Object.fromEntries(
  SECTORS.map((sector) => [sector.id, sector]),
) as Record<SectorId, Sector>;

export function sectorById(id: SectorId): Sector {
  return SECTOR_BY_ID[id];
}