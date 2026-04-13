import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('snaptip_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('snaptip_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('snaptip_token', data.token);
      localStorage.setItem('snaptip_user', JSON.stringify(data.employee));
      setToken(data.token);
      setUser(data.employee);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', formData);
      localStorage.setItem('snaptip_token', data.token);
      localStorage.setItem('snaptip_user', JSON.stringify(data.employee));
      setToken(data.token);
      setUser(data.employee);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Registration failed.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('snaptip_token');
    localStorage.removeItem('snaptip_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (newUser) => {
    localStorage.setItem('snaptip_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
