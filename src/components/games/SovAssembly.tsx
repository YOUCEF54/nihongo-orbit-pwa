"use client";

import { useMemo, useState } from "react";
import type { SeedVocabularyItem } from "@/lib/data";
import type { SentenceSlot } from "@/types/learning";
import { hash, makeRandom, shuffle } from "@/lib/random";
import { EmptyState } from "@/components/ui";

const ROUNDS = 8;

interface Round {
  item: SeedVocabularyItem;
  slots: SentenceSlot[];
  scrambled: SentenceSlot[];
}

function buildRounds(pool: SeedVocabularyItem[], seed: number): Round[] {
  const candidates = pool.filter(
    (item) => item.slots_ar && item.slots_ar.length >= 2,
  );
  if (candidates.length === 0) return [];
  const rand = makeRandom(seed);
  const rounds: Round[] = [];
  while (rounds.length < ROUNDS) {
    for (const item of shuffle(candidates, rand)) {
      const slots = item.slots_ar ?? [];
      rounds.push({
        item,
        slots,
        scrambled: shuffle([...slots], makeRandom(hash(`${item.id}:${seed}`))),
      });
      if (rounds.length === ROUNDS) break;
    }
  }
  return rounds;
}

/** A span is correct when the chosen chunks' positions are strictly increasing — SOV order. */
function isCorrectOrder(chosen: SentenceSlot[]): boolean {
  for (let i = 0; i < chosen.length; i += 1) {
    if (chosen[i].position !== i) return false;
  }
  return true;
}

const CASE_CLASSES: Record<SentenceSlot["caseEn"], string> = {
  subject: "border-cyan/60 bg-cyan/10 text-cyan",
  object: "border-amber/60 bg-amber/10 text-amber",
  verb: "border-crimson/60 bg-crimson/10 text-cream",
  goal: "border-amethyst/60 bg-amethyst/10 text-amethyst",
  predicate: "border-frequency/60 bg-frequency/15 text-cream",
};

