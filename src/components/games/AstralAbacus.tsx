"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ABACUS_GRID,
  ABACUS_HALF_HEIGHT,
  ABACUS_LEVELS,
  BOARD_NODES,
  VALID_PIVOTS,
  getNeighbors,
  isLevelSolved,
  rotateRing,
} from "@/lib/astral-abacus";
import { ARCADE_JADE_REWARD } from "@/lib/progress-state";
import { awardArcadeJade } from "@/lib/starlight";
import { RewardModal, jadePayout, StageToggle, PauseToggle, PausedOverlay } from "@/components/ui";
import { IconRotateCcw, IconRotateCw } from "@/components/icons";

const G = ABACUS_GRID;
const H = ABACUS_HALF_HEIGHT;
// Flat-topped hexagon outline + a tighter inner line for the double-line effect.
const HEX_POINTS = `${G},0 ${G / 2},${H} ${-G / 2},${H} ${-G},0 ${-G / 2},${-H} ${G / 2},${-H}`;
const RI = G - 4;
const HI = (RI * Math.sqrt(3)) / 2;
const HEX_POINTS_INNER = `${RI},0 ${RI / 2},${HI} ${-RI / 2},${HI} ${-RI},0 ${-RI / 2},${-HI} ${RI / 2},${-HI}`;

/** Pick a starting pivot whose ring actually holds a movable token, so the
    very first rotation is never a silent no-op (prefers non-block coins). */
function defaultPivot(tokens: { nodeId: number; isBlock: boolean }[]): number {
  const hasToken = (movableOnly: boolean) =>
    VALID_PIVOTS.find((pivot) =>
      getNeighbors(pivot).some((neighbor) =>
        tokens.some(
          (token) =>
            token.nodeId === neighbor.id && (!movableOnly || !token.isBlock),
        ),
      ),
    );
  return hasToken(true) ?? hasToken(false) ?? VALID_PIVOTS[0];
}

