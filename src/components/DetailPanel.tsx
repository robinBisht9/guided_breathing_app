import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { springs } from "../lib/motion";
import type { Prefs } from "../lib/storage";
import {
  breathsPerMinute,
  cycleSeconds,
  type CustomPattern,
  type PhaseKind,
  type Technique,
} from "../lib/techniques";
import type { PhaseColors } from "../lib/theme";
import { SessionSetup } from "./SessionSetup";
import { MorphShape } from "./Shape";
import { AnimatedText, Icon, IconButton } from "./ui";

/** Connected-group style bar showing each phase proportional to its length */
function RhythmBar({ technique, colors }: { technique: Technique; colors: PhaseColors }) {
  const n = technique.phases.length;
  return (
    <div className="flex h-16 w-full gap-[3px]">
      {technique.phases.map((p, i) => {
        const first = i === 0;
        const last = i === n - 1;
        return (
          <motion.div
            key={`${technique.id}-${i}`}
            initial={{ scaleY: 0.3, opacity: 0, flexGrow: p.seconds }}
            animate={{ scaleY: 1, opacity: 1, flexGrow: p.seconds }}
            transition={{
              scaleY: { ...springs.bouncy, delay: i * 0.06 },
              opacity: { duration: 0.2, delay: i * 0.06 },
              flexGrow: springs.fastSpatial,
            }}
            className="flex min-w-[46px] flex-col items-center justify-center overflow-hidden px-1 transition-colors duration-500"
            style={{
              flexBasis: 0,
              background: colors[p.kind].fill,
              color: colors[p.kind].onFill,
              borderTopLeftRadius: first ? 32 : 8,
              borderBottomLeftRadius: first ? 32 : 8,
              borderTopRightRadius: last ? 32 : 8,
              borderBottomRightRadius: last ? 32 : 8,
            }}
          >
            <span className="truncate text-[11px] font-semibold uppercase tracking-wider opacity-80">{p.short}</span>
            <span className="text-lg font-bold leading-tight tabular-nums rond-100">{p.seconds}s</span>
          </motion.div>
        );
      })}
    </div>
  );
}

const FIELDS: { key: keyof CustomPattern; label: string; kind: PhaseKind; min: number; max: number }[] = [
  { key: "inhale", label: "Breathe in", kind: "inhale", min: 1, max: 20 },
  { key: "hold", label: "Hold", kind: "hold", min: 0, max: 30 },
  { key: "exhale", label: "Breathe out", kind: "exhale", min: 1, max: 30 },
  { key: "rest", label: "Hold (empty)", kind: "rest", min: 0, max: 30 },
];

function CustomEditor({
  value,
  onChange,
  colors,
}: {
  value: CustomPattern;
  onChange: (v: CustomPattern) => void;
  colors: PhaseColors;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FIELDS.map((f) => {
        const v = value[f.key];
        return (
          <div key={f.key} className="rounded-3xl bg-surface-container p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[f.kind].accent }} />
              {f.label}
            </div>
            <div className="mt-2 flex items-center justify-between gap-1">
              <IconButton
                icon="remove"
                size={36}
                iconSize={20}
                variant="tonal"
                label={`Shorter ${f.label}`}
                disabled={v <= f.min}
                onClick={() => onChange({ ...value, [f.key]: Math.max(f.min, v - 1) })}
              />
              <span className="text-2xl font-semibold tabular-nums rond-100">
                <AnimatedText value={v} />
                <span className="text-base text-on-surface-variant">s</span>
              </span>
              <IconButton
                icon="add"
                size={36}
                iconSize={20}
                variant="tonal"
                label={`Longer ${f.label}`}
                disabled={v >= f.max}
                onClick={() => onChange({ ...value, [f.key]: Math.min(f.max, v + 1) })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DetailPanel({
  technique,
  colors,
  prefs,
  setPrefs,
  startSlot,
}: {
  technique: Technique;
  colors: PhaseColors;
  prefs: Prefs;
  setPrefs: Dispatch<SetStateAction<Prefs>>;
  startSlot: ReactNode;
}) {
  const cycle = cycleSeconds(technique);
  const bpm = breathsPerMinute(technique);

  return (
    <section aria-label="Technique details and session setup" className="rounded-[32px] bg-surface-container-low p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[28px] bg-tertiary-container">
          <MorphShape shape={technique.shape} size={52} color="var(--md-on-tertiary-container)" spin />
        </div>
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={technique.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
              transition={springs.spatial}
            >
              <h2 className="text-2xl font-bold leading-tight tracking-tight rond-100">{technique.name}</h2>
              <p className="mt-0.5 text-sm font-medium text-primary">{technique.tagline}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={technique.id}
          className="mt-4 text-[15px] leading-relaxed text-on-surface-variant"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={springs.spatial}
        >
          {technique.description}
        </motion.p>
      </AnimatePresence>

      <div className="mt-5">
        <RhythmBar technique={technique} colors={colors} />
        <div className="mt-2 flex items-center justify-between px-1 text-xs text-on-surface-variant">
          <span>{cycle}s per round</span>
          <span>{bpm.toFixed(1).replace(/\.0$/, "")} breaths / min</span>
        </div>
      </div>

      {technique.custom && (
        <div className="mt-4">
          <CustomEditor
            value={prefs.custom}
            colors={colors}
            onChange={(custom) => setPrefs((p) => ({ ...p, custom }))}
          />
        </div>
      )}

      <div className="mt-4 flex gap-3 rounded-3xl bg-surface-container p-4">
        <Icon name="lightbulb" size={22} className="text-tertiary" fill />
        <p className="text-sm text-on-surface-variant">{technique.tip}</p>
      </div>

      <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
        Session length
      </h3>
      <SessionSetup technique={technique} prefs={prefs} setPrefs={setPrefs} />

      <div className="mt-6">{startSlot}</div>
    </section>
  );
}
