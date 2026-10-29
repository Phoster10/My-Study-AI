import { useEffect, useState } from "react";

/**
 * Lightweight, browser-local activity stats backing the XP Hub's "Streak"
 * and "Notes Summarized" stat cards. Like useDailyGoals, these are not
 * server-persisted — there's no activity-log table in the schema. XP
 * itself is always correct (server-side); these two numbers are a
 * reasonable approximation that resets if the browser's storage is
 * cleared. A real implementation would log activity server-side and
 * compute streak from date-distinct rows.
 */

const STREAK_KEY = "study-ai:streak";
const NOTES_KEY = "study-ai:notes-summarized-count";
const XP_TODAY_KEY = "study-ai:xp-today";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

interface StreakState {
  lastActiveDate: string;
  count: number;
}

function readStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastActiveDate: "", count: 0 };
    return JSON.parse(raw);
  } catch {
    return { lastActiveDate: "", count: 0 };
  }
}

/** Call whenever the user does something that should count toward the
 * streak (e.g. completing a daily goal). Safe to call multiple times per
 * day — only the first call each day advances the count. */
export function bumpStreak(): void {
  const today = todayKey();
  const { lastActiveDate, count } = readStreak();

  if (lastActiveDate === today) return; // already counted today

  const gap = lastActiveDate ? daysBetween(lastActiveDate, today) : Infinity;
  const nextCount = gap === 1 ? count + 1 : 1; // consecutive day vs. streak broken

  localStorage.setItem(STREAK_KEY, JSON.stringify({ lastActiveDate: today, count: nextCount }));
}

export function incrementNotesSummarized(): void {
  const current = Number(localStorage.getItem(NOTES_KEY) ?? "0");
  localStorage.setItem(NOTES_KEY, String(current + 1));
}

interface DayTotal {
  date: string;
  amount: number;
}

function readXPToday(): number {
  try {
    const raw = localStorage.getItem(XP_TODAY_KEY);
    if (!raw) return 0;
    const parsed: DayTotal = JSON.parse(raw);
    return parsed.date === todayKey() ? parsed.amount : 0; // stale (yesterday or older)
  } catch {
    return 0;
  }
}

/** Call every time XP is actually awarded, so the XP Hub's "+N today" stat
 * reflects every award, not just the once-per-day goal checkmark. Resets
 * automatically once the date rolls over. */
export function bumpXPToday(amount: number): void {
  const current = readXPToday();
  localStorage.setItem(XP_TODAY_KEY, JSON.stringify({ date: todayKey(), amount: current + amount }));
}

export function useActivityStats() {
  const [streak, setStreak] = useState(0);
  const [notesSummarized, setNotesSummarized] = useState(0);
  const [xpToday, setXpToday] = useState(0);

  useEffect(() => {
    setStreak(readStreak().count);
    setNotesSummarized(Number(localStorage.getItem(NOTES_KEY) ?? "0"));
    setXpToday(readXPToday());
  }, []);

  return { streak, notesSummarized, xpToday };
}
