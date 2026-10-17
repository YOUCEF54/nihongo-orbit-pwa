"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SeedVocabularyItem } from "@/lib/data";
import type { PitchState } from "@/types/learning";
import { playVocabWord, prefetchVocabAudio, type Playback } from "@/lib/japanese-audio";
import { getPitchAccentPattern, pitchLabel, pitchPatternOf } from "@/lib/pitch";
import { EmptyState } from "@/components/ui";

export type ListeningMode = "meaning" | "kanji" | "pitch";

interface ListeningLabProps {
  pool: SeedVocabularyItem[];
  className?: string;
  onFinish?: (score: number) => void;
}

interface Option {
  key: string;
  correct: boolean;
  text?: string;
  pattern?: PitchState[];
  morae?: string[];
}

const ROUNDS = 8;
const HAS_KANJI = /[\u4e00-\u9fff]/;

const MODE_META: Record<ListeningMode, { ar: string; question: string }> = {
  meaning: { ar: "استمع واختر المعنى", question: "ما معنى الكلمة التي سمعتها؟" },
  kanji: { ar: "استمع واختر الكانجي", question: "أي كتابة كانجي تطابق ما سمعته؟" },
  pitch: { ar: "استمع واختر النبرة", question: "أي نمط نبري طابق النطق؟" },
};

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function makeRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(input: T[], rand: () => number): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRounds(pool: SeedVocabularyItem[], seed: number): SeedVocabularyItem[] {
  if (pool.length === 0) return [];
  const rand = makeRandom(seed);
  const rounds: SeedVocabularyItem[] = [];
  while (rounds.length < ROUNDS) {
    const batch = shuffle(pool, rand);
    for (const item of batch) {
      rounds.push(item);
      if (rounds.length === ROUNDS) break;
    }
  }
  return rounds;
}

function patternKey(pattern: PitchState[]): string {
  return pattern.join("");
}

function buildOptions(
  mode: ListeningMode,
  answer: SeedVocabularyItem,
  pool: SeedVocabularyItem[],
): Option[] {
  const rand = makeRandom(hash(`${mode}:${answer.id}:${pool.length}`));

  if (mode === "meaning") {
    const distractors = shuffle(pool.filter((item) => item.id !== answer.id), rand).slice(0, 3);
    const items = [answer, ...distractors];
    return shuffle(
      items.map((item) => ({
        key: item.id,
        correct: item.id === answer.id,
        text: item.arabicTranslation,
      })),
      rand,
    );
  }

  if (mode === "kanji") {
    const kanjiPool = pool.filter((item) => HAS_KANJI.test(item.japaneseText));
    const distractors = shuffle(kanjiPool.filter((item) => item.id !== answer.id), rand).slice(0, 3);
    const items = [answer, ...distractors];
    return shuffle(
      items.map((item) => ({
        key: item.id,
        correct: item.id === answer.id,
        text: item.japaneseText,
      })),
      rand,
    );
  }

  const seen = new Set([patternKey(pitchPatternOf(answer))]);
  const distractors: SeedVocabularyItem[] = [];
  for (const item of shuffle(pool, rand)) {
    const key = patternKey(pitchPatternOf(item));
    if (item.id === answer.id || seen.has(key)) continue;
    seen.add(key);
    distractors.push(item);
    if (distractors.length === 3) break;
  }
  const items = [answer, ...distractors];
  return shuffle(
    items.map((item) => {
      const { morae, pattern } = getPitchAccentPattern(
        item.hiragana ?? item.readingFurigana,
        item.accent_type,
        item.accent_nucleus,
      );
      return { key: item.id, correct: item.id === answer.id, pattern, morae };
    }),
    rand,
  );
}

