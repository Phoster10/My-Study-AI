import { useEffect, useState } from "react";
import { api } from "../api/client";

/** Small total-XP display for signed-in users. Deliberately minimal: the
 * original app's levels/progress-bar/leaderboard sidebar is not restored
 * here — only the number itself, since that's what was asked for. See
 * README "Restoring XP" for what would be involved in bringing those back. */
export function XPBadge() {
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    api
      .getXP()
      .then((res) => setXp(res.xp))
      .catch(() => setXp(null));
  }, []);

  if (xp === null) return null;

  return <span className="xp-badge" title="Total XP">⚡ {xp.toLocaleString()} XP</span>;
}
