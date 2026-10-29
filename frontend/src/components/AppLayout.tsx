import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { OnboardingModal, hasSeenOnboarding } from "./OnboardingModal";

export function AppLayout() {
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <TopBar />
        <div className="app-shell__content">
          <Outlet />
        </div>
      </div>
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
    </div>
  );
}
