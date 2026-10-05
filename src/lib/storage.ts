import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { SessionMode } from "../hooks/useBreathingEngine";
import { DEFAULT_CUSTOM, type CustomPattern } from "./techniques";

export type ThemeMode = "system" | "light" | "dark";

export interface Settings {
  themeMode: ThemeMode;
  seed: string;
  haptics: boolean;
  sound: boolean;
  voice: boolean;
  ticks: boolean;
  wakeLock: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "system",
  seed: "lagoon",
  haptics: true,
  sound: true,
  voice: false,
  ticks: false,
  wakeLock: true,
};

export interface Prefs {
  techniqueId: string;
  mode: SessionMode;
  rounds: number;
  timerSec: number;
  custom: CustomPattern;
}

export const DEFAULT_PREFS: Prefs = {
  techniqueId: "box",
  mode: "rounds",
  rounds: 8,
  timerSec: 180,
  custom: DEFAULT_CUSTOM,
};

export interface Stats {
  sessions: number;
  seconds: number;
  rounds: number;
  streak: number;
  lastDay: string | null;
}

export const EMPTY_STATS: Stats = { sessions: 0, seconds: 0, rounds: 0, streak: 0, lastDay: null };

export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (initial && typeof initial === "object" && !Array.isArray(initial) && parsed && typeof parsed === "object") {
          return { ...initial, ...parsed } as T;
        }
        return parsed as T;
      }
    } catch {
      /* ignore corrupted storage */
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage full / private mode */
    }
  }, [key, state]);

  return [state, setState];
}

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

export function addSession(stats: Stats, seconds: number, rounds: number): Stats {
  const today = dayKey();
  const streak =
    stats.lastDay === today ? Math.max(1, stats.streak) : stats.lastDay === yesterdayKey() ? stats.streak + 1 : 1;
  return {
    sessions: stats.sessions + 1,
    seconds: stats.seconds + seconds,
    rounds: stats.rounds + rounds,
    streak,
    lastDay: today,
  };
}

export function currentStreak(stats: Stats) {
  if (!stats.lastDay) return 0;
  return stats.lastDay === dayKey() || stats.lastDay === yesterdayKey() ? stats.streak : 0;
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
