/** Real-sample playback engine, tuned for psytrance.
 *
 *  All tonal voices come from genuine psytrance sources on Freesound
 *  (CC0, see public/samples/ATTRIBUTION.md): a Roland TB-03 hardware
 *  recording for the acid line, analog one-shots for the rolling bass,
 *  psytrance lead loops chopped as resample zones, and purpose-made
 *  transition FX.
 *
 *  The genre articulation lives in the per-note resonant filter
 *  envelopes: bass gets the fast darkening "pluck", acid gets the
 *  303-style resonant sweep, lead gets a slow bloom. Long recordings
 *  (TB-03 note, bass loops, lead loops) use random start offsets so each
 *  hit is a fresh chop of the source — the classic psytrance resample
 *  workflow.
 *
 *  Zone base pitches were measured by autocorrelation on the decoded
 *  files (pitch-probe), cross-checked against the upload descriptions. */

import { useMgr } from "./voice";
import { clamp } from "../engine/utils";
import type { NoteEvent } from "../engine/types";

type Layer = NoteEvent["layer"];
type FilterMode = "pluck" | "sweep" | "slow";

interface Zone {
  file: string;
  /** Measured MIDI pitch of the recording (fx zones double as event keys). */
  base: number;
  /** Per-zone start offset override (ratio of duration). */
  off?: number;
  /** Pick a random start offset each hit (chop/resample zones). */
  randOff?: boolean;
  buffer: AudioBuffer | null;
}

interface LayerKit {
  zones: Zone[];
  /** One-shot layers ignore pitch (drums roll zones round-robin). */
  oneshot: boolean;
  /** Texture layers never transpose. */
  unpitched?: boolean;
  /** Per-sample level trim (linear). */
  gain: number;
  /** Natural tail floor for one-shots (seconds). */
  decay?: number;
  /** Resonant filter articulation for pitched voices. */
  filter?: FilterMode;
  /** Default start offset into the recording (ratio of duration). */
  offset: number;
  /** Amp envelope. */
  atk: number;
  rel: number;
}

const z = (file: string, base: number, opts?: Pick<Zone, "off" | "randOff">): Zone => ({
  file,
  base,
  ...opts,
  buffer: null
});

const KITS: Record<Layer, LayerKit> = {
  kick: {
    // Three purpose-made psytrance kicks, round-robin per bar.
    zones: [
      z("/samples/fs128625-psy-kick-asbs.mp3", 60),
      z("/samples/fs818654-psy-kick-02.mp3", 60),
      z("/samples/fs171828-psy-kick-original.mp3", 60)
    ],
    oneshot: true, gain: 1.45, decay: 0.5, offset: 0, atk: 0, rel: 0
  },
  clap: {
    zones: [z("/samples/fs724046-trance-clap.mp3", 60)],
    oneshot: true, gain: 0.9, decay: 0.35, offset: 0, atk: 0, rel: 0
  },
  hats: {
    zones: [z("/samples/techno-hihat.mp3", 60)],
    oneshot: true, gain: 0.5, decay: 0.12, offset: 0, atk: 0, rel: 0
  },
  perc: {
    zones: [
      z("/samples/techno-tom1.mp3", 60),
      z("/samples/techno-tom2.mp3", 60)
    ],
    oneshot: true, gain: 0.6, decay: 0.38, offset: 0, atk: 0, rel: 0
  },
  bass: {
    // Analog psytrance bass: D#1 / F#1 one-shots, a C2 rolling-bass loop
    // chopped at random offsets, and an F2 stab for the top zone.
    zones: [
      z("/samples/fs859188-psy-bass-oneshot-eb.mp3", 27),
      z("/samples/fs706090-psy-bass-fs-punchy.mp3", 30),
      z("/samples/fs554834-psy-bass-roll-c140.mp3", 36, { randOff: true }),
      z("/samples/fs616687-psy-bass-f2.mp3", 41)
    ],
    oneshot: false, gain: 1.0, filter: "pluck", offset: 0.04, atk: 0.004, rel: 0.035
  },
  acid: {
    // Real Roland TB-303 family: hardware TB-03 note + 303-style lines.
    // Lives one octave under the bass root like a second bassline.
    zones: [
      z("/samples/fs467920-acid-tb03-c.mp3", 24, { randOff: true }),
      z("/samples/fs627753-acid-303-b2.mp3", 34, { randOff: true }),
      z("/samples/fs612195-acid-square-slide.mp3", 47, { randOff: true })
    ],
    oneshot: false, gain: 0.85, filter: "sweep", offset: 0.08, atk: 0.005, rel: 0.06
  },
  lead: {
    // Psytrance lead loops spread over the melody range — each note picks
    // the nearest source and chops it, resample style.
    zones: [
      z("/samples/fs162349-goa-lead-glide.mp3", 62, { randOff: true }),
      z("/samples/fs668775-psy-lead-145.mp3", 68, { randOff: true }),
      z("/samples/fs819438-psy-oneshot-03.mp3", 73, { randOff: true }),
      z("/samples/fs829204-psy-lead-fm147.mp3", 78, { randOff: true }),
      z("/samples/fs700382-psy-lead-robot.mp3", 83, { randOff: true })
    ],
    oneshot: false, gain: 1.25, filter: "slow", offset: 0.08, atk: 0.01, rel: 0.14
  },
  pads: {
    zones: [z("/samples/fs829203-psy-atmo-fxloop.mp3", 0, { randOff: true })],
    oneshot: false, unpitched: true, gain: 1.6, offset: 0, atk: 0.3, rel: 0.9
  },
  fx: {
    // Event keys: 27 sub-drop (drop entry), 69 riser + 70 roll (build).
    zones: [
      z("/samples/fs475005-sub-drop-moog.mp3", 27),
      z("/samples/fs829228-psy-fx-shot8.mp3", 69),
      z("/samples/fs829223-psy-fx-shot3.mp3", 70)
    ],
    oneshot: true, gain: 1.1, decay: 4, offset: 0, atk: 0, rel: 0
  }
};

