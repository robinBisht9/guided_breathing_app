import type { ShapeId } from "./shapes";

export type PhaseKind = "inhale" | "hold" | "exhale" | "rest";

export interface Phase {
  kind: PhaseKind;
  label: string;
  short: string;
  hint: string;
  voice: string;
  seconds: number;
  /** Lung fullness (0–1) at the end of an inhale/exhale. Holds keep the previous level. */
  level: number;
  /** Optional shape override for the session visual */
  shape?: ShapeId;
}

export interface Technique {
  id: string;
  name: string;
  pattern: string;
  tagline: string;
  description: string;
  tip: string;
  shape: ShapeId;
  phases: Phase[];
  recommendedRounds: number;
  custom?: boolean;
}

export interface CustomPattern {
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
}

type Extra = Partial<Omit<Phase, "kind" | "seconds">>;

const inhale = (seconds: number, hint = "Slowly through your nose", extra: Extra = {}): Phase => ({
  kind: "inhale",
  label: "Breathe in",
  short: "In",
  voice: "Breathe in",
  hint,
  seconds,
  level: 1,
  ...extra,
});

const hold = (seconds: number, hint = "Stay soft and still", extra: Extra = {}): Phase => ({
  kind: "hold",
  label: "Hold",
  short: "Hold",
  voice: "Hold",
  hint,
  seconds,
  level: 1,
  ...extra,
});

const exhale = (seconds: number, hint = "Slowly through your mouth", extra: Extra = {}): Phase => ({
  kind: "exhale",
  label: "Breathe out",
  short: "Out",
  voice: "Breathe out",
  hint,
  seconds,
  level: 0,
  ...extra,
});

const rest = (seconds: number, hint = "Lungs empty, stay relaxed", extra: Extra = {}): Phase => ({
  kind: "rest",
  label: "Hold",
  short: "Hold",
  voice: "Hold",
  hint,
  seconds,
  level: 0,
  ...extra,
});

const make = (t: Omit<Technique, "pattern">): Technique => ({
  ...t,
  pattern: t.phases.map((p) => p.seconds).join("·"),
});

