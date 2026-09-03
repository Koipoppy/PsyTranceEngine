/** Rolling Psytrance Bass: saw sub-deep + filtered saw top through saturation. */
import { useMgr } from "./voice";
import { mtof } from "../engine/utils";
import type { NoteEvent, VoiceParams } from "../engine/types";

export function playBass(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("bass");
  const t = ev.time;
  const vel = ev.velocity;
  const p: VoiceParams = ev.params ?? {
    cutoff: 900,
    resonance: 2,
    detune: 0,
    fmIndex: 0,
    pan: 0,
    accent: 0
  };
  const freq = mtof(ev.note);

  // Two sub oscillators + one top saw, lightly detuned.
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = freq;
  const sub2 = ctx.createOscillator();
  sub2.type = "sine";
  sub2.frequency.value = freq;

  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.value = freq;
  saw.detune.value = p.detune;

  const sawGain = ctx.createGain();
  sawGain.gain.value = 0.32 * vel;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(Math.max(120, p.cutoff), t);
  lp.Q.value = p.resonance;

  const shaper = ctx.createWaveShaper();
  shaper.curve = tanhCurve(2.2);

  const amp = ctx.createGain();
  // Short envelope: punchy pluck for rolling 16ths.
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.9 * vel, t + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.001, t + ev.duration);

  saw.connect(lp);
  lp.connect(shaper);
  shaper.connect(sawGain);
  sawGain.connect(amp);

  const subMix = ctx.createGain();
  subMix.gain.value = 0.7 * vel;
  sub.connect(subMix);
  sub2.connect(subMix);
  subMix.connect(amp);

  amp.connect(bus);

  const start = Math.max(0, t);
  sub.start(start);
  sub2.start(start);
  saw.start(start);
  sub.stop(start + ev.duration + 0.03);
  sub2.stop(start + ev.duration + 0.03);
  saw.stop(start + ev.duration + 0.03);
}

/** tanh-style waveshaper curve for warm saturation. */
export function tanhCurve(k = 4, n = 1024): Float32Array<ArrayBuffer> {
  const curve: Float32Array<ArrayBuffer> = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * k);
  }
  return curve;
}