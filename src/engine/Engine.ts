/** Top-level facade wiring audio graph + transport + generative brain. */
import { audio, AudioContextManager } from "./AudioContextManager";
import { FX } from "./FX";
import { VoiceManager } from "./VoiceManager";
import { Transport } from "./Transport";
import { SongEngine } from "./generation/SongEngine";
import { STYLES, STYLE_NAMES } from "./styles";
import type { SectionName, StyleName, LayerName, PlanSnapshot, PlayheadView } from "./types";

export interface EngineCallbacks {
  onSectionChange?: (s: SectionName) => void;
  onTransportChange?: (playing: boolean, elapsed: number) => void;
  onPlan?: (s: PlanSnapshot) => void;
  onPlayhead?: (v: PlayheadView) => void;
}

export class Engine {
  readonly mgr: AudioContextManager;
  readonly fx: FX;
  readonly transport: Transport;
  private readonly voice: VoiceManager;
  private readonly song: SongEngine;
  private readonly cb: EngineCallbacks;

  private styleName: StyleName = "fullon";
  private seed = 20240901;
  private startOffset = 0;

  constructor(cb: EngineCallbacks = {}) {
    this.cb = cb;
    this.mgr = audio.mgr;
    this.fx = new FX(this.mgr);
    this.voice = new VoiceManager(this.fx);
    this.transport = new Transport();
    this.song = new SongEngine(this.voice, this.styleName);

    // Orchestrate: plan snapshots + section/playhead events off the audio clock.
    this.song.subscribePlan((s) => this.cb.onPlan?.(s));
    this.transport.subscribe((t) => {
      this.song.onTick(t.time, t.bar, t.sixteenth);
      if (t.sixteenth === 0) {
        this.cb.onTransportChange?.(true, this.mgr.ctx.currentTime - this.startOffset);
        this.cb.onSectionChange?.(this.song.currentSection());
      }
      this.cb.onPlayhead?.({ bar: t.bar, sixteenth: t.sixteenth, section: this.song.currentSection() });
      this.playheadCbs.forEach((fn) => fn({ bar: t.bar, sixteenth: t.sixteenth, section: this.song.currentSection() }));
    });

    this.applyStyleParams();
  }

  /** Subscribe to full planning snapshots (per bar). */
  subscribePlan(fn: (s: PlanSnapshot) => void): void {
    this.song.subscribePlan(fn);
  }

  /** Subscribe to playhead ticks (every 16th step). */
  subscribePlayhead(fn: (v: PlayheadView) => void): void {
    this.playheadCbs.add(fn);
  }

  private readonly playheadCbs = new Set<(v: PlayheadView) => void>();

  private applyStyleParams(): void {
    const cfg = STYLES[this.styleName];
    this.transport.bpm = (cfg.bpm[0] + cfg.bpm[1]) / 2;
    this.fx.setBpm(this.transport.bpm);
    this.fx.setSpace(cfg.space);
    this.voice.setBpm(this.transport.bpm);
    this.song.setBpm(this.transport.bpm);
    this.song.setStyle(this.styleName);
  }

  async start(): Promise<void> {
    this.startOffset = this.mgr.ctx.currentTime;
    await this.transport.start();
    this.cb.onTransportChange?.(true, 0);
  }

  stop(): void {
    this.transport.stop();
    this.cb.onTransportChange?.(false, this.mgr.ctx.currentTime - this.startOffset);
  }

  getStyleName(): StyleName {
    return this.styleName;
  }

  setStyle(name: StyleName): void {
    this.styleName = name;
    this.applyStyleParams();
  }

  setSeed(seed: number): void {
    this.seed = seed >>> 0;
    this.song.setSeed(this.seed);
  }

  setBpm(bpm: number): void {
    this.transport.bpm = bpm;
    this.fx.setBpm(bpm);
    this.voice.setBpm(bpm);
    this.song.setBpm(bpm);
  }

  setVolume(v: number): void {
    this.mgr.setVolume(v);
  }

  setAbsurdity(v: number): void {
    this.song.setAbsurdity(v);
  }

  setBrightness(v: number | null): void {
    this.song.setBrightness(v);
  }
  setGrit(v: number | null): void {
    this.song.setGrit(v);
  }
  setSpace(v: number | null): void {
    this.song.setSpace(v);
    this.fx.setSpace(v ?? STYLES[this.styleName].space);
  }

  /** Randomize seed: regenerate the musical continuum in a fresh key/direction. */
  randomizeSeed(): void {
    this.setSeed((Math.random() * 0xffffffff) >>> 0);
  }

  getSeed(): number {
    return this.seed;
  }

  /** Current elapsed playback seconds (audio-time). */
  elapsedNow(): number {
    return this.mgr.ctx.currentTime - this.startOffset;
  }

  getAnalyser(): AnalyserNode {
    return this.mgr.analyser;
  }

  /** Load real recorded samples; per-layer synth fallback if a file is missing. */
  loadSamples(): Promise<number> {
    return this.voice.loadSamples();
  }

  /** Mute/unmute a channel; mutes drop all scheduled notes for that layer. */
  setLayerMuted(layer: LayerName, muted: boolean): void {
    this.voice.setMuted(layer, muted);
  }

  isLayerMuted(layer: LayerName): boolean {
    return this.voice.isMuted(layer);
  }

  /** Audition one layer: a representative note with current style params. */
  async previewLayer(layer: LayerName): Promise<void> {
    await this.mgr.resume();
    const root = this.song.rootNote();
    const note =
      layer === "kick" ? root - 12
      : layer === "bass" || layer === "acid" ? root
      : layer === "lead" ? root + 36
      : layer === "pads" ? root + 12
      : layer === "perc" ? root - 5
      : layer === "hats" ? 80
      : layer === "clap" ? 70
      : 27; // fx: the sub-drop event key
    const dur =
      layer === "kick" ? 0.06
      : layer === "bass" || layer === "acid" ? 0.13
      : layer === "lead" ? 0.35
      : layer === "hats" ? 0.05
      : layer === "clap" ? 0.08
      : layer === "perc" ? 0.1
      : layer === "pads" ? 1.6
      : 1.8;
    this.voice.playPreview({
      time: this.mgr.ctx.currentTime + 0.03,
      duration: dur,
      note,
      velocity: layer === "pads" ? 0.7 : 0.85,
      layer,
      params: this.song.paramsFor(layer)
    });
  }

  /** Layers currently backed by a real sample (for UI HUD). */
  sampledLayers(): string[] {
    return this.voice.sampledLayers();
  }

  get currentSection(): SectionName {
    return this.song.currentSection();
  }
}

export { STYLES, STYLE_NAMES };
export type { StyleName };