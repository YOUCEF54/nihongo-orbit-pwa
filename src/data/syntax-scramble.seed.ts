/* ============================================================
   Syntax Scramble seed — sentence-building tasks with inline
   Arabic glosses, so no memorized vocabulary is required.
   ============================================================ */

export interface ScramblePart {
  id: string;
  text: string;
  reading: string;
  romaji: string;
  meaningAr: string;
  grammarTypeAr: string;
}

export interface ScrambleTask {
  id: string;
  translationAr: string;
  romaji: string;
  fullJapanese: string;
  parts: ScramblePart[];
  correctOrderIds: string[];
}

export const SYNTAX_SCRAMBLE_TASKS: ScrambleTask[] = [
  {
    id: "s1",
    translationAr: "أنا آكل التفاحة.",
    romaji: "watashi wa ringo o tabemasu",
    fullJapanese: "私はりんごを食べます",
    parts: [
      { id: "p1", text: "私", reading: "わたし", romaji: "watashi", meaningAr: "أنا", grammarTypeAr: "فاعل" },
      { id: "p2", text: "は", reading: "わ", romaji: "wa", meaningAr: "(أداة موضوع)", grammarTypeAr: "أداة موضوع" },
      { id: "p3", text: "りんご", reading: "りんご", romaji: "ringo", meaningAr: "تفاحة", grammarTypeAr: "مفعول به" },
      { id: "p4", text: "を", reading: "お", romaji: "o", meaningAr: "(أداة مفعول)", grammarTypeAr: "أداة مفعول" },
      { id: "p5", text: "食べます", reading: "たべます", romaji: "tabemasu", meaningAr: "آكل", grammarTypeAr: "فعل" },
    ],
    correctOrderIds: ["p1", "p2", "p3", "p4", "p5"],
  },
  {
    id: "s2",
    translationAr: "أذهب إلى المدرسة غداً.",
    romaji: "ashita gakkou ni ikimasu",
    fullJapanese: "明日学校に行きます",
    parts: [
      { id: "p1", text: "明日", reading: "あした", romaji: "ashita", meaningAr: "غداً", grammarTypeAr: "ظرف زمان" },
      { id: "p2", text: "学校", reading: "がっこう", romaji: "gakkou", meaningAr: "مدرسة", grammarTypeAr: "مكان" },
      { id: "p3", text: "に", reading: "に", romaji: "ni", meaningAr: "إلى", grammarTypeAr: "أداة اتجاه" },
      { id: "p4", text: "行きます", reading: "いきます", romaji: "ikimasu", meaningAr: "أذهب", grammarTypeAr: "فعل" },
    ],
    correctOrderIds: ["p1", "p2", "p3", "p4"],
  },
  {
    id: "s3",
    translationAr: "هذا كتابٌ ممتع.",
    romaji: "kore wa omoshiroi hon desu",
    fullJapanese: "これは面白い本です",
    parts: [
      { id: "p1", text: "これ", reading: "これ", romaji: "kore", meaningAr: "هذا", grammarTypeAr: "مبتدأ" },
      { id: "p2", text: "は", reading: "わ", romaji: "wa", meaningAr: "(موضوع)", grammarTypeAr: "أداة موضوع" },
      { id: "p3", text: "面白い", reading: "おもしろい", romaji: "omoshiroi", meaningAr: "ممتع", grammarTypeAr: "صفة" },
      { id: "p4", text: "本", reading: "ほん", romaji: "hon", meaningAr: "كتاب", grammarTypeAr: "خبر (اسم)" },
      { id: "p5", text: "です", reading: "です", romaji: "desu", meaningAr: "(فعل كينونة)", grammarTypeAr: "فعل كينونة" },
    ],
    correctOrderIds: ["p1", "p2", "p3", "p4", "p5"],
  },
  {
    id: "s4",
    translationAr: "أحب القطط.",
    romaji: "neko ga suki desu",
    fullJapanese: "猫が好きです",
    parts: [
      { id: "p1", text: "猫", reading: "ねこ", romaji: "neko", meaningAr: "القطط", grammarTypeAr: "موضوع" },
      { id: "p2", text: "が", reading: "が", romaji: "ga", meaningAr: "(أداة فاعل)", grammarTypeAr: "أداة فاعل" },
      { id: "p3", text: "好き", reading: "すき", romaji: "suki", meaningAr: "أحب", grammarTypeAr: "صفة (شعور)" },
      { id: "p4", text: "です", reading: "です", romaji: "desu", meaningAr: "(للتأدب)", grammarTypeAr: "فعل كينونة" },
    ],
    correctOrderIds: ["p1", "p2", "p3", "p4"],
  },
  {
    id: "s5",
    translationAr: "شربت القهوة في المقهى.",
    romaji: "kafe de koohii o nomimashita",
    fullJapanese: "カフェでコーヒーを飲みました",
    parts: [
      { id: "p1", text: "カフェ", reading: "かふぇ", romaji: "kafe", meaningAr: "المقهى", grammarTypeAr: "مكان" },
      { id: "p2", text: "で", reading: "で", romaji: "de", meaningAr: "في (للمكان)", grammarTypeAr: "أداة مكان" },
      { id: "p3", text: "コーヒー", reading: "こーひー", romaji: "koohii", meaningAr: "القهوة", grammarTypeAr: "مفعول به" },
      { id: "p4", text: "を", reading: "お", romaji: "o", meaningAr: "(أداة مفعول)", grammarTypeAr: "أداة مفعول" },
      { id: "p5", text: "飲みました", reading: "のみました", romaji: "nomimashita", meaningAr: "شربت", grammarTypeAr: "فعل (ماضي)" },
    ],
    correctOrderIds: ["p1", "p2", "p3", "p4", "p5"],
  },
];
