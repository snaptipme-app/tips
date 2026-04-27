import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PERM_ASKED_KEY = 'snaptip_notif_asked'
const API_URL = 'https://snaptip.me/api'
const PROJECT_ID = 'd53512d7-5a91-49c2-8a37-764e896bbcac'

// NOTE: setNotificationHandler is in app/_layout.tsx at module level so it
// runs before any notification arrives, even before AuthContext is mounted.

export async function registerForPushNotifications(authToken: string): Promise<void> {
  if (!Device.isDevice) {
    console.log('[notifications] Skipping — not a physical device')
    return
  }

  try {
    // ── 1. Create Android notification channels ───────────────────────────────
    // Both channels use notification.mp3 with MAX importance.
    // 'default' is used when the server sends without a channelId.
    // 'tips' is used when the server explicitly sets channelId: 'tips'.
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
      console.log('[notifications] Android channels ready (default + tips)')
    }

    // ── 2. Request permission ─────────────────────────────────────────────────
    const { status: currentStatus } = await Notifications.getPermissionsAsync()

    if (currentStatus !== 'granted') {
      const alreadyAsked = await AsyncStorage.getItem(PERM_ASKED_KEY)
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync()
      await AsyncStorage.setItem(PERM_ASKED_KEY, 'asked')

      if (requestedStatus !== 'granted') {
        if (!alreadyAsked) {
          Alert.alert(
            'Enable Notifications',
            'Enable notifications to receive instant alerts when you get a tip. You can turn them on any time in your device Settings.',
            [{ text: 'OK' }]
          )
        }
        console.log('[notifications] Permission denied — skipping token registration')
        return
      }
    }

    // ── 3. Obtain Expo Push Token ─────────────────────────────────────────────
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })
    const pushToken = tokenData?.data

    if (!pushToken) {
      console.error('[notifications] getExpoPushTokenAsync returned empty token')
      return
    }

    console.log('[notifications] Push token obtained:', pushToken)

    // ── 4. Save token to server ───────────────────────────────────────────────
    const res = await fetch(`${API_URL}/employee/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ push_token: pushToken }),
    })

    if (!res.ok) {
      console.error('[notifications] Server rejected push-token save, status:', res.status)
    } else {
      console.log('[notifications] Push token saved to server successfully')
    }
  } catch (err: any) {
    console.error('[notifications] registerForPushNotifications error:', err.message)
  }
}
