import { AnimatePresence, MotionConfig } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Home } from "./components/Home";
import { SessionScreen } from "./components/SessionScreen";
import { SettingsSheet } from "./components/SettingsSheet";
import type { SessionPlan, SessionResult } from "./hooks/useBreathingEngine";
import { useMediaQuery } from "./hooks/useDevice";
import { HAPTIC, haptics, sound, voice } from "./lib/feedback";
import {
  addSession,
  DEFAULT_PREFS,
  DEFAULT_SETTINGS,
  EMPTY_STATS,
  formatClock,
  usePersistentState,
  type Prefs,
  type Settings,
  type Stats,
} from "./lib/storage";
import { buildCustom, cycleSeconds, PRESETS, timerRounds, type Technique } from "./lib/techniques";
import { buildPhaseColors, buildSchemeVars, SEEDS } from "./lib/theme";

interface ActiveSession {
  id: number;
  origin: { x: number; y: number };
  technique: Technique;
  plan: SessionPlan;
}

export default function App() {
  const [settings, setSettings] = usePersistentState<Settings>("tidal:settings", DEFAULT_SETTINGS);
  const [prefs, setPrefs] = usePersistentState<Prefs>("tidal:prefs", DEFAULT_PREFS);
  const [stats, setStats] = usePersistentState<Stats>("tidal:stats", EMPTY_STATS);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* ── Theme: Material You dynamic colour from the seed ── */
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const dark = settings.themeMode === "system" ? systemDark : settings.themeMode === "dark";
  const seed = SEEDS.find((s) => s.id === settings.seed) ?? SEEDS[0];
  const schemeVars = useMemo(() => buildSchemeVars(seed.hex, dark), [seed.hex, dark]);
  const phaseColors = useMemo(() => buildPhaseColors(seed.hex, dark), [seed.hex, dark]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(schemeVars)) root.style.setProperty(k, v);
    root.style.colorScheme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", schemeVars["--md-surface"]);
  }, [schemeVars, dark]);

  /* ── Feedback singletons follow settings ── */
  useEffect(() => {
    haptics.enabled = settings.haptics;
    sound.enabled = settings.sound;
    voice.enabled = settings.voice;
    if (!settings.voice) voice.cancel();
  }, [settings.haptics, settings.sound, settings.voice]);

  /* ── Lock page scroll behind overlays ── */
  useEffect(() => {
    document.documentElement.style.overflow = session || settingsOpen ? "hidden" : "";
  }, [session, settingsOpen]);

  /* ── Technique + plan ── */
  const technique = useMemo<Technique>(
    () =>
      prefs.techniqueId === "custom"
        ? buildCustom(prefs.custom)
        : (PRESETS.find((t) => t.id === prefs.techniqueId) ?? PRESETS[0]),
    [prefs.techniqueId, prefs.custom],
  );
  const cycle = cycleSeconds(technique);

  const plan = useMemo<SessionPlan>(
    () => ({
      mode: prefs.mode,
      rounds:
        prefs.mode === "rounds" ? prefs.rounds : prefs.mode === "timer" ? timerRounds(prefs.timerSec, cycle) : 0,
    }),
    [prefs.mode, prefs.rounds, prefs.timerSec, cycle],
  );

  const summary =
    plan.mode === "rounds"
      ? `${plan.rounds} ${plan.rounds === 1 ? "round" : "rounds"} · ${formatClock(plan.rounds * cycle)}`
      : plan.mode === "timer"
        ? `${formatClock(plan.rounds * cycle)} · ${plan.rounds} ${plan.rounds === 1 ? "round" : "rounds"}`
        : "Endless · stop whenever you like";

  /* ── Actions ── */
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      // Immediate preview so people can feel / hear what they enabled
      if (patch.sound) {
        sound.enabled = true;
        sound.unlock();
        sound.phase("inhale");
      }
      if (patch.voice) {
        voice.enabled = true;
        voice.speak("Voice guide on");
      }
      if (patch.haptics) {
        haptics.enabled = true;
        haptics.play(HAPTIC.hold);
      }
    },
    [setSettings],
  );

  const start = useCallback(
    (origin: { x: number; y: number }) => {
      sound.unlock();
      voice.prime();
      haptics.play(HAPTIC.select);
      setSession({ id: Date.now(), origin, technique, plan });
    },
    [technique, plan],
  );

  const record = useCallback(
    (r: SessionResult) => {
      if (r.rounds >= 1) setStats((s) => addSession(s, r.seconds, r.rounds));
    },
    [setStats],
  );

  const closeSession = useCallback(() => {
    voice.cancel();
    setSession(null);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div inert={!!session || settingsOpen}>
      <Home
        dark={dark}
        prefs={prefs}
        setPrefs={setPrefs}
        technique={technique}
        colors={phaseColors}
        stats={stats}
        summary={summary}
        onStart={start}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleDark={() => updateSettings({ themeMode: dark ? "light" : "dark" })}
      />
      </div>

      <AnimatePresence>
        {session && (
          <SessionScreen
            key={session.id}
            technique={session.technique}
            plan={session.plan}
            colors={phaseColors}
            settings={settings}
            onSettings={updateSettings}
            origin={session.origin}
            onClose={closeSession}
            onRecord={record}
          />
        )}
      </AnimatePresence>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
        dark={dark}
      />
    </MotionConfig>
  );
}