export class SampleKit {
  private readonly rr = new Map<Layer, number>();
  private loadedFiles = 0;

  /** Decode every unique sample file once; failed loads fall back to synths. */
  async load(): Promise<number> {
    const mgr = useMgr();
    const byFile = new Map<string, AudioBuffer | null>();
    const jobs: Promise<void>[] = [];
    for (const kit of Object.values(KITS)) {
      for (const zone of kit.zones) {
        if (byFile.has(zone.file)) continue;
        byFile.set(zone.file, null);
        jobs.push(
          (async () => {
            try {
              const res = await fetch(zone.file, { cache: "force-cache" });
              if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
              const ab = await res.arrayBuffer();
              byFile.set(zone.file, await mgr.ctx.decodeAudioData(ab));
            } catch (e) {
              console.warn(`[samples] failed to load ${zone.file}:`, e);
            }
          })()
        );
      }
    }
    await Promise.all(jobs);

    let loaded = 0;
    byFile.forEach((buf) => {
      if (buf) loaded++;
    });
    this.loadedFiles = loaded;
    for (const kit of Object.values(KITS)) {
      for (const zone of kit.zones) {
        zone.buffer = byFile.get(zone.file) ?? null;
      }
    }
    return loaded;
  }

  /** Layers with at least one playable zone. */
  readyLayers(): Layer[] {
    return (Object.keys(KITS) as Layer[]).filter((l) => KITS[l].zones.some((zn) => zn.buffer));
  }

  count(): number {
    return this.loadedFiles;
  }

