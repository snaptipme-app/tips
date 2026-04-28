import { getItem, removeItem, SecureKeys } from './secureStorage'

const BASE_URL = 'https://snaptip.me/api'

// Navigation callback — set by AuthContext after router is ready
let _navigateToLogin: (() => void) | null = null

export const setNavigateToLogin = (fn: () => void) => {
  _navigateToLogin = fn
}

const getToken = async (): Promise<string | null> => {
  return getItem(SecureKeys.TOKEN)
}

// Build an axios-shaped error so all catch blocks using e.response?.data?.error work
const makeApiError = (message: string, status: number, body: any) => {
  const err: any = new Error(message)
  err.response = { status, data: body }
  return err
}

export const apiRequest = async (
  path: string,
  options: RequestInit = {}
): Promise<{ data: any }> => {
  const token = await getToken()

  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  })

  // Parse body once (always try JSON; fall back to empty object)
  let body: any = {}
  try { body = await response.json() } catch {}

  if (response.status === 401 || response.status === 403) {
    await removeItem(SecureKeys.TOKEN)
    await removeItem(SecureKeys.USER)
    if (_navigateToLogin) _navigateToLogin()
    throw makeApiError(body?.error || 'Unauthorized', response.status, body)
  }

  if (!response.ok) {
    throw makeApiError(body?.error || `HTTP ${response.status}`, response.status, body)
  }

  // Return axios-compatible wrapper so all callers can use const { data } = await api.xxx
  return { data: body }
}

export const api = {
  get:    (path: string)             => apiRequest(path, { method: 'GET' }),
  post:   (path: string, body?: any) => apiRequest(path, { method: 'POST',  body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch:  (path: string, body: any)  => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string)             => apiRequest(path, { method: 'DELETE' }),
}

export default api
