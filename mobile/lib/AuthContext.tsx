import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  profile_image_url?: string;
  photo_base64?: string;
  balance: number;
  is_admin?: number;
  account_type?: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('snaptip_token');
      const u = await AsyncStorage.getItem('snaptip_user');
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
      setLoading(false);
    })();
  }, []);

  const login = async (identifier: string, password: string) => {
    const { data } = await api.post('/auth/login', { email: identifier, password });
    await AsyncStorage.setItem('snaptip_token', data.token);
    await AsyncStorage.setItem('snaptip_user', JSON.stringify(data.employee));
    setToken(data.token);
    setUser(data.employee);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('snaptip_token');
    await AsyncStorage.removeItem('snaptip_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/dashboard');
      const updated = { ...user, ...data.employee, balance: data.balance ?? user?.balance };
      setUser(updated as User);
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
