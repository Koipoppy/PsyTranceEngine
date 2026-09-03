/** Owns the shared AudioContext and the master output chain + bus graph. */

export class AudioContextManager {
  readonly ctx: AudioContext;

  /** Pre-fx master bus (post-every-thing) feeding final master compressor. */
  readonly masterIn: GainNode;
  private readonly masterCompressor: DynamicsCompressorNode;
  readonly analyser: AnalyserNode;

  /** Named mix buses routed into masterIn. Per-instrument sources land here. */
  readonly buses: Record<string, GainNode> = {};

  private noiseCache: AudioBuffer | null = null;
  private reverbCache: ConvolverNode | null = null;

  constructor() {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio API is not supported in this browser.");
    this.ctx = new Ctor({ latencyHint: "interactive" });

    this.masterIn = this.ctx.createGain();
    this.masterIn.gain.value = 0.9;

    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -18;
    this.masterCompressor.knee.value = 20;
    this.masterCompressor.ratio.value = 8;
    this.masterCompressor.attack.value = 0.004;
    this.masterCompressor.release.value = 0.18;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    this.masterIn.connect(this.masterCompressor);
    this.masterCompressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  /** Create (or fetch cached) a named bus. */
  getBus(name: string): GainNode {
    if (!this.buses[name]) {
      const g = this.ctx.createGain();
      g.connect(this.masterIn);
      this.buses[name] = g;
    }
    return this.buses[name];
  }

  /** Set global master volume (0..1). */
  setVolume(v: number): void {
    const t = this.ctx.currentTime;
    this.masterIn.gain.cancelScheduledValues(t);
    this.masterIn.gain.setTargetAtTime(v, t, 0.02);
  }

  /** Cached stereo noise buffer for ticks/hats/noise textures. */
  getNoiseBuffer(seconds = 1): AudioBuffer {
    if (this.noiseCache) return this.noiseCache;
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    this.noiseCache = buf;
    return buf;
  }

  /** Synthesized impulse response reverb (stereo, exponentially decaying). */
  getReverb(duration = 2.2, decay = 2.6): ConvolverNode {
    if (this.reverbCache) return this.reverbCache;
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = impulse;
    this.reverbCache = conv;
    return conv;
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("AudioContext resume failed", e);
      }
    }
  }
}

/** Keep one global instance every module can share. */
export const audio = ((): {
  mgr: AudioContextManager;
  ready: boolean;
} => {
  let mgr: AudioContextManager | null = null;
  let ctx: AudioContext | null = null;
  return {
    get mgr() {
      if (!mgr) mgr = new AudioContextManager();
      ctx = mgr.ctx;
      return mgr;
    },
    get ready() {
      return !!ctx;
    }
  };
})();