export default function SovAssembly({
  pool,
  className = "",
  onFinish,
}: {
  pool: SeedVocabularyItem[];
  className?: string;
  onFinish?: (score: number) => void;
}) {
  const [session, setSession] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [placed, setPlaced] = useState<SentenceSlot[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(false);

  const rounds = useMemo(
    () => buildRounds(pool, hash(`sov:${session}`)),
    [pool, session],
  );
  const round = rounds[roundIndex] ?? null;
  const finished = rounds.length > 0 && roundIndex >= rounds.length;

  const complete = round ? placed.length === round.slots.length : false;
  const correct = complete && isCorrectOrder(placed);

  const place = (slot: SentenceSlot) => {
    if (checked) return;
    setPlaced((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
  };

  const unplace = (slot: SentenceSlot) => {
    if (checked) return;
    setPlaced((prev) => prev.filter((entry) => entry !== slot));
  };

  const validate = () => {
    if (!complete || checked) return;
    setChecked(true);
    if (correct) setScore((value) => value + 1);
    else setAttempts((value) => value + 1);
  };

  const retry = () => {
    setPlaced([]);
    setChecked(false);
  };

  const next = () => {
    if (roundIndex + 1 >= rounds.length) onFinish?.(score);
    setPlaced([]);
    setChecked(false);
    setRoundIndex((value) => value + 1);
  };

  const restart = () => {
    setSession((value) => value + 1);
    setRoundIndex(0);
    setPlaced([]);
    setChecked(false);
    setAttempts(0);
    setScore(0);
  };

  if (pool.every((item) => !item.slots_ar || item.slots_ar.length < 2)) {
    return (
      <EmptyState
        descAr="راجع كلمات القطاع الأول ذات الجمل لتركيبها هنا."
        className={className}
      />
    );
  }

  if (finished) {
    const pct = Math.round((score / rounds.length) * 100);
    return (
      <div className={["glass-panel rounded-2xl p-8 text-center", className].filter(Boolean).join(" ")} dir="rtl">
        <p className="lang-ar text-lg font-bold text-cream">
          انتهى التمرين — نتيجتك {score} / {rounds.length}
        </p>
        <p className="lang-ar mt-2 text-amethyst">
          دقة التركيب · {pct}%
        </p>
        <button type="button" onClick={restart} className="btn-cyan mt-5">
          <span className="lang-ar">جلسة جديدة</span>
        </button>
      </div>
    );
  }

  if (!round) return null;

  const answer = placed.map((entry) => entry.chunk).join(" ") ||
    "— ضع المقاطع هنا —";

  return (
    <div
      data-testid="sov-assembly"
      className={["glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-4", className].filter(Boolean).join(" ")}
      dir="rtl"
    >
      <div className="mb-4 flex items-center justify-between border-b border-line pb-2 text-xs">
        <span className="lang-ar telemetry-label">تركيب الجملة اليابانية</span>
        <span className="lang-ar text-muted">
          {roundIndex + 1} / {rounds.length} · النقاط {score}
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-line bg-void/40 p-3">
        <p className="lang-ar text-center text-base font-bold text-cream">
          {round.item.exampleSentenceAr}
        </p>
        <p className="telemetry mt-1 text-center text-[10px] text-faint" dir="ltr">
          {round.item.romaji}
        </p>
      </div>

      {/* Answer zone */}
      <div
        data-testid="sov-answer"
        className={[
          "mb-4 flex min-h-[64px] flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 transition",
          checked && correct
            ? "border-frequency/70 bg-frequency/10"
            : checked
              ? "border-crimson/70 bg-crimson/10"
              : "border-line bg-abyss/40",
        ].join(" ")}
        dir="ltr"
      >
        {placed.length === 0 ? (
          <span className="lang-ar text-xs text-faint">{answer}</span>
        ) : (
          placed.map((entry) => (
            <button
              key={entry.jp}
              type="button"
              onClick={() => unplace(entry)}
              className={[
                "flex flex-col items-center gap-0.5 rounded-lg border px-3 py-1.5",
                CASE_CLASSES[entry.caseEn],
              ].join(" ")}
            >
              <span className="font-jp text-base text-cream">{entry.jp}</span>
              <span className="lang-ar text-[10px]">{entry.caseAr}</span>
            </button>
          ))
        )}
      </div>

      {/* Available chips */}
      <div className="mb-4 flex flex-wrap justify-center gap-2" dir="ltr">
        {round.scrambled
          .filter((entry) => !placed.includes(entry))
          .map((entry) => (
            <button
              key={entry.jp}
              type="button"
              data-testid="sov-chip"
              onClick={() => place(entry)}
              disabled={checked}
              className={[
                "flex flex-col items-center gap-0.5 rounded-lg border border-line bg-white/5 px-3 py-1.5 transition hover:border-amethyst/50 hover:bg-white/10",
                checked ? "cursor-default opacity-50" : "cursor-pointer",
              ].join(" ")}
            >
              <span className="font-jp text-base text-cream">{entry.jp}</span>
              <span className="lang-ar text-[10px] text-muted">{entry.caseAr}</span>
            </button>
          ))}
      </div>

      {!checked ? (
        <div className="mt-auto flex gap-3 pt-2">
          <button
            type="button"
            data-testid="sov-validate"
            onClick={validate}
            disabled={!complete}
            className="btn-cyan flex-1 disabled:opacity-40"
          >
            <span className="lang-ar">تحقق من الترتيب</span>
          </button>
          <button type="button" onClick={retry} className="btn-ghost flex-none">
            <span className="lang-ar">تصفير</span>
          </button>
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <p className="lang-ar text-sm text-muted">
            {correct
              ? "أحسنت — ترتيب مثالي."
              : "ليست الصحيحة — تذكّر: المبتدأ/الفاعل أولًا، ثم حروف الجرّ والمفعول، والفعل في النهاية."}
          </p>
          {!correct && attempts >= 0 && (
            <p className="lang-ar rounded-lg border border-line bg-void/40 p-2 text-xs leading-relaxed text-muted">
              الترتيب الصحيح:
              {" "}
              {round.slots
                .map((entry) => `${entry.jp} (${entry.caseAr})`)
                .join(" ← ")}
              {" · "}{round.item.exampleSentenceAr}
            </p>
          )}
          <div className="flex gap-3">
            {!correct && (
              <button type="button" onClick={retry} className="btn-ghost flex-1">
                <span className="lang-ar">أعد المحاولة</span>
              </button>
            )}
            <button type="button" data-testid="sov-next" onClick={next} className="btn-cyan flex-1">
              <span className="lang-ar">التالي</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
