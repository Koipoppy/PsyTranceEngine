/** Shared types for the PsyTrance engine. */

/** Available style presets. */
export type StyleName =
  | "goa"
  | "fullon"
  | "dark"
  | "twilight"
  | "progressive";

export type ScaleMode =
  | "phrygian"
  | "phrygianDominant"
  | "harmonicMinor"
  | "hungarianMinor"
  | "naturalMinor"
  | "dorian";

export interface StyleConfig {
  /** Display label. */
  label: string;
  /** Tempo range in BPM. */
  bpm: [number, number];
  /** Preferred scale pool (weighted later). */
  scales: ScaleMode[];
  /** Brightness of lead/pads. */
  brightness: number;
  /** Distortion / saturation depth 0..1. */
  grit: number;
  /** Reverb & delay wetness 0..1. */
  space: number;
  /** How many layers the arrangement tends to reach. */
  density: number;
  /** Bass octave offset. */
  bassOctave: number;
}

/** Musical scale, intervals in semitones from root, root at octave 0. */
export const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  hungarianMinor: [0, 2, 3, 6, 7, 8, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10]
};

/** Section labels of the arrangement engine. */
export type SectionName =
  | "intro"
  | "build"
  | "drop"
  | "breakdown"
  | "outro";

export type LayerName =
  | "kick"
  | "bass"
  | "acid"
  | "lead"
  | "hats"
  | "clap"
  | "perc"
  | "pads"
  | "fx";

/** One scheduled melodic/hit event handed to the VoiceManager. */
export interface NoteEvent {
  /** Absolute AudioContext time. */
  time: number;
  /** Duration in seconds. */
  duration: number;
  /** MIDI note number (0..127). */
  note: number;
  /** Velocity 0..1. */
  velocity: number;
  /** Which instrument plays it. */
  layer: LayerName;
  /** Per-style sound parameters snapshot at schedule time. */
  params?: VoiceParams;
}

export interface VoiceParams {
  /** Filter cutoff target in Hz (for expressive layers). */
  cutoff: number;
  /** Filter resonance. */
  resonance: number;
  /** Detune in cents. */
  detune: number;
  /** FM index (lead/acid metallic). */
  fmIndex: number;
  /** Stereo pan -1..1. */
  pan: number;
  /** Amount of accent. */
  accent: number;
}

/** A candidate note with its Markov transition probability. */
export interface PitchCandidate {
  note: number;
  p: number;
}

/** Markov chain state for the currently prioritized melodic voice. */
export interface MarkovView {
  current: number;
  candidates: PitchCandidate[];
}

/** Per-layer, per-step fire intensity for one bar (16 sixteenths). */
export type BarGrid = Partial<Record<LayerName, number[]>>;

/** Live "music planning" snapshot emitted per bar for the UI. */
export interface PlanSnapshot {
  section: SectionName;
  style: StyleName;
  seed: number;
  root: number;
  scale: ScaleMode;
  /** Which layers fire somewhere in this bar. */
  layersActive: LayerName[];
  /** 16-step fire grid per layer. */
  grid: BarGrid;
  /** Markov chain view (lead voice). */
  markov: MarkovView;
}

/** Playhead update emitted every 16th step. */
export interface PlayheadView {
  bar: number;
  sixteenth: number;
  section: SectionName;
}

/** Global engine state the UI drives. */
export interface EngineState {
  playing: boolean;
  bpm: number;
  volume: number;
  style: StyleName;
  /** Overall psychedelic intensity 0..1. */
  absurdity: number;
  /** Brightness override 0..1 (null = style default). */
  brightness: number | null;
  grit: number | null;
  space: number | null;
  /** Current seed shown / re-locked. */
  seed: number;
  /** Seconds elapsed on transport. */
  elapsed: number;
}

export interface AudioTap {
  /** Play a single note against the engine graph. */
  play(params: NoteEvent): void;
}