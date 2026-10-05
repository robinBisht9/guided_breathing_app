import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { springs } from "../lib/motion";
import type { ShapeId } from "../lib/shapes";
import { currentStreak, type Prefs, type Stats } from "../lib/storage";
import { buildCustom, PRESETS, type Technique } from "../lib/techniques";
import type { PhaseColors } from "../lib/theme";
import { cn } from "../utils/cn";
import { DetailPanel } from "./DetailPanel";
import { MorphShape } from "./Shape";
import { TechniqueCard } from "./TechniqueCard";
import { Icon, IconButton } from "./ui";

const LOGO_SHAPES: ShapeId[] = ["cookie9", "flower", "sunny", "clover", "pentagon", "cookie12", "burst"];

function Logo() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % LOGO_SHAPES.length), 2600);
    return () => window.clearInterval(id);
  }, [reduced]);
  return (
    <div className="grid h-10 w-10 place-items-center">
      <MorphShape shape={LOGO_SHAPES[i]} size={34} color="var(--md-primary)" spin />
    </div>
  );
}

function Header({
  dark,
  onToggleDark,
  onOpenSettings,
}: {
  dark: boolean;
  onToggleDark: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-6">
        <Logo />
        <span className="text-[22px] font-bold tracking-tight rond-100">Tidal</span>
        <div className="flex-1" />
        <IconButton
          icon={dark ? "light_mode" : "dark_mode"}
          label={dark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={onToggleDark}
        />
        <IconButton icon="tune" label="Settings" onClick={onOpenSettings} />
      </div>
    </header>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still awake? Let's wind down";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Time to unwind";
}

function Hero({ stats }: { stats: Stats }) {
  const streak = currentStreak(stats);
  const minutes = stats.seconds > 0 ? Math.max(1, Math.round(stats.seconds / 60)) : 0;
  const items = [
    {
      icon: "local_fire_department",
      value: streak,
      label: "day streak",
      cls: "bg-tertiary-container text-on-tertiary-container",
    },
    { icon: "schedule", value: minutes, label: minutes === 1 ? "minute" : "minutes", cls: "bg-secondary-container text-on-secondary-container" },
    {
      icon: "self_improvement",
      value: stats.sessions,
      label: stats.sessions === 1 ? "session" : "sessions",
      cls: "bg-primary-container text-on-primary-container",
    },
  ];
  const words = ["Take", "a", "deep", "breath."];

  return (
    <section className="pt-6 sm:pt-10">
      <motion.p
        className="text-sm font-semibold text-primary"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.spatial}
      >
        {greeting()}
      </motion.p>
      <h1 className="mt-2 text-[clamp(2.75rem,9vw,5.5rem)] font-[760] leading-[0.95] tracking-[-0.03em] rond-100">
        {words.map((w, i) => (
          <motion.span
            key={w}
            className={cn("mr-[0.22em] inline-block", w === "deep" && "text-primary")}
            initial={{ y: 36, opacity: 0, rotate: 6 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ ...springs.bouncy, delay: 0.05 + i * 0.07 }}
          >
            {w}
          </motion.span>
        ))}
      </h1>
      <motion.p
        className="mt-4 max-w-xl text-base text-on-surface-variant sm:text-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.spatial, delay: 0.3 }}
      >
        Pick a rhythm, press start and follow the shape — breathe in as it grows, hold as it changes colour,
        and let go as it shrinks.
      </motion.p>
      <div className="mt-5 flex flex-wrap gap-2">
        {items.map((it, i) => (
          <motion.div
            key={it.icon}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springs.bouncy, delay: 0.35 + i * 0.07 }}
            className={cn("flex h-12 items-center gap-2 rounded-full pl-3 pr-4", it.cls)}
          >
            <Icon name={it.icon} size={22} fill />
            <span className="text-lg font-bold tabular-nums rond-100">{it.value}</span>
            <span className="text-sm opacity-80">{it.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function StartBar({ summary, onStart }: { summary: string; onStart: (origin: { x: number; y: number }) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const handle = () => {
    const r = ref.current?.getBoundingClientRect();
    onStart(
      r
        ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight - 60 },
    );
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-surface from-60% to-transparent px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-8 lg:static lg:z-auto lg:bg-none lg:p-0">
      <div className="relative mx-auto max-w-xl">
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-primary animate-invite" />
        <motion.button
          ref={ref}
          type="button"
          onClick={handle}
          initial={false}
          animate={{ borderRadius: 36 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97, borderRadius: 20 }}
          transition={springs.fastSpatial}
          className="state-layer elev-2 relative flex h-[72px] w-full items-center justify-center gap-3 overflow-hidden bg-primary px-6 text-on-primary"
        >
          <Icon name="play_arrow" size={34} fill />
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-xl font-bold rond-100">Start breathing</span>
            <span className="text-xs font-medium opacity-85">{summary}</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}

export function Home({
  dark,
  prefs,
  setPrefs,
  technique,
  colors,
  stats,
  summary,
  onStart,
  onOpenSettings,
  onToggleDark,
}: {
  dark: boolean;
  prefs: Prefs;
  setPrefs: Dispatch<SetStateAction<Prefs>>;
  technique: Technique;
  colors: PhaseColors;
  stats: Stats;
  summary: string;
  onStart: (origin: { x: number; y: number }) => void;
  onOpenSettings: () => void;
  onToggleDark: () => void;
}) {
  const custom = useMemo(() => buildCustom(prefs.custom), [prefs.custom]);
  const all = useMemo(() => [...PRESETS, custom], [custom]);

  return (
    <div className="min-h-dvh pb-36 lg:pb-12">
      <Header dark={dark} onToggleDark={onToggleDark} onOpenSettings={onOpenSettings} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <Hero stats={stats} />

        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
          <section aria-labelledby="techniques-title">
            <div className="mb-3 flex items-end justify-between px-1">
              <h2 id="techniques-title" className="text-xl font-bold tracking-tight rond-100">
                Choose a technique
              </h2>
              <span className="text-sm text-on-surface-variant">{all.length} rhythms</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {all.map((t, i) => (
                <TechniqueCard
                  key={t.id}
                  index={i}
                  technique={t}
                  colors={colors}
                  selected={t.id === technique.id}
                  onSelect={() => setPrefs((p) => ({ ...p, techniqueId: t.id }))}
                />
              ))}
            </div>
          </section>

          <div className="lg:sticky lg:top-20">
            <DetailPanel
              technique={technique}
              colors={colors}
              prefs={prefs}
              setPrefs={setPrefs}
              startSlot={<StartBar summary={summary} onStart={onStart} />}
            />
          </div>
        </div>

        <footer className="mt-10 space-y-3 pb-4">
          <div className="flex gap-3 rounded-3xl border border-outline-variant p-4 text-sm text-on-surface-variant">
            <Icon name="info" size={20} />
            <p>
              Breathe gently and never force it. If you feel dizzy, light-headed or uncomfortable, stop and return
              to normal breathing. Tidal is for relaxation and is not medical advice.
            </p>
          </div>
          <p className="hidden px-1 text-xs text-on-surface-variant sm:block">
            During a session: <kbd className="font-semibold">Space</kbd> pause / resume ·{" "}
            <kbd className="font-semibold">R</kbd> restart · <kbd className="font-semibold">Esc</kbd> finish
          </p>
        </footer>
      </main>
    </div>
  );
}
