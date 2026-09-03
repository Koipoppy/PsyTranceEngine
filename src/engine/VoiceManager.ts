/** Dispatches scheduled NoteEvents to instrument voices; applies sidechain ducking. */
import { useMgr } from "../instruments/voice";
import { FX } from "./FX";
import type { NoteEvent } from "./types";

import { SampleKit } from "../instruments/SampleKit";
import { playKick } from "../instruments/KickSynth";
import { playBass } from "../instruments/BassSynth";
import { playAcid } from "../instruments/AcidSynth";
import { playLead } from "../instruments/LeadSynth";
import { playHat, playClap, playTom } from "../instruments/HatSynth";
import { playPad } from "../instruments/PadSynth";

export class VoiceManager {
  private readonly mgr = useMgr();
  private readonly wired = new Set<string>();
  private bpmValue = 145;
  private readonly sampler = new SampleKit();
  /** Channel mutes: muted layers are dropped before any audio is created. */
  private readonly muted = new Set<NoteEvent["layer"]>();

  /** Buses ducked on each kick to carve pocket (sidechain). */
  private readonly duckTargets = ["bass", "acid", "lead", "pads"];

  constructor(private readonly fx: FX) {}

  /** Load real recorded samples; failed loads keep the synth voice instead. */
  loadSamples(): Promise<number> {
    return this.sampler.load();
  }

  /** Names of layers currently backed by a real sample. */
  sampledLayers(): string[] {
    return this.sampler.readyLayers();
  }

  setBpm(bpm: number): void {
    this.bpmValue = bpm;
  }

  /** Mute/unmute a channel (does not affect previews). */
  setMuted(layer: NoteEvent["layer"], muted: boolean): void {
    if (muted) this.muted.add(layer);
    else this.muted.delete(layer);
  }

  isMuted(layer: NoteEvent["layer"]): boolean {
    return this.muted.has(layer);
  }

  play(ev: NoteEvent): void {
    if (this.muted.has(ev.layer)) return;
    this.dispatch(ev);
  }

  /** Audition a layer regardless of channel mute state. */
  playPreview(ev: NoteEvent): void {
    this.dispatch(ev);
  }

  private dispatch(ev: NoteEvent): void {
    this.ensureWired(ev.layer);
    const m = this.mgr;

    // Scheduler lookahead can emit an onset just behind currentTime. A past
    // start makes some browsers reject the scheduled stop() with
    // InvalidStateError, so clamp every onset into the future (applies to both
    // the sampler and the synth fallback).
    const now = m.ctx.currentTime;
    if (ev.time < now + 0.02) ev = { ...ev, time: now + 0.02 };

    // Prefer the real sample; fall back to the synthesizer when unavailable.
    if (this.sampler.play(ev)) {
      if (ev.layer === "kick") this.sidechainDip(ev.time);
      return;
    }

    switch (ev.layer) {
      case "kick":
        playKick(m, ev);
        this.sidechainDip(ev.time);
        break;
      case "bass":
        playBass(m, ev);
        break;
      case "acid":
        playAcid(m, ev);
        break;
      case "lead":
        playLead(m, ev);
        break;
      case "hats":
        playHat(m, ev);
        break;
      case "clap":
        playClap(m, ev);
        break;
      case "perc":
        playTom(m, ev);
        break;
      case "pads":
        playPad(m, ev);
        break;
    }
  }

  /** Route expressive busses into delay/reverb sends once per layer. */
  private ensureWired(layer: NoteEvent["layer"]): void {
    if (this.wired.has(layer)) return;
    this.wired.add(layer);
    const g = this.mgr.buses[layer];
    if (!g) return;
    if (layer === "lead" || layer === "acid") {
      const pre = this.mgr.ctx.createGain();
      pre.gain.value = 0.45;
      g.connect(pre);
      this.fx.sendDelay(pre, 1);
    } else if (layer === "pads") {
      this.fx.sendReverb(g, 0.7);
    }
  }

  /** Duck bass-family buses right after a kick to carve pocket. */
  private sidechainDip(time: number): void {
    const recovery = Math.max(0.09, (60 / this.bpmValue) * 0.45);
    for (const name of this.duckTargets) {
      const bus = this.mgr.buses[name];
      if (!bus) continue;
      const g = bus.gain;
      g.cancelScheduledValues(time);
      g.setValueAtTime(g.value, time);
      g.linearRampToValueAtTime(g.value * 0.45, time + 0.006);
      g.linearRampToValueAtTime(g.value, time + recovery);
    }
  }
}