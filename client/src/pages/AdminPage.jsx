import { useState } from 'react';
import AdminLogin, { isAdminHintSet, clearAdminToken } from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function AdminPage() {
  // Token lives in an httpOnly cookie unreachable from JS. We use a session-
  // scoped hint flag to remember "operator just logged in" between renders.
  // The server is the source of truth — any 401 will trigger clearAdminToken
  // and bounce back here.
  const [isAuthenticated, setIsAuthenticated] = useState(() => isAdminHintSet());

  if (!isAuthenticated) {
    return (
      <AdminLogin
        onSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <AdminDashboard
      onLogout={() => {
        clearAdminToken();
        setIsAuthenticated(false);
      }}
    />
  );
}
