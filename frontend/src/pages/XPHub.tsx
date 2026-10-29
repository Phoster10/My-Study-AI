import { Star, Crown, Zap, Flame, FileText, Award, Target, RefreshCw, Trophy, TrendingUp, Check } from "lucide-react";
import { useXP } from "../hooks/useXP";
import { useDailyGoals, DAILY_GOALS } from "../hooks/useDailyGoals";
import { useActivityStats } from "../hooks/useActivityStats";

function levelTitle(level: number): string {
  if (level <= 3) return "Beginner Learner";
  if (level <= 6) return "Rising Scholar";
  if (level <= 9) return "Dedicated Student";
  if (level <= 14) return "Knowledge Seeker";
  return "Master Learner";
}

export function XPHub() {
  const { xp } = useXP();
  const { completed, completedCount, total } = useDailyGoals();
  const { streak, notesSummarized, xpToday } = useActivityStats();

  if (xp === null) return null;

  const level = Math.floor(xp / 500) + 1;
  const progressPercent = (xp % 500) / 5;
  const xpToNextLevel = 500 - (xp % 500);

  return (
    <div className="xp-hub">
      <section className="panel xp-hub__header">
        <div className="xp-hub__header-top">
          <div className="xp-hub__title-row">
            <Star size={22} aria-hidden />
            <div>
              <h2>XP Hub</h2>
              <p className="panel__hint">Study. Earn XP. Level Up.</p>
            </div>
          </div>
          <span className="pill-badge">
            <Crown size={14} aria-hidden /> Level {level}
          </span>
        </div>

        <div className="xp-hub__level-row">
          <div className="hexagon">
            <span className="hexagon__label">Lv</span>
            <span className="hexagon__value">{level}</span>
          </div>
          <div className="xp-hub__level-info">
            <h3>{levelTitle(level)}</h3>
            <p>Keep going! You're doing great.</p>
            <div className="level-panel__bar-track">
              <div className="level-panel__bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="xp-hub__level-caption">{xp % 500} / 500 XP</p>
          </div>
        </div>
      </section>

      <section className="xp-hub__stats">
        <div className="stat-card">
          <Zap size={16} aria-hidden />
          <p className="label-micro label-micro--muted">Total XP</p>
          <p className="stat-card__value">{xp.toLocaleString()}</p>
          <p className="stat-card__delta">
            <TrendingUp size={12} aria-hidden /> +{xpToday} today
          </p>
        </div>
        <div className="stat-card">
          <Flame size={16} aria-hidden />
          <p className="label-micro label-micro--muted">Streak</p>
          <p className="stat-card__value">{streak} days</p>
          <p className="stat-card__delta">Keep it going!</p>
        </div>
        <div className="stat-card">
          <FileText size={16} aria-hidden />
          <p className="label-micro label-micro--muted">Notes Summarized</p>
          <p className="stat-card__value">{notesSummarized}</p>
          <p className="stat-card__delta">Your progress matters!</p>
        </div>
        <div className="stat-card">
          <Award size={16} aria-hidden />
          <p className="label-micro label-micro--muted">Current Level</p>
          <p className="stat-card__value">{level}</p>
          <p className="stat-card__delta">Next level at {level * 500} XP</p>
        </div>
      </section>

      <section className="panel">
        <div className="xp-hub__goals-header">
          <div className="xp-hub__title-row">
            <Target size={20} aria-hidden />
            <div>
              <h2>Daily Goals</h2>
              <p className="panel__hint">Complete {total} goals today to earn extra XP.</p>
            </div>
          </div>
          <span className="xp-hub__goals-date">
            {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            <RefreshCw size={14} aria-hidden />
          </span>
        </div>

        <div className="daily-goals-grid">
          {DAILY_GOALS.map((goal) => {
            const done = completed[goal.key];
            return (
              <div key={goal.key} className={`goal-card${done ? " goal-card--done" : ""}`}>
                <p className="goal-card__title">{goal.title}</p>
                <p className="goal-card__desc">{goal.description}</p>
                <div className="goal-card__footer">
                  <span className="pill-badge pill-badge--xp">+{goal.xp} XP</span>
                  <span
                    className={`goal-card__check${done ? " goal-card__check--done" : ""}`}
                    aria-label={done ? `${goal.title} completed` : `${goal.title} not yet completed`}
                    role="status"
                  >
                    {done && <Check size={14} aria-hidden />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel xp-hub__banner">
        <Trophy size={20} aria-hidden />
        <div>
          <p className="xp-hub__banner-title">
            {completedCount === total ? "All daily goals complete!" : "Complete your daily goals"}
          </p>
          <p className="panel__hint">
            {completedCount === total ? "Come back tomorrow for more." : "Stay consistent and watch your XP grow!"}
          </p>
        </div>
        <span className="xp-hub__banner-progress">
          {completedCount}/{total}
        </span>
      </section>
    </div>
  );
}
