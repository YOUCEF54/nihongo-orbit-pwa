"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useMounted } from "@/lib/use-mounted";
import SRFlashcard, { type FlashcardData } from "@/components/ui/SRFlashcard";
import {
  EmptyState,
  MiniCarousel,
  StageToggle,
  StageViewport,
  useStage,
} from "@/components/ui";
import { LockedGameCard } from "@/components/games";
import { SECTORS, sectorById, SECTOR_ACCENT_CLASSES } from "@/lib/curriculum";
import type { SectorId } from "@/types/curriculum";
import { DOJO_STEPS, DOJO_STEP_COUNT, stepIndexForHash } from "@/lib/dojo-steps";
import { cardStateLabel, cardStateOf, cardToMastery, createFsrsCard, dueInDays, masteryToCard, type Card } from "@/lib/fsrs";
import { loadMasteryLocal, saveMasteryLocal } from "@/lib/mastery";
import { noteReviewActivity } from "@/lib/progress-state";
import { evaluateGameUnlocks, seenVocab } from "@/lib/game-access";
import { useKanjivgStrokes, type StrokeSlot } from "@/lib/use-kanji-strokes";
import { createClient } from "@/lib/supabase/client";
import { kanjiBySector, sectorKanjiCount } from "@/lib/data";
import { IRAB_SEED } from "@/data/grammar.seed";
import IrabReference from "@/components/grammar/IrabReference";
import type { SeedKanjiNode, SeedVocabularyItem } from "@/lib/data";
import type { UserMasteryState } from "@/types/learning";
import type { ReviewGrade, ScriptType } from "@/lib/gamification";

export interface DojoContentProps {
  userId: string;
  initialMastery: Record<string, UserMasteryState>;
  vocab: SeedVocabularyItem[];
  kanji: SeedKanjiNode[];
}

function scriptOf(text: string): ScriptType {
  return /[\u4e00-\u9fff]/.test(text) ? "kanji" : "kana";
}

const MASTERY_DB_FLAG = "learnjp:no-mastery-db";
const COMPLETE_TOAST_MS = 1500;
/** Strict horizontal touch swipe (px) — generous so drawing drills never misfire. */
const SWIPE_DX = 100;
const SWIPE_DY_MAX = 60;

/** Resolve the deep-linked step after mount (SSR always starts at Step 0). */
function stepFromHash(): number | null {
  if (typeof window === "undefined") return null;
  return stepIndexForHash(window.location.hash);
}

/** Placeholder while a game chunk loads — keeps the stage height stable. */
function GameLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="جارٍ تحميل النشاط"
      className="glass-panel flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-2xl p-8"
    >
      <span className="lang-ar animate-pulse text-sm text-muted">جارٍ تحميل النشاط…</span>
    </div>
  );
}

/** Heavy game stages load on demand so the dojo shell stays light. */
const EchoLink = dynamic(() => import("@/components/games/EchoLink"), {
  ssr: false,
  loading: GameLoading,
});
const KanjiMatrix = dynamic(() => import("@/components/games/KanjiMatrix"), {
  ssr: false,
  loading: GameLoading,
});
const ListeningLab = dynamic(() => import("@/components/games/listening"), {
  ssr: false,
  loading: GameLoading,
});
const StrokeStarters = dynamic(() => import("@/components/games/StrokeStarters"), {
  ssr: false,
  loading: GameLoading,
});
const SyntaxScramble = dynamic(() => import("@/components/games/SyntaxScramble"), {
  ssr: false,
  loading: GameLoading,
});
const SovAssembly = dynamic(() => import("@/components/games/SovAssembly"), {
  ssr: false,
  loading: GameLoading,
});
const MoraTaiko = dynamic(() => import("@/components/games/MoraTaiko"), {
  ssr: false,
  loading: GameLoading,
});

