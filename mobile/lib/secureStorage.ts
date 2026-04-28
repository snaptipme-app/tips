import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Fields stripped from user object before SecureStore write — they're either
// too large (base64 photo) or non-sensitive display data we don't need
// inside the keychain.
const STRIP_FIELDS_DEFAULT = ['photo_base64']

/**
 * Read a value from SecureStore. If the key isn't there but exists in legacy
 * AsyncStorage, migrate it forward (write to SecureStore, delete from AS),
 * then return the value. Returns null if neither store has it.
 */
export async function getItem(key: string): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(key)
    if (v != null) return v
  } catch (e) {
    console.warn('[secureStorage] getItem failed for', key, e)
  }

  // Legacy AsyncStorage migration path — runs once per key.
  try {
    const legacy = await AsyncStorage.getItem(key)
    if (legacy) {
      try {
        await SecureStore.setItemAsync(key, legacy)
      } catch {
        // SecureStore unavailable on this device — keep legacy as fallback.
        return legacy
      }
      try { await AsyncStorage.removeItem(key) } catch {}
      return legacy
    }
  } catch {}

  return null
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value)
    // Best-effort cleanup of any legacy copy left in AsyncStorage.
    try { await AsyncStorage.removeItem(key) } catch {}
  } catch (e) {
    console.warn('[secureStorage] setItem failed for', key, '— falling back to AsyncStorage', e)
    await AsyncStorage.setItem(key, value)
  }
}

export async function removeItem(key: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(key) } catch {}
  try { await AsyncStorage.removeItem(key) } catch {}
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

export async function setJSON(
  key: string,
  value: any,
  stripFields: string[] = STRIP_FIELDS_DEFAULT
): Promise<void> {
  const cleaned: Record<string, any> = { ...value }
  for (const f of stripFields) delete cleaned[f]
  await setItem(key, JSON.stringify(cleaned))
}

export const SecureKeys = {
  TOKEN: 'snaptip_token',
  USER:  'snaptip_user',
  PUSH:  'snaptip_push_token',
} as const
