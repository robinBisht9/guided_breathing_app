import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import type { SessionMode } from "../hooks/useBreathingEngine";
import { springs } from "../lib/motion";
import { formatClock, type Prefs } from "../lib/storage";
import { cycleSeconds, MAX_SESSION_SECONDS, timerRounds, type Technique } from "../lib/techniques";
import { Chip, ConnectedButtonGroup, Icon, Stepper } from "./ui";

const MODES: { value: SessionMode; label: string; icon: string }[] = [
  { value: "rounds", label: "Rounds", icon: "repeat" },
  { value: "timer", label: "Timer", icon: "timer" },
  { value: "free", label: "Endless", icon: "all_inclusive" },
];

const TIMER_PRESETS = [1, 3, 5, 10, 15];
const MAX_ROUNDS = 99;

export function SessionSetup({
  technique,
  prefs,
  setPrefs,
}: {
  technique: Technique;
  prefs: Prefs;
  setPrefs: Dispatch<SetStateAction<Prefs>>;
}) {
  const cycle = cycleSeconds(technique);
  const tRounds = timerRounds(prefs.timerSec, cycle);
  const maxTimerRounds = Math.max(1, Math.floor(MAX_SESSION_SECONDS / cycle));
  const roundPresets = Array.from(new Set([technique.recommendedRounds, 4, 8, 12, 20])).sort((a, b) => a - b);

  const setRounds = (n: number) => setPrefs((p) => ({ ...p, rounds: Math.min(MAX_ROUNDS, Math.max(1, n)) }));
  const setTimer = (sec: number) => setPrefs((p) => ({ ...p, timerSec: sec }));

  return (
    <div>
      <ConnectedButtonGroup
        ariaLabel="Session type"
        options={MODES}
        value={prefs.mode}
        onChange={(mode) => setPrefs((p) => ({ ...p, mode }))}
      />

      <div className="mt-5">
        <AnimatePresence mode="wait" initial={false}>
          {prefs.mode === "rounds" && (
            <motion.div
              key="rounds"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={springs.spatial}
            >
              <Stepper
                label="rounds"
                display={prefs.rounds}
                caption={
                  <>
                    {prefs.rounds === 1 ? "round" : "rounds"} · {formatClock(prefs.rounds * cycle)} total
                  </>
                }
                onDec={() => setRounds(prefs.rounds - 1)}
                onInc={() => setRounds(prefs.rounds + 1)}
                canDec={prefs.rounds > 1}
                canInc={prefs.rounds < MAX_ROUNDS}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {roundPresets.map((n) => (
                  <Chip key={n} selected={prefs.rounds === n} onClick={() => setRounds(n)}>
                    {n}
                    {n === technique.recommendedRounds && <span className="opacity-70">· suggested</span>}
                  </Chip>
                ))}
              </div>
            </motion.div>
          )}

          {prefs.mode === "timer" && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={springs.spatial}
            >
              <Stepper
                label="time"
                display={formatClock(tRounds * cycle)}
                caption={
                  <>
                    {tRounds} × {cycle}s {tRounds === 1 ? "round" : "rounds"} · steps of one full breath
                  </>
                }
                onDec={() => setTimer((tRounds - 1) * cycle)}
                onInc={() => setTimer((tRounds + 1) * cycle)}
                canDec={tRounds > 1}
                canInc={tRounds < maxTimerRounds}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {TIMER_PRESETS.map((m) => (
                  <Chip key={m} selected={tRounds === timerRounds(m * 60, cycle)} onClick={() => setTimer(m * 60)}>
                    ≈ {m} min
                  </Chip>
                ))}
              </div>
            </motion.div>
          )}

          {prefs.mode === "free" && (
            <motion.div
              key="free"
              className="flex items-center gap-4 rounded-3xl bg-surface-container p-4"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={springs.spatial}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
                <Icon name="all_inclusive" size={26} />
              </span>
              <p className="text-sm text-on-surface-variant">
                Breathe for as long as you like. We'll count your rounds and time — tap stop whenever you're
                ready.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
