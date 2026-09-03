/** Deterministic, seedable generation utilities (infinite, non-repeating). */
import { mulberry32, pick, chance, bell } from "../utils";
import type { ScaleMode } from "../types";
import { SCALE_INTERVALS } from "../types";

/** Stable integer hash of (seed, salt) for bar/scene seeding. */
export function hash2(seed: number, salt: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (salt * 2654435761), 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h ^ 0x7fffffff) >>> 0;
}

export class SeedReader {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  /** Uniform [0,1). */
  rnd(): number {
    return this.next();
  }
  /** Integer in [min,max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return pick(this.next, arr);
  }
  chance(p: number): boolean {
    return chance(this.next, p);
  }
  /** Bell-curve [0,1] biased by state (drifts patterns toward natural feel). */
  bell(iter = 2): number {
    return bell(this.next, iter);
  }
}

/** Build a MIDI-note palette from a scale + root. */
export function buildScale(root: number, mode: ScaleMode, octaves = 3): number[] {
  const iv = SCALE_INTERVALS[mode];
  const notes: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const x of iv) notes.push(root + oct * 12 + x);
  }
  return notes;
}

/** Resolution gate: adjust melodic step to nearest scale degree in palette. */
export function quantizeToScale(raw: number, palette: number[]): number {
  let best = raw;
  let bestD = Infinity;
  for (const n of palette) {
    const d = Math.abs(n - raw);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}