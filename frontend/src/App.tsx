import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
import { PublicHeader } from "./components/PublicHeader";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { XPHub } from "./pages/XPHub";
import { History } from "./pages/History";
import { Account } from "./pages/Account";

function PublicPage({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage><Landing /></PublicPage>} />
        <Route path="/login" element={<PublicPage><Login /></PublicPage>} />
        <Route path="/register" element={<PublicPage><Register /></PublicPage>} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Home />} />
          <Route path="/xp" element={<XPHub />} />
          <Route path="/history" element={<History />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
