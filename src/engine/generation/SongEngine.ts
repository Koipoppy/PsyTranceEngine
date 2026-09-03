/** The generative brain: arrangement, per-bar pattern synthesis, parameter drift.
 *  Receives transport ticks and emits NoteEvents — infinitely, without exact repeats. */
import { hash2, SeedReader, buildScale, quantizeToScale } from "./SeedManaged";
import { MarkovMelody } from "./MarkovMelody";
import { clamp } from "../utils";
import type { VoiceManager } from "../VoiceManager";
import type { StyleConfig, SectionName, NoteEvent, VoiceParams, ScaleMode } from "../types";
import { STYLES } from "../styles";

interface SongParams {
  root: number;
  scale: ScaleMode;
  palette: number[];
  bassOctave: number;
  brightness: number;
  grit: number;
  space: number;
  density: number;
}

const SIXTEENTHS = 16;

/** Per-section layer gain gates (0 = silent, 1 = full, <1 = role-specific).
 *  The build entry is a fallback only — builds stage their own curve in buildGates(). */
const SECTION_GATES: Record<SectionName, Partial<Record<NoteEvent["layer"], number>>> = {
  intro: { kick: 0, bass: 0.4, hats: 1, pads: 1, acid: 0, lead: 0, clap: 0, perc: 0.2 },
  build: { kick: 1, bass: 1, hats: 1, pads: 0.7, acid: 0.8, lead: 0.35, clap: 0.7, perc: 0.5 },
  drop: { kick: 1, bass: 1, hats: 1, pads: 0.8, acid: 1, lead: 1, clap: 1, perc: 0.8 },
  breakdown: { kick: 0, bass: 0.5, hats: 0.6, pads: 1, acid: 0, lead: 0.9, clap: 0, perc: 0.25 },
  outro: { kick: 0, bass: 0.3, hats: 0.8, pads: 1, acid: 0, lead: 0, clap: 0, perc: 0.2 }
};

export class SongEngine {
  private voice: VoiceManager;
  private style: StyleConfig;
  private styleName: import("../types").StyleName = "fullon";
  private seed = 20240901;
  private absurdity = 0.5;
  private bpm = 145;

  private p!: SongParams;

  // User overrides (null = use style default).
  private overBrightness: number | null = null;
  private overGrit: number | null = null;
  private overSpace: number | null = null;

  // Arrangement state.
  private section: SectionName = "intro";
  private sectionLength = 3;
  private barsInSection = 0;

  // Cross-bar melodic memory for continuity.
  private bassVariant = 0;

  // Per-bar pattern state.
  private acidRun = true;
  private acidPat: boolean[] = new Array(SIXTEENTHS).fill(false);
  private leadOnsets: Record<number, number> = {};

  // Transition FX queued by the arrangement (27=sub-drop, 69=riser, 70=roll).
  private pendingFx: number | null = null;

  // Markov chain melodic voices.
  private acidMarkov!: import("./MarkovMelody").MarkovMelody;
  private leadMarkov!: import("./MarkovMelody").MarkovMelody;
  private markovView: import("../types").MarkovView | null = null;

  // Per-bar planning grid (recorded while generating).
  private grid: import("../types").BarGrid = {};
  private curStep = 0;
  private planCbs = new Set<(s: import("../types").PlanSnapshot) => void>();

  /** Last computed bar index (to avoid double-generating). */
  private lastBar = -1;

  constructor(voice: VoiceManager, styleName: keyof typeof STYLES) {
    this.voice = voice;
    this.style = STYLES[styleName];
    this.styleName = styleName as import("../types").StyleName;
    this.regenerateRoot();
  }

  setStyle(styleName: keyof typeof STYLES): void {
    this.style = STYLES[styleName];
    this.styleName = styleName as import("../types").StyleName;
    this.regenerateRoot();
  }

  setSeed(seed: number): void {
    this.seed = seed >>> 0;
    this.regenerateRoot();
    // restart melodic walks / markov at tonic
    this.leadMarkov.reset();
    this.acidMarkov.reset();
    this.bassVariant = 0;
  }

  setAbsurdity(v: number): void {
    this.absurdity = clamp(v, 0, 1);
  }

  currentSection(): SectionName {
    return this.section;
  }

  /** Current bass-root MIDI note (drives preview pitches). */
  rootNote(): number {
    return this.p.root;
  }

  /** Typical live params for a layer — used by the audition/preview path. */
  paramsFor(layer: NoteEvent["layer"]): VoiceParams {
    const r = new SeedReader(hash2(this.seed, layer.length * 31 + 7));
    return this.buildParams(layer, r);
  }

