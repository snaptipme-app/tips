import { Stack, router, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '../lib/AuthContext'
import { setNavigateToLogin } from '../lib/api'
import { LanguageProvider } from '../lib/LanguageContext'
import * as Notifications from 'expo-notifications'
import { setupDeepLinkAudit, warnIfHighRiskDevice } from '../lib/security'

// Must be at module level — runs before any notification arrives (foreground or background wake)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function RootLayoutNav() {
  const { user, isLoading } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    setNavigateToLogin(() => {
      router.replace('/login')
    })
  }, [])

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(tabs)' ||
                        segments[0] === 'business' ||
                        segments[0] === 'member'

    if (!user && inAuthGroup) {
      router.replace('/login')
    }
  }, [user, isLoading, segments])

  // Navigate to home when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.replace('/(tabs)/home')
    })
    return () => sub.remove()
  }, [])

  // Security: audit incoming deep links + one-time warning if device is rooted.
  useEffect(() => {
    warnIfHighRiskDevice()
    const unsubscribe = setupDeepLinkAudit()
    return unsubscribe
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="business" />
      <Stack.Screen name="member" />
      <Stack.Screen name="join" />
      <Stack.Screen name="support" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <RootLayoutNav />
      </LanguageProvider>
    </AuthProvider>
  )
}
