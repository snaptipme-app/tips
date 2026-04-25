import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setNavigateToLogin } from './api'

type User = {
  id: number
  full_name: string
  email: string
  username: string
  photo_url?: string
  photo_base64?: string
  profile_image_url?: string
  job_title?: string
  account_type: string
  country: string
  currency: string
  balance: number
  total_tips: number
}

type AuthContextType = {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => Promise<void>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStoredAuth()
  }, [])

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('snaptip_token')
      const storedUser = await AsyncStorage.getItem('snaptip_user')
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch (error) {
      console.error('Auth load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (newToken: string, newUser: User) => {
    await AsyncStorage.setItem('snaptip_token', newToken)
    await AsyncStorage.setItem('snaptip_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = async () => {
    await AsyncStorage.removeItem('snaptip_token')
    await AsyncStorage.removeItem('snaptip_user')
    setToken(null)
    setUser(null)
  }

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      AsyncStorage.setItem('snaptip_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export default AuthContext
