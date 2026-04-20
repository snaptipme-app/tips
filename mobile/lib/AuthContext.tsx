import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  profile_image_url?: string;
  photo_url?: string;
  photo_base64?: string;
  balance: number;
  is_admin?: number;
  account_type?: string;
  job_title?: string;
  business_id?: number;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Also persist to AsyncStorage when setting user
  const setUser = (u: User) => {
    setUserState(u);
    AsyncStorage.setItem('snaptip_user', JSON.stringify(u)).catch(() => {});
  };

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('snaptip_token');
      const u = await AsyncStorage.getItem('snaptip_user');
      if (t && u) {
        setToken(t);
        setUserState(JSON.parse(u));
      }
      setLoading(false);
    })();
  }, []);

  const login = async (identifier: string, password: string) => {
    const { data } = await api.post('/auth/login', { email: identifier, password });
    await AsyncStorage.setItem('snaptip_token', data.token);
    setToken(data.token);

    // Fetch full profile from dashboard to get all fields including photo_base64
    try {
      const dashRes = await api.get('/dashboard', { headers: { Authorization: `Bearer ${data.token}` } });
      const dashEmp = dashRes.data.employee || {};
      const loginEmp = data.employee || {};

      // Merge: dashboard data takes priority, but never overwrite with null/undefined
      const fullUser: User = {
        id: dashEmp.id || loginEmp.id,
        username: dashEmp.username || loginEmp.username,
        full_name: dashEmp.full_name || loginEmp.full_name,
        email: dashEmp.email || loginEmp.email,
        profile_image_url: dashEmp.profile_image_url || loginEmp.profile_image_url || '',
        photo_url: dashEmp.photo_url || loginEmp.photo_url || '',
        photo_base64: dashEmp.photo_base64 || loginEmp.photo_base64 || '',
        balance: Number(dashEmp.balance) || Number(loginEmp.balance) || 0,
        is_admin: dashEmp.is_admin || loginEmp.is_admin || 0,
        account_type: dashEmp.account_type || loginEmp.account_type || 'individual',
        job_title: dashEmp.job_title || loginEmp.job_title || '',
        business_id: dashEmp.business_id || loginEmp.business_id,
      };

      console.log('[auth] Login: account_type =', fullUser.account_type, '| photo =', fullUser.photo_base64 ? 'yes' : 'no');
      await AsyncStorage.setItem('snaptip_user', JSON.stringify(fullUser));
      setUserState(fullUser);
    } catch {
      // Fallback to login response data
      const emp = data.employee || {};
      console.log('[auth] Login fallback: account_type =', emp.account_type);
      await AsyncStorage.setItem('snaptip_user', JSON.stringify(emp));
      setUserState(emp);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('snaptip_token');
    await AsyncStorage.removeItem('snaptip_user');
    setToken(null);
    setUserState(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/dashboard');
      const dashEmp = data.employee || {};
      const current = user || {} as User;

      // Merge: keep existing fields, override with dashboard data only if non-empty
      const updated: User = {
        ...current,
        ...dashEmp,
        // Explicitly preserve these critical fields — never overwrite with null
        account_type: dashEmp.account_type || current.account_type || 'individual',
        photo_base64: dashEmp.photo_base64 || current.photo_base64 || '',
        photo_url: dashEmp.photo_url || current.photo_url || '',
        profile_image_url: dashEmp.profile_image_url || current.profile_image_url || '',
        balance: Number(dashEmp.balance) ?? Number(current.balance) ?? 0,
      };

      setUserState(updated);
      await AsyncStorage.setItem('snaptip_user', JSON.stringify(updated));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
