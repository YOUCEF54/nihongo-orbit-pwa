"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMounted } from "@/lib/use-mounted";
import {
  GRADE_META,
  formatInterval,
  type GradeToken,
  type ReviewGrade,
  type ScriptType,
} from "@/lib/gamification";
import { createFsrsCard, dueInDays, scheduleFsrs, type Card } from "@/lib/fsrs";
import { playVocabWord, type Playback } from "@/lib/japanese-audio";
import PitchContour from "@/components/games/PitchContour";
import { IconVolume } from "@/components/icons";
import { PITCH_LEGEND_AR, getPitchAccentPattern } from "@/lib/pitch";
import type { AccentType } from "@/types/learning";
import ReadingStack from "./ReadingStack";

export interface FlashcardSentence {
  jp: string;
  reading?: string;
  romaji?: string;
  ar: string;
}

export interface FlashcardData {
  word: string;
  reading?: string;
  romaji?: string;
  meaningAr: string;
  meaningEn?: string;
  hiragana?: string;
  accentType?: AccentType;
  accentNucleus?: number;
  audioUrl?: string | null;
  breakdown?: { label: string; value: string }[];
  sentence?: FlashcardSentence;
  script: ScriptType;
  srs?: Card;
}

interface SRFlashcardProps {
  data: FlashcardData;
  onGrade?: (grade: ReviewGrade, next: Card) => void;
  className?: string;
}

const TOKEN_CLASS: Record<GradeToken, string> = {
  crimson: "border-crimson text-crimson hover:bg-crimson/12",
  hazard: "border-hazard text-hazard hover:bg-hazard/12",
  cyan: "border-cyan text-cyan hover:bg-cyan/12",
  amethyst: "border-amethyst text-amethyst hover:bg-amethyst/12",
};

function Ruby({ base, reading }: { base: string; reading?: string }) {
  if (!reading) return <>{base}</>;
  return (
    <ruby className="ruby-jp">
      {base}
      <rt>{reading}</rt>
    </ruby>
  );
}

export default function SRFlashcard({ data, onGrade, className }: SRFlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const mounted = useMounted();
  const playbackRef = useRef<Playback | null>(null);
  // FSRS scheduling runs only when the card identity changes, not per render.
  const srsCard = useMemo(() => data.srs ?? createFsrsCard(), [data.srs]);

  const speakWord = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      const hiragana = data.hiragana ?? data.reading ?? data.word;
      const { pattern } = getPitchAccentPattern(
        hiragana,
        data.accentType ?? "heiban",
        data.accentNucleus ?? 0,
      );
      playbackRef.current?.stop();
      playbackRef.current = playVocabWord({
        audioUrl: data.audioUrl,
        reading: data.reading ?? data.word,
        accent: pattern,
      });
    },
    [data],
  );

  const grade = (value: ReviewGrade) => {
    const next = scheduleFsrs(srsCard, value);
    onGrade?.(value, next);
    setFlipped(false);
  };

  return (
    <div
      className={["relative flex h-full min-h-0 flex-col [perspective:1400px]", className]
        .filter(Boolean)
        .join(" ")}
      dir="ltr"
    >
      {/* Listen control lives outside the flippable card so assistive tech
          never sees a button nested inside the card's role="button". */}
      {!flipped && (
        <button
          type="button"
          onClick={speakWord}
          aria-label="استمع إلى نطق الكلمة"
          title="استمع إلى النطق"
          className="absolute end-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-cyan/40 bg-void/70 text-cyan shadow-[0_0_12px_rgba(0,240,255,0.18)] transition hover:border-cyan/70 hover:bg-cyan/15 focus-visible:border-cyan focus-visible:outline-none"
        >
          <IconVolume className="h-4 w-4" />
        </button>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        onClick={() => setFlipped((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setFlipped((v) => !v);
          }
        }}
        className="relative min-h-[200px] w-full flex-1 cursor-pointer select-none transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front — target */}
        <div
          dir="ltr"
          className="glass-panel absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-2xl p-7"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="hud-pill absolute start-5 top-5">
            <span className="lang-ar telemetry-label">الهدف</span>
            <span className="font-mono text-cyan">{data.script === "kanji" ? "漢" : "あ"}</span>
          </span>
          <div className="flex flex-col items-center gap-3">
            {data.reading ? (
              <ReadingStack
                reading={data.reading}
                romaji={data.romaji}
                className="gap-1"
                readingClassName="font-jp-sub text-lg text-cyan/80"
                romajiClassName="telemetry tracking-[0.28em] text-muted"
              />
            ) : data.romaji ? (
              <span className="telemetry tracking-[0.28em] text-muted">{data.romaji}</span>
            ) : null}
            <span className="font-jp text-8xl leading-none text-cream drop-shadow-[var(--glow-cyan)]">
              {data.word}
            </span>
          </div>
          <span className="lang-ar absolute bottom-5 text-xs text-faint">اضغط للكشف</span>
        </div>

        {/* Back — meaning */}
        <div
          dir="rtl"
          lang="ar"
          className="lang-ar glass-panel absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-2xl p-5"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-jp text-4xl text-cream">{data.word}</span>
          </div>

          <p className="text-xl font-bold text-cyan">{data.meaningAr}</p>

          {(data.hiragana ?? data.reading) && (
            <div>
              <PitchContour
                hiragana={data.hiragana ?? data.reading ?? data.word}
                accentType={data.accentType ?? "heiban"}
                accentNucleus={data.accentNucleus ?? 0}
              />
              <p className="lang-ar mt-1 text-[11px] text-faint">{PITCH_LEGEND_AR}</p>
            </div>
          )}

          {data.breakdown && data.breakdown.length > 0 && (
            <ul className="flex flex-col gap-2">
              {data.breakdown.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-line bg-void/40 px-3 py-2 text-sm"
                >
                  <span className="text-muted">{item.label}</span>
                  <span className="font-jp text-cream">{item.value}</span>
                </li>
              ))}
            </ul>
          )}

          {data.sentence && (
            <div className="rounded-xl border border-line bg-void/40 p-3 text-sm">
              <p className="mb-1 text-cream" dir="ltr">
                <Ruby base={data.sentence.jp} reading={data.sentence.reading} />
              </p>
              {data.sentence.romaji && (
                <p className="telemetry mb-1 text-[11px] text-cyan/70" dir="ltr">
                  {data.sentence.romaji}
                </p>
              )}
              <p className="text-muted">{data.sentence.ar}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grade deck */}
      <div className="mt-4 flex flex-col gap-2" dir="rtl" lang="ar">
        <span className="telemetry-label lang-ar text-faint">جدولة المراجعة · FSRS</span>
        <div className="flex gap-2">
          {GRADE_META.map((meta) => {
            const preview = scheduleFsrs(srsCard, meta.grade);
            return (
              <button
                key={meta.grade}
                type="button"
                onClick={() => grade(meta.grade)}
                className={[
                  "flex flex-1 flex-col items-center gap-1 rounded-xl border bg-void/50 px-2 py-3 transition",
                  TOKEN_CLASS[meta.token],
                ].join(" ")}
              >
                <span className="text-sm font-bold">{meta.ar}</span>
                <span className="telemetry text-[10px] opacity-80">
                  {mounted ? formatInterval(dueInDays(preview)) : "· · ·"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}



