/* ============================================================
   Synthesized Japanese speech (Web Audio). Renders the phoneme
   phrase from japanese-phono.ts as a small formant synth — an
   offline, deterministic stand-in for real voice audio.

   A parallel formant model driven by a glottal-spectrum source:
   three bandpass formants (F1–F3) plus a soft-clip master, with a
   natural pitch declination and light vibrato so words read as
   speech rather than a flat buzz.
   ============================================================ */
import { planPhrase, type PitchState } from "./japanese-phono";

export interface PlayOptions {
  /** Reuse a caller-owned AudioContext (e.g. PitchTuner's analyser graph). */
  context?: AudioContext;
  /** Route audio somewhere other than ctx.destination (e.g. an AnalyserNode). */
  destination?: AudioNode;
  onEnded?: () => void;
  /** Base mora duration in seconds (lower = faster). */
  moraDuration?: number;
  volume?: number;
}

export interface Playback {
  stop(): void;
  readonly duration: number;
}

let sharedContext: AudioContext | null = null;
let masterChain: { ctx: AudioContext; input: GainNode } | null = null;
let glottal: { ctx: AudioContext; wave: PeriodicWave } | null = null;

function browserContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = win.AudioContext ?? win.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new Ctor();
    masterChain = null;
    glottal = null;
  }
  return sharedContext;
}

/** Vowel formant targets (F1–F3, Hz) approximating a male Japanese speaker. */
const VOWEL_FORMANTS: Record<string, [number, number, number]> = {
  a: [750, 1200, 2600],
  i: [300, 2200, 3000],
  u: [350, 1300, 2200],
  e: [500, 1900, 2600],
  o: [500, 900, 2500],
  n: [250, 1400, 2200],
};

const FORMANT_BW = [80, 110, 160];
const FORMANT_GAIN = [1, 0.6, 0.32];

const VOICED = new Set(["g", "d", "b", "z", "j", "m", "n", "r", "w", "y", "l", "v"]);

const CONSONANT_NOISE_HZ: Record<string, number> = {
  k: 2200,
  s: 5200,
  sh: 3200,
  ch: 2600,
  ts: 4600,
  t: 3200,
  h: 1100,
  f: 2100,
  p: 900,
};

/** Tanh soft-clip curve — tames harsh peaks without gating quiet speech. */
function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  const norm = Math.tanh(1.4);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.4) / norm;
  }
  return curve;
}

/** Shared master bus (gain → soft-clip) for the default destination. Custom
    destinations bypass it so analysers receive the raw signal. */
function masterInput(ctx: AudioContext, destination: AudioNode): AudioNode {
  if (destination !== ctx.destination) return destination;
  if (!masterChain || masterChain.ctx !== ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClipCurve();
    shaper.oversample = "2x";
    gain.connect(shaper);
    shaper.connect(ctx.destination);
    masterChain = { ctx, input: gain };
  }
  return masterChain.input;
}

/** Glottal-source spectrum (~ -9 dB/oct) instead of a raw sawtooth's harsh
    -6 dB/oct, so formants color a natural-looking harmonic stack. */
function glottalWave(ctx: AudioContext): PeriodicWave {
  if (glottal && glottal.ctx === ctx) return glottal.wave;
  const harmonics = 48;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n += 1) imag[n] = 1 / Math.pow(n, 1.5);
  const wave = ctx.createPeriodicWave(real, imag);
  glottal = { ctx, wave };
  return wave;
}

function scheduleVowel(
  ctx: AudioContext,
  out: AudioNode,
  start: number,
  duration: number,
  f0: number,
  vowel: string,
  volume: number,
  wave: PeriodicWave,
  vibrato: GainNode,
  nodes: AudioScheduledSourceNode[],
): void {
  const fs = VOWEL_FORMANTS[vowel] ?? VOWEL_FORMANTS.a;
  const end = start + duration;

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave);
  osc.frequency.setValueAtTime(f0, start);
  osc.frequency.linearRampToValueAtTime(f0 * 0.97, end);
  vibrato.connect(osc.frequency);

  const env = ctx.createGain();
  const attack = Math.min(0.016, duration * 0.3);
  const release = Math.min(0.03, duration * 0.45);
  const peak = Math.max(0.02, volume);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + attack);
  env.gain.setValueAtTime(peak, Math.max(start + attack, end - release));
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  env.connect(out);

  for (let k = 0; k < fs.length; k += 1) {
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(fs[k], start);
    band.Q.setValueAtTime(Math.max(0.7, fs[k] / FORMANT_BW[k]), start);
    const bandGain = ctx.createGain();
    bandGain.gain.setValueAtTime(FORMANT_GAIN[k], start);
    osc.connect(band);
    band.connect(bandGain);
    bandGain.connect(env);
  }

  osc.start(start);
  osc.stop(end + 0.02);
  nodes.push(osc);
}

