import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { polarPath, SAMPLES, shapeRadii, type ShapeId } from "../lib/shapes";
import { cn } from "../utils/cn";

interface ShapeProps {
  shape: ShapeId;
  size?: number;
  color?: string;
  className?: string;
  spin?: boolean;
}

/** Static M3 Expressive shape */
export function ShapeIcon({ shape, size = 48, color = "currentColor", className, spin = false }: ShapeProps) {
  const d = useMemo(() => polarPath(shapeRadii(shape), 50, 50, 48), [shape]);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 overflow-visible", spin && "animate-spin-slow", className)}
    >
      <path d={d} style={{ fill: color, transition: "fill 400ms ease" }} />
    </svg>
  );
}

/** Shape that spring-morphs whenever `shape` changes */
export function MorphShape({
  shape,
  size = 48,
  color = "currentColor",
  className,
  spin = false,
  bounce = true,
}: ShapeProps & { bounce?: boolean }) {
  const progress = useMotionValue(1);
  const from = useRef<Float32Array>(new Float32Array(shapeRadii(shape)));
  const to = useRef<Float32Array>(shapeRadii(shape));
  const cur = useRef<Float32Array>(new Float32Array(shapeRadii(shape)));
  const mounted = useRef(false);

  const d = useTransform(progress, (t) => {
    const a = from.current;
    const b = to.current;
    const c = cur.current;
    for (let i = 0; i < SAMPLES; i++) c[i] = a[i] + (b[i] - a[i]) * t;
    return polarPath(c, 50, 50, 46);
  });

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    from.current = new Float32Array(cur.current);
    to.current = shapeRadii(shape);
    progress.jump(0);
    const controls = animate(
      progress,
      1,
      bounce ? { type: "spring", stiffness: 260, damping: 13 } : { type: "spring", stiffness: 500, damping: 45 },
    );
    return () => controls.stop();
  }, [shape, bounce, progress]);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 overflow-visible", spin && "animate-spin-slow", className)}
    >
      <motion.path d={d} style={{ fill: color, transition: "fill 400ms ease" }} />
    </svg>
  );
}
