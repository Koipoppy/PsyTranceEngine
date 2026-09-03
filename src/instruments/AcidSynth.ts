/** Acid Bass (TB-303 flavor): high-resonance filter sweep + distortion. */
import { useMgr } from "./voice";
import { mtof } from "../engine/utils";
import type { NoteEvent, VoiceParams } from "../engine/types";

export function playAcid(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("acid");
  const t = ev.time;
  const vel = ev.velocity;
  const p: VoiceParams = ev.params ?? {
    cutoff: 500,
    resonance: 12,
    detune: 0,
    fmIndex: 0,
    pan: 0,
    accent: 0
  };
  const freq = mtof(ev.note);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, t);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = Math.min(20, Math.max(4, p.resonance));
  // Filter sweeps up fast then decays = classic squelch.
  lp.frequency.setValueAtTime(120, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(200, p.cutoff), t + 0.018);

  const shaper = ctx.createWaveShaper();
  shaper.curve = makeAcidCurve();

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  const peak = (0.5 + 0.5 * p.accent) * vel;
  amp.gain.exponentialRampToValueAtTime(peak, t + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.02, ev.duration));

  osc.connect(lp);
  lp.connect(shaper);
  shaper.connect(amp);
  amp.connect(bus);

  const start = Math.max(0, t);
  osc.start(start);
  osc.stop(start + ev.duration + 0.03);
}

/** Tube-ish curve with extra bite in the middle for acid. */
function makeAcidCurve(n = 1024): Float32Array<ArrayBuffer> {
  const curve: Float32Array<ArrayBuffer> = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (3 + 2.5 * x) * (1 + x * x) * 0.28;
    // clamp -1..1
    curve[i] = Math.max(-1, Math.min(1, curve[i]));
  }
  return curve;
}