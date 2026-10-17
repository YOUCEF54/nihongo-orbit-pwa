"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SeedVocabularyItem } from "@/lib/data";
import { playVocabWord, prefetchVocabAudio, type Playback } from "@/lib/japanese-audio";
import { pitchPatternOf } from "@/lib/pitch";
import { ensureTaikoAudio, playHit, vibrateMiss } from "@/lib/taiko-audio";
import {
  accuracyOf,
  buildBeatmap,
  judgeTap,
  scoreFor,
  DEFAULT_BEAT_MS,
  DEFAULT_LEAD_MS,
  GREAT_WINDOW_MS,
  type TaikoBeatmap,
  type TaikoJudgment,
  type TaikoZone,
} from "@/lib/taiko";
import { hash, makeRandom, shuffle } from "@/lib/random";
import { EmptyState, PauseToggle, PausedOverlay } from "@/components/ui";
import { ARCADE_JADE_REWARD } from "@/lib/progress-state";
import { awardArcadeJade } from "@/lib/starlight";

const ROUNDS = 5;
/** How far ahead (ms) notes are visible before the strike line. */
const VISIBLE_WINDOW_MS = 2400;
/** Strike line position as a % of the lane width (notes flow right → left). */
const STRIKE_PCT = 78;

const JUDGE_META: Record<TaikoJudgment, { ar: string; className: string }> = {
  perfect: { ar: "ممتاز", className: "text-hit" },
  great: { ar: "جيد", className: "text-warn" },
  miss: { ar: "تجاوز", className: "text-danger" },
};

const ZONE_META: Record<TaikoZone, { ar: string; hint: string; glyph: string }> = {
  center: { ar: "مركز", hint: "نغمة عالية", glyph: "●" },
  rim: { ar: "حافة", hint: "نغمة منخفضة", glyph: "◎" },
};

/** Home-row drum keys: F strikes center, J strikes rim. */
const ZONE_KEYS: Record<TaikoZone, string> = { center: "f", rim: "j" };

function pickWords(pool: SeedVocabularyItem[], seed: number): SeedVocabularyItem[] {
  if (pool.length === 0) return [];
  const rand = makeRandom(seed);
  const picks: SeedVocabularyItem[] = [];
  while (picks.length < ROUNDS) {
    for (const item of shuffle(pool, rand)) {
      picks.push(item);
      if (picks.length >= ROUNDS) break;
    }
  }
  return picks;
}

function starsFor(accuracy: number): number {
  if (accuracy >= 95) return 5;
  if (accuracy >= 85) return 4;
  if (accuracy >= 70) return 3;
  if (accuracy >= 50) return 2;
  return 1;
}

const STAGE_LABEL = "تدريب إيقاعي";

