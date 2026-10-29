import { Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

/** Same as History: no mockup was provided for this page, so it's kept to
 * what the app already knows for certain (the signed-in account) rather
 * than inventing settings that don't do anything yet. */
export function Settings() {
  const { user, signOut } = useAuth();

  return (
    <div className="panel coming-soon">
      <SettingsIcon size={40} aria-hidden />
      <h2>Settings</h2>
      <p>Account preferences aren't built yet. For now, here's your account:</p>
      <p className="settings__email">{user?.email}</p>
      <button className="button button--secondary" onClick={() => signOut()}>
        <LogOut size={16} aria-hidden /> Sign out
      </button>
    </div>
  );
}
