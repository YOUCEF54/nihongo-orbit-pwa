"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildScrambleRounds,
  fullReading,
  isScrambleCorrect,
  partById,
  type ScrambleRound,
} from "@/lib/syntax-scramble";
import {
  preloadJapaneseVoice,
  speakJapanese,
} from "@/lib/japanese-tts";
import { playVocabWord } from "@/lib/japanese-audio";
import { phraseAudioUrl } from "@/lib/japanese-audio-manifest";
import type { Playback } from "@/lib/japanese-speech";
import { hash } from "@/lib/random";

type Difficulty = "beginner" | "advanced";
type Result = "none" | "correct" | "incorrect";

interface RoundState {
  slots: (string | null)[];
  bank: string[];
  selected: string | null;
  result: Result;
}

function initRound(round: ScrambleRound): RoundState {
  return {
    slots: Array(round.task.parts.length).fill(null),
    bank: [...round.bank],
    selected: null,
    result: "none",
  };
}

function ChipFace({
  text,
  sub,
  hint,
}: {
  text: string;
  sub: string;
  hint?: string;
}) {
  return (
    <>
      <span className="font-jp text-lg font-bold text-cream">{text}</span>
      <span className="text-[9px] font-medium text-muted" dir="ltr">
        {sub}
      </span>
      {hint ? (
        <span className="lang-ar mt-0.5 w-full truncate rounded bg-white/5 px-1.5 text-center text-[9px] font-bold text-frequency">
          {hint}
        </span>
      ) : null}
    </>
  );
}

