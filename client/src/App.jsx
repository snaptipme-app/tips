import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import TipPage from './pages/TipPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Home from './pages/dashboard/Home';
import Tips from './pages/dashboard/Tips';
import Profile from './pages/dashboard/Profile';
import AdminStats from './pages/AdminStats';
import AdminPage from './pages/AdminPage';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import CookieConsent from './components/CookieConsent';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Root: App Landing Page ── */}
          <Route path="/" element={<LandingPage />} />

          {/* ── Web auth (kept for backwards compat / deep links) ── */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />

          {/* ── Admin panel (self-managed auth) ── */}
          <Route path="/admin/oh" element={<AdminPage />} />
          <Route path="/admin" element={<Navigate to="/" replace />} />

          {/* ── Admin stats (must be above /:username catch-all) ── */}
          <Route
            path="/admin/stats"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AdminStats />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* ── Employee web dashboard ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DashboardLayout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="tips" element={<Tips />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* ── Legal pages (must be above /:username catch-all) ── */}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* ── Tourist tip page — catch-all MUST be last ── */}
          <Route path="/:username" element={<TipPage />} />
        </Routes>
        <CookieConsent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
