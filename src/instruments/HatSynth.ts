/** Hi-hats & percussion: filtered noise bursts and clap. */
import { useMgr } from "./voice";
import type { NoteEvent, VoiceParams } from "../engine/types";

export function playHat(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("hats");
  const t = ev.time;
  const vel = ev.velocity;
  const p: VoiceParams = ev.params ?? {
    cutoff: 7000,
    resonance: 0.8,
    detune: 0,
    fmIndex: 0,
    pan: 0.15,
    accent: 0
  };
  const open = ev.duration > 0.12;

  const noise = ctx.createBufferSource();
  noise.buffer = mgr.getNoiseBuffer();
  noise.loop = true;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = p.cutoff > 6000 ? 9000 : p.cutoff;
  bp.Q.value = p.resonance;

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(p.pan * (0.4 + 0.6 * Math.random()), t);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.35 * vel, t + 0.0015);
  const decay = open ? ev.duration : 0.04;
  amp.gain.exponentialRampToValueAtTime(0.001, t + decay);

  noise.connect(hp);
  hp.connect(bp);
  bp.connect(panner);
  panner.connect(amp);
  amp.connect(bus);

  const start = Math.max(0, t);
  noise.start(start);
  noise.stop(start + decay + 0.02);
}

export function playClap(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("perc");
  const t = ev.time;
  const vel = ev.velocity;
  const p: VoiceParams = ev.params ?? {
    cutoff: 2500,
    resonance: 1,
    detune: 0,
    fmIndex: 0,
    pan: 0,
    accent: 0
  };

  const runs = 3;
  for (let i = 0; i < runs; i++) {
    const noise = ctx.createBufferSource();
    noise.buffer = mgr.getNoiseBuffer();
    noise.loop = false;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = p.cutoff;
    bp.Q.value = 2;
    const amp = ctx.createGain();
    const start = Math.max(0, t + i * 0.011);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(0.28 * vel, start + 0.001);
    amp.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
    noise.connect(hp);
    hp.connect(bp);
    bp.connect(amp);
    amp.connect(bus);
    noise.start(start);
    noise.stop(start + 0.09);
  }
}

export function playTom(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("perc");
  const t = ev.time;
  const vel = ev.velocity;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.3 * vel, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(amp);
  amp.connect(bus);
  osc.start(t);
  osc.stop(t + 0.11);
}