export default function AstralAbacus({
  userId,
  className = "",
  isExpanded = false,
  onToggleExpand,
}: {
  userId: string;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [tokens, setTokens] = useState(ABACUS_LEVELS[0].start);
  const [moves, setMoves] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [activePivot, setActivePivot] = useState<number>(() =>
    defaultPivot(ABACUS_LEVELS[0].start),
  );
  const [jadeTotal, setJadeTotal] = useState<number | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const awardedRef = useRef<string | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const level = ABACUS_LEVELS[levelIndex];
  const solved = isLevelSolved(tokens, level.targets);

  useEffect(() => {
    return () => {
      if (animTimer.current) clearTimeout(animTimer.current);
    };
  }, []);

  // Solve detection + one Jade prize per level (ref-guarded so React
  // StrictMode double-effects can never double-award).
  useEffect(() => {
    if (!solved || isSolved) return;
    const key = `abacus:${levelIndex}`;
    if (awardedRef.current !== key) {
      awardedRef.current = key;
      const starlight = awardArcadeJade(userId, ARCADE_JADE_REWARD);
      void queueMicrotask(() => {
        setIsSolved(true);
        setJadeTotal(starlight.jade);
        setRewardOpen(true);
      });
    }
  }, [solved, isSolved, levelIndex, userId, level.levelNum]);

  const rotate = useCallback(
    (direction: 1 | -1) => {
      if (isSolved || animating || paused) return;
      setTokens((prev) => rotateRing(prev, activePivot, direction));
      setMoves((value) => value + 1);
      setAnimating(true);
      if (animTimer.current) clearTimeout(animTimer.current);
      animTimer.current = setTimeout(() => setAnimating(false), 350);
    },
    [activePivot, animating, isSolved, paused],
  );

  const togglePause = () => setPaused((value) => !value);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (paused) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "a") rotate(-1);
      if (key === "d") rotate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotate, paused]);

  const restartLevel = () => {
    setTokens(level.start);
    setMoves(0);
    setIsSolved(false);
    setActivePivot(defaultPivot(level.start));
  };

  const nextLevel = () => {
    if (levelIndex >= ABACUS_LEVELS.length - 1) return;
    const next = levelIndex + 1;
    setLevelIndex(next);
    setTokens(ABACUS_LEVELS[next].start);
    setMoves(0);
    setIsSolved(false);
    setActivePivot(defaultPivot(ABACUS_LEVELS[next].start));
  };

  return (
    <div
      data-testid="astral-abacus"
      dir="rtl"
      className={["glass-panel relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-4", className].filter(Boolean).join(" ")}
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-2">
        <span className="lang-ar telemetry-label text-cyan">المعداد المداري</span>
        <div className="flex items-center gap-2">
          <PauseToggle paused={paused} onToggle={togglePause} />
          {onToggleExpand && (
            <StageToggle expanded={isExpanded} onToggle={onToggleExpand} testId="abacus-expand" />
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2" dir="rtl">
        <span className="chip is-cyan">
          <span className="lang-ar" data-testid="abacus-level">
            مرحلة {level.levelNum} / {ABACUS_LEVELS.length}
          </span>
        </span>
        <span className="chip">
          <span className="lang-ar">الحركات</span>
          <span className="count" dir="ltr" data-testid="abacus-moves">
            {moves}
          </span>
        </span>
        {jadeTotal !== null && (
          <span className="chip is-gold" data-testid="abacus-prize">
            <span className="lang-ar">+{ARCADE_JADE_REWARD} يشم</span>
          </span>
        )}
      </div>

      {/* Target blueprint — compact horizontal strip, no vertical scroll */}
      <div className="mb-2 flex items-center gap-3 rounded-xl border border-line bg-void/40 px-3 py-2" dir="rtl">
        <span className="font-jp text-4xl font-bold text-cream" dir="ltr">
          {level.kanji}
        </span>
        <span className="min-w-0 flex-none">
          <span className="lang-ar block truncate text-xs text-muted">{level.meaning}</span>
          <span className="telemetry block text-amber" dir="ltr">
            {level.romaji}
          </span>
        </span>
        <span className="lang-ar hidden text-faint">
          مخطط الهدف
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto" dir="ltr">
          {level.targets
            .filter((target) => !target.isBlock)
            .map((target) => (
              <span
                key={target.char}
                className="flex flex-none items-center gap-1.5 rounded-lg border border-line bg-abyss/40 px-2 py-1"
                title={`${target.romaji} — ${target.meaning}`}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan/40 bg-cyan/5 font-jp text-sm font-bold text-cream"
                  dir="ltr"
                >
                  {target.char}
                </span>
                <span className="telemetry text-cyan" dir="ltr">
                  {target.romaji}
                </span>
              </span>
            ))}
        </div>
      </div>

      {/* Board — bounded by container height, aspect preserved */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
        <div className="relative aspect-square max-h-full w-[min(100%,100cqh)]">
        <svg viewBox="-250 -250 500 500" className="h-full w-full" role="img" aria-label="لوحة المعداد المداري">
          <defs>
            <radialGradient id="abacus-teal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style={{ stopColor: "var(--color-cyan)" }} stopOpacity="0.35" />
              <stop offset="100%" style={{ stopColor: "var(--color-abyss)" }} stopOpacity="0.7" />
            </radialGradient>
            <linearGradient id="abacus-coin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--color-raised)" }} />
              <stop offset="100%" style={{ stopColor: "var(--color-abyss)" }} />
            </linearGradient>
            <linearGradient id="abacus-coin-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--color-gold-glow)" }} />
              <stop offset="50%" style={{ stopColor: "var(--color-amber)" }} />
              <stop offset="100%" style={{ stopColor: "var(--brand-lo)" }} />
            </linearGradient>
            <linearGradient id="abacus-coin-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--color-crimson)" }} stopOpacity="0.55" />
              <stop offset="100%" style={{ stopColor: "var(--color-crimson)" }} />
            </linearGradient>
          </defs>

          {BOARD_NODES.map((node) => {
            const isPivot = VALID_PIVOTS.includes(node.id);
            const isActive = activePivot === node.id;
            const isNeighbor = getNeighbors(activePivot).some((entry) => entry.id === node.id);
            return (
              <g
                key={`slot-${node.id}`}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px) ${isActive ? "scale(0.85)" : "scale(1)"}`,
                  transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                onClick={() => {
                  if (isPivot && !paused) setActivePivot(node.id);
                }}
                className={isPivot ? "cursor-pointer" : undefined}
                {...(isPivot
                  ? { "data-testid": "abacus-pivot", "data-pivot-id": node.id }
                  : {})}
              >
                <polygon
                  points={HEX_POINTS}
                  style={{ fill: isActive ? "url(#abacus-teal)" : "var(--color-abyss)" }}
                  stroke="#000"
                  strokeWidth="4"
                />
                <polygon
                  points={HEX_POINTS}
                  fill="none"
                  style={{
                    stroke: isActive
                      ? "var(--color-cyan)"
                      : isNeighbor
                        ? "var(--color-amber)"
                        : "var(--color-faint)",
                  }}
                  strokeWidth={isNeighbor ? 2 : 1.5}
                  opacity={isActive || isNeighbor ? 1 : 0.7}
                />
                <polygon
                  points={HEX_POINTS_INNER}
                  fill="none"
                  style={{ stroke: isActive ? "var(--color-cyan)" : "var(--color-faint)" }}
                  strokeWidth="1"
                  opacity="0.4"
                />
                {isActive && (
                  <circle
                    cx="0"
                    cy="0"
                    r="10"
                    fill="none"
                    style={{ stroke: "var(--color-cyan)" }}
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}
              </g>
            );
          })}

          {level.targets.map((target, index) => {
            const pos = BOARD_NODES.find((entry) => entry.id === target.nodeId);
            if (!pos) return null;
            return (
              <g
                key={`target-${index}`}
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
              >
                <circle
                  cx="0"
                  cy="0"
                  r="28"
                  fill="none"
                  style={{ stroke: "var(--color-amber)" }}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                {!target.isBlock ? (
                  <text
                    x="0"
                    y="8"
                    textAnchor="middle"
                    style={{ fill: "var(--color-amber)" }}
                    opacity="0.3"
                    fontSize="22"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {target.char}
                  </text>
                ) : (
                  <rect
                    x="-6"
                    y="-6"
                    width="12"
                    height="12"
                    style={{ fill: "var(--color-amber)" }}
                    opacity="0.3"
                    transform="rotate(45)"
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}

          {tokens.map((token) => {
            const pos = BOARD_NODES.find((entry) => entry.id === token.nodeId);
            if (!pos) return null;
            const targetAtNode = level.targets.find((entry) => entry.nodeId === token.nodeId);
            const isCorrect = targetAtNode?.char === token.char;
            const isError = targetAtNode !== undefined && targetAtNode.char !== token.char;
            return (
              <g
                key={token.id}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                className="pointer-events-none"
              >
                <circle
                  cx="0"
                  cy="0"
                  r="25"
                  fill={
                    isCorrect ? "url(#abacus-coin-gold)" : isError ? "url(#abacus-coin-red)" : "url(#abacus-coin)"
                  }
                  style={{
                    stroke: isCorrect
                      ? "var(--color-amber)"
                      : isError
                        ? "var(--color-crimson)"
                        : "var(--color-faint)",
                  }}
                  strokeWidth="2"
                />
                {!token.isBlock ? (
                  <text
                    x="0"
                    y="8"
                    textAnchor="middle"
                    style={{ fill: isCorrect ? "var(--color-void)" : "var(--color-cream)" }}
                    fontSize="22"
                    fontWeight="bold"
                    className="font-jp"
                  >
                    {token.char}
                  </text>
                ) : (
                  <rect
                    x="-6"
                    y="-6"
                    width="12"
                    height="12"
                    style={{ fill: isCorrect ? "var(--color-void)" : "var(--color-cream)" }}
                    transform="rotate(45)"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {isSolved && (
          <div
            data-testid="abacus-solved"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-void/70 p-6 text-center backdrop-blur-sm"
          >
            <p className="lang-ar text-amber">
              اكتملت الدارة
            </p>
            <span className="font-jp my-3 text-7xl font-bold text-cream" dir="ltr">
              {level.kanji}
            </span>
            <p className="lang-ar text-lg text-cream">{level.meaning}</p>
            <p className="telemetry mt-1 text-muted" dir="ltr">
              {level.romaji}
            </p>
            {levelIndex < ABACUS_LEVELS.length - 1 ? (
              <button
                type="button"
                data-testid="abacus-next"
                onClick={nextLevel}
                className="btn-cyan mt-5"
              >
                <span className="lang-ar">التسلسل التالي</span>
              </button>
            ) : (
              <p className="lang-ar mt-5 rounded-xl border border-cyan/40 px-6 py-2 text-sm font-bold text-cyan">
                اكتملت الوحدة
              </p>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Rotation controls */}
      <div className="mt-auto flex items-center justify-center gap-3 pt-2" dir="ltr">
        <button
          type="button"
          data-testid="abacus-rotate-ccw"
          onClick={() => rotate(-1)}
          disabled={isSolved || animating || paused}
          className="btn-ghost gap-2 px-5"
          aria-label="تدوير عكس عقارب الساعة"
        >
          <IconRotateCcw className="h-5 w-5" />
          <span className="telemetry text-[10px] text-faint" dir="ltr">
            A
          </span>
        </button>
        <button
          type="button"
          data-testid="abacus-rotate-cw"
          onClick={() => rotate(1)}
          disabled={isSolved || animating || paused}
          className="btn-ghost gap-2 px-5"
          aria-label="تدوير مع عقارب الساعة"
        >
          <IconRotateCw className="h-5 w-5" />
          <span className="telemetry text-[10px] text-faint" dir="ltr">
            D
          </span>
        </button>
        <button
          type="button"
          data-testid="abacus-reset"
          onClick={restartLevel}
          className="btn-cyan px-6"
        >
          <span className="lang-ar">إعادة</span>
        </button>
      </div>
      <p className="lang-ar mt-1 text-center text-xs text-faint">
        اختر محورًا مضيئًا ثم دوّر الحلقة بمفاتيح A / D أو الزرّين — طابق كل عملةٍ مقعدَها الذهبي.
      </p>

      <PausedOverlay show={paused} onResume={togglePause} />

      <RewardModal
        open={rewardOpen}
        onClose={() => setRewardOpen(false)}
        glyph={level.kanji}
        glyphAr={level.meaning}
        payouts={[jadePayout(ARCADE_JADE_REWARD)]}
      />
    </div>
  );
}