function OptionBody({ mode, option }: { mode: ListeningMode; option: Option }) {
  if (mode === "pitch" && option.pattern) {
    return (
      <span className="flex items-center justify-center gap-2" dir="ltr">
        {(option.morae ?? []).map((mora, index) => {
          const high = option.pattern?.[index] === "H";
          const label = pitchLabel(high ? "H" : "L");
          return (
            <span key={`${mora}-${index}`} className="flex flex-col items-center">
              <span className="font-jp text-2xl">{mora}</span>
              <span
                className={[
                  "telemetry text-[10px]",
                  high ? "text-frequency" : "text-muted",
                ].join(" ")}
              >
                {label.arrow} {label.ar}
              </span>
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span className={mode === "kanji" ? "font-jp text-2xl" : "lang-ar text-sm font-bold"}>
      {option.text}
    </span>
  );
}

function ListeningQuiz({
  mode,
  pool,
  rate,
  onFinish,
}: {
  mode: ListeningMode;
  pool: SeedVocabularyItem[];
  rate: number;
  onFinish?: (score: number) => void;
}) {
  const [session, setSession] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const unlocked = useRef(false);
  const playbackRef = useRef<Playback | null>(null);

  const poolKey = pool.map((item) => item.id).join(",");
  const rounds = useMemo(
    () => pickRounds(pool, hash(`${poolKey}:${mode}:${session}`)),
    [pool, poolKey, mode, session],
  );

  const answer = rounds[roundIndex] ?? null;
  const options = useMemo(
    () => (answer ? buildOptions(mode, answer, pool) : []),
    [answer, mode, pool],
  );
  const answered = chosen !== null;
  const finished = rounds.length > 0 && roundIndex >= rounds.length;

  const play = useCallback(() => {
    if (!answer) return;
    playbackRef.current?.stop();
    playbackRef.current = playVocabWord({
      audioUrl: answer.audioUrl,
      reading: answer.readingFurigana,
      accent: pitchPatternOf(answer),
      rate,
    });
  }, [answer, rate]);

  useEffect(() => {
    if (!answer) return;
    if (unlocked.current) void queueMicrotask(() => play());
  }, [answer, play]);

  // Prefetch the upcoming round's MP3 so advancing feels instant.
  useEffect(() => {
    const upcoming = rounds[roundIndex + 1];
    if (upcoming?.audioUrl) prefetchVocabAudio(upcoming.audioUrl);
  }, [rounds, roundIndex]);

  const choose = (option: Option) => {
    if (answered) return;
    unlocked.current = true;
    setChosen(option.key);
    if (option.correct) setScore((value) => value + 1);
  };

  const next = () => {
    unlocked.current = true;
    if (roundIndex + 1 >= rounds.length) onFinish?.(score);
    setChosen(null);
    setRoundIndex((value) => value + 1);
  };

  const restart = () => {
    setSession((value) => value + 1);
    setRoundIndex(0);
    setChosen(null);
    setScore(0);
    playbackRef.current?.stop();
  };

  if (pool.length === 0) {
    return <EmptyState descAr="لا توجد مفردات في هذا القطاع بعد." />;
  }

  if (finished) {
    const pct = Math.round((score / rounds.length) * 100);
    return (
      <div className="glass-panel rounded-2xl p-8 text-center" dir="rtl">
        <p className="lang-ar text-lg font-bold text-cream">
          انتهت الجلسة — نتيجتك {score} / {rounds.length}
        </p>
        <p className="lang-ar mt-2 text-amber">
          الدقة · {pct}%
        </p>
        <button type="button" onClick={restart} className="btn-cyan mt-5">
          <span className="lang-ar">جلسة جديدة</span>
        </button>
      </div>
    );
  }

  return (
    <div data-testid="listening-quiz" className="glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-4" dir="rtl">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-2 text-xs">
        <span className="lang-ar telemetry-label">{MODE_META[mode].ar}</span>
        <span className="lang-ar text-muted">
          {roundIndex + 1} / {rounds.length} · النقاط {score}
        </span>
      </div>

      <div className="mb-2 flex flex-col items-center gap-2">
        <p className="lang-ar text-sm text-muted">{MODE_META[mode].question}</p>
        <button type="button" onClick={play} className="btn-telemetry px-8 py-3">
          <span className="lang-ar">استمع</span>
        </button>
        <button
          type="button"
          onClick={play}
          className="lang-ar text-xs text-faint underline decoration-dotted underline-offset-4 hover:text-cyan"
        >
          أعد الاستماع
        </button>
      </div>

      <div className="grid min-h-0 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isChosen = chosen === option.key;
          const reveal = answered && option.correct;
          return (
            <button
              key={option.key}
              type="button"
              data-testid="listening-option"
              disabled={answered}
              onClick={() => choose(option)}
              className={[
                "flex min-h-[56px] items-center justify-center rounded-xl border px-4 py-2 text-center transition",
                reveal
                  ? "border-frequency bg-frequency/15 text-cream"
                  : isChosen
                    ? "border-crimson bg-crimson/12 text-cream"
                    : "border-line bg-abyss/40 text-cream hover:bg-white/5",
                answered ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <OptionBody mode={mode} option={option} />
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-auto flex items-center justify-between pt-2" dir="rtl">
          <p className="lang-ar text-sm text-muted">
            {chosen === options.find((option) => option.correct)?.key
              ? "أحسنت — إجابة صحيحة."
              : "ليست الصحيحة — تابع للتالي."}
          </p>
          <button type="button" data-testid="listening-next" onClick={next} className="btn-cyan">
            <span className="lang-ar">التالي</span>
          </button>
        </div>
      )}
    </div>
  );
}

const SPRINT_RATES = [0.75, 1, 1.25, 1.5] as const;

export default function ListeningLab({ pool, className = "", onFinish }: ListeningLabProps) {
  const [rate, setRate] = useState<number>(1);
  const kanjiPool = useMemo(() => pool.filter((item) => HAS_KANJI.test(item.japaneseText)), [pool]);
  const modes = useMemo<ListeningMode[]>(() => {
    const list: ListeningMode[] = ["meaning", "pitch"];
    if (kanjiPool.length >= 2) list.splice(1, 0, "kanji");
    return list;
  }, [kanjiPool.length]);

  const [mode, setMode] = useState<ListeningMode>("meaning");

  return (
    <div className={["flex h-full min-h-0 flex-col", className].filter(Boolean).join(" ")}>
      <div className="mb-2 flex flex-wrap items-center gap-2" dir="rtl">
        <span className="lang-ar text-[11px] text-muted">سرعة التشغيل</span>
        {SPRINT_RATES.map((value) => (
          <button
            key={value}
            type="button"
            data-testid="sprint-rate"
            onClick={() => setRate(value)}
            aria-pressed={rate === value}
            className={[
              "chip transition",
              rate === value ? "is-cyan" : "",
            ].join(" ")}
          >
            <span className="telemetry" dir="ltr">
              {value}×
            </span>
          </button>
        ))}
      </div>
      <div className="mb-2 flex flex-wrap gap-2" dir="rtl">
        {modes.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={[
              "rounded-lg border px-4 py-2 text-sm transition",
              mode === value
                ? "border-frequency/60 bg-frequency/15 text-cream"
                : "border-line bg-abyss/40 text-faint hover:bg-white/5",
            ].join(" ")}
          >
            <span className="lang-ar">{MODE_META[value].ar}</span>
          </button>
        ))}
      </div>
      <ListeningQuiz key={mode} mode={mode} pool={pool} rate={rate} onFinish={onFinish} />
    </div>
  );
}