  subscribePlan(fn: (s: import("../types").PlanSnapshot) => void): void {
    this.planCbs.add(fn);
  }

  private regenerateRoot(): void {
    const r = new SeedReader(this.seed);
    const roots = [33, 36, 38, 40, 43]; // C1..G1ish
    const root = r.pick(roots);
    const scale = r.pick(this.style.scales);
    this.p = {
      root,
      scale,
      palette: buildScale(root, scale, 4),
      bassOctave: this.style.bassOctave,
      brightness: this.overBrightness ?? this.style.brightness,
      grit: this.overGrit ?? this.style.grit,
      space: this.overSpace ?? this.style.space,
      density: this.style.density
    };

    // Build per-voice Markov chains over their octave ranges. The acid line
    // rides one octave around the bass root — 303 bassline territory — while
    // leads stay in the upper register.
    const leadPal = this.p.palette.filter((n) => n >= 60 && n <= 84);
    const acidPal = this.p.palette.filter((n) => n >= this.p.root && n <= this.p.root + 12);
    this.leadMarkov = new MarkovMelody({ palette: leadPal, step: 1.0, tonic: 1.4, repose: 0.9 });
    this.acidMarkov = new MarkovMelody({ palette: acidPal, step: 0.85, tonic: 0.7, repose: 0.4 });
    this.markovView = { current: this.leadMarkov.current, candidates: [] };
  }

