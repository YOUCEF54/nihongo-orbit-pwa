"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SECTORS, sectorById } from "@/lib/curriculum";
import { sectorStyle } from "@/lib/sector-skins";
import type { SectorId } from "@/types/curriculum";
import { progressForSector, type SectorProgress } from "@/lib/sector-progress";
import { loadMasteryLocal } from "@/lib/mastery";
import { useMounted } from "@/lib/use-mounted";
import { useSectorState } from "@/lib/sector-state";
import { stepIndexForHash } from "@/lib/dojo-steps";
import SectorNode, { type SectorNodeKind, type SectorNodeView } from "./SectorNode";
import SectorDossier from "./SectorDossier";
import type { SeedKanjiNode, SeedVocabularyItem } from "@/lib/data";
import type { UserMasteryState } from "@/types/learning";

export interface SectorHubProps {
  userId: string;
  initialMastery: Record<string, UserMasteryState>;
  vocab: SeedVocabularyItem[];
  kanji: SeedKanjiNode[];
}

export default function SectorHub({ userId, initialMastery, vocab, kanji }: SectorHubProps) {
  const router = useRouter();
  const mounted = useMounted();
  const mastery = useMemo(
    () => (mounted ? { ...initialMastery, ...loadMasteryLocal(userId) } : initialMastery),
    [mounted, initialMastery, userId],
  );
  const { active, completed, setActive } = useSectorState(userId);

  // Legacy `/practice#review` style deep links land on the drill carousel.
  useEffect(() => {
    const index = stepIndexForHash(window.location.hash);
    if (index === null) return;
    router.replace(`/practice/drill${window.location.hash}`);
  }, [router]);

  const model = useMemo(() => {
    const now = new Date();
    const progress = {} as Record<SectorId, SectorProgress>;
    const kanjiCount = {} as Record<SectorId, number>;
    for (const sector of SECTORS) {
      progress[sector.id] = progressForSector(vocab, sector.id, mastery, now);
      kanjiCount[sector.id] = kanji.filter((node) => node.sector === sector.id).length;
    }
    const isComplete = (id: SectorId) => Boolean(completed[id]) || progress[id].isComplete;
    const recommended =
      SECTORS.find((sector) => progress[sector.id].eligible && !isComplete(sector.id)) ?? null;
    const views: SectorNodeView[] = SECTORS.map((sector) => {
      const p = progress[sector.id];
      const count = kanjiCount[sector.id];
      const kind: SectorNodeKind = p.eligible ? "campaign" : count > 0 ? "kanji-only" : "roadmap";
      return {
        sector,
        kanjiCount: count,
        progress: p,
        kind,
        isActive: sector.id === active,
        isComplete: isComplete(sector.id),
        recommended: recommended?.id === sector.id,
      };
    });
    return { views, recommendedId: recommended?.id ?? null };
  }, [vocab, kanji, mastery, completed, active]);

  const activeView = model.views.find((view) => view.sector.id === active) ?? model.views[0];
  const journey = model.views.filter((view) => view.kind !== "roadmap");
  const roadmap = model.views.filter((view) => view.kind === "roadmap");
  const campaignViews = model.views.filter((view) => view.kind === "campaign");
  const campaignUnits = campaignViews.reduce((sum, view) => sum + view.progress.total, 0);
  const reviewedUnits = campaignViews.reduce((sum, view) => sum + view.progress.reviewed, 0);
  const dueUnits = campaignViews.reduce((sum, view) => sum + view.progress.due, 0);
  const completedCount = campaignViews.filter((view) => view.isComplete).length;
  const nextSector =
    model.recommendedId && model.recommendedId !== active ? sectorById(model.recommendedId) : null;

  return (
    <div data-testid="sector-hub" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <nav className="mb-2 flex items-center gap-2 text-xs" dir="rtl" aria-label="التنقل">
        <Link href="/" className="lang-ar text-faint transition hover:text-cyan">
          الرئيسية
        </Link>
        <span className="telemetry text-faint" dir="ltr">
          /
        </span>
        <span className="lang-ar font-bold text-cyan">خريطة القطاعات</span>
      </nav>

      <header className="mb-5 flex text-[12px] flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="lang-ar text-xl font-bold text-cream">خريطة القطاعات</h1>
          <p className="lang-ar mt-0.5 max-w-xl text-xs leading-relaxed text-muted">
            اختر قطاعًا لتقرأ ملف حملته — يصبح القطاع النشط الذي تغذّي منه كل التدريبات والمراجعة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="hud-pill  sector-scope" style={sectorStyle(active)}>
            <span className="lang-ar telemetry-label">الحملة النشطة</span>
            <span
              aria-hidden="true"
              className="h-5 w-[0.45] rounded-full"
              style={{ background: "var(--sector-accent)" }}
            />
            <span className="lang-ar font-bold sector-text">{sectorById(active).titleAr}</span>
          </span>
          <span className="hud-pill">
            <span className="lang-ar telemetry-label">مُراجَعة</span>
            <span className="font-mono text-frequency" dir="ltr">
              {reviewedUnits}/{campaignUnits}
            </span>
          </span>
          <span className="hud-pill">
            <span className="lang-ar telemetry-label">مستحقة</span>
            <span className="font-mono text-hazard">{dueUnits}</span>
          </span>
          <span className="hud-pill">
            <span className="lang-ar telemetry-label">حملات مكتملة</span>
            <span className="font-mono text-amber">
              {completedCount}/{campaignViews.length}
            </span>
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <ol data-testid="sector-journey" className="flex flex-col">
            {journey.map((view, index) => {
              const marker = view.isComplete
                ? "border-amber/50 bg-amber/10 text-amber"
                : view.isActive
                  ? "sector-border-strong sector-bg-soft sector-text"
                  : "sector-border sector-bg-soft sector-text";
              return (
                <li
                  key={view.sector.id}
                  className="sector-scope flex items-stretch gap-3"
                  style={sectorStyle(view.sector.id)}
                >
                  <div className="flex w-8 flex-none flex-col items-center">
                    <span
                      className={[
                        "grid h-8 w-8 place-items-center rounded-full border text-xs font-bold",
                        marker,
                      ].join(" ")}
                    >
                      {view.sector.order}
                    </span>
                    {index < journey.length - 1 && (
                      <span aria-hidden="true" className="mt-1 w-px flex-1 bg-line" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-3">
                    <SectorNode view={view} onSelect={() => setActive(view.sector.id)} />
                  </div>
                </li>
              );
            })}
          </ol>

          {roadmap.length > 0 && (
            <div className="mt-5">
              <span className="telemetry-label lang-ar text-faint">خارطة الطريق</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {roadmap.map((view) => (
                  <SectorNode
                    key={view.sector.id}
                    view={view}
                    onSelect={() => setActive(view.sector.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SectorDossier view={activeView} nextSector={nextSector} />
        </aside>
      </div>
    </div>
  );
}
