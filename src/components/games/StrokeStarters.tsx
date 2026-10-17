"use client";

import { useMemo, useState } from "react";
import { STROKE_STARTERS } from "@/data/stroke-starters.seed";
import { useKanjivgStrokes, type StrokeSource } from "@/lib/use-kanji-strokes";
import KanjiMatrix from "./KanjiMatrix";

export default function StrokeStarters({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const sources: StrokeSource[] = useMemo(
    () =>
      STROKE_STARTERS.map((starter) => ({
        id: `starter-${starter.character}`,
        character: starter.character,
      })),
    [],
  );
  const { slots, retry } = useKanjivgStrokes(sources);

  const current = STROKE_STARTERS[index];
  const slot = slots[`starter-${current.character}`] ?? { status: "loading" as const };

  return (
    <div data-testid="stroke-starters" className={["flex h-full min-h-0 flex-col", className].filter(Boolean).join(" ")}>
      <div className="mb-2 flex flex-wrap gap-2" dir="rtl">
        {STROKE_STARTERS.map((starter, i) => {
          const active = i === index;
          return (
            <button
              key={starter.character}
              type="button"
              data-testid="stroke-starter"
              onClick={() => setIndex(i)}
              className={[
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition",
                active
                  ? "border-cyan/60 bg-cyan/15 text-cream"
                  : "border-line bg-abyss/40 text-faint hover:bg-white/5",
              ].join(" ")}
            >
              <span className="font-jp text-base">{starter.character}</span>
              <span className="lang-ar text-xs text-muted">{starter.meaningAr}</span>
            </button>
          );
        })}
      </div>
      <KanjiMatrix
        key={current.character}
        character={current.character}
        strokes={slot.status === "ready" ? slot.strokes : undefined}
        status={slot.status}
        onRetry={() => retry(`starter-${current.character}`)}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
