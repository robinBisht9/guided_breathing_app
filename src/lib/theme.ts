import {
  argbFromHex,
  hexFromArgb,
  Hct,
  SchemeTonalSpot,
  TonalPalette,
  type DynamicScheme,
} from "@material/material-color-utilities";
import type { PhaseKind } from "./techniques";

export interface Seed {
  id: string;
  name: string;
  hex: string;
}

export const SEEDS: Seed[] = [
  { id: "lagoon", name: "Lagoon", hex: "#0E8A84" },
  { id: "lavender", name: "Lavender", hex: "#6750A4" },
  { id: "ocean", name: "Ocean", hex: "#2F6FD6" },
  { id: "meadow", name: "Meadow", hex: "#4D8B31" },
  { id: "ember", name: "Ember", hex: "#D9692B" },
  { id: "blossom", name: "Blossom", hex: "#C2457A" },
];

const ROLES = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "surface",
  "surfaceDim",
  "surfaceBright",
  "onSurface",
  "onSurfaceVariant",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "outline",
  "outlineVariant",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
  "scrim",
] as const;

type Role = (typeof ROLES)[number];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

function makeScheme(hex: string, dark: boolean): DynamicScheme {
  const source = Hct.fromInt(argbFromHex(hex));
  try {
    // 2025 spec = Material 3 Expressive colour system
    const scheme = new SchemeTonalSpot(source, dark, 0, "2025");
    void scheme.primary;
    return scheme;
  } catch {
    return new SchemeTonalSpot(source, dark, 0);
  }
}

export function buildSchemeVars(hex: string, dark: boolean): Record<string, string> {
  const scheme = makeScheme(hex, dark) as unknown as Record<Role, number>;
  const vars: Record<string, string> = {};
  for (const role of ROLES) vars[`--md-${kebab(role)}`] = hexFromArgb(scheme[role]);
  return vars;
}

export interface PhaseColor {
  /** Main fill of the breathing shape */
  fill: string;
  /** Text on top of the fill */
  onFill: string;
  /** Strong accent: rings, labels, progress */
  accent: string;
  /** Soft glow behind the shape */
  glow: string;
  /** Tinted page background during the phase */
  bg: string;
}

export type PhaseColors = Record<PhaseKind, PhaseColor>;

/** Harmonised phase colours derived from the seed hue (analogous triad) */
export function buildPhaseColors(hex: string, dark: boolean): PhaseColors {
  const hue = Hct.fromInt(argbFromHex(hex)).hue;
  const make = (offset: number, chroma: number): PhaseColor => {
    const h = (hue + offset + 360) % 360;
    const p = TonalPalette.fromHueAndChroma(h, chroma);
    const soft = TonalPalette.fromHueAndChroma(h, Math.min(chroma, 18));
    const c = (pal: TonalPalette, tone: number) => hexFromArgb(pal.tone(tone));
    return dark
      ? { fill: c(p, 32), onFill: c(p, 92), accent: c(p, 80), glow: c(p, 45), bg: c(soft, 8) }
      : { fill: c(p, 84), onFill: c(p, 16), accent: c(p, 44), glow: c(p, 80), bg: c(soft, 96) };
  };
  return {
    inhale: make(0, 52),
    hold: make(62, 46),
    exhale: make(-58, 46),
    rest: make(-58, 14),
  };
}

/** Swatch colour for the seed picker */
export function seedSwatch(hex: string, dark: boolean) {
  const hue = Hct.fromInt(argbFromHex(hex)).hue;
  return hexFromArgb(TonalPalette.fromHueAndChroma(hue, 56).tone(dark ? 78 : 48));
}
