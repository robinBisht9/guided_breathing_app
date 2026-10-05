import { useEffect, useRef, useSyncExternalStore } from "react";
import { cycleSeconds, phaseLevels, type Phase, type Technique } from "../lib/techniques";

export type SessionMode = "rounds" | "timer" | "free";

export interface SessionPlan {
  mode: SessionMode;
  /** Target rounds for "rounds" and "timer" (timer = whole cycles); ignored for "free" */
  rounds: number;
}

export type EngineStatus = "idle" | "countdown" | "running" | "paused" | "complete";

/** Per-frame values read directly by the visuals (no React re-render) */
export interface LiveState {
  status: EngineStatus;
  key: number;
  phaseIndex: number;
  phaseProgress: number;
  cycleProgress: number;
  breath: number;
  round: number;
  sessionProgress: number;
  countdown: number;
}

/** Coarse values that drive React rendering (changes a few times per second) */
export interface Snapshot {
  status: EngineStatus;
  key: number;
  phaseIndex: number;
  round: number;
  secondsLeft: number;
  elapsed: number;
  countdown: number;
}

export interface SessionResult {
  rounds: number;
  seconds: number;
  completed: boolean;
}

export interface EngineHandlers {
  onCountdown?: (n: number) => void;
  onPhase?: (phase: Phase, index: number, round: number) => void;
  onSecond?: (secondsLeft: number, phase: Phase) => void;
  onComplete?: (result: SessionResult) => void;
}

