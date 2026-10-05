/**
 * Material 3 Expressive motion tokens (springs).
 * Damping values are converted from M3 damping ratios (mass = 1):
 *   damping = 2 · ratio · √stiffness
 */
export const springs = {
  /** Expressive fast spatial — ratio 0.6, stiffness 800 (small components) */
  fastSpatial: { type: "spring", stiffness: 800, damping: 34 },
  /** Expressive default spatial — ratio 0.8, stiffness 380 */
  spatial: { type: "spring", stiffness: 380, damping: 31 },
  /** Expressive slow spatial — ratio 0.8, stiffness 200 (large surfaces) */
  slowSpatial: { type: "spring", stiffness: 200, damping: 23 },
  /** Effects (no overshoot) */
  fastEffects: { type: "spring", stiffness: 3800, damping: 123 },
  effects: { type: "spring", stiffness: 1600, damping: 80 },
  /** Extra playful springs for celebratory / numeric moments */
  bouncy: { type: "spring", stiffness: 520, damping: 19 },
  jelly: { type: "spring", stiffness: 240, damping: 13 },
} as const;

export const EASE_EMPHASIZED: [number, number, number, number] = [0.2, 0, 0, 1];
export const EASE_EMPHASIZED_DECEL: [number, number, number, number] = [0.05, 0.7, 0.1, 1];
export const EASE_EMPHASIZED_ACCEL: [number, number, number, number] = [0.3, 0, 0.8, 0.15];
