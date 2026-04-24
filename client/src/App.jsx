import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppLanding from './pages/AppLanding';
import TipPage from './pages/TipPage';
import Login from './pages/Login';
import RegisterMultiStep from './pages/RegisterMultiStep';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Home from './pages/dashboard/Home';
import Tips from './pages/dashboard/Tips';
import Profile from './pages/dashboard/Profile';
import AdminStats from './pages/AdminStats';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Root: App Landing Page ── */}
          <Route path="/" element={<AppLanding />} />

          {/* ── Web auth (kept for backwards compat / deep links) ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterMultiStep />} />

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

          {/* ── Tourist tip page — catch-all MUST be last ── */}
          <Route path="/:username" element={<TipPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

