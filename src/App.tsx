import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Footer, Header } from "./components/Chrome";
import { CreatePage } from "./pages/CreatePage";
import { HomePage } from "./pages/HomePage";
import { ListenPage, SharePage } from "./pages/SharePage";

function GhPagesRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const stored = sessionStorage.getItem("mixtape-redirect");
    if (stored) {
      sessionStorage.removeItem("mixtape-redirect");
      navigate(stored, { replace: true });
    }
  }, [navigate]);
  return null;
}

function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return <div className="offline-banner">You&apos;re offline. The app and songs saved on this device still work.</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <GhPagesRedirect />
      <div className="app-shell">
        <Header />
        <OfflineBanner />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/share/:id" element={<SharePage />} />
            <Route path="/m/:id" element={<ListenPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
