import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef } from "react";
import type { BreathEngine, Snapshot } from "../hooks/useBreathingEngine";
import { useRafLoop } from "../hooks/useDevice";
import { springs } from "../lib/motion";
import {
  arcPath,
  dampingFor,
  polarPath,
  SAMPLES,
  shapeRadii,
  stepSpring,
  wavyArcPath,
  type ShapeId,
  type SpringState,
} from "../lib/shapes";
import { cycleSeconds, phaseShape, type PhaseKind, type Technique } from "../lib/techniques";
import type { PhaseColors } from "../lib/theme";

const C = 200; // viewBox centre (400 × 400)
const RING_R = 184;
const BLOB_R = 146;
const MIN_S = 0.52;
const STROKE = 8;
const AMP = 4.5;
const WAVES = 36;
const GAP = 0.1;
const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;
const COUNTDOWN_SHAPES: ShapeId[] = ["cookie9", "pentagon", "sunny"];
const NUMBER_SIZE =
  typeof CSS !== "undefined" && CSS.supports?.("width", "1cqw") ? "17cqw" : "min(13vw, 7.5vh)";

interface Sim {
  key: number;
  from: Float32Array;
  to: Float32Array;
  cur: Float32Array;
  morph: SpringState;
  pop: SpringState;
  echo: SpringState;
  rot: number;
  kick: number;
  wave: number;
}

interface Props {
  technique: Technique;
  colors: PhaseColors;
  engine: BreathEngine;
  snap: Snapshot;
  reduced: boolean;
}