export const COUNTDOWN_SECONDS = 3;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export class BreathEngine {
  readonly technique: Technique;
  readonly plan: SessionPlan;
  handlers: EngineHandlers;

  live: LiveState = {
    status: "idle",
    key: Number.NaN,
    phaseIndex: 0,
    phaseProgress: 0,
    cycleProgress: 0,
    breath: 0,
    round: 0,
    sessionProgress: 0,
    countdown: COUNTDOWN_SECONDS,
  };

  private snap: Snapshot = {
    status: "idle",
    key: Number.NaN,
    phaseIndex: 0,
    round: 0,
    secondsLeft: 0,
    elapsed: 0,
    countdown: COUNTDOWN_SECONDS,
  };

  private listeners = new Set<() => void>();
  private levels: { start: number[]; end: number[] };
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private countdownStart = 0;
  private lastKey = Number.NaN;
  private lastSecond = -1;
  private lastElapsed = -1;

  constructor(technique: Technique, plan: SessionPlan, handlers: EngineHandlers) {
    this.technique = technique;
    this.plan = plan;
    this.handlers = handlers;
    this.levels = phaseLevels(technique.phases);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.snap;

  get cycleMs() {
    return cycleSeconds(this.technique) * 1000;
  }

  get targetRounds() {
    return this.plan.mode === "free" ? Infinity : Math.max(1, this.plan.rounds);
  }

  private publish(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  private setStatus(status: EngineStatus) {
    this.live.status = status;
    this.publish({ status });
  }

  /** (Re)start from the beginning with a short "get ready" countdown */
  start() {
    cancelAnimationFrame(this.raf);
    this.elapsed = 0;
    this.lastKey = Number.NaN;
    this.lastSecond = -1;
    this.lastElapsed = -1;
    Object.assign(this.live, {
      key: Number.NaN,
      phaseIndex: 0,
      phaseProgress: 0,
      cycleProgress: 0,
      breath: 0,
      round: 0,
      sessionProgress: 0,
      countdown: COUNTDOWN_SECONDS,
    });
    this.countdownStart = performance.now();
    this.publish({
      key: Number.NaN,
      phaseIndex: 0,
      round: 0,
      secondsLeft: this.technique.phases[0].seconds,
      elapsed: 0,
      countdown: COUNTDOWN_SECONDS,
    });
    this.setStatus("countdown");
    this.raf = requestAnimationFrame(this.loop);
  }

  skipCountdown() {
    if (this.live.status === "countdown") this.countdownStart = performance.now() - COUNTDOWN_SECONDS * 1000;
  }

  pause() {
    if (this.live.status !== "running") return;
    cancelAnimationFrame(this.raf);
    this.setStatus("paused");
  }

  resume() {
    if (this.live.status !== "paused") return;
    this.last = performance.now();
    this.setStatus("running");
    this.raf = requestAnimationFrame(this.loop);
  }

  toggle() {
    const s = this.live.status;
    if (s === "running") this.pause();
    else if (s === "paused") this.resume();
    else if (s === "countdown") this.skipCountdown();
  }

  /** End early; returns what was completed */
  stop(): SessionResult {
    cancelAnimationFrame(this.raf);
    const result: SessionResult = {
      rounds: Math.floor(this.elapsed / this.cycleMs),
      seconds: Math.round(this.elapsed / 1000),
      completed: false,
    };
    this.setStatus("idle");
    return result;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  private loop = (now: number) => {
    const L = this.live;

    if (L.status === "countdown") {
      const n = COUNTDOWN_SECONDS - Math.floor((now - this.countdownStart) / 1000);
      if (n > 0) {
        const key = -n;
        if (key !== this.lastKey) {
          this.lastKey = key;
          L.key = key;
          L.countdown = n;
          this.handlers.onCountdown?.(n);
          this.publish({ key, countdown: n });
        }
        this.raf = requestAnimationFrame(this.loop);
        return;
      }
      this.last = now;
      this.elapsed = 0;
      this.setStatus("running");
    }

    if (L.status !== "running") return;

    this.elapsed += Math.min(Math.max(0, now - this.last), 1000);
    this.last = now;

    const phases = this.technique.phases;
    const cycleMs = this.cycleMs;
    const totalMs = this.targetRounds * cycleMs;

    if (this.elapsed >= totalMs) {
      this.finish(totalMs);
      return;
    }

    const round = Math.floor(this.elapsed / cycleMs);
    const t = this.elapsed - round * cycleMs;
    let acc = 0;
    let idx = 0;
    while (idx < phases.length - 1 && t >= acc + phases[idx].seconds * 1000) {
      acc += phases[idx].seconds * 1000;
      idx++;
    }
    const phase = phases[idx];
    const durMs = phase.seconds * 1000;
    const local = Math.min(durMs, Math.max(0, t - acc));
    const progress = durMs > 0 ? local / durMs : 1;
    const from = this.levels.start[idx];
    const to = this.levels.end[idx];

    L.breath = from + (to - from) * easeInOutSine(progress);
    L.phaseIndex = idx;
    L.phaseProgress = progress;
    L.cycleProgress = t / cycleMs;
    L.round = round;
    L.sessionProgress = Number.isFinite(totalMs) ? this.elapsed / totalMs : 0;

    const key = round * 100 + idx;
    const secondsLeft = Math.max(1, Math.ceil((durMs - local) / 1000));
    const elapsed = Math.floor(this.elapsed / 1000);

    if (key !== this.lastKey) {
      this.lastKey = key;
      L.key = key;
      this.lastSecond = secondsLeft;
      this.lastElapsed = elapsed;
      this.handlers.onPhase?.(phase, idx, round);
      this.publish({ key, phaseIndex: idx, round, secondsLeft, elapsed });
    } else if (secondsLeft !== this.lastSecond || elapsed !== this.lastElapsed) {
      if (secondsLeft !== this.lastSecond) this.handlers.onSecond?.(secondsLeft, phase);
      this.lastSecond = secondsLeft;
      this.lastElapsed = elapsed;
      this.publish({ secondsLeft, elapsed });
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private finish(totalMs: number) {
    this.elapsed = totalMs;
    const rounds = this.targetRounds;
    Object.assign(this.live, { breath: 0, phaseProgress: 1, cycleProgress: 1, sessionProgress: 1, round: rounds });
    const result: SessionResult = { rounds, seconds: Math.round(totalMs / 1000), completed: true };
    this.publish({ round: rounds, elapsed: result.seconds });
    this.setStatus("complete");
    this.handlers.onComplete?.(result);
  }
}

export function useBreathingEngine(technique: Technique, plan: SessionPlan, handlers: EngineHandlers) {
  const ref = useRef<BreathEngine | null>(null);
  if (ref.current === null) ref.current = new BreathEngine(technique, plan, handlers);
  const engine = ref.current;
  engine.handlers = handlers;

  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => {
    // Auto-pause when the tab is hidden (animation frames stop anyway)
    const onVisibility = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      engine.destroy();
    };
  }, [engine]);

  return { engine, snap };
}