export const PRESETS: Technique[] = [
  make({
    id: "box",
    name: "Box Breathing",
    tagline: "Steady focus under pressure",
    description:
      "Four equal sides — breathe in, hold, breathe out, hold. Used by Navy SEALs, athletes and first responders to stay calm and clear-headed when the stakes are high.",
    tip: "Picture tracing the sides of a square as you move through each phase.",
    shape: "square",
    recommendedRounds: 8,
    phases: [
      inhale(4),
      hold(4, "Keep your shoulders soft"),
      exhale(4),
      rest(4),
    ],
  }),
  make({
    id: "478",
    name: "4-7-8 Breathing",
    tagline: "Unwind & drift off to sleep",
    description:
      "Dr. Andrew Weil's “relaxing breath”. A long hold and an even longer exhale slow your heart rate and quiet a racing mind — perfect at bedtime.",
    tip: "Rest the tip of your tongue just behind your upper front teeth throughout. Beginners should start with 4 rounds.",
    shape: "flower",
    recommendedRounds: 4,
    phases: [
      inhale(4, "Quietly through your nose"),
      hold(7, "Tongue resting behind your top teeth"),
      exhale(8, "Whoosh out through your mouth"),
    ],
  }),
  make({
    id: "coherent",
    name: "Coherent Breathing",
    tagline: "Balance heart & mind",
    description:
      "About six slow breaths a minute — the “resonant” pace that helps bring your heart rate, breath and nervous system into a steady, balanced rhythm.",
    tip: "Breathe low into your belly and keep every breath smooth, with no pause at the top or bottom.",
    shape: "cookie9",
    recommendedRounds: 12,
    phases: [inhale(5, "Soft belly breath through your nose"), exhale(5, "Smooth and unhurried")],
  }),
  make({
    id: "sigh",
    name: "Physiological Sigh",
    tagline: "The fastest way to calm down",
    description:
      "Two inhales through the nose — a deep one, then a short top-up — followed by a long, slow exhale. Research from Stanford found it's one of the quickest ways to release stress.",
    tip: "Even one to three sighs help in a stressful moment. Make the exhale long and complete.",
    shape: "clover",
    recommendedRounds: 5,
    phases: [
      inhale(2, "Deep through your nose", { level: 0.72 }),
      inhale(1, "A short top-up breath", {
        label: "Sip in more",
        short: "Top-up",
        voice: "And again",
        shape: "sunny",
      }),
      exhale(6, "Long and slow through your mouth", { label: "Long exhale", voice: "Long breath out" }),
    ],
  }),
  make({
    id: "triangle",
    name: "Triangle Breathing",
    tagline: "Grounding & clarity",
    description:
      "Three equal sides — in, hold, out. A simple, memorable rhythm that steadies your attention and brings you back to the present moment.",
    tip: "Imagine moving along the edges of a triangle, one side for each phase.",
    shape: "triangle",
    recommendedRounds: 8,
    phases: [inhale(4), hold(4), exhale(4)],
  }),
  make({
    id: "equal",
    name: "Equal Breathing",
    tagline: "Simple calm for beginners",
    description:
      "Sama Vritti — breathe in and out for the same count. The easiest way to begin a breathing practice and settle a busy mind.",
    tip: "Once four counts feels easy, try five or six with a Custom pattern.",
    shape: "cookie6",
    recommendedRounds: 10,
    phases: [inhale(4), exhale(4)],
  }),
  make({
    id: "711",
    name: "7-11 Breathing",
    tagline: "Ease anxiety & panic",
    description:
      "A long exhale switches on your body's relaxation response. Widely used to ease anxiety, panic and stage fright.",
    tip: "If 7 and 11 feel too long, keep the ratio but count a little faster in your head.",
    shape: "burst",
    recommendedRounds: 6,
    phases: [inhale(7), exhale(11)],
  }),
  make({
    id: "pursed",
    name: "Pursed-Lip Breathing",
    tagline: "Ease breathlessness",
    description:
      "Breathe in through your nose, then out slowly through pursed lips — as if gently blowing out a candle. It slows your breathing and makes each breath more effective.",
    tip: "Keep your neck and shoulders relaxed and let the exhale take twice as long as the inhale.",
    shape: "pill",
    recommendedRounds: 10,
    phases: [inhale(2, "Through your nose"), exhale(4, "Through pursed lips, like cooling soup")],
  }),
];

export const DEFAULT_CUSTOM: CustomPattern = { inhale: 4, hold: 2, exhale: 6, rest: 0 };

export function buildCustom(c: CustomPattern): Technique {
  const phases: Phase[] = [inhale(Math.max(1, c.inhale))];
  if (c.hold > 0) phases.push(hold(c.hold));
  phases.push(exhale(Math.max(1, c.exhale)));
  if (c.rest > 0) phases.push(rest(c.rest));
  return make({
    id: "custom",
    name: "Custom Rhythm",
    tagline: "Design your own pattern",
    description:
      "Set your own count for each part of the breath. Set a hold to 0 to skip it entirely.",
    tip: "Begin gently — you can always lengthen the counts as your breath slows down.",
    shape: "gem",
    recommendedRounds: 8,
    phases,
    custom: true,
  });
}

export const cycleSeconds = (t: Technique) => t.phases.reduce((sum, p) => sum + p.seconds, 0);

export const breathsPerMinute = (t: Technique) => 60 / cycleSeconds(t);

/** Shape used by the session visual for a given phase */
export function phaseShape(t: Technique, phase: Phase): ShapeId {
  if (phase.shape) return phase.shape;
  switch (phase.kind) {
    case "inhale":
      return t.shape;
    case "hold":
      return "sunny";
    case "exhale":
      return "circle";
    default:
      return "cookie4";
  }
}

/** Lung level at the start and end of every phase of one cycle */
export function phaseLevels(phases: Phase[]) {
  const start: number[] = [];
  const end: number[] = [];
  let level = 0;
  for (const p of phases) {
    start.push(level);
    if (p.kind === "inhale" || p.kind === "exhale") level = p.level;
    end.push(level);
  }
  return { start, end };
}

export const MAX_SESSION_SECONDS = 3600;

/** Timer sessions are always a whole number of cycles */
export const timerRounds = (seconds: number, cycle: number) =>
  Math.min(Math.max(1, Math.round(seconds / cycle)), Math.max(1, Math.floor(MAX_SESSION_SECONDS / cycle)));
