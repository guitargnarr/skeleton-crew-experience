import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrainConfig {
  density: number;
  grainDuration: number;
  pitchRange: [number, number];
  panSpread: number;
  amplitude: number;
  filterFreq: number;
  filterQ: number;
  reverbWet: number;
}

interface SceneBlend {
  scene: number;
  blend: number;
}

// ---------------------------------------------------------------------------
// Scene configurations
// ---------------------------------------------------------------------------

const GRAIN_CONFIGS: GrainConfig[] = [
  // I: Inventory -- sparse clicks, counting
  { density: 3, grainDuration: 0.012, pitchRange: [0.8, 1.5], panSpread: 0.6, amplitude: 0.03, filterFreq: 2000, filterQ: 2, reverbWet: 0.15 },
  // II: Decision -- two textures diverging L/R
  { density: 8, grainDuration: 0.025, pitchRange: [0.5, 2.0], panSpread: 1.0, amplitude: 0.025, filterFreq: 1200, filterQ: 4, reverbWet: 0.3 },
  // III: Assembly -- dense rhythmic hum
  { density: 25, grainDuration: 0.015, pitchRange: [0.9, 1.1], panSpread: 0.3, amplitude: 0.02, filterFreq: 800, filterQ: 1.5, reverbWet: 0.2 },
  // IV: Verification -- clean tones, heavy reverb
  { density: 6, grainDuration: 0.04, pitchRange: [1.0, 1.5], panSpread: 0.4, amplitude: 0.035, filterFreq: 3000, filterQ: 6, reverbWet: 0.55 },
  // V: Accumulation -- full warm granular wash
  { density: 18, grainDuration: 0.045, pitchRange: [0.6, 1.2], panSpread: 0.8, amplitude: 0.025, filterFreq: 1500, filterQ: 1, reverbWet: 0.45 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpConfig(a: GrainConfig, b: GrainConfig, t: number): GrainConfig {
  return {
    density: lerp(a.density, b.density, t),
    grainDuration: lerp(a.grainDuration, b.grainDuration, t),
    pitchRange: [
      lerp(a.pitchRange[0], b.pitchRange[0], t),
      lerp(a.pitchRange[1], b.pitchRange[1], t),
    ],
    panSpread: lerp(a.panSpread, b.panSpread, t),
    amplitude: lerp(a.amplitude, b.amplitude, t),
    filterFreq: lerp(a.filterFreq, b.filterFreq, t),
    filterQ: lerp(a.filterQ, b.filterQ, t),
    reverbWet: lerp(a.reverbWet, b.reverbWet, t),
  };
}

function getSceneBlend(progress: number): SceneBlend {
  const boundaries = [0.03, 0.20, 0.37, 0.54, 0.71, 0.86];
  const transitionWidth = 0.02;

  // Before first scene starts
  if (progress < boundaries[0]) {
    return { scene: 0, blend: 0 };
  }

  // Find which segment we are in
  for (let i = 0; i < boundaries.length - 1; i++) {
    const segEnd = boundaries[i + 1];
    const transStart = segEnd - transitionWidth;

    // Within the stable zone of scene i
    if (progress < transStart) {
      return { scene: i, blend: 0 };
    }

    // Within the transition zone between scene i and scene i+1
    if (progress < segEnd) {
      const t = (progress - transStart) / transitionWidth;
      return { scene: i, blend: Math.min(Math.max(t, 0), 1) };
    }
  }

  // Past the last boundary -- final scene
  return { scene: GRAIN_CONFIGS.length - 1, blend: 0 };
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferLength = ctx.sampleRate;
  const noiseBuf = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufferLength; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.8 + Math.sin(i * 0.05) * 0.2;
  }
  return noiseBuf;
}

function createImpulseResponse(ctx: AudioContext): AudioBuffer {
  const irLength = ctx.sampleRate * 3;
  const irBuf = ctx.createBuffer(2, irLength, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = irBuf.getChannelData(ch);
    for (let i = 0; i < irLength; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.8));
    }
  }
  return irBuf;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGranularAudio(progress: number): {
  isPlaying: boolean;
  toggleAudio: () => void;
} {
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for audio graph nodes and state
  const ctxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const grainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const currentConfigRef = useRef<GrainConfig>(GRAIN_CONFIGS[0]);
  const mobileRef = useRef(isMobile());

  // Keep progress in a ref so the grain scheduler always reads the latest
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Update scene config and shared filter/reverb nodes when progress changes
  useEffect(() => {
    if (!isPlayingRef.current) return;

    const { scene, blend } = getSceneBlend(progress);
    const baseConfig = GRAIN_CONFIGS[scene];
    const nextScene = Math.min(scene + 1, GRAIN_CONFIGS.length - 1);
    const nextConfig = GRAIN_CONFIGS[nextScene];

    const blended = blend > 0 ? lerpConfig(baseConfig, nextConfig, blend) : baseConfig;

    // Cap density on mobile
    if (mobileRef.current && blended.density > 10) {
      blended.density = 10;
    }

    currentConfigRef.current = blended;

    // Update shared filter
    const filter = filterRef.current;
    if (filter) {
      filter.frequency.value = blended.filterFreq;
      filter.Q.value = blended.filterQ;
    }

    // Update dry/wet mix
    const dryGain = dryGainRef.current;
    const wetGain = wetGainRef.current;
    if (dryGain && wetGain) {
      dryGain.gain.value = 1 - blended.reverbWet;
      wetGain.gain.value = blended.reverbWet;
    }
  }, [progress]);

  // Spawn a single grain
  const spawnGrain = useCallback((config: GrainConfig) => {
    const ctx = ctxRef.current;
    const noiseBuffer = noiseBufferRef.current;
    const filter = filterRef.current;
    if (!ctx || !noiseBuffer || !filter) return;

    const now = ctx.currentTime;
    const dur = config.grainDuration;

    // Source
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const pitchLow = config.pitchRange[0];
    const pitchHigh = config.pitchRange[1];
    const pitch = pitchLow + Math.random() * (pitchHigh - pitchLow);
    src.playbackRate.value = pitch;

    // Random start offset within the 1s buffer
    const maxOffset = Math.max(0, 1.0 - dur);
    const startOffset = Math.random() * maxOffset;

    // Envelope (Hann window)
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(config.amplitude, now + dur * 0.2);
    env.gain.linearRampToValueAtTime(config.amplitude, now + dur * 0.8);
    env.gain.linearRampToValueAtTime(0, now + dur);

    // Pan
    const pan = ctx.createStereoPanner();

    // Scene II special behavior: hard-pan based on pitch
    const { scene } = getSceneBlend(progressRef.current);
    if (scene === 1) {
      const midPitch = (pitchLow + pitchHigh) / 2;
      pan.pan.value = pitch < midPitch ? -0.8 : 0.8;
    } else {
      pan.pan.value = (Math.random() * 2 - 1) * config.panSpread;
    }

    // Connect per-grain chain: src -> env -> pan -> shared filter
    src.connect(env);
    env.connect(pan);
    pan.connect(filter);

    // Start and schedule cleanup
    src.start(now, startOffset, dur + 0.01);

    const cleanupDelay = (dur + 0.05) * 1000;
    setTimeout(() => {
      try {
        src.disconnect();
        env.disconnect();
        pan.disconnect();
      } catch {
        // Nodes may already be garbage collected
      }
    }, cleanupDelay);
  }, []);

  // Grain scheduling loop
  const scheduleNextGrain = useCallback(() => {
    if (!isPlayingRef.current) return;

    const config = currentConfigRef.current;
    spawnGrain(config);

    const baseInterval = 1000 / config.density;
    const jitter = baseInterval * 0.3 * (Math.random() - 0.5);
    const nextDelay = Math.max(10, baseInterval + jitter);

    grainTimerRef.current = setTimeout(scheduleNextGrain, nextDelay);
  }, [spawnGrain]);

  // Initialize audio graph
  const initAudio = useCallback(() => {
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      // Generate procedural buffers
      noiseBufferRef.current = createNoiseBuffer(ctx);
      const irBuffer = createImpulseResponse(ctx);

      // Master gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Bandpass filter (shared across all grains)
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = GRAIN_CONFIGS[0].filterFreq;
      filter.Q.value = GRAIN_CONFIGS[0].filterQ;
      filterRef.current = filter;

      // Dry path
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - GRAIN_CONFIGS[0].reverbWet;
      dryGainRef.current = dryGain;

      // Wet path (convolver reverb)
      const convolver = ctx.createConvolver();
      convolver.buffer = irBuffer;
      convolverRef.current = convolver;

      const wetGain = ctx.createGain();
      wetGain.gain.value = GRAIN_CONFIGS[0].reverbWet;
      wetGainRef.current = wetGain;

      // Connect shared chain: filter -> dry/wet split -> master
      filter.connect(dryGain);
      filter.connect(convolver);
      dryGain.connect(masterGain);
      convolver.connect(wetGain);
      wetGain.connect(masterGain);

      return true;
    } catch {
      // Web Audio API not available
      return false;
    }
  }, []);

  // Start playback
  const start = useCallback(() => {
    const success = initAudio();
    if (!success) return;

    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    // Resume context (required after user gesture on most browsers)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    // Fade in master gain over 2 seconds
    const now = ctx.currentTime;
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.7, now + 2);

    // Set initial config based on current progress
    const { scene, blend } = getSceneBlend(progressRef.current);
    const baseConfig = GRAIN_CONFIGS[scene];
    const nextScene = Math.min(scene + 1, GRAIN_CONFIGS.length - 1);
    const blended = blend > 0
      ? lerpConfig(baseConfig, GRAIN_CONFIGS[nextScene], blend)
      : baseConfig;

    if (mobileRef.current && blended.density > 10) {
      blended.density = 10;
    }
    currentConfigRef.current = blended;

    // Begin grain scheduling
    scheduleNextGrain();
  }, [initAudio, scheduleNextGrain]);

  // Stop playback
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);

    // Clear grain scheduler
    if (grainTimerRef.current !== null) {
      clearTimeout(grainTimerRef.current);
      grainTimerRef.current = null;
    }

    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;

    if (ctx && masterGain) {
      // Fade out master gain over 1.5 seconds, then close context
      const now = ctx.currentTime;
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 1.5);

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // Context may already be closed
        }
        ctxRef.current = null;
        noiseBufferRef.current = null;
        masterGainRef.current = null;
        filterRef.current = null;
        dryGainRef.current = null;
        wetGainRef.current = null;
        convolverRef.current = null;
      }, 1600);
    }
  }, []);

  // Toggle
  const toggleAudio = useCallback(() => {
    if (isPlayingRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;

      if (grainTimerRef.current !== null) {
        clearTimeout(grainTimerRef.current);
        grainTimerRef.current = null;
      }

      const ctx = ctxRef.current;
      if (ctx) {
        try {
          ctx.close();
        } catch {
          // Already closed
        }
      }
    };
  }, []);

  return { isPlaying, toggleAudio };
}
