/** Psytrance Lead: supersaw stack + FM shimmer + moving filter + stereo pan. */
import { useMgr } from "./voice";
import { mtof } from "../engine/utils";
import type { NoteEvent, VoiceParams } from "../engine/types";

const DETUNE_STACK = [-9, -5, 0, 5, 9];

export function playLead(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("lead");
  const t = ev.time;
  const vel = ev.velocity;
  const p: VoiceParams = ev.params ?? {
    cutoff: 1800,
    resonance: 3,
    detune: 6,
    fmIndex: 4,
    pan: -0.2,
    accent: 0
  };
  const freq = mtof(ev.note);

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(p.pan, t);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(Math.max(300, p.cutoff), t);
  lp.Q.value = p.resonance;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.06, ev.duration));

  // FM modulator injecting metallic shimmer.
  const mod = ctx.createOscillator();
  mod.frequency.setValueAtTime(freq * 2, t);
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(p.fmIndex * freq * 0.5, t);

  const mix = ctx.createGain();
  mix.gain.value = 0.55;

  for (const d of DETUNE_STACK) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = d + p.detune * 0.7;
    o.connect(mix);
    o.start(t);
    o.stop(t + ev.duration + 0.05);
  }

  mod.connect(modGain);
  modGain.connect(mod.frequency);

  // Bright whistle layer adds the psy "squeal".
  const whistle = ctx.createOscillator();
  whistle.type = "sawtooth";
  whistle.frequency.value = freq * 2;
  whistle.detune.value = p.detune;
  const whistGain = ctx.createGain();
  whistGain.gain.value = 0.11 * vel;
  whistle.connect(whistGain);
  whistGain.connect(mix);

  mix.connect(lp);
  lp.connect(amp);
  amp.connect(panner);
  panner.connect(bus);

  const start = Math.max(0, t);
  mod.start(start);
  mod.stop(start + ev.duration + 0.05);
  whistle.start(start);
  whistle.stop(start + ev.duration + 0.05);
}