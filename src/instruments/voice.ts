/** One-shot envelope helpers and node lifecycle utilities. */

import { audio } from "../engine/AudioContextManager";

/** Build a one-shot decay envelope on a gain node. */
export function decayEnvelope(
  _ctx: AudioContext,
  gain: GainNode,
  time: number,
  peak: number,
  decay: number,
  curve: "exp" | "lin" = "exp"
): void {
  gain.gain.setValueAtTime(peak, time);
  const end = decay > 0.0001 ? decay : 0.0001;
  if (curve === "exp") {
    gain.gain.exponentialRampToValueAtTime(0.0001, time + end);
  } else {
    gain.gain.linearRampToValueAtTime(0.0001, time + end);
  }
}

/** Shared accessor to the global manager. */
export function useMgr() {
  return audio.mgr;
}

/** Trigger decay at `time` then stop a source right after. */
export function fireEnvelope(
  source: { stop(t?: number): void },
  gain: GainNode,
  context: AudioContext,
  time: number,
  peak: number,
  decay: number
): void {
  decayEnvelope(context, gain, time, peak, decay);
  source.stop(Math.max(time, 0) + decay + 0.02);
}