import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PERM_ASKED_KEY = 'snaptip_notif_asked'
const API_URL = 'https://snaptip.me/api'
const PROJECT_ID = 'd53512d7-5a91-49c2-8a37-764e896bbcac'

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Registers the device for Expo Push Notifications.
 *
 * - Requests permission (Android 13+ POST_NOTIFICATIONS, iOS)
 * - Creates the Android 'tips' notification channel with custom sound
 * - Obtains an Expo Push Token and saves it to the server
 *
 * Safe to call on every login/app-start. Errors never crash the app.
 *
 * @param authToken  The user's JWT for the push-token save endpoint
 */
export async function registerForPushNotifications(authToken: string): Promise<void> {
  if (!Device.isDevice) {
    console.log('[notifications] Skipping — not a physical device')
    return
  }

  try {
    // ── 1. Create Android notification channel FIRST ─────────────────────────
    // The channel must exist before the token is used; the sound file must be
    // bundled via expo-notifications plugin in app.json.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tips', {
        name: 'Tips',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'notification.mp3',   // matches the file in assets/sounds/
        lightColor: '#00C896',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      })
      console.log('[notifications] Android channel "tips" ready')
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
    // Never let a notification error crash the app
    console.error('[notifications] registerForPushNotifications error:', err.message)
  }
}
