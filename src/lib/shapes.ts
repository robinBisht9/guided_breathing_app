/**
 * Procedural versions of the Material 3 Expressive shape library.
 * Every shape is sampled at the same polar angles, so any two shapes can be
 * morphed by simply interpolating their radii (springs may overshoot for bounce).
 */
export type ShapeId =
  | "circle"
  | "square"
  | "cookie4"
  | "cookie6"
  | "cookie9"
  | "cookie12"
  | "sunny"
  | "flower"
  | "clover"
  | "triangle"
  | "pentagon"
  | "burst"
  | "pill"
  | "gem"
  | "puffy";

export const SAMPLES = 120;
const TAU = Math.PI * 2;

type Def =
  | { kind: "circle" }
  | { kind: "lobes"; n: number; depth: number; sharp: number; offset?: number }
  | { kind: "superellipse"; p: number }
  | { kind: "ellipse"; ratio: number; angle: number };

const DEFS: Record<ShapeId, Def> = {
  circle: { kind: "circle" },
  square: { kind: "superellipse", p: 4.2 },
  cookie4: { kind: "lobes", n: 4, depth: 0.12, sharp: 0.7, offset: Math.PI / 4 },
  cookie6: { kind: "lobes", n: 6, depth: 0.1, sharp: 0.72, offset: -Math.PI / 2 },
  cookie9: { kind: "lobes", n: 9, depth: 0.085, sharp: 0.75, offset: -Math.PI / 2 },
  cookie12: { kind: "lobes", n: 12, depth: 0.075, sharp: 0.8 },
  sunny: { kind: "lobes", n: 8, depth: 0.13, sharp: 1.7, offset: -Math.PI / 2 },
  flower: { kind: "lobes", n: 8, depth: 0.24, sharp: 0.55, offset: -Math.PI / 2 },
  clover: { kind: "lobes", n: 4, depth: 0.34, sharp: 0.5, offset: Math.PI / 4 },
  triangle: { kind: "lobes", n: 3, depth: 0.3, sharp: 0.85, offset: -Math.PI / 2 },
  pentagon: { kind: "lobes", n: 5, depth: 0.14, sharp: 1.1, offset: -Math.PI / 2 },
  burst: { kind: "lobes", n: 12, depth: 0.2, sharp: 2.6, offset: -Math.PI / 2 },
  pill: { kind: "ellipse", ratio: 0.66, angle: -Math.PI / 4 },
  gem: { kind: "lobes", n: 6, depth: 0.15, sharp: 1.9, offset: -Math.PI / 2 },
  puffy: { kind: "lobes", n: 5, depth: 0.13, sharp: 0.6, offset: -Math.PI / 2 },
};

function radiusAt(def: Def, t: number): number {
  switch (def.kind) {
    case "circle":
      return 1;
    case "lobes": {
      const g = Math.pow((1 + Math.cos(def.n * (t - (def.offset ?? 0)))) / 2, def.sharp);
      return 1 - def.depth * (1 - g);
    }
    case "superellipse": {
      const c = Math.abs(Math.cos(t));
      const s = Math.abs(Math.sin(t));
      return Math.pow(Math.pow(c, def.p) + Math.pow(s, def.p), -1 / def.p);
    }
    case "ellipse": {
      const a = t - def.angle;
      const c = Math.cos(a);
      const s = Math.sin(a) / def.ratio;
      return 1 / Math.sqrt(c * c + s * s);
    }
  }
}

const cache = new Map<ShapeId, Float32Array>();

/** Normalised radii (max = 1) sampled at SAMPLES evenly spaced angles */
export function shapeRadii(id: ShapeId): Float32Array {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = DEFS[id];
  const r = new Float32Array(SAMPLES);
  let max = 0;
  for (let i = 0; i < SAMPLES; i++) {
    r[i] = radiusAt(def, (i / SAMPLES) * TAU);
    if (r[i] > max) max = r[i];
  }
  for (let i = 0; i < SAMPLES; i++) r[i] /= max;
  cache.set(id, r);
  return r;
}

const f = (v: number) => (Math.round(v * 10) / 10).toString();

const xs = new Float32Array(SAMPLES);
const ys = new Float32Array(SAMPLES);

/** Smooth closed path through the polar samples (quadratic midpoint smoothing) */
export function polarPath(radii: ArrayLike<number>, cx: number, cy: number, R: number, rotation = 0): string {
  const n = radii.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rotation;
    const r = Math.max(0, radii[i]) * R;
    xs[i] = cx + r * Math.cos(a);
    ys[i] = cy + r * Math.sin(a);
  }
  let d = `M${f((xs[n - 1] + xs[0]) / 2)} ${f((ys[n - 1] + ys[0]) / 2)}`;
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    d += `Q${f(xs[i])} ${f(ys[i])} ${f((xs[i] + xs[j]) / 2)} ${f((ys[i] + ys[j]) / 2)}`;
  }
  return d + "Z";
}

/** Flat circular arc (clockwise from a0 to a1, radians) */
export function arcPath(cx: number, cy: number, R: number, a0: number, a1: number): string {
  if (a1 - a0 <= 0.0001) return "";
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${f(cx + R * Math.cos(a0))} ${f(cy + R * Math.sin(a0))}A${R} ${R} 0 ${large} 1 ${f(
    cx + R * Math.cos(a1),
  )} ${f(cy + R * Math.sin(a1))}`;
}

/** M3 Expressive wavy circular indicator segment */
export function wavyArcPath(
  cx: number,
  cy: number,
  R: number,
  a0: number,
  a1: number,
  amp: number,
  waves: number,
  phase: number,
): string {
  if (a1 - a0 <= 0.0001) return "";
  const n = Math.max(2, Math.ceil((a1 - a0) / 0.02));
  const ramp = 0.09;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const env = Math.min(1, (a - a0) / ramp, (a1 - a) / ramp);
    const r = R + amp * env * Math.sin(waves * a + phase);
    d += `${i ? "L" : "M"}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }
  return d;
}

/** M3 Expressive wavy linear indicator */
export function wavyLinePath(x0: number, x1: number, y: number, amp: number, wavelength: number, phase: number): string {
  if (x1 - x0 <= 0.5) return "";
  const n = Math.max(1, Math.ceil((x1 - x0) / 2));
  const ramp = 8;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const env = Math.min(1, (x - x0) / ramp, (x1 - x) / ramp);
    const yy = y + amp * env * Math.sin((x / wavelength) * TAU - phase);
    d += `${i ? "L" : "M"}${f(x)} ${f(yy)}`;
  }
  return d;
}

export interface SpringState {
  x: number;
  v: number;
}

export const dampingFor = (stiffness: number, ratio: number) => 2 * ratio * Math.sqrt(stiffness);

/** Semi-implicit Euler integration of a damped spring */
export function stepSpring(s: SpringState, target: number, stiffness: number, damping: number, dt: number) {
  if (dt <= 0) return;
  const steps = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const a = -stiffness * (s.x - target) - damping * s.v;
    s.v += a * h;
    s.x += s.v * h;
  }
}