function RoundView({
  rounds,
  difficulty,
  onFinish,
  className = "",
}: {
  rounds: ScrambleRound[];
  difficulty: Difficulty;
  onFinish: (score: number) => void;
  className?: string;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [state, setState] = useState<RoundState>(() => initRound(rounds[0]));
  const [score, setScore] = useState(0);
  const [dragged, setDragged] = useState<{
    id: string;
    source: "bank" | number;
  } | null>(null);
  const playbackRef = useRef<Playback | null>(null);

  useEffect(() => {
    preloadJapaneseVoice();
  }, []);

  const round = rounds[roundIndex] ?? null;
  if (!round) return null;
  const { task } = round;

  const speak = (text: string, reading: string, rate?: number) => {
    playbackRef.current?.stop();
    const audioUrl = phraseAudioUrl(text) ?? phraseAudioUrl(reading);
    playbackRef.current = audioUrl
      ? playVocabWord({ audioUrl, reading, rate })
      : speakJapanese(text, { reading, rate });
  };

  const settle = (
    slots: (string | null)[],
    bank: string[],
    selected: string | null,
  ) => {
    if (slots.every((entry) => entry !== null)) {
      if (isScrambleCorrect(task, slots)) {
        const next = score + 1;
        setScore(next);
        setState({ slots, bank, selected: null, result: "correct" });
        speak(task.fullJapanese, fullReading(task), 0.85);
        return;
      }
      setState({ slots, bank, selected, result: "incorrect" });
      return;
    }
    setState({ slots, bank, selected, result: "none" });
  };

  const place = (id: string, source: "bank" | number, target: number) => {
    if (state.result === "correct") return;
    const slots = [...state.slots];
    let bank = [...state.bank];
    const occupant = slots[target];
    if (source === "bank") {
      bank = bank.filter((entry) => entry !== id);
      if (occupant) bank = [...bank, occupant];
    } else if (source !== target) {
      slots[source] = occupant;
    } else {
      return;
    }
    slots[target] = id;
    settle(slots, bank, null);
  };

  const returnToBank = (slotIndex: number) => {
    if (state.result === "correct") return;
    const id = state.slots[slotIndex];
    if (!id) return;
    const slots = [...state.slots];
    slots[slotIndex] = null;
    settle(slots, [...state.bank, id], state.selected);
  };

  const tapBank = (id: string) => {
    if (state.result === "correct") return;
    if (state.selected !== id) {
      const part = partById(task, id);
      if (part) speak(part.text, part.reading);
    }
    setState((prev) => ({
      ...prev,
      selected: prev.selected === id ? null : id,
    }));
  };

  const tapSlot = (index: number) => {
    if (state.result === "correct") return;
    if (state.slots[index]) {
      returnToBank(index);
      return;
    }
    if (state.selected) place(state.selected, "bank", index);
  };

  const retry = () => setState(initRound(round));

  const next = () => {
    if (roundIndex + 1 < rounds.length) {
      setRoundIndex((value) => value + 1);
      setState(initRound(rounds[roundIndex + 1]));
    } else {
      onFinish(score);
    }
  };

  return (
    <div
      data-testid="syntax-scramble"
      className={["glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-4", className]
        .filter(Boolean)
        .join(" ")}
      dir="rtl"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between border-b border-line pb-2 text-xs">
        <span className="lang-ar telemetry-label">قطار الجمل</span>
        <span className="lang-ar text-muted">
          {roundIndex + 1} / {rounds.length} · النقاط {score}
        </span>
      </div>

      {/* Bounded middle (prompt · slots · status · bank) — scrolls only when
          the viewport is short, so it never bleeds over the pinned footer. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pe-0.5">
        <div className="shrink-0 text-center">
          <p className="lang-ar text-xs text-muted">رتّب الكلمات لتكوين الجملة:</p>
          <p className="lang-ar mt-0.5 text-base font-black text-cream">
            {task.translationAr}
          </p>
        </div>

        {/* Answer slots */}
        <div
          className={[
            "flex min-h-[64px] shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 transition",
          state.result === "correct"
            ? "border-frequency/60 bg-frequency/10"
            : state.result === "incorrect"
              ? "border-crimson/60 bg-crimson/10"
              : "border-line bg-abyss/40",
        ].join(" ")}
        dir="ltr"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (dragged) {
            const target = state.slots.findIndex((entry) => entry === null);
            if (target >= 0) place(dragged.id, dragged.source, target);
            setDragged(null);
          }
        }}
      >
        {state.slots.map((id, index) => {
          const part = id ? partById(task, id) : null;
          const hint =
            !part && difficulty === "beginner"
              ? partById(task, task.correctOrderIds[index])?.grammarTypeAr
              : undefined;
          return (
            <div
              key={`slot-${index}`}
              data-testid="syntax-slot"
              data-slot-index={index}
              data-filled={part ? "true" : "false"}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (dragged) place(dragged.id, dragged.source, index);
                setDragged(null);
              }}
              onClick={() => tapSlot(index)}
              className={[
                "flex min-h-[60px] min-w-[72px] items-center justify-center rounded-xl transition",
                part ? "" : "border-2 border-dashed border-line bg-void/40",
                !part && state.selected
                  ? "cursor-pointer hover:border-amber/60"
                  : !part
                    ? "cursor-pointer"
                    : "",
              ].join(" ")}
            >
              {part ? (
                <button
                  type="button"
                  draggable={state.result !== "correct"}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    setDragged({ id: part.id, source: index });
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    tapSlot(index);
                  }}
                  className={[
                    "flex flex-col items-center rounded-xl border px-3 py-1.5 shadow-md transition hover:scale-105",
                    state.result === "correct"
                      ? "border-frequency/60 bg-frequency/15"
                      : state.result === "incorrect"
                        ? "border-crimson/60 bg-crimson/10"
                        : "cursor-grab border-cyan/50 bg-cyan/10 active:cursor-grabbing",
                  ].join(" ")}
                >
                  <ChipFace
                    text={part.text}
                    sub={`${part.reading} (${part.romaji})`}
                    hint={difficulty === "beginner" ? part.meaningAr : undefined}
                  />
                </button>
              ) : (
                <span className="lang-ar pointer-events-none px-2 text-center text-xs font-bold text-faint">
                  {hint ?? "···"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {state.result === "correct" && (
        <div className="mb-2 shrink-0 rounded-xl border border-frequency/40 bg-frequency/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="lang-ar text-sm font-bold text-frequency">بناء مثالي!</p>
            <button type="button" data-testid="syntax-next" onClick={next} className="btn-cyan px-6">
              <span className="lang-ar">التالي</span>
            </button>
          </div>
          <p className="telemetry text-center text-[10px] text-muted" dir="ltr">
            {task.romaji}
          </p>
        </div>
      )}
      {state.result === "incorrect" && (
        <p className="lang-ar mb-2 shrink-0 text-center text-sm text-muted">
          ليس بعد — تذكّر: الفاعل أولًا، ثم المفعول، والفعل في النهاية.
        </p>
      )}

      {/* Word bank */}
        <div className="shrink-0 rounded-2xl border border-line bg-void/40 p-3">
          <div className="mb-2 flex items-center justify-between border-b border-line/60 pb-2">
            <p className="lang-ar text-xs font-bold text-muted">بنك الكلمات</p>
            <p className="lang-ar text-[10px] text-faint">انقر للتحديد ثم انقر المربع</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2" dir="ltr">
          {state.bank.map((id) => {
            const part = partById(task, id);
            if (!part) return null;
            const active = state.selected === id;
            return (
              <button
                key={`bank-${id}`}
                type="button"
                data-testid="syntax-chip"
                data-part-id={id}
                draggable={state.result !== "correct"}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDragged({ id, source: "bank" });
                }}
                onClick={() => tapBank(id)}
                className={[
                  "flex flex-col items-center rounded-xl border px-3 py-1.5 transition",
                  active
                    ? "scale-105 border-amber/70 bg-amber/15 shadow-[0_0_14px_var(--color-amber)]"
                    : "border-line bg-white/5 hover:border-cyan/40 hover:bg-white/10",
                  state.result === "correct" ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                <ChipFace
                  text={part.text}
                  sub={part.reading}
                  hint={difficulty === "beginner" ? part.meaningAr : undefined}
                />
              </button>
            );
          })}
          {state.bank.length === 0 && state.result !== "correct" && (
            <span className="lang-ar py-4 text-sm text-muted">
              اللوحة مكتملة. جارٍ التحقق...
            </span>
          )}
        </div>
      </div>
      </div>

      <div className="mt-2 flex shrink-0 gap-3">
        <button
          type="button"
          data-testid="syntax-listen"
          onClick={() => speak(task.fullJapanese, fullReading(task), 0.85)}
          className="btn-telemetry flex-1"
        >
          <span className="lang-ar">استمع للجملة</span>
        </button>
        <button type="button" data-testid="syntax-retry" onClick={retry} className="btn-ghost flex-none">
          <span className="lang-ar">تصفير</span>
        </button>
      </div>
    </div>
  );
}

export default function SyntaxScramble({
  className = "",
  onFinish,
}: {
  className?: string;
  onFinish?: (score: number) => void;
}) {
  const [session, setSession] = useState(0);
  const [gameState, setGameState] = useState<"intro" | "playing" | "results">("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [score, setScore] = useState(0);

  const rounds = useMemo(
    () => buildScrambleRounds(hash(`scramble:${session}`)),
    [session],
  );

  const startGame = (selected: Difficulty) => {
    setDifficulty(selected);
    setSession((value) => value + 1);
    setScore(0);
    setGameState("playing");
  };

  if (gameState === "intro") {
    return (
      <div
        data-testid="syntax-intro"
        className={["glass-panel rounded-2xl p-6 text-center", className]
          .filter(Boolean)
          .join(" ")}
        dir="rtl"
      >
        <p className="lang-ar text-lg font-black text-cream">قطار الجمل</p>
        <p className="lang-ar mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          رتّب الكلمات لبناء جملة يابانية صحيحة — كل كلمة تحمل معناها،
          والجملة اليابانية ترتيبها: الفاعل ← المفعول ← الفعل.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            data-testid="syntax-start-beginner"
            onClick={() => startGame("beginner")}
            className="btn-telemetry flex-1"
          >
            <span className="lang-ar">مبتدئ (مع مساعدة)</span>
          </button>
          <button
            type="button"
            data-testid="syntax-start-advanced"
            onClick={() => startGame("advanced")}
            className="btn-cyan flex-1"
          >
            <span className="lang-ar">متقدم (بدون ترجمة)</span>
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "results") {
    const pct = rounds.length > 0 ? Math.round((score / rounds.length) * 100) : 0;
    return (
      <div
        data-testid="syntax-results"
        className={["glass-panel rounded-2xl p-8 text-center", className]
          .filter(Boolean)
          .join(" ")}
        dir="rtl"
      >
        <p className="lang-ar text-lg font-bold text-cream">
          اكتمل التحدي — نتيجتك {score} / {rounds.length}
        </p>
        <p className="lang-ar mt-2 text-amber">
          دقة التركيب · {pct}%
        </p>
        <button type="button" onClick={() => setGameState("intro")} className="btn-cyan mt-5">
          <span className="lang-ar">العب مرة أخرى</span>
        </button>
      </div>
    );
  }

  return (
    <RoundView
      key={session}
      rounds={rounds}
      difficulty={difficulty}
      onFinish={(finalScore) => {
        setScore(finalScore);
        setGameState("results");
        onFinish?.(finalScore);
      }}
      className={className}
    />
  );
}
