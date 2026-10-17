"use client";

import type { AccentType } from "@/types/learning";
import { getPitchAccentPattern, pitchLabel } from "@/lib/pitch";

const COL = 48;
const H_Y = 12;
const L_Y = 44;

/**
 * Word pitch-accent display. Takes the word's hiragana + accent metadata,
 * derives the H/L pattern via the universal accent engine, then renders one
 * beat per mora (a combined sound like しょ is a single index).
 */
export default function PitchContour({
  hiragana,
  accentType,
  accentNucleus,
  className = "",
}: {
  hiragana: string;
  accentType: AccentType;
  accentNucleus: number;
  className?: string;
}) {
  const { morae, pattern } = getPitchAccentPattern(hiragana, accentType, accentNucleus);
  const width = Math.max(morae.length, 1) * COL;
  const points = pattern
    .map((state, index) => `${index * COL + COL / 2},${state === "H" ? H_Y : L_Y}`)
    .join(" ");

  if (morae.length === 0) return null;

  return (
    <div className={["flex flex-col gap-1", className].filter(Boolean).join(" ")} dir="ltr">
      <div className="overflow-x-auto rounded-lg border border-line bg-void/40 p-2">
        <svg width={width} height={56} viewBox={`0 0 ${width} 56`} role="img" aria-label="منحنى النبرة">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            className="text-frequency"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {pattern.map((state, index) => (
            <circle
              key={index}
              cx={index * COL + COL / 2}
              cy={state === "H" ? H_Y : L_Y}
              r={4}
              fill="currentColor"
              className={state === "H" ? "text-frequency" : "text-muted"}
            />
          ))}
        </svg>
      </div>
      <div className="flex overflow-x-auto" style={{ minWidth: width }}>
        {morae.map((mora, index) => {
          const label = pitchLabel(pattern[index] ?? "L");
          return (
            <span key={`${mora}-${index}`} className="flex flex-col items-center" style={{ width: COL }}>
              <span className="font-jp text-lg text-cream">{mora}</span>
              <span
                className={[
                  "telemetry text-[10px]",
                  pattern[index] === "H" ? "text-frequency" : "text-muted",
                ].join(" ")}
              >
                {label.arrow} {label.ar}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