export default function MoraTaiko({
  pool,
  className = "",
  onFinish,
  userId,
  seed,
}: {
  pool: SeedVocabularyItem[];
  className?: string;
  onFinish?: (score: number) => void;
  userId?: string;
  seed?: number;
}) {
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [counts, setCounts] = useState<Record<TaikoJudgment, number>>({
    perfect: 0,
    great: 0,
    miss: 0,
  });
  const [flash, setFlash] = useState<{ kind: TaikoJudgment; key: number } | null>(null);
  const [clock, setClock] = useState(0);
  const [jadeAwarded, setJadeAwarded] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const playbackRef = useRef<Playback | null>(null);
  const judgedRef = useRef<Set<number>>(new Set());
  // Render-visible mirror of judgedRef (refs must not be read during render).
  const [judgedList, setJudgedList] = useState<number[]>([]);
  const judgedSet = useMemo(() => new Set(judgedList), [judgedList]);
  const roundStartRef = useRef(0);
  const advanceRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playedKeyRef = useRef<string | null>(null);
  const finishFiredRef = useRef(false);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const flashKeyRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseStartRef = useRef(0);

  const poolKey = useMemo(() => pool.map((item) => item.id).join(","), [pool]);
  const rounds = useMemo(
    () =>
      started
        ? pickWords(pool, hash(`${poolKey}:${session}:${seed ?? "live"}`))
        : [],
    [started, pool, poolKey, session, seed],
  );
  const item = rounds[roundIndex] ?? null;
  const beatmap: TaikoBeatmap | null = useMemo(
    () =>
      item
        ? buildBeatmap(
            {
              id: item.id,
              hiragana: item.hiragana,
              readingFurigana: item.readingFurigana,
              accent_type: item.accent_type,
              accent_nucleus: item.accent_nucleus,
              audioUrl: item.audioUrl,
            },
            DEFAULT_BEAT_MS,
            DEFAULT_LEAD_MS,
          )
        : null,
    [item],
  );
  const finished = rounds.length > 0 && roundIndex >= rounds.length;
  const accuracy = accuracyOf(counts);

  const applyJudgment = useCallback((index: number, judgment: TaikoJudgment) => {
    if (judgedRef.current.has(index)) return;
    judgedRef.current.add(index);
    setJudgedList((current) => (current.includes(index) ? current : [...current, index]));
    if (judgment === "miss") {
      comboRef.current = 0;
      setCombo(0);
      vibrateMiss();
    } else {
      comboRef.current += 1;
      setCombo(comboRef.current);
      setBestCombo((best) => Math.max(best, comboRef.current));
      scoreRef.current += scoreFor(judgment, comboRef.current);
      setScore(scoreRef.current);
      playHit(judgment);
    }
    setCounts((current) => ({ ...current, [judgment]: current[judgment] + 1 }));
    flashKeyRef.current += 1;
    setFlash({ kind: judgment, key: flashKeyRef.current });
  }, []);

  const tapZone = useCallback(
    (zone: TaikoZone) => {
      if (!beatmap || finished || pausedRef.current) return;
      const elapsed = performance.now() - roundStartRef.current;
      let best = -1;
      let bestDelta = Infinity;
      beatmap.notes.forEach((note, index) => {
        if (judgedRef.current.has(index)) return;
        const delta = Math.abs(elapsed - note.timeMs);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = index;
        }
      });
      if (best === -1 || bestDelta > GREAT_WINDOW_MS) return;
      const note = beatmap.notes[best];
      applyJudgment(best, judgeTap(note.timeMs, elapsed, note.zone === zone));
    },
    [beatmap, finished, applyJudgment],
  );

  // Round lifecycle: reset clocks, play the word prompt once, prefetch next.
  // (Ref-only: no setState here. State resets happen in event handlers.)
  useEffect(() => {
    if (!started || !item) return;
    judgedRef.current = new Set();
    advanceRef.current = false;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    roundStartRef.current = performance.now();
    const key = `${session}:${roundIndex}:${item.id}`;
    if (playedKeyRef.current !== key) {
      playedKeyRef.current = key;
      playbackRef.current?.stop();
      playbackRef.current = playVocabWord({
        audioUrl: item.audioUrl,
        reading: item.readingFurigana,
        accent: pitchPatternOf(item),
      });
      const upcoming = rounds[roundIndex + 1];
      if (upcoming?.audioUrl) prefetchVocabAudio(upcoming.audioUrl);
    }
  }, [started, item, roundIndex, session, rounds]);

  // Frame loop: advance the clock, auto-miss lapsed notes, move on when done.
  // Completion (last round → jade + onFinish) runs in the advance timeout,
  // never in an effect body.
  useEffect(() => {
    if (!started || finished || !beatmap) return;
    let raf = 0;
    const tick = () => {
      if (pausedRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = performance.now() - roundStartRef.current;
      beatmap.notes.forEach((note, index) => {
        if (!judgedRef.current.has(index) && elapsed - note.timeMs > GREAT_WINDOW_MS) {
          applyJudgment(index, "miss");
        }
      });
      setClock(elapsed);
      if (judgedRef.current.size >= beatmap.notes.length && !advanceRef.current) {
        advanceRef.current = true;
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          const isLast = roundIndex + 1 >= rounds.length;
          if (isLast && !finishFiredRef.current) {
            finishFiredRef.current = true;
            if (userId) {
              try {
                awardArcadeJade(userId, ARCADE_JADE_REWARD);
                setJadeAwarded(ARCADE_JADE_REWARD);
              } catch {
                // rewards are best-effort
              }
            }
            onFinish?.(scoreRef.current);
          }
          judgedRef.current = new Set();
          setJudgedList([]);
          setRoundIndex((current) => current + 1);
        }, 700);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [started, finished, beatmap, roundIndex, rounds.length, userId, onFinish, applyJudgment]);

  useEffect(
    () => () => {
      playbackRef.current?.stop();
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    [],
  );

  // Keyboard drums: F = center, J = rim (same judgments as tapping).
  useEffect(() => {
    if (!started || finished) return;
    const onKey = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const zone = (Object.keys(ZONE_KEYS) as TaikoZone[]).find(
        (candidate) => ZONE_KEYS[candidate] === key,
      );
      if (!zone) return;
      event.preventDefault();
      tapZone(zone);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, finished, tapZone]);

  const togglePause = useCallback(() => {
    if (pausedRef.current) {
      // Shift the round origin forward by the paused span so the frozen
      // note positions resume exactly where they left off.
      roundStartRef.current += performance.now() - pauseStartRef.current;
      pausedRef.current = false;
      setPaused(false);
    } else {
      pausedRef.current = true;
      pauseStartRef.current = performance.now();
      playbackRef.current?.stop();
      setPaused(true);
    }
  }, []);

  const startSession = () => {
    ensureTaikoAudio();
    pausedRef.current = false;
    setPaused(false);
    comboRef.current = 0;
    scoreRef.current = 0;
    finishFiredRef.current = false;
    playedKeyRef.current = null;
    judgedRef.current = new Set();
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setJudgedList([]);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setCounts({ perfect: 0, great: 0, miss: 0 });
    setFlash(null);
    setJadeAwarded(null);
    setRoundIndex(0);
    setSession((current) => current + 1);
    setStarted(true);
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
        data-testid="mora-taiko"
        dir="rtl"
        className={[
          "glass-panel flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto rounded-2xl p-6 text-center",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mb-3 flex items-center gap-2 rounded-full border border-frequency/25 bg-frequency/10 px-4 py-1">
          <span className="h-2 w-2 rounded-full bg-frequency" />
          <span className="lang-ar text-xs font-bold text-frequency">تحدي الإيقاع والنبرة</span>
        </div>
        <h2 className="lang-ar text-2xl font-extrabold text-cream">
          طبل المورا <span className="telemetry text-frequency">「 MORA TAIKO 」</span>
        </h2>
        <p className="lang-ar mt-2 max-w-md text-sm leading-relaxed text-muted">
          استمع للكلمة، ثم اضرب المركز للنغمة العالية والحافة للنغمة المنخفضة لحظة عبور كل مورا — باللمس أو بمفتاحي
          F و J.
        </p>
        <div className="mt-5 grid w-full max-w-sm gap-2 text-start">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-void/50 px-4 py-2.5">
            <span className="font-jp text-xl text-frequency" dir="ltr">
              ●
            </span>
            <span className="lang-ar text-sm text-cream">
              المركز — <span className="font-bold text-frequency">نغمة عالية</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-void/50 px-4 py-2.5">
            <span className="font-jp text-xl text-amber" dir="ltr">
              ◎
            </span>
            <span className="lang-ar text-sm text-cream">
              الحافة — <span className="font-bold text-amber">نغمة منخفضة</span>
            </span>
          </div>
        </div>
        <button type="button" data-testid="taiko-start" onClick={startSession} className="btn-cyan mt-6">
          <span className="lang-ar">ابدأ الجولة</span>
        </button>
      </div>
    );
  }

  if (finished) {
    const stars = starsFor(accuracy);
    return (
      <div
        data-testid="mora-taiko"
        dir="rtl"
        className={[
          "glass-panel flex h-full min-h-0 flex-col items-center justify-center gap-3 overflow-y-auto rounded-2xl p-8 text-center",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 className="lang-ar text-xl font-bold text-cream">تم الانتهاء!</h2>
        <p className="lang-ar text-sm text-muted">
          نقاطك: <span className="telemetry text-xl font-extrabold text-amber">{score}</span>{" "}
          <span aria-hidden="true">{"★".repeat(stars)}</span>
        </p>
        <p className="lang-ar text-sm text-muted">
          دقة الأداء: <span className="telemetry font-extrabold text-frequency">{accuracy}%</span>
        </p>
        <p className="lang-ar text-sm text-muted" role="status">
          ممتاز: {counts.perfect} · جيد: {counts.great} · تجاوز: {counts.miss}
        </p>
        <p className="lang-ar text-faint">
          أفضل تتابع · {bestCombo}×
        </p>
        {jadeAwarded !== null && (
          <p className="lang-ar text-amber">
            +{jadeAwarded} يشم
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" data-testid="taiko-restart" onClick={startSession} className="btn-cyan">
            <span className="lang-ar">جلسة جديدة</span>
          </button>
          {onFinish && (
            <button
              type="button"
              data-testid="taiko-continue"
              onClick={() => onFinish(scoreRef.current)}
              className="btn-ghost"
            >
              <span className="lang-ar">مواصلة</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!beatmap || !item) return null;

  const span = 100 - STRIKE_PCT;
  const visibleNotes = beatmap.notes
    .map((note, index) => ({ note, index }))
    .filter(({ note, index }) => {
      const left = STRIKE_PCT + ((note.timeMs - clock) / VISIBLE_WINDOW_MS) * span;
      return left > -8 && left < 102 && !judgedSet.has(index);
    });

  return (
    <div
      data-testid="mora-taiko"
      dir="rtl"
      className={[
        "glass-panel relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <span className="lang-ar telemetry-label">طبل المورا · {STAGE_LABEL}</span>
        <div className="flex items-center gap-3" aria-live="off">
          <span className="lang-ar text-muted">
            {roundIndex + 1} / {rounds.length} · النقاط {score}
          </span>
          <span className="lang-ar text-xs font-bold text-amber">سلسلة {combo}×</span>
          <span className="telemetry text-frequency" dir="ltr">
            {accuracy}%
          </span>
          <PauseToggle paused={paused} onToggle={togglePause} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <div className="relative h-40 shrink-0 overflow-hidden rounded-2xl border border-line bg-void/40" dir="ltr">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-cyan/60"
            style={{ left: `${STRIKE_PCT}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 aspect-square w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber/25"
            style={{ left: `${STRIKE_PCT}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 aspect-square w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-frequency/30"
            style={{ left: `${STRIKE_PCT}%` }}
          />
          {visibleNotes.map(({ note, index }) => {
            const left = STRIKE_PCT + ((note.timeMs - clock) / VISIBLE_WINDOW_MS) * span;
            return (
              <span
                key={`${roundIndex}-${index}`}
                data-testid="taiko-note"
                data-zone={note.zone}
                className={[
                  "font-jp absolute top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-xl text-cream",
                  note.zone === "center"
                    ? "border-frequency/60 bg-frequency/10"
                    : "border-amber/60 bg-amber/10",
                ].join(" ")}
                style={{ left: `${left}%` }}
              >
                {note.mora}
              </span>
            );
          })}
          {flash && (
            <span
              key={flash.key}
              aria-hidden="true"
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${JUDGE_META[flash.kind].className}`}
              style={{ left: `${STRIKE_PCT}%` }}
            >
              <span className="animate-strike block aspect-square w-16 rounded-full border-2 border-current" />
            </span>
          )}
          {flash && (
            <span key={`t-${flash.key}`} className={`lang-ar absolute top-2 text-sm font-extrabold ${JUDGE_META[flash.kind].className}`} style={{ left: `${STRIKE_PCT}%`, transform: "translateX(-50%)" }}>
              {JUDGE_META[flash.kind].ar}
            </span>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2" dir="rtl">
          {(["center", "rim"] as const).map((zone) => (
            <button
              key={zone}
              type="button"
              data-testid={`taiko-zone-${zone}`}
              onClick={() => tapZone(zone)}
              aria-label={`${ZONE_META[zone].ar} — ${ZONE_META[zone].hint} (مفتاح ${ZONE_KEYS[zone].toUpperCase()})`}
              className={[
                "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2 transition active:scale-[0.98]",
                zone === "center"
                  ? "border-frequency/50 bg-frequency/10 hover:bg-frequency/15"
                  : "border-amber/50 bg-amber/10 hover:bg-amber/15",
              ].join(" ")}
            >
              <span
                className={zone === "center" ? "text-xl text-frequency" : "text-xl text-amber"}
                dir="ltr"
                aria-hidden="true"
              >
                {ZONE_META[zone].glyph}
              </span>
              <span className="lang-ar text-sm font-bold text-cream">
                {ZONE_META[zone].ar} · {ZONE_META[zone].hint}
              </span>
              <kbd
                aria-hidden="true"
                className="telemetry rounded border border-line bg-void/60 px-1.5 text-faint"
                dir="ltr"
              >
                {ZONE_KEYS[zone].toUpperCase()}
              </kbd>
            </button>
          ))}
        </div>
      </div>

      <PausedOverlay show={paused} onResume={togglePause} />
    </div>
  );
}
