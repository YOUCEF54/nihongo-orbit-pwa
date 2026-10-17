"use client";

import { useCallback, useSyncExternalStore } from "react";
import { refreshJapaneseVoices } from "./japanese-tts";

export type JapaneseVoiceState = "checking" | "available" | "missing";

export interface JapaneseVoiceStatus {
  state: JapaneseVoiceState;
  voices: SpeechSynthesisVoice[];
}

const CHECKING: JapaneseVoiceStatus = { state: "checking", voices: [] };
const VOICE_LOAD_GRACE_MS = 1500;

let status: JapaneseVoiceStatus = CHECKING;
let bound = false;
let graceTimer: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function sameVoices(a: SpeechSynthesisVoice[], b: SpeechSynthesisVoice[]) {
  return a.length === b.length && a.every((voice, index) => voice === b[index]);
}

function setStatus(next: JapaneseVoiceStatus) {
  if (next.state === status.state && sameVoices(next.voices, status.voices)) return;
  status = next;
  emit();
}

function sync(listLoaded: boolean) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    setStatus({ state: "missing", voices: [] });
    return;
  }
  const japanese = refreshJapaneseVoices();
  if (japanese.length > 0) {
    setStatus({ state: "available", voices: japanese });
    return;
  }
  const anyVoices = window.speechSynthesis.getVoices().length > 0;
  setStatus(anyVoices || listLoaded ? { state: "missing", voices: [] } : CHECKING);
}

function onVoicesChanged() {
  if (graceTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(graceTimer);
    graceTimer = null;
  }
  sync(true);
}

function bind() {
  if (bound || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  bound = true;
  window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
  sync(false);
  graceTimer = window.setTimeout(() => {
    graceTimer = null;
    sync(true);
  }, VOICE_LOAD_GRACE_MS);
}

function subscribe(listener: () => void) {
  bind();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => status;
const getServerSnapshot = () => CHECKING;

/** Live ja-JP voice availability for the machine + a manual re-check. */
export function useJapaneseVoice(): JapaneseVoiceStatus & { refresh: () => void } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const refresh = useCallback(() => {
    sync(true);
  }, []);
  return { state: snapshot.state, voices: snapshot.voices, refresh };
}