  /** Play a layer via its nearest sample zone. False = no sample available. */
  play(ev: NoteEvent): boolean {
    const kit = KITS[ev.layer];
    if (!kit) return false;
    const zone = this.pickZone(kit, ev);
    if (!zone || !zone.buffer) return false;

    const mgr = useMgr();
    const ctx = mgr.ctx;
    const buf = zone.buffer;
    // VoiceManager guarantees ev.time is in the future before we get here.
    const t = Math.max(0, ev.time);

    const rate = kit.oneshot || kit.unpitched ? 1 : Math.pow(2, (ev.note - zone.base) / 12);
    const offRatio = zone.randOff
      ? 0.05 + Math.random() * 0.55
      : zone.off ?? kit.offset;
    const offset = Math.min(buf.duration * offRatio, Math.max(0, buf.duration - 0.4));
    const avail = Math.max(0.05, (buf.duration - offset) / rate);
    const noteDur = Math.max(0.05, ev.duration || 0.12);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(rate, t);

    const g = ctx.createGain();
    const peak = clamp(ev.velocity * kit.gain, 0.02, 1.2);
    let stopTime: number;

    if (kit.oneshot) {
      // Samples carry their own attack; just gate a tail.
      const tail = Math.max(kit.decay ?? 0.3, noteDur + 0.06);
      stopTime = t + Math.min(avail, tail);
      g.gain.setValueAtTime(peak, t);
      if (avail > tail) {
        g.gain.exponentialRampToValueAtTime(0.0001, stopTime);
      }
    } else {
      const atk = Math.max(0.003, kit.atk);
      const rel = kit.rel;
      const holdEnd = t + Math.max(atk + 0.01, noteDur);
      stopTime = Math.min(holdEnd + rel, t + avail + 0.02);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + atk);
      g.gain.setValueAtTime(peak, holdEnd);
      g.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    }

    // Voice-as-oscillator: resonant filter envelope shapes the genre articulation.
    let head: AudioNode = src;
    if (kit.filter && ev.params) {
      const lp = this.buildFilter(ctx, kit.filter, ev.params, t, stopTime, noteDur);
      src.connect(lp);
      head = lp;
    }
    head.connect(g);

    let tail: AudioNode = g;
    const pan = ev.params?.pan;
    if (pan !== undefined && pan !== 0 && typeof ctx.createStereoPanner === "function") {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(clamp(pan, -1, 1), t);
      g.connect(p);
      tail = p;
    }
    tail.connect(mgr.getBus(ev.layer));

    try {
      src.start(t, offset);
      if (stopTime > t) src.stop(stopTime);
    } catch (e) {
      // A stray scheduling race on a tight onset shouldn't break the bar.
      console.warn("[samples] scheduling", ev.layer, e);
    }
    return true;
  }

  private buildFilter(
    ctx: AudioContext,
    mode: FilterMode,
    params: NonNullable<NoteEvent["params"]>,
    t: number,
    stopTime: number,
    noteDur: number
  ): BiquadFilterNode {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    const cut = clamp(params.cutoff, 90, 12000);
    const res = clamp(params.resonance, 0.5, 20);
    if (mode === "pluck") {
      // Psytrance bass: bright attack darkening fast — the "womp" per note.
      lp.frequency.setValueAtTime(Math.min(14000, cut * 2.5), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(60, cut * 0.45), t + 0.08);
      lp.Q.setValueAtTime(clamp(res * 0.45, 1, 7), t);
    } else if (mode === "sweep") {
      // Acid: 303-style resonant rise then settle.
      const rise = t + Math.min(0.32, Math.max(0.12, noteDur));
      lp.frequency.setValueAtTime(Math.max(90, cut * 0.35), t);
      lp.frequency.exponentialRampToValueAtTime(Math.min(14000, cut * 1.8), rise);
      lp.frequency.exponentialRampToValueAtTime(Math.max(70, cut * 0.5), stopTime);
      lp.Q.setValueAtTime(clamp(res * 0.75, 5, 14), t);
    } else {
      // Lead: slow bloom downward.
      lp.frequency.setValueAtTime(Math.min(14000, cut * 1.2), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(80, cut * 0.5), stopTime);
      lp.Q.setValueAtTime(1.2, t);
    }
    return lp;
  }

  private pickZone(kit: LayerKit, ev: NoteEvent): Zone | null {
    const live = kit.zones.filter((zn) => zn.buffer);
    if (live.length === 0) return null;
    if (ev.layer === "fx") {
      return live.find((zn) => zn.base === ev.note) ?? live[0];
    }
    if (kit.oneshot) {
      const i = (this.rr.get(ev.layer) ?? 0) % live.length;
      this.rr.set(ev.layer, i + 1);
      return live[i];
    }
    if (kit.unpitched) return live[0];
    let best = live[0];
    let bd = Infinity;
    for (const zone of live) {
      const d = Math.abs(ev.note - zone.base);
      if (d < bd) {
        bd = d;
        best = zone;
      }
    }
    return best;
  }
}
