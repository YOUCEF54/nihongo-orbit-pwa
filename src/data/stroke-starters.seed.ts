/* ============================================================
   Zero-vocabulary stroke starters — simple radicals and 1–4
   stroke characters used for handwriting calibration before the
   learner knows any words. Stroke paths resolve from KanjiVG.
   ============================================================ */

export interface StrokeStarter {
  character: string;
  romaji: string;
  meaningAr: string;
}

export const STROKE_STARTERS: StrokeStarter[] = [
  { character: "一", romaji: "ichi", meaningAr: "واحد" },
  { character: "二", romaji: "ni", meaningAr: "اثنان" },
  { character: "三", romaji: "san", meaningAr: "ثلاثة" },
  { character: "十", romaji: "juu", meaningAr: "عشرة" },
  { character: "人", romaji: "hito", meaningAr: "شخص" },
  { character: "大", romaji: "ookii", meaningAr: "كبير" },
  { character: "口", romaji: "kuchi", meaningAr: "فم" },
  { character: "日", romaji: "hi", meaningAr: "شمس · يوم" },
  { character: "山", romaji: "yama", meaningAr: "جبل" },
  { character: "川", romaji: "kawa", meaningAr: "نهر" },
  { character: "木", romaji: "ki", meaningAr: "شجرة" },
];
