import { useEffect } from 'react'
import { router } from 'expo-router'
import { useAuth } from '../lib/AuthContext'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (user.account_type === 'business') {
      router.replace('/business/dashboard')
    } else {
      router.replace('/(tabs)/home')
    }
  }, [user, isLoading])

  return (
    <View style={{ flex: 1, backgroundColor: '#080818', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#00C896" size="large" />
    </View>
  )
}
