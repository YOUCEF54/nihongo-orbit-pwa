"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SeedVocabularyItem } from "@/lib/data";
import { playVocabWord, prefetchVocabAudio, type Playback } from "@/lib/japanese-audio";
import { pitchPatternOf } from "@/lib/pitch";
import { EmptyState, ReadingStack } from "@/components/ui";
import { hash, makeRandom, shuffle } from "@/lib/random";

type EchoMode = "beginner" | "advanced";

const ROUNDS = 6;
const COMBO_BONUS = 20;

const MODE_META: Record<EchoMode, { ar: string; descAr: string }> = {
  beginner: {
    ar: "نمط المبتدئ (موصى به)",
    descAr: "يشمل الروماجي والقراءة بالكانا مع تلميح السياق.",
  },
  advanced: {
    ar: "نمط المتقدّم",
    descAr: "الكانا فقط بدون روماجي — اختبار قراءة حقيقي.",
  },
};

interface EchoRound {
  item: SeedVocabularyItem;
  options: string[];
}

function buildRounds(pool: SeedVocabularyItem[], seed: number): EchoRound[] {
  if (pool.length === 0) return [];
  const rand = makeRandom(seed);
  const picks: SeedVocabularyItem[] = [];
  let guard = 0;
  while (picks.length < ROUNDS && guard < ROUNDS * 4) {
    guard += 1;
    for (const item of shuffle(pool, rand)) {
      picks.push(item);
      if (picks.length === ROUNDS) break;
    }
  }
  const meanings = Array.from(new Set(pool.map((item) => item.arabicTranslation)));
  return picks.map((item) => {
    const distractors = shuffle(
      meanings.filter((meaning) => meaning !== item.arabicTranslation),
      rand,
    ).slice(0, 3);
    return {
      item,
      options: shuffle([item.arabicTranslation, ...distractors], rand),
    };
  });
}

