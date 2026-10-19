"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  IconBlocks,
  IconDrum,
  IconEar,
  IconGrid,
  IconHeadphones,
  IconParticles,
  IconPlay,
  IconTrophy,
} from "@/components/icons";
import { SECTOR_SKINS, sectorStyle } from "@/lib/sector-skins";
import { sectorArtUrl } from "@/lib/sector-art-manifest";
import { evaluateGameUnlocks, unlockProgress } from "@/lib/game-access";
import { SECTOR_COMPLETION_RATIO } from "@/lib/sector-progress";
import { ProgressRing, type SectorNodeView } from "./SectorNode";
import type { Sector } from "@/types/curriculum";

const UNLOCK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "echo-link": IconEar,
  "listening-lab": IconHeadphones,
  "taiko-mora": IconDrum,
  "sov-assembly": IconBlocks,
  "grammar-core": IconParticles,
};

function Stat({ labelAr, value, tone = "text-cream" }: { labelAr: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-line bg-abyss/40 px-3 py-2">
      <span className={["telemetry text-lg font-bold", tone].join(" ")} dir="ltr">
        {value}
      </span>
      <span className="lang-ar text-[11px] text-muted">{labelAr}</span>
    </div>
  );
}

export default function SectorDossier({
  view,
  nextSector,
}: {
  view: SectorNodeView;
  nextSector: Sector | null;
}) {
  const { sector, progress, kind, isComplete } = view;
  const skin = SECTOR_SKINS[sector.id];
  const art = sectorArtUrl(sector.id);
  const unlocks = evaluateGameUnlocks(progress.reviewed).filter(
    (entry) => entry.requiredSeenCount > 0,
  );
  const threshold = Math.round(progress.total * SECTOR_COMPLETION_RATIO);

  return (
    <div
      data-testid="sector-dossier"
      data-sector-id={sector.id}
      dir="rtl"
      style={sectorStyle(sector.id, art)}
      className="glass-panel sector-scope flex flex-col gap-4 rounded-2xl p-5"
    >
      <div className="relative overflow-hidden rounded-xl border sector-border bg-abyss/50 p-3">
        {art ? <span aria-hidden="true" className="sector-art sector-art--fade" /> : null}
        <div className="relative flex items-center gap-3">
          <span
            aria-hidden="true"
            className="sector-emblem h-11 w-11 flex-none rounded-xl font-jp text-xl font-bold"
          >
            {skin.emblem}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="telemetry-label lang-ar text-faint">ملف الحملة</span>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="lang-ar text-lg font-bold text-cream">{sector.titleAr}</h2>
              {isComplete && (
                <span className="chip is-gold flex-none">
                  <IconTrophy className="h-3.5 w-3.5" />
                  <span className="lang-ar">مكتمل</span>
                </span>
              )}
            </div>
            <p className="lang-ar text-[11px] leading-relaxed sector-text">{sector.themeAr}</p>
            <p className="lang-ar text-[11px] leading-relaxed text-muted">{sector.taglineAr}</p>
          </div>
          <ProgressRing
            pct={progress.reviewPct}
            size={48}
            stroke={4}
            className={isComplete ? "text-amber" : "sector-text"}
          />
        </div>
      </div>

      <p className="lang-ar rounded-xl border border-line bg-abyss/40 p-3 text-xs leading-relaxed text-muted">
        {sector.focusAr}
      </p>

      {kind === "campaign" ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Stat labelAr="مُراجَعة" value={progress.reviewed} tone="sector-text" />
            <Stat labelAr="مُثبّتة" value={progress.mastered} tone="text-amber" />
            <Stat labelAr="مستحقة" value={progress.due} tone="text-hazard" />
            <Stat labelAr="جديدة" value={progress.fresh} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="lang-ar font-bold text-cream">
                هدف الحملة — راجع {Math.round(SECTOR_COMPLETION_RATIO * 100)}٪ من المفردات
              </span>
              <span className="telemetry text-faint" dir="ltr">
                {progress.reviewed} / {threshold || progress.total}
              </span>
            </div>
            <div className="meter">
              <div
                className={["meter-fill", isComplete ? "is-gold" : "sector-fill"].join(" ")}
                style={{ width: `${Math.min(100, Math.round((progress.reviewed / (threshold || 1)) * 100))}%` }}
              />
            </div>
            <p className="lang-ar text-[11px] leading-relaxed text-faint">
              {isComplete
                ? "اكتملت الحملة — كل كلمات هذا القطاع أصبحت في دورة المراجعة."
                : `باقٍ ${Math.max(0, threshold - progress.reviewed)} كلمة لإكمال الحملة.`}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="telemetry-label lang-ar sector-text">هذا القطاع يفتح</span>
            <div className="flex flex-col gap-1.5">
              {unlocks.map((entry) => {
                const Icon = UNLOCK_ICONS[entry.gameId] ?? IconParticles;
                return (
                  <div
                    key={entry.gameId}
                    className="flex items-center gap-2 rounded-lg border border-line bg-abyss/40 px-3 py-2"
                  >
                    <Icon
                      className={["h-4 w-4 flex-none", entry.isUnlocked ? "sector-text" : "text-faint"].join(" ")}
                    />
                    <span className="lang-ar min-w-0 flex-1 truncate text-xs text-cream">
                      {entry.titleAr}
                    </span>
                    {entry.isUnlocked ? (
                      <span className="lang-ar text-[11px] font-bold sector-text">مفتوح</span>
                    ) : (
                      <span className="telemetry text-[11px] text-faint" dir="ltr">
                        {entry.currentSeenCount}/{entry.requiredSeenCount}
                        <span className="lang-ar text-faint"> · {unlockProgress(entry.currentSeenCount, entry.requiredSeenCount)}%</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-abyss/40 p-3">
          <span className="lang-ar text-xs leading-relaxed text-muted">
            {kind === "kanji-only"
              ? `لا مفردات في هذا القطاع بعد — تدريب الكانجي متاح (${view.kanjiCount} حرفًا). تُطلق حملة المفردات مع الدفعة التالية.`
              : `هذا القطاع على خارطة الطريق — الهدف ${sector.targetVocab} مفردة و${sector.targetKanji} كانجي.`}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {kind === "campaign" && (
          <>
            <Link href="/practice/drill#review" className="btn-cyan sector-cta w-full">
              <IconPlay className="h-4 w-4" />
              <span className="lang-ar">ابدأ المراجعة</span>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/practice/drill#strokes" className="btn-ghost justify-center">
                <span className="lang-ar">تدريبات الكتابة</span>
              </Link>
              <Link href="/practice/drill#taiko" className="btn-ghost justify-center">
                <span className="lang-ar">طبل المورا</span>
              </Link>
            </div>
          </>
        )}
        {kind === "kanji-only" && (
          <Link href="/practice/drill#matrix" className="btn-cyan sector-cta w-full">
            <IconGrid className="h-4 w-4" />
            <span className="lang-ar">ابدأ تدريب الكانجي</span>
          </Link>
        )}
        {kind === "roadmap" && (
          <button type="button" disabled className="btn-cyan w-full opacity-50">
            <span className="lang-ar">قيد الإعداد</span>
          </button>
        )}
        {isComplete && nextSector && (
          <p className="lang-ar text-center text-[11px] leading-relaxed text-amber">
            الحملة التالية: {nextSector.titleAr} — {nextSector.taglineAr}
          </p>
        )}
      </div>
    </div>
  );
}
