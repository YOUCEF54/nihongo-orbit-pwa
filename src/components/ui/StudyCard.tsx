"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface StudyCardProps {
  kanji: string;
  furigana: string;
  arabicTranslation: string;
  rootCategory: string;
  className?: string;
}

export default function StudyCard({
  kanji,
  furigana,
  arabicTranslation,
  rootCategory,
  className = "",
}: StudyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [, setIsHovered] = useState(false);

  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });
  const glareX = useSpring(50, { stiffness: 300, damping: 30 });
  const glareY = useSpring(50, { stiffness: 300, damping: 30 });
  // Coalesce mousemove bursts to one spring update per frame.
  const glareRaf = useRef<number | null>(null);
  const pendingGlare = useRef<{ px: number; py: number } | null>(null);

  const flushGlare = useCallback(() => {
    glareRaf.current = null;
    const pending = pendingGlare.current;
    pendingGlare.current = null;
    if (!pending) return;
    rotateX.set((0.5 - pending.py) * 30);
    rotateY.set((pending.px - 0.5) * 30);
    glareX.set(pending.px * 100);
    glareY.set(pending.py * 100);
  }, [rotateX, rotateY, glareX, glareY]);

  useEffect(
    () => () => {
      if (glareRaf.current !== null) cancelAnimationFrame(glareRaf.current);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

      const rect = cardRef.current.getBoundingClientRect();
      pendingGlare.current = {
        px: (event.clientX - rect.left) / rect.width,
        py: (event.clientY - rect.top) / rect.height,
      };
      if (glareRaf.current === null) {
        glareRaf.current = requestAnimationFrame(flushGlare);
      }
    },
    [flushGlare],
  );

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (glareRaf.current !== null) {
      cancelAnimationFrame(glareRaf.current);
      glareRaf.current = null;
    }
    pendingGlare.current = null;
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }, [rotateX, rotateY, glareX, glareY]);

  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.25) 0%, rgba(0,0,0,0) 70%)`,
  );

  return (
    <div className={["[perspective:1000px] aspect-[3/4] w-full max-w-72", className].filter(Boolean).join(" ")}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-abyss/80 shadow-2xl backdrop-blur-xl transition-shadow duration-300 hover:shadow-[var(--glow-cyan)]"
      >
        {/* Pointer-driven holographic glare */}
        <motion.div
          style={{ background: glareBackground }}
          className="pointer-events-none absolute inset-0 z-20"
        />

        {/* Card content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-5 text-cream [transform-style:preserve-3d]">
          <div className="flex items-center justify-between text-xs">
            <span className="telemetry text-cyan">{rootCategory}</span>
            <span className="lang-ar telemetry-label rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5">
              بطاقة دراسة
            </span>
          </div>

          <div className="my-auto flex flex-col items-center justify-center">
            <span className="mb-1 text-sm font-medium text-amber" dir="ltr">
              {furigana}
            </span>
            <span className="font-jp bg-gradient-to-b from-white to-slate-300 bg-clip-text text-6xl font-extrabold tracking-wider text-transparent">
              {kanji}
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3" dir="rtl">
            <p className="lang-ar text-sm font-semibold text-cream">{arabicTranslation}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
