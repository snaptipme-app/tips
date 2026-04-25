import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'https://snaptip.me/api'

// Navigation callback — set by AuthContext after router is ready
let _navigateToLogin: (() => void) | null = null

export const setNavigateToLogin = (fn: () => void) => {
  _navigateToLogin = fn
}

const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem('snaptip_token')
}

export const apiRequest = async (
  path: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = await getToken()
  
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  })

  if (response.status === 401 || response.status === 403) {
    await AsyncStorage.removeItem('snaptip_token')
    await AsyncStorage.removeItem('snaptip_user')
    if (_navigateToLogin) _navigateToLogin()
    throw new Error('Unauthorized')
  }

  const data = await response.json()
  return data
}

export const api = {
  get: (path: string) => apiRequest(path, { method: 'GET' }),
  post: (path: string, body: any) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: any) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => apiRequest(path, { method: 'DELETE' }),
}

export default api
