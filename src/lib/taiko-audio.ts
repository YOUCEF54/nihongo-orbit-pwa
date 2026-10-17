/* ============================================================
   Mora Taiko — low-latency hit audio (browser only).
   A lazily created `interactive` AudioContext plus two tiny
   pre-rendered click buffers (PERFECT = bright, GREAT = softer).
   Misses stay silent and fall back to a short haptic pulse.
   ============================================================ */

let sharedContext: AudioContext | null = null;
let perfectBuffer: AudioBuffer | null = null;
let greatBuffer: AudioBuffer | null = null;

function browserContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedContext) return sharedContext;
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = win.AudioContext ?? win.webkitAudioContext;
  if (!Ctor) return null;
  try {
    sharedContext = new Ctor({ latencyHint: "interactive" });
  } catch {
    return null;
  }
  return sharedContext;
}

/** A crisp percussive blip rendered once and replayed per hit. */
function makeClick(context: AudioContext, frequency: number): AudioBuffer {
  const duration = 0.09;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / context.sampleRate;
    data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 60);
  }
  return buffer;
}

/**
 * Prepare the hit engine. Call from a user gesture (drill start) so the
 * context resumes under autoplay policies. Returns whether audio is ready.
 */
export function ensureTaikoAudio(): boolean {
  const context = browserContext();
  if (!context) return false;
  if (context.state === "suspended") {
    void context.resume().catch(() => {});
  }
  if (!perfectBuffer) perfectBuffer = makeClick(context, 2093);
  if (!greatBuffer) greatBuffer = makeClick(context, 1318);
  return true;
}

/** Immediate feedback click for a judged tap. */
export function playHit(kind: "perfect" | "great"): void {
  const context = sharedContext;
  const buffer = kind === "perfect" ? perfectBuffer : greatBuffer;
  if (!context || !buffer) return;
  if (context.state === "suspended") {
    void context.resume().catch(() => {});
  }
  try {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
  } catch {
    // hit feedback is best-effort only
  }
}

/** Tactile miss feedback where the Vibration API exists. */
export function vibrateMiss(): void {
  try {
    navigator.vibrate?.(50);
  } catch {
    // unsupported — stay silent
  }
}
