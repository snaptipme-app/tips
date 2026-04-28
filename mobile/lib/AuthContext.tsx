import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { registerForPushNotifications } from './notifications'
import { getItem, setItem, removeItem, getJSON, setJSON, SecureKeys } from './secureStorage'

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
      const storedToken = await getItem(SecureKeys.TOKEN)
      const storedUser = await getJSON<User>(SecureKeys.USER)
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(storedUser)
        // Re-register push token on every app start (token can rotate)
        registerForPushNotifications(storedToken).catch(console.error)
      }
    } catch (error) {
      console.error('Auth load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (newToken: string, newUser: User) => {
    await setItem(SecureKeys.TOKEN, newToken)
    await setJSON(SecureKeys.USER, newUser) // photo_base64 stripped automatically
    setToken(newToken)
    setUser(newUser)
    // Delay slightly so navigation transition completes before the permission
    // dialog appears — avoids the dialog being swallowed during screen change
    setTimeout(() => {
      registerForPushNotifications(newToken).catch(err =>
        console.error('[auth] registerForPushNotifications failed:', err)
      )
    }, 800)
  }

  const logout = async () => {
    await removeItem(SecureKeys.TOKEN)
    await removeItem(SecureKeys.USER)
    await removeItem(SecureKeys.PUSH)
    setToken(null)
    setUser(null)
  }

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      // Persist (photo_base64 stripped by setJSON)
      setJSON(SecureKeys.USER, updated).catch(err =>
        console.error('[auth] persist user failed:', err)
      )
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
