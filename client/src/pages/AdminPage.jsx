import { useState } from 'react';
import AdminLogin, { getAdminToken, clearAdminToken } from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function AdminPage() {
  // Check for existing valid token in localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAdminToken());

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
