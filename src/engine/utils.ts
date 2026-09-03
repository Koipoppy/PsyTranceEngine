/** Small deterministic PRNG (mulberry32) so a seed reproduces a sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** MIDI note number -> frequency (A4 = 440Hz, MIDI 69). */
export function mtof(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Bias a random to a bell curve in [0,1] around center (0.5 center keeps flat). */
export function bell(rng: () => number, iterations = 2): number {
  let v = 0;
  for (let i = 0; i < iterations; i++) v += rng();
  return v / iterations;
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear mapping with clamp. */
export function remap(v: number, lo: number, hi: number, tLo: number, tHi: number): number {
  const t = clamp((v - lo) / (hi - lo), 0, 1);
  return lerp(tLo, tHi, t);
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function chance(rng: () => number, p: number): boolean {
  return rng() < p;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Convert a MIDI note to a display name like "A#3". */
export function noteName(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}${oct}`;
}

const SCALE_LABELS: Record<string, string> = {
  phrygian: "Phrygian",
  phrygianDominant: "Phrygian-Dom",
  harmonicMinor: "Harmonic-minor",
  hungarianMinor: "Hungarian-minor",
  naturalMinor: "Natural-minor",
  dorian: "Dorian"
};

export function scaleLabel(mode: string): string {
  return SCALE_LABELS[mode] ?? mode;
}