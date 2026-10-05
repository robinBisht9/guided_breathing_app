import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  useBreathingEngine,
  type BreathEngine,
  type EngineStatus,
  type SessionPlan,
  type SessionResult,
  type Snapshot,
} from "../hooks/useBreathingEngine";
import { useWakeLock } from "../hooks/useDevice";
import { HAPTIC, haptics, sound, voice } from "../lib/feedback";
import { EASE_EMPHASIZED, EASE_EMPHASIZED_ACCEL, springs } from "../lib/motion";
import type { ShapeId } from "../lib/shapes";
import { formatClock, type Settings } from "../lib/storage";
import { breathsPerMinute, cycleSeconds, type Technique } from "../lib/techniques";
import type { PhaseColors } from "../lib/theme";
import { cn } from "../utils/cn";
import { BreathVisual } from "./BreathVisual";
import { MorphShape, ShapeIcon } from "./Shape";
import { AnimatedText, Button, Icon, IconButton } from "./ui";
import { WavyLinearProgress } from "./WavyProgress";

const SUPPORTS_CQ = typeof CSS !== "undefined" && !!CSS.supports?.("width", "1cqw");
const VISUAL_SIZE = SUPPORTS_CQ ? "min(88cqw, 94cqh, 560px)" : "min(84vw, 46vh, 560px)";

interface Props {
  technique: Technique;
  plan: SessionPlan;
  colors: PhaseColors;
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  origin: { x: number; y: number };
  onClose: () => void;
  onRecord: (result: SessionResult) => void;
}

