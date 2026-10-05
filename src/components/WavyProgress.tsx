import { useLayoutEffect, useRef, useState } from "react";
import { useRafLoop } from "../hooks/useDevice";
import { wavyLinePath } from "../lib/shapes";
import { cn } from "../utils/cn";

/** M3 Expressive wavy linear progress indicator with a travelling wave and stop indicator */
export function WavyLinearProgress({
  getProgress,
  color,
  active = true,
  height = 16,
  className,
}: {
  getProgress: () => number;
  color: string;
  active?: boolean;
  height?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<SVGPathElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(0);
  const phase = useRef(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useRafLoop((dt) => {
    if (!width) return;
    if (active) phase.current += dt * 6;
    const p = Math.min(1, Math.max(0, getProgress()));
    const y = height / 2;
    const x0 = 2;
    const x1 = width - 10;
    const head = x0 + (x1 - x0) * p;
    const hasActive = p > 0.003;
    activeRef.current?.setAttribute("d", hasActive ? wavyLinePath(x0, head, y, 3, 28, phase.current) : "");
    const ts = head + (hasActive ? 8 : 0);
    trackRef.current?.setAttribute("d", ts < x1 ? `M${ts.toFixed(1)} ${y}L${x1.toFixed(1)} ${y}` : "");
  });

  return (
    <div ref={wrapRef} className={cn("w-full", className)} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <path
            ref={trackRef}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            style={{ stroke: color, strokeOpacity: 0.25, transition: "stroke 600ms ease" }}
          />
          <circle cx={width - 2} cy={height / 2} r={2} style={{ fill: color, transition: "fill 600ms ease" }} />
          <path
            ref={activeRef}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: color, transition: "stroke 600ms ease" }}
          />
        </svg>
      )}
    </div>
  );
}
