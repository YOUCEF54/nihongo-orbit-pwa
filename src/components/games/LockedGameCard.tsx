"use client";

import { IconShield } from "@/components/icons";
import { unlockProgress } from "@/lib/game-access";

export default function LockedGameCard({
  titleAr,
  descAr,
  seenCount,
  requiredCount,
  className = "",
}: {
  titleAr: string;
  descAr: string;
  seenCount: number;
  requiredCount: number;
  className?: string;
}) {
  const pct = unlockProgress(seenCount, requiredCount);

  return (
    <div
      data-testid="locked-game"
      className={[
        "glass-panel relative overflow-hidden rounded-2xl p-5 opacity-80",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      dir="rtl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="lang-ar font-bold text-cream">{titleAr}</span>
        <span className="telemetry text-amber" dir="ltr">
          مغلق ({seenCount}/{requiredCount})
        </span>
      </div>
      <p className="lang-ar mb-3 flex items-center gap-2 text-xs leading-relaxed text-muted">
        <IconShield className="h-4 w-4 flex-none text-amber" />
        {descAr}
      </p>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="lang-ar mt-2 text-[11px] text-faint">
        راجع {requiredCount} مفردات في هذا القطاع لفتح هذا التدريب — لن تُعرض كلمات لم ترها بعد.
      </p>
    </div>
  );
}