  setBrightness(v: number | null): void {
    this.overBrightness = v;
    this.p.brightness = v ?? this.style.brightness;
  }
  setGrit(v: number | null): void {
    this.overGrit = v;
    this.p.grit = v ?? this.style.grit;
  }
  setSpace(v: number | null): void {
    this.overSpace = v;
    this.p.space = v ?? this.style.space;
  }
  currentSpace(): number {
    return this.p.space;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  /** Seconds of one 16th step. */
  private stepDur(): number {
    return 60 / this.bpm / 4;
  }

  /** Called by Transport on every 16th step. */
  onTick(time: number, bar: number, _sixteenth: number): void {
    if (bar === this.lastBar) {
      // Not a new bar: nothing extra to (re)generate.
    } else {
      this.lastBar = bar;
      this.advanceArrangement(bar);
      this.generateBar(time, bar);
    }
  }

  private advanceArrangement(bar: number): void {
    this.barsInSection++;
    const done = this.barsInSection >= this.sectionLength;
    if (!done) return;

    // Pick next section + length, deterministic from seed+bar.
    const r = new SeedReader(hash2(this.seed, bar * 97 + this.sectionCode()));
    this.barsInSection = 0;

    switch (this.section) {
      case "intro":
        this.section = "build";
        this.sectionLength = r.int(6, 10);
        break;
      case "build":
        this.section = "drop";
        this.sectionLength = r.int(8, 16);
        break;
      case "drop":
        this.section = r.chance(0.45) ? "breakdown" : "build";
        this.sectionLength = this.section === "breakdown" ? r.int(4, 8) : r.int(5, 9);
        break;
      case "breakdown":
        this.section = "build";
        this.sectionLength = r.int(5, 9);
        break;
      case "outro":
        this.section = "intro";
        this.sectionLength = r.int(2, 4);
        break;
    }

    // Land a sub-drop with every drop entry.
    if (this.section === "drop") this.pendingFx = 27;
  }

  private sectionCode(): number {
    return { intro: 1, build: 2, drop: 3, breakdown: 4, outro: 5 }[this.section];
  }

  /** Generate and schedule one full bar of 16 sixteenths. */
  private generateBar(barTime: number, bar: number): void {
    const r = new SeedReader(hash2(this.seed, bar));
    const stepDur = this.stepDur();
    const dens = this.p.density + (this.absurdity - 0.5) * 0.3;
    this.grid = {};

    // Build staging: 0..1 progress through the section drives the energy curve.
    const prog = this.sectionLength <= 1 ? 1 : this.barsInSection / (this.sectionLength - 1);
    const lastBar = this.barsInSection === this.sectionLength - 1;
    const rollBar = this.section === "build" && this.barsInSection >= this.sectionLength - 2;
    const gates = this.buildGates(prog);

    // --- Transition FX: sub-drop lands with each drop entry. ---
    if (this.pendingFx !== null) {
      this.emit("fx", barTime, this.pendingFx, 0.9, 1.8, r);
      this.pendingFx = null;
    }
    // One riser spans the final two bars of a build, peaking right into the drop.
    if (this.section === "build" && this.barsInSection === this.sectionLength - 2) {
      this.emit("fx", barTime, 69, 0.8, stepDur * 32, r);
    }

    // --- Acid: tight 16th-note runs (8th backbone + 16th ghosts). ---
    this.acidRun = r.chance(0.85);
    this.acidPat = this.acidPat.map((_, i) => i % 2 === 0 || r.chance(0.3));

    // --- Lead: a few sustained notes per bar, slow phrases over the roll. ---
    this.leadOnsets = {};
    const onsets = [0, 6, 10].filter(() => r.chance(0.8));
    if (onsets.length === 0) onsets.push(0);
    for (const o of onsets) this.leadOnsets[o] = r.int(3, 6);

    for (let s = 0; s < SIXTEENTHS; s++) {
      this.curStep = s;
      const t = barTime + s * stepDur;
      const beat = s % 4;

      // The signature break: the final beat of the last build bar cuts every
      // percussive layer — one beat of held-breath silence, then the drop.
      if (this.section === "build" && lastBar && s >= 12) continue;

      // --- Kick: four on the floor (with rare ghost). ---
      if (beat === 0 && gates.kick) {
        this.emit("kick", t, this.p.root - 12, 1, 0.06, r);
      } else if (beat === 0 && !gates.kick && r.chance(0.05)) {
        // ambient ghost splat in beat-less sections
        this.emit("perc", t, this.p.root - 12, 0.3, 0.05, r);
      }

      // --- Hats: closed offbeats / open occasionally; open up through a build. ---
      if (gates.hats) {
        const open = beat === 2 && r.chance(0.25);
        const esc = this.section === "build" ? prog * 0.2 : 0;
        const hit = open || (s % 2 === 1 && r.chance(Math.min(0.97, 0.75 + 0.25 * dens + esc)));
        if (hit) {
          this.emit("hats", t, 80, open ? 0.22 : 0.5, open ? 0.28 : 0.045, r);
        }
      }

      // --- Clap: clean backbeat on beats 2 & 4 (steps 4 & 12). ---
      // Build rolls replace the backbeat with an accelerating snare roll.
      if (gates.clap) {
        if (rollBar) {
          const hit = lastBar || s % 2 === 0;
          if (hit) {
            const ramp = lastBar ? s / 12 : 0.35 + 0.25 * (s / 15);
            this.emit("clap", t, 70, 0.28 + 0.62 * ramp, 0.05, r);
          }
        } else if (s === 4 || s === 12) {
          this.emit("clap", t, 70, 0.55 + 0.1 * r.bell(), 0.07, r);
        } else if (s === 14 && r.chance(0.1)) {
          // rare end-of-bar ghost fill
          this.emit("clap", t, 70, 0.28, 0.05, r);
        }
      }

      // --- Bass: rolling offbeat 16ths (kick-bass-bass-bass feel). ---
      if (gates.bass && s % 4 !== 0 && r.chance(this.bassHitChance(beat, r))) {
        const note = this.bassNote(r, s);
        this.emit("bass", t, note, 0.8, stepDur * 0.9, r);
      }

      // --- Acid: continuous accented runs, not sparse blips. ---
      if (gates.acid && this.acidRun && this.acidPat[s]) {
        const note = this.acidNote(r);
        const vel = beat === 0 ? 0.8 : 0.5 + 0.15 * r.bell();
        this.emit("acid", t, note, vel, stepDur * 0.95, r);
      }

      // --- Lead: sustained slow phrases. ---
      if (gates.lead && this.leadOnsets[s] !== undefined) {
        const note = this.leadNote(r);
        this.emit("lead", t, note, 0.8, stepDur * this.leadOnsets[s], r);
      }

      // --- Perc fills (toms) rarely in denser sections. ---
      if (gates.perc && r.chance(0.06 * dens)) {
        this.emit("perc", t, this.p.root - 5, 0.5, 0.08, r);
      }
    }

    // --- Pads: one sustained chord per bar (role sections). Sustains through
    //     the pre-drop gap — the held breath under the silence. ---
    if (gates.pads) {
      this.curStep = 0;
      const padNote = this.p.root + 12;
      this.emit("pads", barTime, padNote, 0.7 * gates.pads, stepDur * 16 * 1.6, r);
    }

    this.emitPlan();
  }

  /** Effective section gates. Builds stage a rising energy curve instead of
   *  using the flat preset: strip → bass → acid+clap → lead, ending in roll+gap. */
  private buildGates(prog: number): Partial<Record<NoteEvent["layer"], number>> {
    if (this.section !== "build") return SECTION_GATES[this.section];
    const g: Partial<Record<NoteEvent["layer"], number>> = {
      kick: 1, hats: 1, pads: prog < 0.25 ? 0.5 : 0.7, perc: 0.35,
      bass: 0, acid: 0, clap: 0, lead: 0
    };
    if (prog >= 0.25) g.bass = 1;
    if (prog >= 0.5) { g.acid = 0.85; g.clap = 1; }
    if (prog >= 0.75) g.lead = 0.6;
    return g;
  }

  private emitPlan(): void {
    if (this.planCbs.size === 0) return;
    const active: import("../types").LayerName[] = [];
    const grid = this.grid;
    (Object.keys(grid) as import("../types").LayerName[]).forEach((layer) => {
      const arr = grid[layer];
      if (arr && arr.some((v) => v > 0)) active.push(layer);
    });
    const snap: import("../types").PlanSnapshot = {
      section: this.section,
      style: this.styleNameSnap(),
      seed: this.seed,
      root: this.p.root,
      scale: this.p.scale,
      layersActive: active,
      grid,
      markov: this.markovView ?? { current: 0, candidates: [] }
    };
    this.planCbs.forEach((fn) => fn(snap));
  }

  private styleNameSnap(): import("../types").StyleName {
    return this.styleName;
  }

  private bassHitChance(beat: number, r: SeedReader): number {
    // 3-of-4 sub-steps typical; occasionally denser/sparser via variant.
    const base = [0.7, 0.85, 0.85][beat] ?? 0.85;
    return Math.min(1, base * (0.8 + 0.4 * r.bell()));
  }

  private bassNote(r: SeedReader, s: number): number {
    // Mix root / fifth / octave with occasional walk. Rolling feel via pitch contour.
    void s;
    const root = this.p.root + this.p.bassOctave * 12;
    const opts: number[] = [root, root, root + 7, root];
    if (r.chance(0.15)) opts.push(this.bassWalk(root, r));
    return r.pick(opts);
  }

  private bassWalk(root: number, r: SeedReader): number {
    this.bassVariant = quantizeToScale(root + (r.int(-2, 2) * 2), this.p.palette.filter((n) => n < root + 16 && n > root - 16));
    return this.bassVariant;
  }

  private acidNote(r: SeedReader): number {
    const { note } = this.acidMarkov.next(r);
    return note;
  }

  private leadNote(r: SeedReader): number {
    const c = this.leadMarkov.next(r);
    // Keep the Markov view (planning) tied to the lead voice.
    if (!this.markovView) this.markovView = { current: 0, candidates: [] };
    this.markovView.current = c.note;
    this.markovView.candidates = c.candidates;
    return c.note;
  }

  private emit(
    layer: NoteEvent["layer"],
    time: number,
    note: number,
    velocity: number,
    duration: number,
    r: SeedReader
  ): void {
    // Record into the planning grid for UI visualization.
    let row = this.grid[layer];
    if (!row) {
      row = new Array(SIXTEENTHS).fill(0);
      this.grid[layer] = row;
    }
    row[this.curStep] = Math.max(row[this.curStep] ?? 0, velocity);

    const params = this.buildParams(layer, r);
    const ev: NoteEvent = { time, duration, note, velocity: Math.max(0.01, velocity), layer, params };
    this.voice.play(ev);
  }

  private buildParams(layer: NoteEvent["layer"], r: SeedReader): VoiceParams {
    const b = this.p.brightness + (this.absurdity - 0.5) * 0.3;
    const g = this.p.grit + (this.absurdity - 0.5) * 0.2;
    const a = this.absurdity;
    switch (layer) {
      case "bass":
        return {
          cutoff: (300 + 1600 * b) * r.bell(),
          resonance: 1.8 + 2.2 * g,
          detune: (5 + 14 * g),
          fmIndex: 0,
          pan: -0.05,
          accent: 0.2 + 0.6 * r.bell()
        };
      case "acid":
        return {
          cutoff: (700 + 2600 * b * (1 + a)),
          resonance: 10 + 8 * g,
          detune: 0,
          fmIndex: 0,
          pan: 0.1,
          accent: 0.8 * g + 0.2
        };
      case "lead":
        return {
          cutoff: (500 + 3400 * b * (1 + a)),
          resonance: 2.5 + 3 * (a + g),
          detune: 6 + 9 * a,
          fmIndex: 3 + 5 * a,
          pan: r.bell() * 0.7 - 0.35,
          accent: 0.5
        };
      case "hats":
      case "clap":
        return { cutoff: 7200, resonance: 1, detune: 0, fmIndex: 0, pan: r.bell() * 0.6 - 0.3, accent: 0.5 };
      case "pads":
        return {
          cutoff: 800 + 1600 * b,
          resonance: 0.7,
          detune: 7,
          fmIndex: 0,
          pan: 0,
          accent: 0
        };
      default:
        return { cutoff: 1200, resonance: 1, detune: 0, fmIndex: 0, pan: 0, accent: 0.5 };
    }
  }
}