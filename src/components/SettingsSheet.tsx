import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect } from "react";
import { wakeLockSupported } from "../hooks/useDevice";
import { HAPTIC, haptics, voice } from "../lib/feedback";
import { springs } from "../lib/motion";
import type { Settings, ThemeMode } from "../lib/storage";
import { SEEDS, seedSwatch } from "../lib/theme";
import { MorphShape } from "./Shape";
import { ConnectedButtonGroup, Icon, IconButton, Switch } from "./ui";

function Row({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex cursor-pointer items-center gap-4 rounded-3xl px-3 py-3 transition-colors hover:bg-on-surface/5"
      onClick={() => {
        haptics.play(HAPTIC.toggle);
        onChange(!checked);
      }}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
        <Icon name={icon} size={22} fill={checked} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-sm text-on-surface-variant">{subtitle}</span>
      </span>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function SettingsSheet({
  open,
  onClose,
  settings,
  onChange,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  dark: boolean;
}) {
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[60] bg-scrim/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="elev-3 fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-[32px] bg-surface-container-low"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.3, ease: [0.3, 0, 0.8, 0.15] } }}
            transition={springs.spatial}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <div
              className="flex cursor-grab touch-none justify-center pb-1 pt-3 active:cursor-grabbing"
              onPointerDown={(e) => drag.start(e)}
            >
              <div className="h-1 w-9 rounded-full bg-on-surface-variant/40" />
            </div>

            <div className="flex items-center justify-between px-6 pb-2 pt-1">
              <h2 className="text-2xl font-bold tracking-tight rond-100">Settings</h2>
              <IconButton icon="close" label="Close settings" onClick={onClose} />
            </div>

            <div className="overflow-y-auto px-3 pb-[max(env(safe-area-inset-bottom),20px)]">
              <h3 className="px-3 pb-1 pt-2 text-sm font-semibold uppercase tracking-wider text-primary">Guidance</h3>
              <Row
                icon="volume_up"
                title="Sound cues"
                subtitle="Soft bells when each phase begins"
                checked={settings.sound}
                onChange={(v) => onChange({ sound: v })}
              />
              {voice.supported && (
                <Row
                  icon="record_voice_over"
                  title="Voice guide"
                  subtitle="Spoken “breathe in”, “hold”, “breathe out”"
                  checked={settings.voice}
                  onChange={(v) => onChange({ voice: v })}
                />
              )}
              {haptics.supported && (
                <Row
                  icon="vibration"
                  title="Haptic feedback"
                  subtitle={
                    haptics.native
                      ? "Distinct vibration patterns you can follow with eyes closed"
                      : "Light taps — iPhone browsers only allow limited haptics"
                  }
                  checked={settings.haptics}
                  onChange={(v) => onChange({ haptics: v })}
                />
              )}
              <Row
                icon="av_timer"
                title="Count every second"
                subtitle="A gentle tick (and pulse) on each count"
                checked={settings.ticks}
                onChange={(v) => onChange({ ticks: v })}
              />
              {wakeLockSupported && (
                <Row
                  icon="smartphone"
                  title="Keep screen on"
                  subtitle="Stop the screen from sleeping mid-session"
                  checked={settings.wakeLock}
                  onChange={(v) => onChange({ wakeLock: v })}
                />
              )}

              <h3 className="px-3 pb-3 pt-6 text-sm font-semibold uppercase tracking-wider text-primary">
                Appearance
              </h3>
              <div className="px-3">
                <ConnectedButtonGroup<ThemeMode>
                  ariaLabel="Theme"
                  value={settings.themeMode}
                  onChange={(themeMode) => onChange({ themeMode })}
                  options={[
                    { value: "system", label: "Auto", icon: "brightness_auto" },
                    { value: "light", label: "Light", icon: "light_mode" },
                    { value: "dark", label: "Dark", icon: "dark_mode" },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2 px-3 pb-2 pt-5 text-sm font-semibold text-on-surface-variant">
                <Icon name="palette" size={20} />
                Colour
              </div>
              <div className="grid grid-cols-6 gap-1 px-2 pb-4">
                {SEEDS.map((s) => {
                  const selected = s.id === settings.seed;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      aria-label={`${s.name} colour`}
                      aria-pressed={selected}
                      title={s.name}
                      onClick={() => {
                        haptics.play(HAPTIC.select);
                        onChange({ seed: s.id });
                      }}
                      whileTap={{ scale: 0.85 }}
                      whileHover={{ scale: 1.08 }}
                      transition={springs.fastSpatial}
                      className="relative grid aspect-square place-items-center"
                    >
                      <MorphShape
                        shape={selected ? "cookie9" : "circle"}
                        size={52}
                        color={seedSwatch(s.hex, dark)}
                        spin={selected}
                      />
                      <AnimatePresence>
                        {selected && (
                          <motion.span
                            className="absolute grid place-items-center"
                            style={{ color: dark ? "#00000099" : "#ffffffee" }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={springs.bouncy}
                          >
                            <Icon name="check" size={24} weight={700} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
