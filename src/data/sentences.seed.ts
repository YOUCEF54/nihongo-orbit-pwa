/* ============================================================
   SOV Sentence Assembly — curated slot breakdowns for seed
   sentences. Each slot carries the Japanese chunk (with its
   particle), the Arabic I'rab case label, and its position in
   canonical SOV order. Learners assemble chunks in SOV order
   while the Arabic case labels map particles to native syntax
   intuition (حروف الأداء ↔ حروف الإعراب).
   ============================================================ */
import type { SentenceSlot } from "@/types/learning";

function slot(
  jp: string,
  chunk: string,
  particle: string | undefined,
  caseAr: string,
  caseEn: SentenceSlot["caseEn"],
  position: number,
): SentenceSlot {
  return { jp, romaji: SLOT_ROMAJI[jp] ?? chunk, chunk, particle, caseAr, caseEn, position };
}

/** Per-chunk readings (chunk + particle) so every chip is readable. */
const SLOT_ROMAJI: Record<string, string> = {
  "学校へ": "gakkou e",
  "先生に": "sensei ni",
  "鉛筆で": "enpitsu de",
  "水を": "mizu o",
  "海に": "umi ni",
  "花を": "hana o",
  "川を": "kawa o",
  "山に": "yama ni",
  "雨が": "ame ga",
  "ご飯を": "gohan o",
  "電車で": "densha de",
  "空が": "sora ga",
  "星が": "hoshi ga",
  "本を": "hon o",
  "日本に": "nihon ni",
  "日本語を": "nihongo o",
  "私は": "watashi wa",
  "高い山に": "takai yama ni",
  "家へ": "ie e",
  "人が": "hito ga",
  "音楽を": "ongaku o",
  "音楽が": "ongaku ga",
  "海が": "umi ga",
  "魚を": "sakana o",
  "肉を": "niku o",
  "野菜を": "yasai o",
  "町が": "machi ga",
  "家に": "ie ni",
  "天気が": "tenki ga",
  "行きます": "ikimasu",
  "聞きます": "kikimasu",
  "書きます": "kakimasu",
  "飲みます": "nomimasu",
  "見ます": "mimasu",
  "渡ります": "watarimasu",
  "登ります": "noborimasu",
  "降ります": "furimasu",
  "食べます": "tabemasu",
  "青いです": "aoi desu",
  "光ります": "hikarimasu",
  "読みます": "yomimasu",
  "住んでいます": "sunde imasu",
  "勉強します": "benkyou shimasu",
  "学生です": "gakusei desu",
  "来ます": "kimasu",
  "好きです": "suki desu",
  "買います": "kaimasu",
  "美しいです": "utsukushii desu",
  "います": "imasu",
  "いいですね": "ii desu ne",
};

// Role shorthands for readability when authoring.
const OBJECT = (jp: string, chunk: string, position: number): SentenceSlot =>
  slot(jp, chunk, "を", "المفعول به", "object", position);
const SUBJECT = (jp: string, chunk: string, position: number): SentenceSlot =>
  slot(jp, chunk, "が", "الفاعل", "subject", position);
const TOPIC = (jp: string, chunk: string, position: number): SentenceSlot =>
  slot(jp, chunk, "は", "المبتدأ", "subject", position);
const GOAL = (jp: string, chunk: string, particle: "に" | "へ" | "で", position: number): SentenceSlot =>
  slot(jp, chunk, particle, "حرف الجر", "goal", position);
const VERB = (jp: string, position: number): SentenceSlot =>
  slot(jp, jp, undefined, "الفعل", "verb", position);
const PREDICATE = (jp: string, position: number): SentenceSlot =>
  slot(jp, jp, undefined, "الخبر", "predicate", position);

export const SENTENCE_SLOTS: Record<string, SentenceSlot[]> = {
  // ---- Sector 0 ----
  "v0-008": [GOAL("学校へ", "学校", "へ", 0), VERB("行きます", 1)],
  "v0-009": [GOAL("先生に", "先生", "に", 0), VERB("聞きます", 1)],
  "v0-010": [GOAL("鉛筆で", "鉛筆", "で", 0), VERB("書きます", 1)],

  // ---- Sector 1 ----
  "v1-001": [OBJECT("水を", "水", 0), VERB("飲みます", 1)],
  "v1-002": [GOAL("海に", "海", "に", 0), VERB("行きます", 1)],
  "v1-003": [OBJECT("花を", "花", 0), VERB("見ます", 1)],
  "v1-004": [OBJECT("川を", "川", 0), VERB("渡ります", 1)],
  "v1-005": [GOAL("山に", "山", "に", 0), VERB("登ります", 1)],
  "v1-006": [SUBJECT("雨が", "雨", 0), VERB("降ります", 1)],
  "v1-007": [OBJECT("ご飯を", "ご飯", 0), VERB("食べます", 1)],
  "v1-008": [GOAL("電車で", "電車", "で", 0), VERB("行きます", 1)],
  "v1-009": [SUBJECT("空が", "空", 0), PREDICATE("青いです", 1)],
  "v1-010": [SUBJECT("星が", "星", 0), VERB("光ります", 1)],
  "v1-011": [OBJECT("本を", "本", 0), VERB("読みます", 1)],
  "v1-012": [GOAL("日本に", "日本", "に", 0), VERB("住んでいます", 1)],
  "v1-013": [OBJECT("日本語を", "日本語", 0), VERB("勉強します", 1)],
  "v1-014": [TOPIC("私は", "私", 0), PREDICATE("学生です", 1)],
  "v1-017": [GOAL("高い山に", "高い山", "に", 0), VERB("登ります", 1)],
  "v1-018": [GOAL("家へ", "家", "へ", 0), VERB("行きます", 1)],
  "v1-019": [SUBJECT("人が", "人", 0), VERB("来ます", 1)],
  "v1-020": [OBJECT("花を", "花", 0), VERB("見ます", 1)],
  "v1-021": [OBJECT("音楽を", "音楽", 0), VERB("聞きます", 1)],
  "v1-022": [SUBJECT("音楽が", "音楽", 0), PREDICATE("好きです", 1)],
  "v1-023": [SUBJECT("海が", "海", 0), PREDICATE("好きです", 1)],
  "v1-024": [OBJECT("魚を", "魚", 0), VERB("食べます", 1)],
  "v1-025": [OBJECT("肉を", "肉", 0), VERB("食べます", 1)],
  "v1-026": [OBJECT("野菜を", "野菜", 0), VERB("買います", 1)],
  "v1-027": [OBJECT("本を", "本", 0), VERB("買います", 1)],
  "v1-028": [SUBJECT("町が", "町", 0), PREDICATE("美しいです", 1)],
  "v1-029": [GOAL("家に", "家", "に", 0), VERB("います", 1)],
  "v1-030": [SUBJECT("天気が", "天気", 0), PREDICATE("いいですね", 1)],
};

export function slotsFor(vocabId: string): SentenceSlot[] | null {
  return SENTENCE_SLOTS[vocabId] ?? null;
}
