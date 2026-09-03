import { audio } from "./AudioContextManager";

/** Per-16th-step timeslice emitted by the transport. */
export interface TickEvent {
  /** Absolute AudioContext time this step fires. */
  time: number;
  /** Global 16th-step index (monotonic while playing). */
  step: number;
  /** 16th position within current bar (0..15). */
  sixteenth: number;
  /** Bar index (0-based). */
  bar: number;
  /** Whether this is beat 0 of the bar (downbeat). */
  downbeat: boolean;
}

/**
 * Sample-accurate lookahead scheduler.
 * Audio plays by `ctx.currentTime`; JS only decides *what* to schedule.
 */
export class Transport {
  private readonly ctx: AudioContext;
  private bpmValue = 145;
  private swingValue = 0;

  private running = false;
  private timerId: number | null = null;

  private nextStepTime = 0;
  private stepIndex = 0;

  private readonly lookahead = 0.1; // seconds
  private readonly tickMs = 20; // scheduler poll rate

  private subscribers = new Set<(t: TickEvent) => void>();

  constructor() {
    this.ctx = audio.mgr.ctx;
  }

  get bpm(): number {
    return this.bpmValue;
  }
  set bpm(v: number) {
    this.bpmValue = v;
  }

  /** 0..0.5 swing, applied to offbeat 16ths. */
  get swing(): number {
    return this.swingValue;
  }
  set swing(v: number) {
    this.swingValue = v;
  }

  /** Seconds of one 16th step (swing not applied to the raw clock). */
  get stepDuration(): number {
    return 60 / this.bpmValue / 4;
  }

  /** Latest scheduled absolute time (useful for prologue scheduling). */
  get cursor(): number {
    return this.running ? this.nextStepTime : this.ctx.currentTime;
  }

  subscribe(fn: (t: TickEvent) => void): void {
    this.subscribers.add(fn);
  }

  unsubscribe(fn: (t: TickEvent) => void): void {
    this.subscribers.delete(fn);
  }

  async start(): Promise<void> {
    if (this.running) return;
    await audio.mgr.resume();
    this.nextStepTime = this.ctx.currentTime + this.lookahead;
    this.stepIndex = 0;
    this.running = true;
    this.scheduler();
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduler = (): void => {
    if (!this.running) return;
    // Schedule all steps that fall inside the lookahead window.
    while (this.nextStepTime < this.ctx.currentTime + this.lookahead) {
      this.dispatch(this.stepIndex, this.nextStepTime);
      this.stepIndex++;
      this.nextStepTime += this.stepDuration;
    }
    this.timerId = window.setTimeout(this.scheduler, this.tickMs);
  };

  private dispatch(step: number, time: number): void {
    const sixteenth = step & 15;
    // Apply swing to offbeat sixteenths via a tiny schedule-time offset is messy;
    // instead songs encode swing into rhythm generators. We pass through.
    const downbeat = sixteenth === 0;
    const t: TickEvent = { time, step, sixteenth, bar: Math.floor(step / 16), downbeat };
    this.subscribers.forEach((fn) => fn(t));
  }
}