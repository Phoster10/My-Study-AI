import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { bumpStreak, bumpXPToday } from "./useActivityStats";

export type DailyGoalKey = "upload" | "summary" | "ai";

export interface DailyGoalDef {
  key: DailyGoalKey;
  title: string;
  description: string;
  xp: number;
}

export const DAILY_GOALS: DailyGoalDef[] = [
  { key: "upload", title: "Upload a file", description: "Upload your notes (PDF, DOCX, TXT, etc.).", xp: 25 },
  { key: "summary", title: "Generate a summary", description: "Create a summary using any type.", xp: 20 },
  { key: "ai", title: "Use AI", description: "Ask a question or get help from the AI assistant.", xp: 15 },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function storageKey(): string {
  return `study-ai:daily-goals:${todayKey()}`;
}

type CompletionState = Record<DailyGoalKey, boolean>;

function readCompletion(): CompletionState {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { upload: false, summary: false, ai: false };
    return { upload: false, summary: false, ai: false, ...JSON.parse(raw) };
  } catch {
    return { upload: false, summary: false, ai: false };
  }
}

/**
 * Tracks the 3 "daily goals" shown on the XP Hub page.
 *
 * IMPORTANT — two separate things happen on every complete() call, and they
 * are NOT the same thing:
 *   1. XP is awarded EVERY time the action happens (upload a file, generate
 *      a summary, use AI search) — every real action grows your total XP,
 *      every single time, uncapped. This is what actually drives the level
 *      progress bar on the XP Hub.
 *   2. The goal's checkmark on the XP Hub is a one-time-per-day "did I do
 *      this at least once today" indicator, used only for the "X/3 goals"
 *      banner. It does NOT gate the XP award — it's purely cosmetic status.
 * An earlier version of this hook conflated the two (only awarded XP the
 * first time per day), which made the XP total look frozen no matter how
 * much you used the app after the first action of the day. That's fixed.
 *
 * Storage note: unchanged — still browser-local (localStorage keyed by
 * today's date), not persisted server-side. XP itself IS always correct
 * server-side (via api.addXP on every call); only the checkmark/streak
 * bookkeeping resets if the browser's storage is cleared.
 */
export function useDailyGoals() {
  const [completed, setCompleted] = useState<CompletionState>(() => readCompletion());

  // Reset at midnight if the tab is left open across a day boundary.
  useEffect(() => {
    const id = setInterval(() => setCompleted(readCompletion()), 60_000);
    return () => clearInterval(id);
  }, []);

  const complete = useCallback(async (key: DailyGoalKey) => {
    const goal = DAILY_GOALS.find((g) => g.key === key)!;

    // Award XP unconditionally — every real action counts, every time.
    try {
      await api.addXP(goal.xp);
    } catch {
      return; // server never recorded the XP; don't touch local state either
    }
    bumpXPToday(goal.xp);

    const current = readCompletion();
    if (current[key]) return; // checkmark already set for today, nothing more to do

    const next = { ...current, [key]: true };
    localStorage.setItem(storageKey(), JSON.stringify(next));
    bumpStreak();
    setCompleted(next);
  }, []);

  const completedCount = Object.values(completed).filter(Boolean).length;

  return { completed, complete, completedCount, total: DAILY_GOALS.length };
}
