import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('snaptip_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('snaptip_token');
      localStorage.removeItem('snaptip_user');
      if (window.location.pathname === '/dashboard') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
