import { Stack, router, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '../lib/AuthContext'
import { setNavigateToLogin } from '../lib/api'
import { LanguageProvider } from '../lib/LanguageContext'

function RootLayoutNav() {
  const { user, isLoading } = useAuth()
  const segments = useSegments()

  // Register navigation callback — router is safe to use here
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
