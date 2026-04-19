import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#080818' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="business/setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="business/team" />
        <Stack.Screen name="business/invite" options={{ presentation: 'modal' }} />
        <Stack.Screen name="join/[token]" />
      </Stack>
    </AuthProvider>
  );
}
