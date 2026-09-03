/** Psytrance Kick: swept sine sub + click transient, dry and punchy. */
import { useMgr } from "./voice";
import type { NoteEvent } from "../engine/types";

export function playKick(mgr: ReturnType<typeof useMgr>, ev: NoteEvent): void {
  const ctx = mgr.ctx;
  const bus = mgr.getBus("kick");
  const t = ev.time;
  const vel = ev.velocity;

  // Sub layer with pitch envelope: 150Hz -> ~42Hz in 60ms.
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(150, t);
  sub.frequency.exponentialRampToValueAtTime(42, t + 0.055);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.0001, t);
  subGain.gain.exponentialRampToValueAtTime(1.4 * vel, t + 0.002);
  subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
  sub.connect(subGain);
  subGain.connect(bus);
  sub.start(t);
  sub.stop(t + 0.22);

  // Punch/click layer: short square click shaped by a band-pass.
  const click = ctx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(1200, t);
  click.frequency.exponentialRampToValueAtTime(220, t + 0.02);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2500;
  bp.Q.value = 1.2;
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.55 * vel, t);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  click.connect(bp);
  bp.connect(clickGain);
  clickGain.connect(bus);
  click.start(t);
  click.stop(t + 0.05);
}