export function BreathVisual({ technique, colors, engine, snap, reduced }: Props) {
  const phases = technique.phases;

  // Each phase becomes a segment of the cycle ring, proportional to its duration
  const segments = useMemo(() => {
    const cycle = cycleSeconds(technique);
    let acc = 0;
    return technique.phases.map((p) => {
      const a0 = TOP + (acc / cycle) * TAU;
      acc += p.seconds;
      return { a0, a1: TOP + (acc / cycle) * TAU, kind: p.kind };
    });
  }, [technique]);

  const blobRef = useRef<SVGPathElement>(null);
  const echoRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const activeRefs = useRef<(SVGPathElement | null)[]>([]);
  const trackRefs = useRef<(SVGPathElement | null)[]>([]);
  const sim = useRef<Sim | null>(null);
  if (sim.current === null) {
    const base = shapeRadii("circle");
    sim.current = {
      key: Number.NaN,
      from: new Float32Array(base),
      to: base,
      cur: new Float32Array(base),
      morph: { x: 1, v: 0 },
      pop: { x: 1, v: 0 },
      echo: { x: MIN_S, v: 0 },
      rot: 0,
      kick: 0,
      wave: 0,
    };
  }

  useRafLoop((dt) => {
    const S = sim.current!;
    const L = engine.live;
    const status = L.status;
    const moving = status === "running" || status === "countdown";
    const step = moving ? dt : 0;

    // Phase change → spring morph to the next shape + a bouncy pop
    if (moving && !Number.isNaN(L.key) && L.key !== S.key) {
      S.key = L.key;
      const shape =
        status === "countdown"
          ? COUNTDOWN_SHAPES[L.countdown % COUNTDOWN_SHAPES.length]
          : phaseShape(technique, phases[L.phaseIndex]);
      S.from = new Float32Array(S.cur);
      S.to = shapeRadii(shape);
      S.morph.x = 0;
      S.morph.v = 0;
      if (!reduced) {
        S.pop.v += status === "countdown" ? 1.6 : 1.1;
        S.kick += 80;
      }
    }

    stepSpring(S.morph, 1, 280, dampingFor(280, reduced ? 1 : 0.55), step);
    stepSpring(S.pop, 1, 320, dampingFor(320, reduced ? 1 : 0.3), step);

    const breath = status === "countdown" || status === "idle" ? 0 : L.breath;
    const scale = MIN_S + (1 - MIN_S) * breath;
    stepSpring(S.echo, scale, 70, dampingFor(70, reduced ? 1 : 0.42), step);

    S.rot += ((status === "countdown" ? 60 : 8) + S.kick) * step;
    S.kick *= Math.exp(-step * 3);
    S.wave += step * 4;

    const m = S.morph.x;
    for (let i = 0; i < SAMPLES; i++) S.cur[i] = S.from[i] + (S.to[i] - S.from[i]) * m;
    const rot = (S.rot * Math.PI) / 180;

    blobRef.current?.setAttribute("d", polarPath(S.cur, C, C, BLOB_R * scale * S.pop.x, rot));
    echoRef.current?.setAttribute("d", polarPath(S.cur, C, C, BLOB_R * S.echo.x * 1.08, -rot * 0.7));
    if (glowRef.current) {
      const g = 0.5 + 0.55 * ((S.echo.x - MIN_S) / (1 - MIN_S));
      glowRef.current.style.transform = `scale(${g.toFixed(4)})`;
    }

    // Cycle ring: completed part is wavy, the rest is a flat track
    const showProgress = status !== "countdown" && status !== "idle";
    const head = TOP + (status === "complete" ? TAU : L.cycleProgress * TAU);
    for (let j = 0; j < segments.length; j++) {
      const seg = segments[j];
      const start = seg.a0 + GAP / 2;
      const end = seg.a1 - GAP / 2;
      const act = activeRefs.current[j];
      const trk = trackRefs.current[j];
      if (end - start < 0.01) {
        act?.setAttribute("d", "");
        trk?.setAttribute("d", "");
        continue;
      }
      if (!showProgress || head <= start) {
        act?.setAttribute("d", "");
        trk?.setAttribute("d", arcPath(C, C, RING_R, start, end));
      } else if (head >= end) {
        act?.setAttribute("d", wavyArcPath(C, C, RING_R, start, end, AMP, WAVES, S.wave));
        trk?.setAttribute("d", "");
      } else {
        act?.setAttribute("d", wavyArcPath(C, C, RING_R, start, head, AMP, WAVES, S.wave));
        const ts = head + GAP;
        trk?.setAttribute("d", ts < end ? arcPath(C, C, RING_R, ts, end) : "");
      }
    }
  });

  const preparing = snap.status === "countdown" || snap.status === "idle";
  const kind: PhaseKind = preparing ? "rest" : (phases[snap.phaseIndex]?.kind ?? "inhale");
  const col = colors[kind];
  const display = preparing ? snap.countdown : snap.secondsLeft;

  return (
    <div className="relative h-full w-full select-none" style={{ containerType: "inline-size" }}>
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full will-change-transform"
        style={{
          color: col.glow,
          background: "radial-gradient(circle at center, currentColor 0%, transparent 62%)",
          opacity: 0.55,
          transition: "color 800ms ease",
        }}
      />
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {segments.map((seg, j) => (
          <g key={`${technique.id}-${j}`}>
            <path
              ref={(el) => {
                trackRefs.current[j] = el;
              }}
              fill="none"
              stroke={colors[seg.kind].accent}
              strokeOpacity={0.24}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            <path
              ref={(el) => {
                activeRefs.current[j] = el;
              }}
              fill="none"
              stroke={colors[seg.kind].accent}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        <path ref={echoRef} style={{ fill: col.accent, fillOpacity: 0.16, transition: "fill 700ms ease" }} />
        <path ref={blobRef} style={{ fill: col.fill, transition: "fill 700ms ease" }} />
      </svg>

      <div
        className="absolute inset-0 grid place-items-center"
        style={{ color: col.onFill, transition: "color 600ms ease" }}
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={`${snap.key}:${display}`}
            className="col-start-1 row-start-1 font-semibold leading-none tabular-nums rond-100"
            style={{ fontSize: NUMBER_SIZE }}
            initial={{ opacity: 0, scale: 0.4, y: "18%" }}
            animate={{ opacity: 1, scale: 1, y: "0%" }}
            exit={{ opacity: 0, scale: 1.3, transition: { duration: 0.18 } }}
            transition={springs.bouncy}
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
