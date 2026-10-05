import type { PhaseKind } from "./techniques";

/* ───────────────────────────── Haptics ─────────────────────────────
 * Android / Chromium: the standard Vibration API (navigator.vibrate).
 * iOS Safari has no Vibration API; on iOS 17.4+ toggling a hidden
 * <input type="checkbox" switch> plays a light Taptic tick, which we use
 * as a best-effort fallback. Elsewhere haptics are simply unavailable.
 */
type Pattern = number | number[];

const hasWindow = typeof window !== "undefined";
const nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined;
const isTouch =
  !!nav && (nav.maxTouchPoints > 0 || (hasWindow && !!window.matchMedia?.("(pointer: coarse)")?.matches));
const canVibrate = !!nav && typeof nav.vibrate === "function" && isTouch;
const isIOS =
  !!nav && (/iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1));

function iosTick() {
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    label.remove();
  } catch {
    /* unsupported */
  }
}

export const HAPTIC = {
  tap: [12],
  select: [18],
  toggle: [10, 40, 18],
  /** Rising pulses — the breath building up */
  inhale: [14, 60, 22, 60, 36],
  /** Two even taps — hold still */
  hold: [26, 110, 26],
  /** Falling pulses — letting go */
  exhale: [36, 60, 22, 60, 14],
  rest: [24],
  tick: [9],
  countdown: [20],
  complete: [50, 90, 50, 90, 180],
} satisfies Record<string, number[]>;

export const haptics = {
  enabled: true,
  supported: canVibrate || isIOS,
  native: canVibrate,
  play(pattern: Pattern) {
    if (!this.enabled || !this.supported) return;
    if (canVibrate) {
      try {
        nav!.vibrate(pattern);
      } catch {
        /* blocked until user activation */
      }
      return;
    }
    if (isIOS) {
      const arr = Array.isArray(pattern) ? pattern : [pattern];
      let t = 0;
      arr.forEach((dur, i) => {
        if (i % 2 === 0) {
          if (t === 0) iosTick();
          else window.setTimeout(iosTick, t);
        }
        t += dur;
      });
    }
  },
};

/* ───────────────────────────── Sound ───────────────────────────── */
class SoundEngine {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (!hasWindow) return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  /** Must be called from a user gesture once (Start button) */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  /** Soft synthesized bell */
  bell(freq: number, { duration = 1.8, gain = 0.15, delay = 0 } = {}) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t0 = ctx.currentTime + 0.01 + delay;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    env.connect(this.master);
    const partials: [number, number][] = [
      [1, 1],
      [2, 0.26],
      [2.99, 0.09],
      [4.07, 0.035],
    ];
    for (const [mult, g] of partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * mult, t0);
      const pg = ctx.createGain();
      pg.gain.value = g;
      osc.connect(pg);
      pg.connect(env);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    }
  }

  phase(kind: PhaseKind) {
    switch (kind) {
      case "inhale":
        return this.bell(523.25, { duration: 1.9 });
      case "hold":
        return this.bell(659.25, { duration: 1.5, gain: 0.11 });
      case "exhale":
        return this.bell(392.0, { duration: 2.3 });
      case "rest":
        return this.bell(329.63, { duration: 1.3, gain: 0.1 });
    }
  }
  tick() {
    this.bell(1046.5, { duration: 0.14, gain: 0.03 });
  }
  countdown(n: number) {
    this.bell(n === 1 ? 783.99 : 587.33, { duration: 0.45, gain: 0.07 });
  }
  complete() {
    [523.25, 659.25, 783.99, 1046.5].forEach((fq, i) => this.bell(fq, { delay: i * 0.14, duration: 2.6, gain: 0.11 }));
  }
}

export const sound = new SoundEngine();

/* ───────────────────────────── Voice ───────────────────────────── */
class VoiceGuide {
  enabled = false;
  readonly supported =
    hasWindow && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
  private voice: SpeechSynthesisVoice | null = null;

  private pick(): SpeechSynthesisVoice | null {
    if (this.voice) return this.voice;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
    const preferred = [
      "Google UK English Female",
      "Samantha",
      "Karen",
      "Moira",
      "Serena",
      "Microsoft Aria",
      "Microsoft Jenny",
      "Google US English",
    ];
    this.voice =
      preferred.map((name) => en.find((v) => v.name.includes(name))).find(Boolean) ??
      en.find((v) => v.localService) ??
      en[0] ??
      null;
    return this.voice;
  }

  speak(text: string) {
    if (!this.enabled || !this.supported) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pick();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      }
      u.rate = 0.88;
      u.pitch = 1;
      u.volume = 1;
      synth.speak(u);
    } catch {
      /* ignore */
    }
  }

  /** iOS needs a first utterance inside a user gesture */
  prime() {
    if (!this.enabled || !this.supported) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  cancel() {
    if (!this.supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export const voice = new VoiceGuide();

if (voice.supported) {
  // Warm up the voice list (Chrome loads it asynchronously)
  window.speechSynthesis.getVoices();
}
