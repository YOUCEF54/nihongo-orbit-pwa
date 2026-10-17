"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconClose, IconSpark, IconVolume } from "@/components/icons";
import { useDialogFocus } from "@/components/ui";
import { speakJapanese } from "@/lib/japanese-tts";
import { dailyWordIndex, wordAt } from "@/lib/word-of-the-day";

export default function WordOfTheDay({ initialIndex }: { initialIndex?: number }) {
  const [index] = useState<number>(() => initialIndex ?? dailyWordIndex());
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const word = wordAt(index);

  const dialogRef = useDialogFocus<HTMLDivElement>(open);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ttsStopRef = useRef<(() => void) | null>(null);
  const ttsTimerRef = useRef<number | null>(null);

  const stopPlayback = useCallback(() => {
    if (ttsTimerRef.current !== null) {
      window.clearTimeout(ttsTimerRef.current);
      ttsTimerRef.current = null;
    }
    audioRef.current?.pause();
    ttsStopRef.current?.();
    ttsStopRef.current = null;
    setPlaying(false);
  }, []);

  const playTts = useCallback(() => {
    const playback = speakJapanese(word.japaneseText, { reading: word.furigana, rate: 0.85 });
    ttsStopRef.current = playback ? () => playback.stop() : null;
    const ms = Math.max(900, (playback?.duration ?? 1) * 1000);
    ttsTimerRef.current = window.setTimeout(() => {
      ttsTimerRef.current = null;
      setPlaying(false);
    }, ms);
  }, [word]);

  const handlePlay = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (playing) {
        stopPlayback();
        return;
      }
      setPlaying(true);
      const el = audioRef.current;
      if (el && word.audioUrl) {
        el.currentTime = 0;
        void el.play().catch(() => playTts());
      } else {
        playTts();
      }
    },
    [playing, stopPlayback, playTts, word],
  );

  const closeModal = useCallback(() => {
    stopPlayback();
    setOpen(false);
  }, [stopPlayback]);

  // Stop any audio when the widget unmounts.
  useEffect(() => stopPlayback, [stopPlayback]);

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeModal]);

  return (
    <>
      <motion.button
        type="button"
        layoutId="wotd-container"
        data-testid="wotd-trigger"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label={`كلمة اليوم: ${word.japaneseText} — ${word.arabicTranslation}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-cyan/25 bg-abyss/60 p-4 text-end shadow-[var(--glow-cyan)] backdrop-blur-md transition-shadow hover:border-cyan/50"
      >
        <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-in-out group-hover:-translate-x-full" />
        <span className="relative z-10 flex flex-col items-start gap-1">
          <span className="lang-ar flex items-center gap-2 text-sm font-bold text-cyan">
            <IconSpark className="h-4 w-4" />
            كلمة اليوم
          </span>
          <span className="lang-ar text-xs text-muted">كلمة مختارة لهذا اليوم</span>
        </span>
        <span className="relative z-10 h-10 w-px bg-line" />
        <motion.span
          layoutId="wotd-glyph"
          className="font-jp relative z-10 min-w-14 text-center text-3xl font-bold text-cream"
        >
          {word.japaneseText}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            />
            <motion.div
              ref={dialogRef}
              layoutId="wotd-container"
              role="dialog"
              aria-modal="true"
              aria-label="كلمة اليوم"
              data-testid="wotd-modal"
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
              className="glass-panel relative z-10 w-full max-w-[360px] overflow-hidden rounded-3xl outline-none"
            >
              <button
                type="button"
                data-testid="wotd-close"
                onClick={closeModal}
                aria-label="إغلاق"
                className="absolute end-4 top-4 z-20 grid h-8 w-8 place-items-center rounded-full border border-line bg-void/50 text-muted transition hover:border-cyan/50 hover:text-cyan"
              >
                <IconClose className="h-4 w-4" />
              </button>

              <div
                data-testid="wotd-hero"
                className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-cyan/10 to-transparent"
              >
                {word.art ? (
                  <span
                    data-testid="wotd-art"
                    role="img"
                    aria-label={word.arabicTranslation}
                    className="relative select-none text-7xl drop-shadow-[0_0_28px_rgba(0,240,255,0.35)]"
                  >
                    {word.art}
                  </span>
                ) : (
                  <span className="font-jp pointer-events-none absolute -bottom-6 start-2 select-none text-[10rem] leading-none text-cyan/5">
                    {word.japaneseText}
                  </span>
                )}
                <span className="lang-ar absolute bottom-3 end-3 z-10 flex items-center gap-1.5 rounded-full border border-cyan/30 bg-void/60 px-3 py-1.5 text-xs font-bold text-cyan backdrop-blur-md">
                  <IconSpark className="h-3 w-3" />
                  كلمة اليوم
                </span>
              </div>

              <div className="relative z-10 -mt-10 flex flex-col items-center px-6 pb-6">
                <div className="flex w-full items-end justify-center gap-6">
                  <button
                    type="button"
                    data-testid="wotd-play"
                    onClick={handlePlay}
                    aria-pressed={playing}
                    aria-label="تشغيل النطق"
                    className={[
                      "mb-2 grid h-12 w-12 place-items-center rounded-full border shadow-lg transition",
                      playing
                        ? "border-cyan bg-cyan/20 text-cyan"
                        : "border-line bg-abyss/80 text-cyan hover:border-cyan/50",
                    ].join(" ")}
                  >
                    <IconVolume className="h-5 w-5" />
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="lang-ar text-sm font-medium text-amber" dir="ltr">
                      {word.furigana}
                    </span>
                    <span
                      data-testid="wotd-glyph-main"
                      className="font-jp bg-gradient-to-b from-white to-cream bg-clip-text text-6xl font-extrabold tracking-wider text-transparent"
                    >
                      {word.japaneseText}
                    </span>
                    <span
                      data-testid="wotd-romaji"
                      className="telemetry mt-2 text-xs text-cyan/80"
                      dir="ltr"
                    >
                      {word.romaji}
                    </span>
                  </div>

                  <span className="h-12 w-12" />
                </div>

                <div className="mt-6 w-full space-y-3">
                  <div className="rounded-2xl border border-line bg-abyss/40 p-4 text-center">
                    <h3 data-testid="wotd-meaning" className="lang-ar text-xl font-bold text-cream">
                      {word.arabicTranslation}
                    </h3>
                    <p className="lang-ar mt-1 text-xs font-medium text-muted">
                      {word.categoryAr} <span className="mx-1">•</span> {word.sectorLabelAr}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan/20 bg-cyan/5 p-4">
                    <p
                      className="font-jp text-sm font-medium leading-relaxed text-cream"
                      dir="ltr"
                      style={{ textAlign: "left" }}
                    >
                      {word.example.jp}
                    </p>
                    <p
                      data-testid="wotd-example-ar"
                      className="lang-ar mt-2 text-sm leading-relaxed text-cyan/90"
                    >
                      {word.example.ar}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={word.audioUrl ?? undefined}
        onEnded={() => setPlaying(false)}
        onError={() => {
          if (playing) playTts();
        }}
        className="hidden"
      />
    </>
  );
}
