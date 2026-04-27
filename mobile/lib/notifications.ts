import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PERM_ASKED_KEY = 'snaptip_notif_asked'
const PUSH_TOKEN_KEY  = 'snaptip_push_token'
const API_URL         = 'https://snaptip.me/api'
const PROJECT_ID      = 'd53512d7-5a91-49c2-8a37-764e896bbcac'

// Retry helper — getExpoPushTokenAsync can fail on first call right after
// permission grant while FCM is still initialising on the device.
async function getTokenWithRetry(attempts = 3): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`[notifications] getExpoPushTokenAsync attempt ${i + 1}/${attempts}`)
      const data = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })
      const token = data?.data ?? null
      if (token) {
        console.log('[notifications] Token obtained:', token)
        return token
      }
      console.warn('[notifications] Token was empty on attempt', i + 1)
    } catch (err: any) {
      // Log full error — native errors often have no .message, so stringify
      const msg = err?.message ?? JSON.stringify(err) ?? String(err)
      console.error(`[notifications] getExpoPushTokenAsync error (attempt ${i + 1}):`, msg)
      if (i < attempts - 1) {
        // Exponential back-off: 2 s, 4 s
        await new Promise(r => setTimeout(r, 2000 * (i + 1)))
      }
    }
  }
  return null
}

export async function registerForPushNotifications(authToken: string): Promise<void> {
  console.log('[notifications] registerForPushNotifications called, device:', Device.isDevice)

  if (!Device.isDevice) {
    console.log('[notifications] Not a physical device — skipping')
    return
  }

  try {
    // ── 1. Create Android notification channels ───────────────────────────────
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SnapTip',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'notification.mp3',
        lightColor: '#00C896',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      })
      await Notifications.setNotificationChannelAsync('tips', {
        name: 'Tips',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'notification.mp3',
        lightColor: '#00C896',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      })
      console.log('[notifications] Android channels ready')
    }

    // ── 2. Request permission ─────────────────────────────────────────────────
    const { status: currentStatus } = await Notifications.getPermissionsAsync()
    console.log('[notifications] Current permission status:', currentStatus)

    if (currentStatus !== 'granted') {
      const alreadyAsked = await AsyncStorage.getItem(PERM_ASKED_KEY)
      const { status: newStatus } = await Notifications.requestPermissionsAsync()
      // Mark as asked BEFORE checking result so the alert only shows once
      await AsyncStorage.setItem(PERM_ASKED_KEY, 'asked')
      console.log('[notifications] Permission after request:', newStatus)

      if (newStatus !== 'granted') {
        if (!alreadyAsked) {
          Alert.alert(
            'Enable Notifications',
            'Enable notifications to receive instant tip alerts. You can turn them on any time in Settings.',
            [{ text: 'OK' }]
          )
        }
        console.log('[notifications] Permission denied — aborting')
        return
      }
    }

    // ── 3. Get Expo Push Token (retry up to 3×) ───────────────────────────────
    const pushToken = await getTokenWithRetry(3)

    if (!pushToken) {
      console.error('[notifications] Failed to obtain push token after 3 attempts')
      return
    }

    // Cache token locally — also lets AuthContext skip the server call when
    // token hasn't changed (reduces unnecessary network requests)
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken)

    // ── 4. Save token to server ───────────────────────────────────────────────
    console.log('[notifications] Saving push token to server...')
    const res = await fetch(`${API_URL}/employee/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ push_token: pushToken }),
    })

    const body = await res.text()
    if (!res.ok) {
      console.error(`[notifications] Server rejected push-token — status=${res.status} body=${body}`)
    } else {
      console.log('[notifications] Push token saved to server ✓', pushToken)
    }
  } catch (err: any) {
    const msg = err?.message ?? JSON.stringify(err) ?? String(err)
    console.error('[notifications] registerForPushNotifications fatal error:', msg)
  }
}
