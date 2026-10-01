import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
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

export default function App() {
  return (
    <BrowserRouter>
      <GhPagesRedirect />
      <div className="app-shell">
        <Header />
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
