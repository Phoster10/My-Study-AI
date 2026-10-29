import { useCallback, useEffect } from "react";
import { api } from "../api/client";
import { useStudyStore } from "../store/useStudyStore";

/** Fetches XP once on mount and exposes a refresh() for after an action
 * that awards XP (grading an exam, completing a daily goal). Backed by the
 * shared store so the sidebar badge and the XP Hub page never disagree. */
export function useXP() {
  const xp = useStudyStore((s) => s.xp);
  const setXP = useStudyStore((s) => s.setXP);

  const refresh = useCallback(() => {
    api
      .getXP()
      .then((res) => setXP(res.xp))
      .catch(() => setXP(0));
  }, [setXP]);

  useEffect(() => {
    api
      .getXP()
      .then((res) => setXP(res.xp))
      .catch(() => setXP(0));
  }, [setXP]);

  return { xp, refresh };
}
