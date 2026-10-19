"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FLOOD_GRID,
  FLOOD_MAX_MOVES,
  RADICAL_TOKENS,
  dealFlood,
  floodFill,
  isUnified,
  type FloodBoard,
  type RadicalToken,
} from "@/lib/radical-flood";
import { hash, makeRandom } from "@/lib/random";
import { speakJapanese } from "@/lib/japanese-tts";
import { playVocabWord, prefetchVocabAudio } from "@/lib/japanese-audio";
import { phraseAudioUrl } from "@/lib/japanese-audio-manifest";
import type { Playback } from "@/lib/japanese-speech";
import { ARCADE_JADE_REWARD } from "@/lib/progress-state";
import { awardArcadeJade } from "@/lib/starlight";
import { ARCADE_PASS_POINTS, noteResonanceActivity } from "@/lib/resonance";
import { RewardModal, jadePayout, StageToggle, PauseToggle, PausedOverlay } from "@/components/ui";

type FloodState = "playing" | "won" | "lost";

export default function RadicalConfluence({
  userId,
  seed,
  className = "",
  isExpanded = false,
  onToggleExpand,
}: {
  userId: string;
  /** Fixed deal seed (used by E2E for deterministic boards). */
  seed?: number;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [session, setSession] = useState(seed ?? 0);
  const [board, setBoard] = useState<FloodBoard>([]);
  const [movesLeft, setMovesLeft] = useState(FLOOD_MAX_MOVES);
  const [gameState, setGameState] = useState<FloodState>("playing");
  const [targetTokenId, setTargetTokenId] = useState(0);
  const [selectedTool, setSelectedTool] = useState(0);
  const [prizeShown, setPrizeShown] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const awardedRef = useRef<string | null>(null);
  const soundRef = useRef<Playback | null>(null);
  const boardRegionRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Keep the square board exactly bounded by the available region on both
  // axes (a pure CSS aspect-ratio + max-height combo clips the grid when the
  // height is the tighter constraint).
  useEffect(() => {
    const region = boardRegionRef.current;
    const square = boardRef.current;
    if (!region || !square) return;
    const apply = () => {
      const rect = region.getBoundingClientRect();
      const side = Math.max(0, Math.min(rect.width, rect.height, 520));
      square.style.width = `${side}px`;
      square.style.height = `${side}px`;
      square.style.setProperty("--fld-cell", `${side}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => soundRef.current?.stop(), []);

  // Warm the four radical clips so the first brush tap plays instantly.
  useEffect(() => {
    for (const token of RADICAL_TOKENS) prefetchVocabAudio(phraseAudioUrl(token.reading));
  }, []);

  // Deal on mount + every restart (client-only, so seeded deals never
  // mismatch server renders).
  useEffect(() => {
    const rand = makeRandom(hash(`flood:${session}`));
    const deal = dealFlood(rand);
    void queueMicrotask(() => {
      setBoard(deal.board);
      setTargetTokenId(deal.targetTokenId);
      setMovesLeft(FLOOD_MAX_MOVES);
      setGameState("playing");
      setSelectedTool(0);
      setPrizeShown(false);
    });
  }, [session]);

  const startNewGame = () => setSession((value) => value + 1);

  const togglePause = useCallback(() => {
    setPaused((value) => {
      if (!value) soundRef.current?.stop();
      return !value;
    });
  }, []);

  const previewRadical = useCallback((token: RadicalToken) => {
    soundRef.current?.stop();
    const audioUrl = phraseAudioUrl(token.reading);
    soundRef.current = audioUrl
      ? playVocabWord({ audioUrl, reading: token.reading })
      : speakJapanese(token.reading, { reading: token.reading });
  }, []);

  const handleCellClick = (row: number, col: number) => {
    if (paused || gameState !== "playing" || board.length === 0) return;
    if (board[row][col].id === selectedTool) return;
    setBoard(floodFill(board, row, col, selectedTool));
    setMovesLeft((value) => value - 1);
  };

  // Win/loss evaluation + one Jade prize per solved board.
  useEffect(() => {
    if (board.length === 0 || gameState !== "playing") return;
    const won = isUnified(board, targetTokenId);
    if (!won && movesLeft > 0) return;
    const key = `flood:${session}`;
    if (won && awardedRef.current !== key) {
      awardedRef.current = key;
      awardArcadeJade(userId, ARCADE_JADE_REWARD);
      noteResonanceActivity(userId, ARCADE_PASS_POINTS);
      void queueMicrotask(() => {
        setGameState("won");
        setPrizeShown(true);
        setRewardOpen(true);
      });
    } else if (!won && movesLeft <= 0) {
      void queueMicrotask(() => setGameState("lost"));
    }
  }, [board, movesLeft, gameState, targetTokenId, session, userId]);

  const target = RADICAL_TOKENS[targetTokenId];
  const movesPct = Math.round((movesLeft / FLOOD_MAX_MOVES) * 100);

  return (
    <div
      data-testid="radical-confluence"
      dir="rtl"
      className={["glass-panel relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-4", className].filter(Boolean).join(" ")}
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-2">
        <span className="lang-ar telemetry-label text-cyan">توحيد الجذور</span>
        <div className="flex items-center gap-2">
          <PauseToggle paused={paused} onToggle={togglePause} />
          {onToggleExpand && (
            <StageToggle expanded={isExpanded} onToggle={onToggleExpand} testId="flood-expand" />
          )}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="chip is-cyan">
            <span className="lang-ar">الهدف</span>
          </span>
          {target && (
            <span data-testid="flood-target" className="flex items-center gap-2">
              <span className="font-jp text-2xl font-black text-cream" dir="ltr">
                {target.char}
              </span>
              <span className="telemetry text-muted" dir="ltr">
                {target.name}
              </span>
              <span className="lang-ar text-xs text-muted">{target.meaningAr}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {prizeShown && (
            <span className="chip is-gold" data-testid="flood-prize">
              <span className="lang-ar">+{ARCADE_JADE_REWARD} يشم</span>
            </span>
          )}
          <span className="telemetry text-muted" dir="ltr" data-testid="flood-moves">
            {movesLeft} / {FLOOD_MAX_MOVES}
          </span>
        </div>
      </div>
      <div className="meter mb-2" aria-hidden="true">
        <div
          className={`meter-fill ${movesLeft <= 3 ? "is-crimson" : ""}`}
          style={{ width: `${movesPct}%` }}
        />
      </div>

      {/* Board — sized to the tighter of the region's width/height */}
      <div
        ref={boardRegionRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center"
      >
        <div
          ref={boardRef}
          className="chamfer-border relative border border-line bg-void/60 p-1"
        >
        <div dir="ltr" className="chamfer bg-void p-1">
          {board.length > 0 && (
            <div
              className="grid w-full gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${FLOOD_GRID}, minmax(0, 1fr))` }}
            >
              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const token = RADICAL_TOKENS[cell.id];
                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      data-testid="flood-cell"
                      data-r={rIdx}
                      data-c={cIdx}
                      disabled={gameState !== "playing"}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      className="relative flex aspect-square min-h-0 min-w-0 cursor-pointer items-center justify-center bg-raised transition hover:ring-1 hover:ring-white/40 disabled:cursor-default"
                      aria-label={`خلية ${token.char}`}
                    >
                      <span
                        className="absolute inset-0"
                        style={{
                          backgroundColor: token.hex,
                          transitionProperty: "background-color",
                          transitionDuration: "250ms",
                          transitionDelay: `${cell.depth * 35}ms`,
                        }}
                      />
                      <span
                        className="font-jp relative z-10 font-bold select-none"
                        style={{
                          color: "#111",
                          fontSize: "calc(var(--fld-cell, 320px) / 17)",
                          transitionDelay: `${cell.depth * 35}ms`,
                        }}
                      >
                        {token.char}
                      </span>
                    </button>
                  );
                }),
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {gameState !== "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              data-testid="flood-result"
              data-result={gameState}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 p-6 text-center backdrop-blur-sm"
            >
              <p className="lang-ar text-lg font-bold" dir="rtl">
                {gameState === "won" ? (
                  <span className="text-amber">اكتملت المصفوفة</span>
                ) : (
                  <span className="text-crimson">نفدت الدورات</span>
                )}
              </p>
              <p className="lang-ar mt-2 text-sm text-muted">
                {gameState === "won"
                  ? "تم توحيد المصفوفة الهيكلية بنجاح."
                  : "نفدت دورات التزامن. يرجى إعادة المحاولة."}
              </p>
              <button
                type="button"
                data-testid="flood-again"
                onClick={startNewGame}
                className="btn-cyan mt-5"
              >
                <span className="lang-ar">{gameState === "won" ? "تابع" : "إعادة المحاولة"}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Tool palette */}
      <div className="mt-2">
        <p className="lang-ar mb-1 text-faint">
          اختر عقدة الجذر
        </p>
        <div className="flex items-stretch gap-1.5 md:gap-3" dir="ltr">
          {RADICAL_TOKENS.map((token) => {
            const isActive = selectedTool === token.id;
            return (
              <button
                key={token.id}
                type="button"
                data-testid="flood-tool"
                data-tool-id={token.id}
                aria-pressed={isActive}
                disabled={gameState !== "playing" || paused}
                onClick={() => {
                  previewRadical(token);
                  setSelectedTool(token.id);
                }}
                className={[
                  "flex flex-1 flex-col items-center justify-center gap-0.5 border px-1 py-2 transition disabled:cursor-not-allowed disabled:opacity-50",
                  isActive
                    ? "border-cyan bg-cyan/15"
                    : "border-line bg-abyss/40 hover:border-cyan/40",
                ].join(" ")}
              >
                <span
                  className="font-jp text-xl font-black md:text-2xl"
                  dir="ltr"
                  style={{ color: isActive ? "var(--color-cream)" : token.hex }}
                >
                  {token.char}
                </span>
                <span className="telemetry text-[9px] text-muted" dir="ltr">
                  {token.name}
                </span>
                <span className="lang-ar text-[10px] text-muted">{token.meaningAr}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-end border-t border-line pt-2">
          <button
            type="button"
            data-testid="flood-restart"
            onClick={startNewGame}
            className="btn-ghost px-5 py-1.5"
          >
            <span className="lang-ar">مصفوفة جديدة</span>
          </button>
        </div>
      </div>

      <PausedOverlay show={paused} onResume={togglePause} />

      <RewardModal
        open={rewardOpen}
        onClose={() => setRewardOpen(false)}
        glyph={target?.char}
        glyphAr={target?.meaningAr}
        payouts={[jadePayout(ARCADE_JADE_REWARD)]}
      />
    </div>
  );
}
