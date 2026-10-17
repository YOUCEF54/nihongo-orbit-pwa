"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EnergyPanel, StarlightPanel, StreakPanel } from "@/components/ui";
import WordOfTheDay from "@/components/word-of-the-day/WordOfTheDay";
import { IconArchive, IconBolt, IconDojo, IconSpark, IconTrophy, IconOrbit } from "@/components/icons";
import { handleLabelFor } from "@/lib/shell";
import { dueInDays, masteryToCard } from "@/lib/fsrs";
import { loadMasteryLocal } from "@/lib/mastery";
import { initStreak, type StreakState } from "@/lib/gamification";
import { loadStreak, REVIEW_ENERGY_COST } from "@/lib/progress-state";
import { VOCAB_SEED } from "@/data/vocab.seed";
import type { UserMasteryState } from "@/types/learning";

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "صباح الخير";
  if (hour >= 12 && hour < 18) return "مساء الخير";
  if (hour >= 18 && hour < 23) return "مساء الخير";
  return "ليلة هادئة";
}

export default function HomeDashboard({
  userId,
  userEmail,
  initialMastery,
}: {
  userId: string;
  userEmail: string;
  initialMastery: Record<string, UserMasteryState>;
}) {
  const handle = handleLabelFor(userEmail);

  const mastery = useMemo(
    () => ({ ...initialMastery, ...loadMasteryLocal(userId) }),
    [initialMastery, userId],
  );

  const sector1Vocab = useMemo(
    () => VOCAB_SEED.filter((word) => word.sector === "sector-1"),
    [],
  );

  const deckSize = sector1Vocab.length;
  const reviewed = useMemo(
    () => sector1Vocab.filter((word) => (mastery[word.id]?.reps ?? 0) > 0).length,
    [mastery, sector1Vocab],
  );
  const dueToday = useMemo(() => {
    const now = new Date();
    return sector1Vocab.filter((word) => {
      const state = mastery[word.id];
      if (!state || state.reps <= 0) return false;
      return dueInDays(masteryToCard(state), now) <= 0;
    }).length;
  }, [mastery, sector1Vocab]);
  const freshCount = deckSize - reviewed;
  const masteredPct = deckSize > 0 ? Math.round((reviewed / deckSize) * 100) : 0;

  const [streak, setStreak] = useState<StreakState>(() => initStreak());
  useEffect(() => {
    void queueMicrotask(() => {
      setStreak(loadStreak(userId) ?? initStreak());
    });
  }, [userId]);

  const goals = [
    { label: "أتقنت حتى الآن", value: reviewed, total: deckSize, cls: "is-cyan" },
    { label: "للمراجعة اليوم", value: dueToday, total: deckSize, cls: "is-hazard" },
    { label: "بطاقات جديدة", value: freshCount, total: deckSize, cls: "" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 lg:px-8">
      {/* Hero */}
      <section className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="telemetry text-cyan" suppressHydrationWarning>
              {new Intl.DateTimeFormat("ar", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </p>
            <h1 className="lang-ar mt-1 text-3xl font-extrabold text-cream">
              {greetingFor(new Date().getHours())}، {handle}!
            </h1>
            <p className="lang-ar mt-1 text-sm text-muted">
              وجهة اليوم — أكمل مراجعات القطاع الأول راجع بجدولتك وواصِل رصيد أيام نشاطك.
            </p>
          </div>

          <div className="shrink-0">
            <WordOfTheDay />
          </div>
        </div>
      </section>

      {/* Today goals */}
      <section className="mb-8">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title lang-ar">مهام اليوم</h2>
            <span className="telemetry text-cyan" dir="ltr">
              {dueToday} / {reviewed}
            </span>
          </div>
          <div className="panel-body grid gap-5 lg:grid-cols-3">
            {goals.map((goal) => {
              const pct = goal.total > 0 ? Math.round((goal.value / goal.total) * 100) : 0;
              return (
                <div key={goal.label}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="lang-ar font-bold text-muted">{goal.label}</span>
                    <span className="telemetry text-muted" dir="ltr">
                      {goal.value} / {goal.total}
                    </span>
                  </div>
                  <div className="meter">
                    <div className={`meter-fill ${goal.cls}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Energy + Streak + Starlight */}
      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <EnergyPanel userId={userId} />
        <StreakPanel userId={userId} />
        <StarlightPanel userId={userId} />
      </section>

      {/* Quick actions */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/practice#review"
          className="panel group transition hover:border-cyan/50 hover:shadow-[var(--glow-cyan)]"
        >
          <div className="panel-body">
            <IconBolt className="h-6 w-6 text-cyan" />
            <p className="lang-ar mt-3 font-extrabold text-cream">المراجعة اليومية</p>
            <p className="lang-ar mt-1 text-xs text-muted">بطاقات FSRS بجدولة متباعدة</p>
            <span className="chip is-cyan mt-4">
              <span className="lang-ar">ابدأ</span>
            </span>
          </div>
        </Link>

        <Link
          href="/practice#matrix"
          className="panel group transition hover:border-cyan/50 hover:shadow-[var(--glow-cyan)]"
        >
          <div className="panel-body">
            <IconDojo className="h-6 w-6 text-cyan" />
            <p className="lang-ar mt-3 font-extrabold text-cream">تدريب الكتابة</p>
            <p className="lang-ar mt-1 text-xs text-muted">قاعة الكانجي — سكتات KanjiVG بالترتيب</p>
            <span className="chip is-cyan mt-4">
              <span className="lang-ar">ابدأ</span>
            </span>
          </div>
        </Link>

        <Link
          href="/practice#grammar"
          className="panel group transition hover:border-cyan/50 hover:shadow-[var(--glow-cyan)]"
        >
          <div className="panel-body">
            <IconArchive className="h-6 w-6 text-cyan" />
            <p className="lang-ar mt-3 font-extrabold text-cream">مرجع الإعراب</p>
            <p className="lang-ar mt-1 text-xs text-muted">جسيمات القواعد — الفاعل والمفعول به</p>
            <span className="chip is-cyan mt-4">
              <span className="lang-ar">استعرِض</span>
            </span>
          </div>
        </Link>

        <Link
          href="/games"
          className="panel group transition hover:border-cyan/50 hover:shadow-[var(--glow-cyan)]"
        >
          <div className="panel-body">
            <IconOrbit className="h-6 w-6 text-cyan" />
            <p className="lang-ar mt-3 font-extrabold text-cream">أركيد الألعاب</p>
            <p className="lang-ar mt-1 text-xs text-muted">المعداد المداري وتوحيد الجذور — ألغاز الجذور</p>
            <span className="chip is-cyan mt-4">
              <span className="lang-ar">العب</span>
            </span>
          </div>
        </Link>
      </section>

      {/* Telemetry */}
      <section className="mb-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="panel panel-body flex flex-col items-center justify-center gap-2 text-center">
          <span className="telemetry-label lang-ar text-faint">تقدّم القطاع الأول</span>
          <span className="font-display text-5xl font-extrabold text-cyan" dir="ltr">
            {reviewed}
            <span className="text-2xl text-faint"> / {deckSize}</span>
          </span>
          <span className="lang-ar text-muted">
            {masteredPct}% · القطاع الأول
          </span>
          <div className="meter mt-2 w-full">
            <div className="meter-fill is-cyan" style={{ width: `${masteredPct}%` }} />
          </div>
        </div>
        <div className="panel panel-body flex flex-col justify-center gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="chip is-cyan">
              <IconBolt className="h-3.5 w-3.5" /> للمراجعة اليوم {dueToday}
            </span>
            <span className="chip is-amethyst">
              <IconSpark className="h-3.5 w-3.5" /> بطاقات جديدة {freshCount}
            </span>
            <span className="chip">
              <IconArchive className="h-3.5 w-3.5" /> كلمات مُحدَّثة {reviewed}
            </span>
            <span className="chip is-hazard">
              <IconTrophy className="h-3.5 w-3.5" /> سلسلة ×{streak.current}
            </span>
          </div>
          <p className="lang-ar text-xs leading-relaxed text-muted">
            كل بطاقة تُروى بخوارزمية FSRS، وكل مراجعة تُنهي بطاقة وتستهلك {REVIEW_ENERGY_COST} نقطة من
            طاقة الصفاء وتُسجّل يوم نشاط في سلسلتك — ورصيد أيامك لا يُصفَّر عند الغياب، بل يذوّب زخمك فقط.
          </p>
        </div>
      </section>
    </div>
  );
}