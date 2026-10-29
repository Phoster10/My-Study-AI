import { Link } from "react-router-dom";
import { Brain } from "lucide-react";

export function PublicHeader() {
  return (
    <header className="public-header">
      <Link to="/" className="public-header__brand">
        <Brain size={20} aria-hidden />
        Study <span>AI</span>
      </Link>
      <nav className="public-header__links">
        <Link to="/login">Log in</Link>
        <Link to="/register" className="navbar__cta">
          Sign up
        </Link>
      </nav>
    </header>
  );
}
