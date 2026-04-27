import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PERM_ASKED_KEY = 'snaptip_notif_asked'
const API_URL = 'https://snaptip.me/api'
const PROJECT_ID = 'd53512d7-5a91-49c2-8a37-764e896bbcac'

// Set default notification handler so notifications display while app is open
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
 * - Requests permission from the user (Android 13+ POST_NOTIFICATIONS, iOS)
 * - If denied on first ask, shows an explanatory Alert
 * - Gets the Expo Push Token and saves it to the server
 * - Creates the Android notification channel for tip sounds
 *
 * Safe to call on every login/app-start: it skips silently on simulators
 * or when permission was already denied and re-asked is suppressed.
 *
 * @param authToken  The user's JWT — used to authenticate the push-token save call
 */
export async function registerForPushNotifications(authToken: string): Promise<void> {
  // Push notifications require a real physical device
  if (!Device.isDevice) {
    console.log('[notifications] Skipping — not a physical device')
    return
  }

  try {
    // Android: create the notification channel BEFORE requesting permission
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tips', {
        name: 'Tips',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'tip_received.mp3',
        lightColor: '#00C896',
      })
    }

    // Check current permission status
    const { status: currentStatus } = await Notifications.getPermissionsAsync()

    if (currentStatus !== 'granted') {
      const alreadyAsked = await AsyncStorage.getItem(PERM_ASKED_KEY)
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync()

      // Mark that we've asked so we don't spam on every launch
      if (!alreadyAsked) {
        await AsyncStorage.setItem(PERM_ASKED_KEY, 'asked')
      }

      if (requestedStatus !== 'granted') {
        // Only explain on the very first denial, not on every app launch
        if (!alreadyAsked) {
          Alert.alert(
            'Enable Notifications',
            'Enable notifications to receive instant alerts when you get a tip. You can turn them on any time in your device Settings.',
            [{ text: 'OK' }]
          )
        }
        return
      }
    }

    // Fetch the Expo push token for this device/app
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })
    const pushToken = tokenData?.data
    if (!pushToken) return

    console.log('[notifications] Push token:', pushToken)

    // Save the token to the server so it can send notifications later
    await fetch(`${API_URL}/employee/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ push_token: pushToken }),
    })

    console.log('[notifications] Token saved to server')
  } catch (err: any) {
    // Never crash the app over a notification registration failure
    console.error('[notifications] registerForPushNotifications error:', err.message)
  }
}
