/** Pad / atmosphere: slow saw chord pad through filter + reverb. */
import { useMgr } from "./voice";
import { mtof } from "../engine/utils";
import type { NoteEvent, VoiceParams } from "../engine/types";

export function playPad(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("pads");
  const t = ev.time;
  const vel = ev.velocity;
  const p: VoiceParams = ev.params ?? {
    cutoff: 1200,
    resonance: 0.7,
    detune: 8,
    fmIndex: 0,
    pan: 0,
    accent: 0
  };

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(Math.max(300, p.cutoff), t);
  lp.Q.value = p.resonance;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(0.14 * vel, t + Math.min(0.5, ev.duration * 0.4));
  amp.gain.linearRampToValueAtTime(0.001, t + ev.duration);

  const detune = p.detune;

  // Chord voicing: root + fifth + octave saws, softly detuned.
  const notes = [0, 7, 12];
  const stack = ctx.createGain();
  stack.gain.value = 1;
  for (const iv of notes) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = mtof(ev.note + iv);
    o.detune.value = detune * (iv === 0 ? 1 : iv === 7 ? -1 : 0.5);
    // layer a soft sine underneath for body
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = mtof(ev.note + iv);
    o2.detune.value = detune;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    o2.connect(g2);
    g2.connect(stack);
    o.connect(stack);
    o.start(t);
    o.stop(t + ev.duration + 0.05);
    o2.start(t);
    o2.stop(t + ev.duration + 0.05);
  }

  stack.connect(lp);
  lp.connect(amp);
  amp.connect(bus);
}