/* ============================================================
   Japanese audio playback. Prefers real pre-generated MP3s
   (audioUrl) over the formant synth fallback.
   ============================================================ */

"use client";

import { playJapanese, type Playback, type PlayOptions } from "./japanese-speech";
import type { PitchState } from "@/types/learning";

export interface PlayVocabOptions extends PlayOptions {
  audioUrl?: string | null;
  reading?: string;
  accent?: PitchState[];
  /** Playback speed multiplier (0.75–1.5). Scales MP3 playbackRate and
      shortens mora duration for the synth fallback. */
  rate?: number;
  /** Called when the MP3 element rejects playback (e.g. autoplay policy). */
  onError?: (error: unknown) => void;
}

let sharedAudio: HTMLAudioElement | null = null;

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

/** Warm the browser cache for an upcoming round's MP3 so taps play instantly. */
export function prefetchVocabAudio(audioUrl?: string | null): void {
  if (typeof window === "undefined" || !audioUrl) return;
  try {
    const probe = new Audio();
    probe.preload = "auto";
    probe.src = audioUrl;
  } catch {
    // prefetch is best-effort only
  }
}

export function playVocabWord(options: PlayVocabOptions = {}): Playback | null {
  const { audioUrl, reading, accent = [], rate = 1, onError, ...rest } = options;

  // Prefer real audio file if provided
  if (audioUrl) {
    const audio = getSharedAudio();
    if (audio) {
      try {
        audio.pause();
      } catch {
        // ignore
      }
      audio.currentTime = 0;
      audio.src = audioUrl;
      audio.playbackRate = Math.max(0.5, Math.min(2, rate));
      audio.play().catch((error: unknown) => {
        // Surface playback failures instead of swallowing them.
        if (process.env.NODE_ENV === "development") {
          console.warn("[audio] playback rejected", error);
        }
        onError?.(error);
      });

      let ended = false;
      let onEndHandler: (() => void) | null = null;

      const handleEnded = () => {
        ended = true;
        audio.removeEventListener("ended", handleEnded);
        if (onEndHandler) onEndHandler();
      };
      audio.addEventListener("ended", handleEnded);

      const playback: Playback = {
        stop() {
          if (ended) return;
          ended = true;
          audio.removeEventListener("ended", handleEnded);
          try {
            audio.pause();
          } catch {
            // ignore
          }
          audio.currentTime = 0;
        },
        get duration() {
          return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0.8;
        },
      };

      if (rest.onEnded) {
        onEndHandler = rest.onEnded;
      }

      return playback;
    }
  }

  // Synth fallback: faster rate → shorter moras.
  const baseMora = rest.moraDuration ?? 0.18;
  const scaledMora = baseMora / Math.max(0.5, Math.min(2, rate));
  return playJapanese(reading ?? "", accent, { ...rest, moraDuration: scaledMora });
}

export function stopVocabWord(): void {
  const audio = sharedAudio;
  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  }
}

export type { Playback, PlayOptions } from "./japanese-speech";
