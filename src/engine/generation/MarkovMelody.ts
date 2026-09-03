/** First-order Markov chain for melodic voice generation.
 *  Transition table is built from musical affinities (step motion favored,
 *  tonic repose strong), then sampled with a seeded RNG to stay reproducible.
 *  Exposes candidate probabilities so the UI can render the "planning" view. */
import type { PitchCandidate } from "../types";
import type { SeedReader } from "./SeedManaged";

export interface MarkovConfig {
  /** Ascending MIDI-note palette to walk within (the "state space"). */
  palette: number[];
  /** Weight of step motion (adjacent scale degree). */
  step: number;
  /** Weight toward the tonic (index of root within palette). */
  tonic: number;
  /** Repose strength: probability to land on tonic-ish tones. */
  repose: number;
}

export class MarkovMelody {
  private readonly palette: number[];
  private readonly table: number[][]; // palette.length x palette.length (unnormalized weights)
  private readonly tonicIdx: number;
  private idx: number;

  constructor(cfg: MarkovConfig) {
    this.palette = cfg.palette;
    this.tonicIdx = nearestIndex(cfg.palette, cfg.palette[0] >= 0 ? cfg.palette[0] : 0);
    this.table = buildTable(this.palette.length, cfg, this.tonicIdx);
    this.idx = this.tonicIdx;
  }

  reset(): void {
    this.idx = this.tonicIdx;
  }

  get current(): number {
    return this.palette[this.idx] ?? 0;
  }

  /** Draw next note; returns it and the top candidates (with probabilities). */
  next(r: SeedReader): { note: number; candidates: PitchCandidate[] } {
    const row = this.table[this.idx];
    const total = row.reduce((a, b) => a + b, 0) || 1;
    let roll = r.rnd() * total;
    let next = this.idx;
    for (let i = 0; i < row.length; i++) {
      roll -= row[i];
      if (roll <= 0) {
        next = i;
        break;
      }
    }
    if (next >= row.length) next = row.length - 1;
    this.idx = next;

    // Top candidates with normalized probabilities.
    const scored = row.map((w, i) => ({ i, w })).sort((a, b) => b.w - a.w);
    const candidates: PitchCandidate[] = scored.slice(0, 5).map((c) => ({
      note: this.palette[c.i] ?? 0,
      p: Math.max(0.001, c.w / total)
    }));
    return { note: this.palette[next] ?? 0, candidates };
  }
}

function nearestIndex(palette: number[], target: number): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = Math.abs(palette[i] - target);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

/** Build a musically-biased transition weight matrix. */
function buildTable(n: number, cfg: MarkovConfig, tonic: number): number[][] {
  const table: number[][] = [];
  for (let from = 0; from < n; from++) {
    const row: number[] = new Array(n).fill(0);
    for (let to = 0; to < n; to++) {
      const d = to - from;
      let w = 0;
      const ad = Math.abs(d);
      if (ad === 1) w = cfg.step; // step motion is strongest
      else if (ad === 2) w = cfg.step * 0.7;
      else if (ad === 0) w = cfg.step * 0.35; // unison/repeat
      else if (ad === 3) w = cfg.step * 0.4;
      else if (ad === 4) w = cfg.step * 0.3;
      else if (ad <= 7) w = cfg.step * 0.12;
      else w = cfg.step * 0.04; // big leaps discouraged
      // Tonic repose: any state pulls back toward tonic.
      if (to === tonic) w += cfg.tonic * (0.6 + (from === tonic ? 0.9 : 0));
      row[to] = w;
    }
    table.push(row);
  }
  // Bias rows so that between 25..55% of draws (roughly) land on scale-near tonic
  // is naturally handled by the +tonic weight; nothing else needed.
  return table;
}