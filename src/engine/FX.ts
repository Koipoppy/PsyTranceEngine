/** FX: tempo-synced delay + convolution reverb returns, wet-controlled. */
import type { AudioContextManager } from "./AudioContextManager";
import { clamp } from "./utils";

export class FX {
  private readonly ctx: AudioContext;

  private readonly delay: DelayNode;
  private readonly delayWet: GainNode;

  private readonly convolver: ConvolverNode;
  private readonly reverbWet: GainNode;

  constructor(manager: Pick<AudioContextManager, "ctx" | "masterIn" | "getReverb">) {
    this.ctx = manager.ctx;

    // Tempo-synced echo (dotted 8th).
    this.delay = this.ctx.createDelay(1.5);
    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.value = 0.5;
    const delayReturn = this.ctx.createGain();
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.3;
    const damp = this.ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 4200;
    this.delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(this.delay);
    damp.connect(this.delayWet);
    this.delayWet.connect(delayReturn);
    delayReturn.connect(manager.masterIn);

    // Convolution reverb.
    this.convolver = manager.getReverb(2.6, 3.0);
    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.value = 0.4;
    const reverbReturn = this.ctx.createGain();
    this.convolver.connect(this.reverbWet);
    this.reverbWet.connect(reverbReturn);
    reverbReturn.connect(manager.masterIn);

    this.setBpm(145);
    this.setSpace(0.5);
  }

  setBpm(bpm: number): void {
    this.delay.delayTime.setTargetAtTime((60 / bpm) * 1.5, this.ctx.currentTime, 0.02);
  }

  /** Scale wetness from a master "space" 0..1 (0 = dry, 1 = wet). */
  setSpace(space: number): void {
    const s = clamp(space, 0, 1);
    this.delayWet.gain.setTargetAtTime(0.8 * s, this.ctx.currentTime, 0.05);
    this.reverbWet.gain.setTargetAtTime(0.6 * s, this.ctx.currentTime, 0.05);
  }

  sendDelay(source: AudioNode, gain = 0.35): void {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    source.connect(g);
    g.connect(this.delay);
  }

  sendReverb(source: AudioNode, gain = 0.6): void {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    source.connect(g);
    g.connect(this.convolver);
  }
}