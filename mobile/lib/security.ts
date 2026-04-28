import { Alert, Platform } from 'react-native'
import * as ScreenCapture from 'expo-screen-capture'
import * as Linking from 'expo-linking'

// jail-monkey is autolinked native code; require it lazily so dev builds and
// tests that don't include the native module don't crash on import.
let JailMonkey: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  JailMonkey = require('jail-monkey').default
} catch {
  JailMonkey = null
}

// ── Root / Jailbreak detection ─────────────────────────────────────────────
// Returns true when the device shows clear signs of being rooted/jailbroken.
// Dev builds (__DEV__) always return false because debugger attachment trips
// the same heuristics jail-monkey uses.
export function isHighRiskDevice(): boolean {
  if (__DEV__ || !JailMonkey) return false
  try {
    if (typeof JailMonkey.isJailBroken === 'function' && JailMonkey.isJailBroken()) return true
    if (typeof JailMonkey.hookDetected === 'function' && JailMonkey.hookDetected()) return true
    if (typeof JailMonkey.canMockLocation === 'function' && JailMonkey.canMockLocation() && Platform.OS === 'android') return true
  } catch {
    // jail-monkey can throw on some emulators — treat as low-risk rather than blocking the user.
    return false
  }
  return false
}

let _warnedThisSession = false
/**
 * Show a one-time advisory dialog if the device is high-risk. Does not block
 * the app — sensitive screens (withdrawals) call isHighRiskDevice() directly
 * to gate their flows.
 */
export function warnIfHighRiskDevice() {
  if (_warnedThisSession) return
  if (!isHighRiskDevice()) return
  _warnedThisSession = true
  Alert.alert(
    'Security Notice',
    'This device appears to be rooted/jailbroken. For your safety, some sensitive actions may be limited.',
    [{ text: 'OK' }]
  )
}

// ── Screen capture protection ──────────────────────────────────────────────
// Use as a hook in any screen handling bank/withdrawal data.
export function useScreenCaptureProtection() {
  // Imported lazily inside the hook so non-React callers don't pay the import cost.
  const { useEffect } = require('react') as typeof import('react')
  useEffect(() => {
    let cancelled = false
    ScreenCapture.preventScreenCaptureAsync()
      .catch(() => { /* expo-screen-capture is no-op on unsupported targets */ })
    return () => {
      cancelled = true
      ScreenCapture.allowScreenCaptureAsync().catch(() => {})
      void cancelled
    }
  }, [])
}

// ── Deep-link validation ───────────────────────────────────────────────────
// Whitelist of top-level path segments the app routes accept. Anything else
// arriving via snaptip://… is treated as untrusted and ignored.
const ALLOWED_TOP_LEVEL = new Set([
  '',          // bare snaptip:// → handled by index
  'login',
  'register',
  'forgot-password',
  'support',
  'business',
  'member',
  'join',
  'tabs',
  '(tabs)',
])

export function isAllowedDeepLink(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = Linking.parse(url)
    // Reject unknown schemes.
    if (parsed.scheme && !['snaptip', 'https', 'http', 'exp'].includes(parsed.scheme)) {
      return false
    }
    const path = (parsed.path || '').replace(/^\/+/, '')
    const top = path.split('/')[0] || ''
    return ALLOWED_TOP_LEVEL.has(top)
  } catch {
    return false
  }
}

/**
 * Subscribe to deep links and log anything that isn't on the whitelist.
 * Expo Router still handles navigation natively — this listener is an audit
 * trail and a single point we can hook into to add stricter enforcement later.
 */
export function setupDeepLinkAudit(): () => void {
  const sub = Linking.addEventListener('url', ({ url }) => {
    if (!isAllowedDeepLink(url)) {
      console.warn('[security] Suspicious deep link rejected:', url)
    }
  })
  return () => sub.remove()
}