function scheduleConsonant(
  ctx: AudioContext,
  out: AudioNode,
  start: number,
  duration: number,
  f0: number,
  consonant: string,
  glide: boolean,
  volume: number,
  wave: PeriodicWave,
  nodes: AudioScheduledSourceNode[],
): void {
  const end = start + duration;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(Math.max(0.02, volume * 0.9), start + Math.min(0.006, duration * 0.4));
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  env.connect(out);

  if (VOICED.has(consonant)) {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(glide ? f0 * 1.12 : f0, start);
    osc.frequency.linearRampToValueAtTime(f0, end);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(glide ? 1500 : 800, start);
    filter.Q.setValueAtTime(0.7, start);
    osc.connect(filter);
    filter.connect(env);
    osc.start(start);
    osc.stop(end + 0.01);
    nodes.push(osc);
    return;
  }

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(CONSONANT_NOISE_HZ[consonant] ?? 2000, start);
  noiseFilter.Q.setValueAtTime(1.2, start);

  noise.connect(noiseFilter);
  noiseFilter.connect(env);
  noise.start(start);
  noise.stop(end + 0.01);
  nodes.push(noise);
}

export function playJapanese(
  reading: string,
  pattern: PitchState[] = [],
  options: PlayOptions = {},
): Playback | null {
  const ctx = options.context ?? browserContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") void ctx.resume();

  const destination = options.destination ?? ctx.destination;
  const out = masterInput(ctx, destination);
  const volume = options.volume ?? 0.32;
  const segments = planPhrase(reading, pattern, { moraDuration: options.moraDuration });
  const nodes: AudioScheduledSourceNode[] = [];
  const origin = ctx.currentTime + 0.04;
  const wave = glottalWave(ctx);

  // Light vibrato shared by every voiced segment (±4 Hz at 5.2 Hz).
  const vibrato = ctx.createOscillator();
  vibrato.type = "sine";
  vibrato.frequency.setValueAtTime(5.2, origin);
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.setValueAtTime(4, origin);
  vibrato.connect(vibratoGain);
  vibrato.start(origin);
  nodes.push(vibrato);

  const maxMora = segments.reduce((max, segment) => Math.max(max, segment.moraIndex), 0);

  for (const segment of segments) {
    if (segment.kind === "silence") continue;
    const start = origin + segment.start;
    // Gentle phrase-wide declination: a touch higher at the onset, easing down.
    const declination = 1.05 - 0.1 * (segment.moraIndex / Math.max(1, maxMora));
    const f0 = segment.f0 * declination;
    if (segment.kind === "vowel") {
      scheduleVowel(
        ctx,
        out,
        start,
        segment.duration,
        f0,
        segment.vowel ?? "a",
        volume,
        wave,
        vibratoGain,
        nodes,
      );
    } else {
      scheduleConsonant(
        ctx,
        out,
        start,
        segment.duration,
        f0,
        segment.consonant ?? "",
        segment.glide,
        volume,
        wave,
        nodes,
      );
    }
  }

  const last = segments[segments.length - 1];
  const duration = (last ? last.start + last.duration : 0) + 0.12;
  vibrato.stop(origin + duration);

  let ended = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const stop = () => {
    if (ended) return;
    ended = true;
    if (timer) clearTimeout(timer);
    for (const node of nodes) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
  };

  if (options.onEnded) {
    timer = setTimeout(() => {
      if (ended) return;
      ended = true;
      options.onEnded?.();
    }, duration * 1000);
  }

  return { stop, duration };
}
