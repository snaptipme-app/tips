import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import api from '../lib/api';

export default function Index() {
  const { token, user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!token) {
      setDestination('/login');
      setChecking(false);
      return;
    }

    // Business owners: check if they have a business set up
    if (user?.account_type === 'business') {
      api.get('/business/me')
        .then(() => {
          setDestination('/business/dashboard');
        })
        .catch(() => {
          // No business yet → go to setup
          setDestination('/business/setup');
        })
        .finally(() => setChecking(false));
    } else {
      setDestination('/(tabs)/home');
      setChecking(false);
    }
  }, [token, user, loading]);

  useEffect(() => {
    if (!checking && destination) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [checking, destination]);

  if (loading || checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080818', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6c6cff" />
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}