export function SessionScreen({ technique, plan, colors, settings, onSettings, origin, onClose, onRecord }: Props) {
  const reduced = !!useReducedMotion();
  const [result, setResult] = useState<SessionResult | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const recordRef = useRef(onRecord);
  recordRef.current = onRecord;

  const { engine, snap } = useBreathingEngine(technique, plan, {
    onCountdown: (n) => {
      haptics.play(HAPTIC.countdown);
      sound.countdown(n);
    },
    onPhase: (phase) => {
      haptics.play(HAPTIC[phase.kind]);
      sound.phase(phase.kind);
      voice.speak(phase.voice);
    },
    onSecond: () => {
      if (!settingsRef.current.ticks) return;
      haptics.play(HAPTIC.tick);
      sound.tick();
    },
    onComplete: (r) => {
      haptics.play(HAPTIC.complete);
      sound.complete();
      voice.speak("Well done");
      recordRef.current(r);
      setResult(r);
    },
  });

  // Start before first paint so the screen opens straight into "Get ready"
  useLayoutEffect(() => {
    engine.start();
    return () => voice.cancel();
  }, [engine]);

  useWakeLock(settings.wakeLock && !result);

  // Move focus into the dialog so keyboard shortcuts work immediately
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, []);

  const finish = useCallback(() => {
    if (result) {
      onClose();
      return;
    }
    const r = engine.stop();
    voice.cancel();
    // Ending an endless session is the natural finish, not an early stop
    if (plan.mode === "free") r.completed = true;
    if (r.rounds >= 1) {
      recordRef.current(r);
      haptics.play(HAPTIC.complete);
      sound.complete();
      setResult(r);
    } else {
      onClose();
    }
  }, [engine, onClose, result, plan.mode]);

  const again = useCallback(() => {
    setResult(null);
    engine.start();
  }, [engine]);

  // Keyboard: Space = pause / resume, Esc = end, R = restart
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
        return;
      }
      if (result) return;
      if (e.code === "Space" && !target?.closest("button, input, textarea")) {
        e.preventDefault();
        engine.toggle();
      } else if (e.key === "r" || e.key === "R") {
        engine.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, finish, result]);

  const phase = technique.phases[snap.phaseIndex] ?? technique.phases[0];
  const preparing = snap.status === "countdown" || snap.status === "idle";
  const kind = preparing ? "rest" : phase.kind;
  const col = colors[kind];
  const background = result ? "var(--md-surface-container-low)" : preparing ? "var(--md-surface)" : col.bg;

  const maxR = useMemo(
    () =>
      Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y)) +
      24,
    [origin],
  );

  const cycle = cycleSeconds(technique);
  const modeText =
    plan.mode === "rounds"
      ? `${plan.rounds} ${plan.rounds === 1 ? "round" : "rounds"}`
      : plan.mode === "timer"
        ? `${formatClock(plan.rounds * cycle)} timer`
        : "Endless";

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${technique.name} session`}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden text-on-surface outline-none"
      style={{ backgroundColor: background, transition: "background-color 900ms ease" }}
      initial={{ clipPath: `circle(36px at ${origin.x}px ${origin.y}px)` }}
      animate={{
        clipPath: `circle(${maxR}px at ${origin.x}px ${origin.y}px)`,
        transition: { duration: reduced ? 0 : 0.75, ease: EASE_EMPHASIZED },
      }}
      exit={{
        clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
        transition: { duration: reduced ? 0 : 0.45, ease: EASE_EMPHASIZED_ACCEL },
      }}
    >
      {/* Header */}
      <header className="relative z-10 flex items-center gap-1.5 px-3 pt-[max(env(safe-area-inset-top),12px)] sm:px-5">
        <IconButton icon="close" label={result ? "Close" : "End session"} onClick={finish} />
        <div className="ml-1 min-w-0 flex-1">
          <div className="truncate text-base font-semibold leading-tight">{technique.name}</div>
          <div className="truncate text-xs text-on-surface-variant">
            {technique.pattern} · {modeText}
          </div>
        </div>
        {haptics.supported && (
          <IconButton
            toggle
            variant="tonal"
            size={40}
            iconSize={20}
            selected={settings.haptics}
            icon="vibration"
            label={settings.haptics ? "Turn haptics off" : "Turn haptics on"}
            onClick={() => onSettings({ haptics: !settings.haptics })}
          />
        )}
        {voice.supported && (
          <IconButton
            toggle
            variant="tonal"
            size={40}
            iconSize={20}
            selected={settings.voice}
            icon={settings.voice ? "record_voice_over" : "voice_over_off"}
            label={settings.voice ? "Turn voice guide off" : "Turn voice guide on"}
            onClick={() => onSettings({ voice: !settings.voice })}
          />
        )}
        <IconButton
          toggle
          variant="tonal"
          size={40}
          iconSize={20}
          selected={settings.sound}
          icon={settings.sound ? "volume_up" : "volume_off"}
          label={settings.sound ? "Mute sounds" : "Turn sounds on"}
          onClick={() => onSettings({ sound: !settings.sound })}
        />
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <CompletionView
            key="done"
            result={result}
            technique={technique}
            colors={colors}
            onAgain={again}
            onDone={onClose}
          />
        ) : (
          <motion.div
            key="run"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.22 } }}
          >
            <div className="mx-auto mt-4 w-full max-w-md px-6">
              <ProgressInfo plan={plan} snap={snap} cycle={cycle} color={col.accent} engine={engine} />
            </div>

            {/* Visual — sized to fit the remaining space as a square */}
            <div className="relative min-h-0 flex-1" style={{ containerType: "size" }}>
              <div
                className={cn(
                  "absolute inset-0 m-auto aspect-square transition-opacity duration-500",
                  snap.status === "paused" && "opacity-60",
                )}
                style={{ width: VISUAL_SIZE, height: VISUAL_SIZE }}
              >
                <BreathVisual technique={technique} colors={colors} engine={engine} snap={snap} reduced={reduced} />
              </div>
            </div>

            <PhaseLabel snap={snap} technique={technique} accent={col.accent} />

            {/* Floating toolbar */}
            <div className="flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-3">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...springs.spatial, delay: 0.3 }}
                className="elev-2 flex items-center gap-3 rounded-full bg-surface-container-high p-2.5"
              >
                <IconButton
                  icon="restart_alt"
                  label="Restart (R)"
                  size={56}
                  variant="tonal"
                  onClick={() => engine.start()}
                />
                <PlayPauseButton status={snap.status} onClick={() => engine.toggle()} />
                <IconButton icon="stop" label="Finish session (Esc)" size={56} variant="tonal" iconFill onClick={finish} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────── Progress ─────────────────────────── */
function ProgressInfo({
  plan,
  snap,
  cycle,
  color,
  engine,
}: {
  plan: SessionPlan;
  snap: Snapshot;
  cycle: number;
  color: string;
  engine: BreathEngine;
}) {
  if (plan.mode === "free") {
    return (
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <AnimatedText value={snap.round} className="text-4xl font-semibold tabular-nums rond-100" />
          <span className="text-sm text-on-surface-variant">{snap.round === 1 ? "round" : "rounds"} done</span>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums rond-100">{formatClock(snap.elapsed)}</div>
          <div className="text-xs text-on-surface-variant">elapsed</div>
        </div>
      </div>
    );
  }

  const total = plan.rounds * cycle;
  const remaining = Math.max(0, total - snap.elapsed);
  const current = Math.min(snap.round + 1, plan.rounds);

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        {plan.mode === "rounds" ? (
          <div className="flex items-baseline gap-2">
            <AnimatedText value={current} className="text-4xl font-semibold tabular-nums rond-100" />
            <span className="text-sm text-on-surface-variant">of {plan.rounds} rounds</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums rond-100">{formatClock(remaining)}</span>
            <span className="text-sm text-on-surface-variant">left</span>
          </div>
        )}
        <div className="text-right text-sm text-on-surface-variant tabular-nums">
          {plan.mode === "rounds" ? `${formatClock(remaining)} left` : `Round ${current} of ${plan.rounds}`}
        </div>
      </div>
      <WavyLinearProgress
        getProgress={() => engine.live.sessionProgress}
        color={color}
        active={snap.status === "running"}
      />
    </div>
  );
}

/* ─────────────────────────── Phase label ─────────────────────────── */
function PhaseLabel({ snap, technique, accent }: { snap: Snapshot; technique: Technique; accent: string }) {
  const phase = technique.phases[snap.phaseIndex] ?? technique.phases[0];
  let key: string;
  let title: string;
  let hint: string;
  if (snap.status === "countdown" || snap.status === "idle") {
    key = "countdown";
    title = "Get ready";
    hint = "Sit comfortably and relax your shoulders";
  } else if (snap.status === "paused") {
    key = "paused";
    title = "Paused";
    hint = "Press play when you're ready";
  } else {
    key = `phase-${snap.key}`;
    title = phase.label;
    hint = phase.hint;
  }

  return (
    <div aria-live="polite" className="grid min-h-[104px] place-items-center px-6 text-center">
      <AnimatePresence initial={false}>
        <motion.div
          key={key}
          className="col-start-1 row-start-1"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -22, scale: 0.96, transition: { duration: 0.18 } }}
          transition={springs.spatial}
        >
          <h2
            className="text-[clamp(2.25rem,7.5vw,3.75rem)] font-bold leading-none tracking-tight rond-100"
            style={{ color: accent, transition: "color 600ms ease" }}
          >
            {title}
          </h2>
          <p className="mt-2.5 text-base text-on-surface-variant">{hint}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── Play / pause ─────────────────────────── */
function PlayPauseButton({ status, onClick }: { status: EngineStatus; onClick: () => void }) {
  const playing = status === "running";
  const countdown = status === "countdown";
  const icon = countdown ? "skip_next" : playing ? "pause" : "play_arrow";
  const label = countdown ? "Skip countdown" : playing ? "Pause (Space)" : "Resume (Space)";
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        haptics.play(HAPTIC.select);
        onClick();
      }}
      initial={false}
      animate={{ borderRadius: playing ? 26 : 40, width: playing ? 104 : 80 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.9, borderRadius: 18 }}
      transition={springs.bouncy}
      className="state-layer relative grid h-20 place-items-center overflow-hidden bg-primary text-on-primary elev-1"
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={icon}
          className="col-start-1 row-start-1 grid place-items-center"
          initial={{ scale: 0.2, rotate: -90, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.2, rotate: 90, opacity: 0 }}
          transition={springs.bouncy}
        >
          <Icon name={icon} size={40} fill />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ─────────────────────────── Completion ─────────────────────────── */
const CONFETTI: ShapeId[] = ["flower", "sunny", "cookie6", "clover", "pentagon", "triangle", "gem", "pill"];

function CompletionView({
  result,
  technique,
  colors,
  onAgain,
  onDone,
}: {
  result: SessionResult;
  technique: Technique;
  colors: PhaseColors;
  onAgain: () => void;
  onDone: () => void;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 120 + Math.random() * 80;
        const palette = [colors.inhale.accent, colors.hold.accent, colors.exhale.accent];
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          shape: CONFETTI[i % CONFETTI.length],
          size: 14 + Math.random() * 16,
          color: palette[i % palette.length],
          rotate: (Math.random() - 0.5) * 360,
        };
      }),
    [colors],
  );

  const minutes = Math.floor(result.seconds / 60);
  const title = result.completed ? "Beautifully done" : "Nice work";
  const subtitle = result.completed
    ? `You completed ${result.rounds} ${result.rounds === 1 ? "round" : "rounds"} of ${technique.name.toLowerCase()}.`
    : `You stopped early, but ${result.rounds} mindful ${result.rounds === 1 ? "round" : "rounds"} still count.`;

  const stats = [
    { label: "Rounds", value: String(result.rounds) },
    { label: "Time", value: minutes > 0 ? formatClock(result.seconds) : `${result.seconds}s` },
    { label: "Breaths / min", value: breathsPerMinute(technique).toFixed(1).replace(/\.0$/, "") },
  ];

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-10 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative grid h-60 w-60 place-items-center">
        {pieces.map((p, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: p.y, scale: [0, 1, 0.7], opacity: [1, 1, 0], rotate: p.rotate }}
            transition={{ duration: 1.8, delay: 0.25 + i * 0.015, ease: [0.15, 0.8, 0.3, 1] }}
          >
            <ShapeIcon shape={p.shape} size={p.size} color={p.color} />
          </motion.div>
        ))}
        <motion.div
          className="absolute inset-4 grid place-items-center"
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...springs.jelly, delay: 0.1 }}
        >
          <MorphShape shape="sunny" size={208} color="var(--md-primary-container)" spin />
        </motion.div>
        <motion.div
          className="relative text-on-primary-container"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...springs.bouncy, delay: 0.4 }}
        >
          <Icon name={result.completed ? "check" : "favorite"} size={84} weight={600} fill />
        </motion.div>
      </div>

      <motion.h2
        className="mt-4 text-[clamp(2.25rem,7vw,3.5rem)] font-bold leading-none tracking-tight rond-100"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springs.spatial, delay: 0.3 }}
      >
        {title}
      </motion.h2>
      <motion.p
        className="mt-3 max-w-sm text-base text-on-surface-variant"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springs.spatial, delay: 0.38 }}
      >
        {subtitle}
      </motion.p>

      <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="rounded-3xl bg-surface-container-high px-2 py-4"
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ ...springs.bouncy, delay: 0.45 + i * 0.06 }}
          >
            <div className="text-2xl font-semibold tabular-nums rond-100">{s.value}</div>
            <div className="mt-0.5 text-xs text-on-surface-variant">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-8 flex flex-wrap justify-center gap-3"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springs.spatial, delay: 0.6 }}
      >
        <Button variant="tonal" size="md" icon="restart_alt" onClick={onAgain}>
          Go again
        </Button>
        <Button size="md" icon="check" onClick={onDone}>
          Done
        </Button>
      </motion.div>
    </motion.div>
  );
}
