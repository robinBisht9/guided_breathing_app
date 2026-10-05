import { AnimatePresence, motion } from "motion/react";
import { HAPTIC, haptics } from "../lib/feedback";
import { springs } from "../lib/motion";
import type { Technique } from "../lib/techniques";
import type { PhaseColors } from "../lib/theme";
import { cn } from "../utils/cn";
import { ShapeIcon } from "./Shape";
import { Icon } from "./ui";

export function PatternPills({ technique, colors, small }: { technique: Technique; colors: PhaseColors; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {technique.phases.map((p, i) => (
        <span
          key={i}
          className={cn(
            "grid place-items-center rounded-full font-semibold tabular-nums transition-colors duration-500",
            small ? "h-5 min-w-5 px-1.5 text-[11px]" : "h-6 min-w-6 px-2 text-xs",
          )}
          style={{ background: colors[p.kind].fill, color: colors[p.kind].onFill }}
          title={`${p.short} ${p.seconds}s`}
        >
          {p.seconds}
        </span>
      ))}
    </div>
  );
}

export function TechniqueCard({
  technique,
  selected,
  onSelect,
  colors,
  index,
}: {
  technique: Technique;
  selected: boolean;
  onSelect: () => void;
  colors: PhaseColors;
  index: number;
}) {
  const delay = 0.08 + index * 0.04;
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 28, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springs.spatial, delay, opacity: { duration: 0.3, delay } }}
    >
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        haptics.play(HAPTIC.select);
        onSelect();
      }}
      initial={false}
      animate={{ borderRadius: selected ? 40 : 24 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.95 }}
      transition={springs.fastSpatial}
      className={cn(
        "state-layer group relative flex h-full min-h-[156px] w-full flex-col items-start overflow-hidden p-4 text-left transition-colors duration-300",
        selected ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface",
      )}
    >
      <div className="flex w-full items-start justify-between">
        <motion.div
          animate={{ scale: selected ? 1.14 : 1, rotate: selected ? 0 : -8 }}
          transition={springs.bouncy}
          className="origin-center"
        >
          <ShapeIcon
            shape={technique.shape}
            size={46}
            color={selected ? "var(--md-primary)" : "var(--md-secondary)"}
            spin={selected}
          />
        </motion.div>
        <AnimatePresence>
          {selected && (
            <motion.span
              key="check"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={springs.bouncy}
              className="grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary"
            >
              <Icon name="check" size={18} weight={600} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-auto w-full pt-4">
        <div className="text-[15px] font-semibold leading-tight sm:text-base">{technique.name}</div>
        <div className={cn("mt-1 line-clamp-1 text-xs", selected ? "opacity-80" : "text-on-surface-variant")}>
          {technique.tagline}
        </div>
        <div className="mt-2.5">
          <PatternPills technique={technique} colors={colors} small />
        </div>
      </div>
    </motion.button>
    </motion.div>
  );
}
