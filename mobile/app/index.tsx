import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080818', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6c6cff" />
      </View>
    );
  }

  if (token) return <Redirect href="/(tabs)/home" />;
  return <Redirect href="/login" />;
}
