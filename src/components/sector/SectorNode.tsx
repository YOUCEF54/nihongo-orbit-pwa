"use client";

import { IconTrophy } from "@/components/icons";
import { SECTOR_SKINS, sectorStyle } from "@/lib/sector-skins";
import { sectorArtUrl } from "@/lib/sector-art-manifest";
import type { Sector } from "@/types/curriculum";
import type { SectorProgress } from "@/lib/sector-progress";

export type SectorNodeKind = "campaign" | "kanji-only" | "roadmap";

export interface SectorNodeView {
  sector: Sector;
  kanjiCount: number;
  progress: SectorProgress;
  kind: SectorNodeKind;
  isActive: boolean;
  isComplete: boolean;
  recommended: boolean;
}

/** Compact SVG progress ring; inherits its colour from `className` (currentColor). */
export function ProgressRing({
  pct,
  size = 46,
  stroke = 4,
  className = "",
  label,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * circumference;
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className={className}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="telemetry absolute text-[11px] font-bold text-cream" dir="ltr">
        {label ?? `${Math.round(pct)}%`}
      </span>
    </span>
  );
}

export default function SectorNode({
  view,
  onSelect,
}: {
  view: SectorNodeView;
  onSelect: () => void;
}) {
  const { sector, progress, kanjiCount, kind, isActive, isComplete, recommended } = view;
  const skin = SECTOR_SKINS[sector.id];
  const art = sectorArtUrl(sector.id);
  const disabled = kind === "roadmap";
  const jlptAr =
    sector.jlpt === "Pre-N5" ? `قطاع ${sector.order} · ما قبل N5` : `قطاع ${sector.order} · ${sector.jlpt}`;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={isActive ? "true" : undefined}
      onClick={onSelect}
      data-testid="sector-node"
      data-sector-id={sector.id}
      data-state={
        isComplete ? "complete" : isActive ? "active" : kind === "roadmap" ? "roadmap" : "available"
      }
      style={sectorStyle(sector.id, art)}
      className={[
        "sector-scope chamfer-border hover:scale-103  relative flex w-full items-center gap-3 overflow-hidden border p-3 text-end transition-all",
        isActive
          ? "sector-border-strong bg-white/5"
          : "sector-border bg-abyss/40 hover:bg-white/5",
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
      ].join(" ")}
    >
      {art ? <span aria-hidden="true" className="sector-art sector-art--fade" /> : null}

      <span
        aria-hidden="true"
        className="sector-emblem relative h-10 w-10 flex-none rounded-xl font-jp text-lg font-bold"
      >
        {skin.emblem}
      </span>

      <div className="relative flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="lang-ar sector-text text-xs font-bold">{jlptAr}</span>
          {isComplete && (
            <span className="chip is-gold">
              <IconTrophy className="h-3 w-3" />
              <span className="lang-ar">مكتمل</span>
            </span>
          )}
          {!isComplete && isActive && (
            <span className="chip is-cyan">
              <span className="lang-ar">الحملة النشطة</span>
            </span>
          )}
          {!isComplete && !isActive && recommended && (
            <span className="chip is-gold">
              <span className="lang-ar">الحملة التالية</span>
            </span>
          )}
          {kind === "roadmap" && (
            <span className="lang-ar text-[11px] text-faint">قيد الإعداد</span>
          )}
        </div>

        <span className="lang-ar truncate text-base font-bold text-cream">{sector.titleAr}</span>
        <span className="lang-ar truncate text-[10px] sector-text">{sector.themeAr}</span>
        <span className="lang-ar line-clamp-2 text-[11px] leading-relaxed text-muted">
          {sector.focusAr}
        </span>

        {kind === "campaign" ? (
          <div className="mt-0.5 flex items-center justify-between text-[11px]">
            <span className="lang-ar text-muted">
              {progress.due > 0 ? `${progress.due} للمراجعة` : "لا مراجعات مستحقة"}
            </span>
            <span className="telemetry text-faint" dir="ltr">
              {progress.reviewed} / {progress.total}
            </span>
          </div>
        ) : (
          <span className="lang-ar mt-0.5 text-[11px] text-amber">
            {kanjiCount > 0 ? `كانجي متاح ${kanjiCount}` : `الهدف ${sector.targetVocab} مفردة`}
          </span>
        )}
      </div>

      <ProgressRing
        pct={progress.reviewPct}
        className={isComplete ? "text-amber" : "sector-text"}
        label={kind === "campaign" ? undefined : "···"}
      />
    </button>
  );
}