export default function DojoContent({
  userId,
  initialMastery,
  vocab,
  kanji,
}: DojoContentProps) {
  const playableKanji = kanji;

  const pickKanji = (sector: SectorId): SeedKanjiNode | null => {
    if (playableKanji.length === 0) return null;
    return playableKanji.find((node) => node.sector === sector) ?? playableKanji[0];
  };

  const [activeSector, setActiveSector] = useState<SectorId>("sector-0");
  const [deckIndex, setDeckIndex] = useState(0);
  const [matrixKanji, setMatrixKanji] = useState<SeedKanjiNode | null>(() =>
    pickKanji("sector-0"),
  );
  const [chainsCompleted, setChainsCompleted] = useState(0);
  const [mastery, setMastery] = useState<Record<string, UserMasteryState>>(() => ({
    ...initialMastery,
    ...loadMasteryLocal(userId),
  }));
  const [activeStep, setActiveStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const mounted = useMounted();
  const stage = useStage();
  const masteriesUnavailableRef = useRef(false);
  const stepRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const { slots: strokeSlots, retry: retryStrokes } = useKanjivgStrokes(kanji);

  // Stable identities matter: games receive `seen` as a `pool` prop and rebuild
  // their rounds when it changes. Recreating it every render (e.g. on carousel
  // navigation) would re-trigger their audio autoplay — keep it memoized.
  const sectorVocab = useMemo(
    () => vocab.filter((item) => item.sector === activeSector),
    [vocab, activeSector],
  );
  const activeKanji = useMemo(() => kanjiBySector(activeSector), [activeSector]);

  // Per-sector review progress for the mission-deck grid (Step 0). A sector is
  // only locked when it has neither vocabulary nor kanji — otherwise "V0 · K6"
  // sectors like the compound-kanji one would wrongly read as unavailable.
  const sectorSummaries = useMemo(
    () =>
      SECTORS.map((sector) => {
        const items = vocab.filter((item) => item.sector === sector.id);
        const now = new Date();
        let reviewed = 0;
        let due = 0;
        for (const item of items) {
          const state = mastery[item.id];
          if (!state || state.reps <= 0) continue;
          reviewed += 1;
          if (dueInDays(masteryToCard(state), now) <= 0) due += 1;
        }
        const kanjiCount = sectorKanjiCount(sector.id);
        return {
          sector,
          total: items.length,
          reviewed,
          due,
          kanjiCount,
          locked: items.length === 0 && kanjiCount === 0,
        };
      }),
    [vocab, mastery],
  );

  const seen = useMemo(() => seenVocab(sectorVocab, mastery), [sectorVocab, mastery]);
  const seenCount = seen.length;
  const unlocks = evaluateGameUnlocks(seenCount);
  const unlockOf = (gameId: string) => unlocks.find((entry) => entry.gameId === gameId);
  const echoUnlock = unlockOf("echo-link");
  const listenUnlock = unlockOf("listening-lab");
  const sovUnlock = unlockOf("sov-assembly");
  const grammarUnlock = unlockOf("grammar-core");
  const taikoUnlock = unlockOf("taiko-mora");
  const echoUnlocked = echoUnlock?.isUnlocked ?? false;
  const listenUnlocked = listenUnlock?.isUnlocked ?? false;
  const sovUnlocked = sovUnlock?.isUnlocked ?? false;
  const grammarUnlocked = grammarUnlock?.isUnlocked ?? false;
  const taikoUnlocked = taikoUnlock?.isUnlocked ?? false;

  const clearToastTimer = () => {
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const move = (delta: 1 | -1) => {
    const next = Math.min(DOJO_STEP_COUNT - 1, Math.max(0, stepRef.current + delta));
    if (next === stepRef.current) return;
    clearToastTimer();
    setToast(null);
    stepRef.current = next;
    setActiveStep(next);
  };

  const goTo = (index: number) => {
    const clamped = Math.min(DOJO_STEP_COUNT - 1, Math.max(0, index));
    if (clamped === stepRef.current) return;
    clearToastTimer();
    setToast(null);
    stepRef.current = clamped;
    setActiveStep(clamped);
  };

  const completeStep = (message: string) => {
    clearToastTimer();
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setToast(null);
      move(1);
    }, COMPLETE_TOAST_MS);
  };

  useEffect(() => {
    const deepLinked = stepFromHash();
    if (deepLinked !== null && deepLinked !== 0) {
      void queueMicrotask(() => goTo(deepLinked));
    }
    const onHash = () => {
      const index = stepIndexForHash(window.location.hash);
      if (index !== null) goTo(index);
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowLeft") move(1);
      else if (event.key === "ArrowRight") move(-1);
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("keydown", onKey);
      if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    masteriesUnavailableRef.current =
      typeof window !== "undefined" && window.localStorage.getItem(MASTERY_DB_FLAG) === "1";
  }, []);

  const selectSector = (id: SectorId) => {
    setActiveSector(id);
    setDeckIndex(0);
    setMatrixKanji(pickKanji(id));
  };

  const currentWord = sectorVocab[deckIndex] ?? null;

  const persist = async (item: UserMasteryState) => {
    if (masteriesUnavailableRef.current) return;
    try {
      const supabase = createClient();
      await supabase
        .from("user_mastery_states")
        .upsert(
          {
            user_id: item.userId,
            card_id: item.cardId,
            card_type: item.cardType,
            stability: item.stability,
            difficulty: item.difficulty,
            elapsed_days: item.elapsedDays,
            scheduled_days: item.scheduledDays,
            reps: item.reps,
            lapses: item.lapses,
            state: item.state,
            last_review: item.lastReview,
          },
          { onConflict: "user_id,card_id" },
        );
    } catch {
      masteriesUnavailableRef.current = true;
      try {
        window.localStorage.setItem(MASTERY_DB_FLAG, "1");
      } catch {
        // storage unavailable — session-only fallback remains active
      }
    }
  };

  const handleGrade = (id: string, _grade: ReviewGrade, next: Card) => {
    const item = cardToMastery(userId, id, "vocab", next);
    const updated = { ...mastery, [id]: item };
    setMastery(updated);
    saveMasteryLocal(userId, updated);
    noteReviewActivity(userId);
    void persist(item);
    if (deckIndex < sectorVocab.length - 1) {
      setDeckIndex((value) => value + 1);
    } else {
      completeStep("اكتملت المراجعة — انتقال تلقائي للتدريب التالي");
    }
  };

  const deckCard: Card | undefined = currentWord
    ? mastery[currentWord.id]
      ? masteryToCard(mastery[currentWord.id])
      : createFsrsCard()
    : undefined;

  const deckData: FlashcardData | null = currentWord
    ? {
        word: currentWord.japaneseText,
        reading: currentWord.readingFurigana,
        romaji: currentWord.romaji,
        meaningAr: currentWord.arabicTranslation,
        hiragana: currentWord.hiragana,
        accentType: currentWord.accent_type,
        accentNucleus: currentWord.accent_nucleus,
        audioUrl: currentWord.audioUrl,
        sentence: {
          jp: currentWord.exampleSentenceJp,
          ar: currentWord.exampleSentenceAr,
        },
        script: scriptOf(currentWord.japaneseText),
        srs: deckCard,
      }
    : null;

  const currentReviewState = deckCard ? cardStateLabel(cardStateOf(deckCard)) : null;

  const matrixSlot: StrokeSlot | null = matrixKanji
    ? strokeSlots[matrixKanji.id] ?? { status: "loading" }
    : null;

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_DX && Math.abs(dy) <= SWIPE_DY_MAX) {
      // RTL: the next step waits off-screen to the left, so dragging right advances.
      move(dx > 0 ? 1 : -1);
    }
  };

  const lockedStep = (
    titleAr: string,
    descAr: string,
    seenCountValue: number,
    requiredCount: number,
  ) => (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <LockedGameCard
        titleAr={titleAr}
        descAr={descAr}
        seenCount={seenCountValue}
        requiredCount={requiredCount}
        className="flex-1"
      />
      <button type="button" data-testid="dojo-locked-next" onClick={() => move(1)} className="btn-cyan w-full">
        <span className="lang-ar">التالي ←</span>
      </button>
    </div>
  );

  const renderStep = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex h-full min-h-0 flex-col">
            <div className="grid flex-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
              {sectorSummaries.map(({ sector, total, reviewed, due, kanjiCount, locked }) => {
                const accent = SECTOR_ACCENT_CLASSES[sector.accent];
                const active = sector.id === activeSector;
                const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
                return (
                  <button
                    key={sector.id}
                    type="button"
                    disabled={locked}
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      selectSector(sector.id);
                      goTo(1);
                    }}
                    style={{ "--chamfer-edge": accent.edge } as CSSProperties}
                    className={[
                      "flex flex-col gap-2 border p-3 text-end transition-all chamfer-border foil-overlay",
                      accent.border,
                      active ? "bg-white/5 shadow-[0_0_18px_color-mix(in_oklab,var(--color-cyan)_25%,transparent)]" : "bg-abyss/40 hover:bg-white/5",
                      locked ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className={["lang-ar text-xs font-bold", accent.text].join(" ")}>
                        {sector.jlpt === "Pre-N5"
                          ? `قطاع ${sector.order} · ما قبل N5`
                          : `قطاع ${sector.order} · ${sector.jlpt}`}
                      </span>
                      {locked ? (
                        <span className="lang-ar text-xs text-faint">قيد الإعداد</span>
                      ) : (
                        <span className="lang-ar text-xs text-amber">
                          مفردات {total} · كانجي {kanjiCount}
                        </span>
                      )}
                    </div>
                    <span className="lang-ar text-base font-bold text-cream">{sector.titleAr}</span>
                    <span className="lang-ar text-[11px] leading-relaxed text-muted">
                      {sector.focusAr}
                    </span>
                    {!locked && (
                      <div className="mt-auto flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="lang-ar text-muted">
                            {due > 0 ? `${due} للمراجعة` : "لا مراجعات مستحقة"}
                          </span>
                          <span className="telemetry text-faint" dir="ltr">
                            {reviewed} / {total}
                          </span>
                        </div>
                        <div className="meter">
                          <div className="meter-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span
                          className={[
                            "lang-ar text-xs font-bold",
                            active ? "text-cyan" : accent.text,
                          ].join(" ")}
                        >
                          {active ? "الحملة الحالية ✓" : "ابدأ الحملة ←"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 1:
        return <StrokeStarters />;
      case 2:
        return (
          <SyntaxScramble onFinish={() => completeStep("اكتمل قطار الجمل — انتقال تلقائي")} />
        );
      case 3:
        return deckData ? (
          <div className="flex h-full min-h-0 flex-col">
            <SRFlashcard data={deckData} onGrade={(g, next) => handleGrade(currentWord.id, g, next)} />
            <div className="mt-2 flex items-center justify-between" dir="rtl">
              <span className="lang-ar telemetry text-sm text-faint">
                {mounted ? currentReviewState ?? "" : "···"}
                {mounted && deckCard ? (
                  <span dir="ltr" className="text-amber">
                    {" "}
                    · S{deckCard.stability.toFixed(2)}
                  </span>
                ) : null}
              </span>
              <span className="lang-ar telemetry text-sm text-faint">
                البطاقة {deckIndex + 1} / {sectorVocab.length}
              </span>
            </div>
          </div>
        ) : (
          <EmptyState descAr="لا توجد بطاقات في هذا القطاع بعد — يتم إطلاق المحتوى على دفعات." />
        );
      case 4:
        return !echoUnlocked && echoUnlock ? (
          lockedStep(
            echoUnlock.titleAr,
            "يتطلب مراجعة عدد كافٍ من مفردات هذا القطاع قبل فتح صدى المعاني، ولن تُدرَج إلا كلمات رأيتها.",
            echoUnlock.currentSeenCount,
            echoUnlock.requiredSeenCount,
          )
        ) : (
          <EchoLink pool={seen} />
        );
      case 5:
        return (
          <div className="flex h-full min-h-0 flex-col gap-3">
            {playableKanji.length > 0 && (
              <MiniCarousel
                testId="matrix-picker"
                chipTestId="matrix-kanji"
                ariaLabel="اختر كانجي للتدريب على السكتات"
                activeId={matrixKanji?.id ?? ""}
                onSelect={(id) => {
                  const node = playableKanji.find((entry) => entry.id === id);
                  if (node) setMatrixKanji(node);
                }}
                items={playableKanji.map((node) => ({
                  id: node.id,
                  ariaLabel: `${node.character} — ${node.semanticRootAr}`,
                  render: () => (
                    <span className="flex items-center gap-2">
                      <span className="font-jp text-base">{node.character}</span>
                      <span className="lang-ar text-xs text-muted">{node.semanticRootAr}</span>
                      {node.sector === activeSector && (
                        <span className="lang-ar text-[10px] text-cyan">القطاع الحالي</span>
                      )}
                    </span>
                  ),
                }))}
              />
            )}
            {matrixKanji && matrixSlot ? (
              <KanjiMatrix
                key={matrixKanji.id}
                character={matrixKanji.character}
                strokes={matrixSlot.status === "ready" ? matrixSlot.strokes : undefined}
                status={matrixSlot.status}
                onRetry={() => retryStrokes(matrixKanji.id)}
                onComplete={() => setChainsCompleted((value) => value + 1)}
                className="min-h-0 flex-1"
              />
            ) : (
              <EmptyState descAr="لم نُحمّل بيانات السكتات بعد — محتوى KanjiVG قادم مع الدفعة التالية." />
            )}
          </div>
        );
      case 6:
        return !listenUnlocked && listenUnlock ? (
          lockedStep(
            listenUnlock.titleAr,
            "يتطلب مراجعة مفردات كافية في هذا القطاع قبل فتح سباق السرعة — ولن تُدرَج إلا كلمات رأيتها.",
            listenUnlock.currentSeenCount,
            listenUnlock.requiredSeenCount,
          )
        ) : (
          <ListeningLab
            pool={seen}
            onFinish={() => completeStep("انتهى السباق الصوتي — انتقال تلقائي")}
          />
        );
      case 7:
        return !sovUnlocked && sovUnlock ? (
          lockedStep(
            sovUnlock.titleAr,
            "رتّب مقاطع الجملة بنظامها النحوي (فاعل/مبتدأ → مفعول/حرف جر → فعل). يتطلب مفردات مُراجَعة من القطاع الأول.",
            sovUnlock.currentSeenCount,
            sovUnlock.requiredSeenCount,
          )
        ) : (
          <SovAssembly
            pool={seen}
            onFinish={() => completeStep("اكتمل التركيب — انتقال تلقائي")}
          />
        );
      case 8:
        return !grammarUnlocked && grammarUnlock ? (
          lockedStep(
            grammarUnlock.titleAr,
            "مرجع الجُزرة النحوية المتقدّم — يفتح بعد بناء رصيد كافٍ من المفردات في هذا القطاع.",
            grammarUnlock.currentSeenCount,
            grammarUnlock.requiredSeenCount,
          )
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <IrabReference entries={IRAB_SEED} />
          </div>
        );
      case 9:
        return !taikoUnlocked && taikoUnlock ? (
          lockedStep(
            taikoUnlock.titleAr,
            "طبل المورا الإيقاعي — اضرب المركز للنغمة العالية والحافة للمنخفضة. يتطلب مفردات مُراجَعة في هذا القطاع.",
            taikoUnlock.currentSeenCount,
            taikoUnlock.requiredSeenCount,
          )
        ) : (
          <MoraTaiko
            pool={seen}
            onFinish={() => completeStep("اكتمل طبل المورا — انتقال تلقائي")}
          />
        );
      default:
        return null;
    }
  };

  const stepMeta = DOJO_STEPS[activeStep];

  return (
    <div className="screen-shell mx-auto w-full max-w-6xl px-4 sm:px-6">
      <nav className="mb-2 flex items-center gap-2 text-xs" dir="rtl" aria-label="التنقل">
        <Link href="/" className="lang-ar text-faint transition hover:text-cyan">
          الرئيسية
        </Link>
        <span className="telemetry text-faint" dir="ltr">
          /
        </span>
        <span className="lang-ar font-bold text-cyan">الدوجو</span>
      </nav>
      <header className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="lang-ar text-xl font-bold text-cream">
            حلبة التعلّم الميدان {sectorById(activeSector).order + 1}
          </h1>
          <p className="lang-ar mt-0.5 text-xs text-muted">
            {sectorById(activeSector).titleAr} — {sectorById(activeSector).taglineAr}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="hud-pill">
            <span className="lang-ar telemetry-label">بنك المفردات</span>
            <span className="font-mono text-frequency">{sectorVocab.length}</span>
          </span>
          <span className="hud-pill">
            <span className="lang-ar telemetry-label">مُشاهَد</span>
            <span className="font-mono text-cyan">{seenCount}</span>
          </span>
          <span className="hud-pill">
            <span className="lang-ar telemetry-label">بنك الكانجي</span>
            <span className="font-mono text-cyan">{activeKanji.length}</span>
          </span>
          <span className="hud-pill">
            <span className="lang-ar telemetry-label">السلاسل</span>
            <span className="font-mono text-amber">{chainsCompleted}</span>
          </span>
        </div>
      </header>

      <div data-testid="dojo-carousel" className="screen-body">
        <StageViewport expanded={stage.expanded} onCollapse={stage.collapse}>
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-2">
          <span className="lang-ar telemetry-label text-cyan">{stepMeta.titleAr}</span>
          <StageToggle expanded={stage.expanded} onToggle={stage.toggle} testId="dojo-expand" />
        </div>

        <div
          data-testid="dojo-track"
          className="relative min-h-0 flex-1 overflow-clip"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {DOJO_STEPS.map((step, index) => {
            const isActive = index === activeStep;
            const offset = activeStep - index;
            return (
              <div
                key={step.id}
                data-testid="dojo-step"
                data-step-id={step.id}
                data-active={isActive ? "true" : "false"}
                aria-hidden={!isActive}
                inert={!isActive}
                style={{
                  transform: `translateX(${offset * 100}%)`,
                  opacity: isActive ? 1 : 0,
                  pointerEvents: isActive ? "auto" : "none",
                }}
                className="absolute inset-0 h-full min-h-0 overflow-clip transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
              >
                {renderStep(index)}
              </div>
            );
          })}
        </div>

        <div className="mt-3 shrink-0" dir="rtl">
          <div className="glass-panel flex items-center justify-between gap-1.5 rounded-2xl px-2 py-2 sm:gap-2 sm:px-3">
            <button
              type="button"
              data-testid="dojo-prev"
              disabled={activeStep === 0}
              onClick={() => move(-1)}
              className="btn-ghost flex-none px-3 sm:px-5 disabled:opacity-40"
            >
              <span aria-hidden="true">→</span>
              <span className="lang-ar">السابق</span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto px-1 sm:gap-1.5"
                dir="ltr"
              >
                {DOJO_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={step.titleAr}
                    data-step-dot={step.id}
                    className="grid min-h-6 min-w-6 shrink-0 place-items-center"
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "h-1.5 rounded-full transition-all sm:h-2",
                        index === activeStep ? "w-5 bg-cyan sm:w-6" : "w-1.5 bg-line hover:bg-muted/60 sm:w-2",
                      ].join(" ")}
                    />
                  </button>
                ))}
              </div>
              <span data-testid="dojo-progress" className="lang-ar text-[11px] text-faint">
                الخطوة {activeStep + 1} من {DOJO_STEP_COUNT}
              </span>
            </div>
            <button
              type="button"
              data-testid="dojo-next"
              disabled={activeStep === DOJO_STEP_COUNT - 1}
              onClick={() => move(1)}
              className="btn-cyan flex-none px-3 sm:px-5 disabled:opacity-40"
            >
              <span className="lang-ar">التالي</span>
              <span aria-hidden="true">←</span>
            </button>
          </div>
        </div>
        </StageViewport>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            data-testid="dojo-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-6"
          >
            <div className="glass-panel rounded-2xl border-frequency/40 px-5 py-3 text-center shadow-[0_0_24px_rgba(69,240,223,0.25)]">
              <span className="lang-ar text-sm font-bold text-frequency">✓ {toast}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
