import { NavLink } from "react-router-dom";
import { Brain, Home, Star, Clock, Zap } from "lucide-react";
import { useXP } from "../hooks/useXP";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home, end: true },
  { to: "/xp", label: "XP", icon: Star },
  { to: "/history", label: "History", icon: Clock },
];

export function Sidebar() {
  const { xp } = useXP();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Brain className="sidebar__brand-icon" aria-hidden />
        <div>
          <p className="sidebar__brand-name">
            Study <span>AI</span>
          </p>
          <p className="sidebar__brand-tagline">Smarter Notes. Higher Goals.</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar__nav-item${isActive ? " sidebar__nav-item--active" : ""}`}>
            <Icon size={18} aria-hidden />
            <span>{label}</span>
            {label === "XP" && xp !== null && <span className="sidebar__nav-badge">{xp}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__tip">
        <Zap size={16} aria-hidden />
        <p>
          Small steps
          <br />
          create big results.
        </p>
      </div>
    </aside>
  );
}
