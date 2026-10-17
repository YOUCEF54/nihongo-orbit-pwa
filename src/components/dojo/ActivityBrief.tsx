"use client";

import type { ComponentType } from "react";
import {
  IconArchive,
  IconBolt,
  IconChart,
  IconOrbit,
  IconPlay,
  IconSpark,
  IconTrophy,
  IconVolume,
  IconWave,
} from "@/components/icons";
import { unlockProgress } from "@/lib/game-access";
import type { DojoStepIcon, DojoStepMeta } from "@/lib/dojo-steps";

const ICON_MAP: Record<DojoStepIcon, ComponentType<{ className?: string }>> = {
  orbit: IconOrbit,
  spark: IconSpark,
  archive: IconArchive,
  wave: IconWave,
  trophy: IconTrophy,
  volume: IconVolume,
  chart: IconChart,
  bolt: IconBolt,
};

export default function ActivityBrief({
  step,
  locked = false,
  seenCount = 0,
  requiredCount = 0,
  poolCount,
  poolLabel = "كلمات متاحة",
  onStart,
  onNext,
}: {
  step: DojoStepMeta;
  locked?: boolean;
  seenCount?: number;
  requiredCount?: number;
  poolCount?: number;
  poolLabel?: string;
  onStart?: () => void;
  onNext?: () => void;
}) {
  const Icon = ICON_MAP[step.icon];
  const pct = locked ? unlockProgress(seenCount, requiredCount) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3" dir="rtl">
      <div
        data-testid="dojo-brief"
        className="glass-panel flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="telemetry-label lang-ar text-faint">ملخّص التدريب</span>
            <h2 className="lang-ar text-lg font-bold text-cream">{step.titleAr}</h2>
          </div>
          {locked && (
            <span className="lang-ar ms-auto flex-none rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-[11px] font-bold text-amber">
              مغلق
            </span>
          )}
        </div>

        <p className="lang-ar text-sm leading-relaxed text-muted">{step.descAr}</p>

        <div className="rounded-xl border border-line bg-abyss/40 p-3">
          <span className="telemetry-label lang-ar text-cyan">كيف تلعب</span>
          <p className="lang-ar mt-1 text-xs leading-relaxed text-muted">{step.howToAr}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {typeof poolCount === "number" && (
            <span className="chip">
              <span className="lang-ar">{poolLabel}</span>
              <span className="telemetry text-cream" dir="ltr">
                {poolCount}
              </span>
            </span>
          )}
          {locked && (
            <span className="chip is-hazard">
              <span className="lang-ar">مغلق</span>
              <span className="telemetry text-amber" dir="ltr">
                {seenCount}/{requiredCount}
              </span>
            </span>
          )}
        </div>

        {locked && (
          <div className="flex flex-col gap-1.5">
            <div className="meter">
              <div className="meter-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="lang-ar text-[11px] leading-relaxed text-faint">
              راجع {requiredCount} مفردات في هذا القطاع لفتح هذا التدريب — لن تُعرض كلمات لم ترها بعد.
            </p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        {locked ? (
          <button
            type="button"
            disabled
            data-testid="dojo-play"
            className="btn-cyan w-full opacity-50"
          >
            <IconPlay className="h-4 w-4" />
            <span className="lang-ar">{step.ctaAr}</span>
          </button>
        ) : (
          <button type="button" data-testid="dojo-play" onClick={onStart} className="btn-cyan w-full">
            <IconPlay className="h-4 w-4" />
            <span className="lang-ar">{step.ctaAr}</span>
          </button>
        )}
        {locked && onNext && (
          <button type="button" data-testid="dojo-locked-next" onClick={onNext} className="btn-ghost w-full">
            <span className="lang-ar">التالي ←</span>
          </button>
        )}
      </div>
    </div>
  );
}
