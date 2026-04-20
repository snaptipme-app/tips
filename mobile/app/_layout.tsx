import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/AuthContext';
import { LanguageProvider } from '../lib/LanguageContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
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
        <Stack.Screen name="business/dashboard" />
        <Stack.Screen name="business/transactions" />
        <Stack.Screen name="business/profile-settings" />
        <Stack.Screen name="join/[token]" />
      </Stack>
    </AuthProvider>
    </LanguageProvider>
  );
}
