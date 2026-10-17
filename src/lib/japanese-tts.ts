/* ============================================================
   Japanese voice playback. Prefers the OS/browser Japanese
   speech engine (real word audio) and falls back to the
   offline formant synth in japanese-speech.ts when no ja-JP
   voice is installed.
   ============================================================ */
import { playJapanese, type Playback } from "./japanese-speech";

export interface SpeakOptions {
  /** Kana reading used only by the offline synth fallback. */
  reading?: string;
  /** Speech rate (Web Speech API). Defaults to a learner-friendly 0.85. */
  rate?: number;
  volume?: number;
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let resolved = false;
let listenerAttached = false;

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (resolved) return cachedVoice;
  const engine = synth();
  if (!engine) return null;
  const voices = engine.getVoices();
  if (voices.length === 0) return null; // not loaded yet — retry on a later call
  cachedVoice = voices.find((voice) => /^ja/i.test(voice.lang)) ?? null;
  resolved = true;
  return cachedVoice;
}

/** Warm the voice list on mount so the first tap already has a ja-JP voice. */
export function preloadJapaneseVoice(): void {
  const engine = synth();
  if (!engine) return;
  pickVoice();
  if (listenerAttached) return;
  listenerAttached = true;
  engine.addEventListener("voiceschanged", () => {
    resolved = false;
    pickVoice();
  });
}

export function japaneseVoiceAvailable(): boolean {
  return pickVoice() !== null;
}

/** Reset the cached pick and return the ja-JP voices the engine currently exposes. */
export function refreshJapaneseVoices(): SpeechSynthesisVoice[] {
  resolved = false;
  cachedVoice = null;
  const engine = synth();
  if (!engine) return [];
  const voices = engine.getVoices();
  const japanese = voices.filter((voice) => /^ja/i.test(voice.lang));
  if (voices.length > 0) {
    resolved = true;
    cachedVoice = japanese[0] ?? null;
  }
  return japanese;
}

export function speakJapanese(text: string, options: SpeakOptions = {}): Playback | null {
  if (!text) return null;
  const engine = synth();
  const voice = pickVoice();

  if (!engine || !voice) {
    return playJapanese(options.reading ?? text, [], {
      moraDuration: options.rate ? 0.3 / options.rate : 0.3,
      volume: options.volume,
    });
  }

  engine.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang || "ja-JP";
  utterance.voice = voice;
  utterance.rate = options.rate ?? 0.85;
  if (options.volume !== undefined) utterance.volume = options.volume;
  engine.speak(utterance);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      engine.cancel();
    },
    get duration() {
      return Math.max(0.6, text.length * 0.22);
    },
  };
}
