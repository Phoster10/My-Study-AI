// study-ai/frontend/src/pages/Account.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Lock } from "lucide-react";
import { api } from "../api/client";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

/**
 * Username and password changes go through the backend (PATCH
 * /api/account/username and /api/account/password), which validates them
 * before anything is sent to Supabase. This page deliberately does no rule
 * checking of its own — the backend is the single source of truth, and its
 * error messages are shown as-is.
 *
 * Username is stored in the user's `user_metadata`, since there's no
 * separate profiles table in the schema.
 */
export function Account() {
  const { user } = useAuth();

  const [username, setUsername] = useState((user?.user_metadata as { username?: string } | undefined)?.username ?? "");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleUsernameSave(e: React.FormEvent) {
    e.preventDefault();
    setUsernameSaving(true);
    setUsernameError(null);
    setUsernameSaved(false);
    try {
      const { username: saved } = await api.updateUsername(username);
      setUsername(saved);
      setUsernameSaved(true);
      // The backend changed the user server-side, so pull a fresh session to
      // make the new username show up everywhere useAuth() is used.
      await supabase.auth.refreshSession().catch(() => undefined);
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : "Failed to update username.");
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    setPasswordSaving(true);
    try {
      await api.updatePassword(newPassword, confirmPassword);
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="page-header-wrap account-page">
      <Link to="/dashboard" className="account-page__back">
        <ArrowLeft size={16} aria-hidden /> Back
      </Link>
      <h1 className="page-title">Account Details</h1>
      <p className="account-page__email">{user?.email}</p>

      <section className="panel">
        <div className="xp-hub__title-row">
          <User size={20} aria-hidden />
          <h2>Username</h2>
        </div>
        <form className="account-form" onSubmit={handleUsernameSave}>
          <label>
            Username
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" autoComplete="username" />
          </label>
          {usernameError && <p className="error-text">{usernameError}</p>}
          {usernameSaved && <p className="info-text">Username updated.</p>}
          <button className="button" type="submit" disabled={usernameSaving}>
            {usernameSaving ? "Saving..." : "Save Username"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="xp-hub__title-row">
          <Lock size={20} aria-hidden />
          <h2>Password</h2>
        </div>
        <form className="account-form" onSubmit={handlePasswordSave}>
          <label>
            New password
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <label>
            Confirm new password
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </label>
          {passwordError && <p className="error-text">{passwordError}</p>}
          {passwordSaved && <p className="info-text">Password updated.</p>}
          <button className="button" type="submit" disabled={passwordSaving}>
            {passwordSaving ? "Saving..." : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}