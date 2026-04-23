import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert } from 'react-native';

const api = axios.create({
  baseURL: 'https://snaptip.me/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('snaptip_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    // Account suspended — force immediate logout
    if (status === 403 && code === 'ACCOUNT_SUSPENDED') {
      console.log('[api] Account suspended — forcing logout');
      await AsyncStorage.removeItem('snaptip_token');
      await AsyncStorage.removeItem('snaptip_user');
      Alert.alert(
        'Account Suspended',
        'Your account has been suspended. Please contact support.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
      return Promise.reject(error);
    }

    // Token expired or invalid — silent logout
    if (status === 401) {
      await AsyncStorage.removeItem('snaptip_token');
      await AsyncStorage.removeItem('snaptip_user');
    }
    return Promise.reject(error);
  }
);

export default api;