export default function EchoLink({
  pool,
  className = "",
}: {
  pool: SeedVocabularyItem[];
  className?: string;
}) {
  const [mode, setMode] = useState<EchoMode>("beginner");
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const playbackRef = useRef<Playback | null>(null);
  const playedKeyRef = useRef<string | null>(null);

  const poolKey = useMemo(() => pool.map((item) => item.id).join(","), [pool]);
  const rounds = useMemo(
    () => (started ? buildRounds(pool, hash(`${poolKey}:${mode}:${session}`)) : []),
    [started, pool, poolKey, mode, session],
  );
  const round = rounds[roundIndex] ?? null;
  const answered = chosen !== null;
  const finished = rounds.length > 0 && roundIndex >= rounds.length;
  const accuracy = rounds.length > 0 ? Math.round((correctCount / rounds.length) * 100) : 0;

  const play = useCallback(
    (rate: number) => {
      const item = round?.item;
      if (!item) return;
      playbackRef.current?.stop();
      playbackRef.current = playVocabWord({
        audioUrl: item.audioUrl,
        reading: item.readingFurigana,
        accent: pitchPatternOf(item),
        rate,
      });
    },
    [round],
  );

  useEffect(() => {
    if (!started || !round) return;
    // Play the prompt once per round. Guarding on a content key keeps the
    // autoplay from re-firing when the `pool` prop (or `round` identity)
    // changes for unrelated reasons — e.g. navigating the dojo carousel.
    const key = `${session}:${roundIndex}:${mode}:${round.item.id}`;
    if (playedKeyRef.current === key) return;
    playedKeyRef.current = key;
    void queueMicrotask(() => play(mode === "advanced" ? 1 : 0.9));
  }, [started, round, mode, session, roundIndex, play]);

  useEffect(() => () => playbackRef.current?.stop(), []);

  // Prefetch the upcoming round's MP3 so advancing feels instant.
  useEffect(() => {
    const upcoming = rounds[roundIndex + 1]?.item;
    if (upcoming?.audioUrl) prefetchVocabAudio(upcoming.audioUrl);
  }, [rounds, roundIndex]);

  const selectMode = (value: EchoMode) => {
    setMode(value);
    setSession((current) => current + 1);
    setRoundIndex(0);
    setChosen(null);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setCorrectCount(0);
    setStarted(true);
  };

  const choose = (meaning: string) => {
    if (answered || !round) return;
    setChosen(meaning);
    if (meaning === round.item.arabicTranslation) {
      const nextCombo = combo + 1;
      setScore((current) => current + 100 + combo * COMBO_BONUS);
      setCombo(nextCombo);
      setBestCombo((current) => Math.max(current, nextCombo));
      setCorrectCount((current) => current + 1);
    } else {
      setCombo(0);
    }
  };

  const next = () => {
    playbackRef.current?.stop();
    setChosen(null);
    setRoundIndex((current) => current + 1);
  };

  if (pool.length === 0) {
    return (
      <div className={["glass-panel rounded-2xl p-4", className].filter(Boolean).join(" ")} dir="rtl">
        <EmptyState descAr="لا توجد كلمات مُراجَعة في هذا القطاع بعد — راجع بطاقات لتظهر هنا." />
      </div>
    );
  }

  if (!started) {
    return (
      <div
        data-testid="echo-link"
        dir="rtl"
        className={[
          "glass-panel flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto rounded-2xl p-6 text-center",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mb-3 flex items-center gap-2 rounded-full border border-amber/25 bg-amber/10 px-4 py-1">
          <span className="h-2 w-2 rounded-full bg-amber" />
          <span className="lang-ar text-xs font-bold text-amber">تحدي الاستماع والمفردات</span>
        </div>
        <h2 className="lang-ar text-2xl font-extrabold text-cream">
          صدى المعاني <span className="telemetry text-amber">「 ECHO LINK 」</span>
        </h2>
        <p className="lang-ar mt-2 max-w-md text-sm leading-relaxed text-muted">
          استمع للكلمة اليابانية، طابق معناها بالعربية، وطوّر حصيلتك اللغوية ونطقك بسرعة.
        </p>

        <div className="mt-6 grid w-full max-w-sm gap-3">
          {(["beginner", "advanced"] as const).map((value) => (
            <button
              key={value}
              type="button"
              data-testid="echo-mode"
              data-mode={value}
              onClick={() => selectMode(value)}
              className={[
                "flex flex-col items-start gap-1 rounded-2xl border p-4 text-start transition active:scale-[0.98]",
                value === "beginner"
                  ? "border-frequency/40 bg-frequency/10 hover:border-frequency/70 hover:bg-frequency/15"
                  : "border-amber/40 bg-amber/10 hover:border-amber/70 hover:bg-amber/15",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={[
                    "lang-ar text-base font-bold",
                    value === "beginner" ? "text-frequency" : "text-amber",
                  ].join(" ")}
                >
                  {MODE_META[value].ar}
                </span>
                <span className="lang-ar text-[10px] text-faint">
                  {value === "beginner" ? "سهل" : "تحدٍّ"}
                </span>
              </div>
              <p className="lang-ar text-xs leading-relaxed text-muted">{MODE_META[value].descAr}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div
        data-testid="echo-link"
        dir="rtl"
        className={[
          "glass-panel flex h-full min-h-0 flex-col items-center justify-center gap-3 overflow-y-auto rounded-2xl p-8 text-center",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="text-4xl" aria-hidden="true">
          🏆
        </span>
        <h3 className="lang-ar text-xl font-bold text-cream">اكتملت الجلسة!</h3>
        <p className="lang-ar text-sm text-muted">أحسنت — طوّرت استماعك ومفرداتك اليوم.</p>
        <div className="my-3 grid w-full max-w-xs grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-void/50 p-4">
            <span className="lang-ar block text-xs text-faint">النتيجة</span>
            <span className="telemetry block text-xl font-extrabold text-amber">{score}</span>
          </div>
          <div className="rounded-2xl border border-line bg-void/50 p-4">
            <span className="lang-ar block text-xs text-faint">الدقة</span>
            <span className="telemetry block text-xl font-extrabold text-frequency">{accuracy}%</span>
          </div>
        </div>
        <p className="lang-ar text-faint">
          أفضل تتابع · {bestCombo}×
        </p>
        <button type="button" data-testid="echo-restart" onClick={() => setStarted(false)} className="btn-cyan mt-3">
          <span className="lang-ar">جلسة جديدة</span>
        </button>
      </div>
    );
  }

  if (!round) return null;

  const item = round.item;

  return (
    <div
      data-testid="echo-link"
      dir="rtl"
      className={[
        "glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <span className="lang-ar telemetry-label">{MODE_META[mode].ar}</span>
        <div className="flex items-center gap-2">
          {combo > 1 && (
            <span className="lang-ar rounded-md border border-amber/40 bg-amber/15 px-2 py-0.5 text-[11px] font-extrabold text-amber">
              {combo}× تسلسل!
            </span>
          )}
          <span className="lang-ar text-muted">
            {roundIndex + 1} / {rounds.length} · النقاط {score}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-void/40 p-5">
          <span className="font-jp text-4xl font-extrabold tracking-wide text-cream sm:text-5xl">
            {item.japaneseText}
          </span>
          {mode === "beginner" && (
            <ReadingStack
              reading={item.readingFurigana}
              romaji={item.romaji}
              className="mt-2 gap-1"
              readingClassName="font-jp text-sm text-muted"
              romajiClassName="telemetry text-xs text-amber"
            />
          )}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" data-testid="echo-listen" onClick={() => play(mode === "advanced" ? 1 : 0.9)} className="btn-telemetry px-5">
              <span className="lang-ar">استمع</span>
            </button>
            <button type="button" data-testid="echo-slow" onClick={() => play(0.65)} className="btn-ghost">
              <span className="lang-ar">بطيء (0.7×)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {round.options.map((meaning) => {
            const isChosen = chosen === meaning;
            const isCorrect = meaning === item.arabicTranslation;
            const reveal = answered && isCorrect;
            return (
              <button
                key={meaning}
                type="button"
                data-testid="echo-option"
                disabled={answered}
                onClick={() => choose(meaning)}
                className={[
                  "flex min-h-[56px] items-center justify-center rounded-xl border px-3 py-2 text-center transition",
                  reveal
                    ? "border-frequency bg-frequency/15 text-cream"
                    : isChosen
                      ? "border-crimson bg-crimson/12 text-cream"
                      : "border-line bg-abyss/40 text-cream hover:bg-white/5",
                  answered ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                <span className="lang-ar text-sm font-bold">{meaning}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-auto flex flex-col gap-2 rounded-2xl border border-line bg-void/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="lang-ar text-sm">
                {chosen === item.arabicTranslation ? (
                  <span className="font-bold text-frequency">إجابة صحيحة! 🎉</span>
                ) : (
                  <span className="font-bold text-crimson">إجابة خاطئة</span>
                )}
                <span className="text-muted">
                  {" "}
                  (المعنى: <span className="font-bold text-amber">{item.arabicTranslation}</span>)
                </span>
              </span>
              <button type="button" data-testid="echo-next" onClick={next} className="btn-cyan flex-none">
                <span className="lang-ar">التالي</span>
              </button>
            </div>
            <div className="rounded-xl border border-amber/15 bg-amber/5 p-2 text-xs text-muted">
              <span className="lang-ar">
                💡 <span className="font-bold text-amber">تلميح السياق:</span> {item.exampleSentenceAr}
              </span>
              <span className="font-jp mt-1 block text-faint" dir="ltr">
                {item.exampleSentenceJp}
              </span>
              <span className="telemetry mt-0.5 block text-[10px] text-cyan/70" dir="ltr">
                {item.exampleSentenceRomaji}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
