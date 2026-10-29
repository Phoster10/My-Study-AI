import { useEffect, useState } from "react";
import { api } from "../api/client";

/** Restored from the original Sidebar.tsx's XP tab. Same formulas as the
 * original: level = floor(xp / 500) + 1, one level every 500 XP, progress
 * bar = (xp % 500) / 5 as a percentage. The original's leaderboard tab is
 * not restored here — ask if you want that back too. */
export function LevelPanel() {
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    api
      .getXP()
      .then((res) => setXp(res.xp))
      .catch(() => setXp(0));
  }, []);

  if (xp === null) return null;

  const level = Math.floor(xp / 500) + 1;
  const progressPercent = (xp % 500) / 5;
  const xpToNextLevel = 500 - (xp % 500);

  return (
    <section className="level-panel">
      <div className="level-panel__row">
        <div>
          <span className="label-micro">Aether Level</span>
          <h3 className="level-panel__level">{level}</h3>
        </div>
        <div className="level-panel__xp-total">
          <span className="label-micro label-micro--muted">Total XP</span>
          <p>{xp.toLocaleString()}</p>
        </div>
      </div>

      <div className="level-panel__bar-track">
        <div className="level-panel__bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <p className="level-panel__caption">{xpToNextLevel} XP to Next Level</p>
    </section>
  );
}
