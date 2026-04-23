import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../lib/AuthContext';
import { LanguageProvider, useLanguage } from '../lib/LanguageContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function InnerLayout() {
  const { isRTL } = useLanguage();

  useEffect(() => {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }, [isRTL]);

  return (
    <>
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
        <Stack.Screen name="support" />
        <Stack.Screen name="business/setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="business/team" />
        <Stack.Screen name="business/invite" options={{ presentation: 'modal' }} />
        <Stack.Screen name="business/dashboard" />
        <Stack.Screen name="business/transactions" />
        <Stack.Screen name="business/profile-settings" />
        <Stack.Screen name="member/dashboard" />
        <Stack.Screen name="member/qr" />
        <Stack.Screen name="member/withdraw" />
        <Stack.Screen name="member/profile" />
        <Stack.Screen name="join/[token]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <InnerLayout />
      </LanguageProvider>
    </AuthProvider>
  );
}
