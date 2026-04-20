import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { Share } from 'react-native';

/**
 * Captures a PrintableQRCard ref as a high-quality PNG,
 * saves it to the device gallery (if permission is granted),
 * and opens the native share sheet.
 */
export const downloadAndShareQRCard = async (
  cardRef: React.RefObject<any>,
  username: string,
  onSuccess?: () => void,
  onError?: () => void
): Promise<void> => {
  try {
    // Give the view 500ms to fully render (important for hidden off-screen cards)
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
    });

    // Request media library permission
    const { status } = await MediaLibrary.requestPermissionsAsync();

    // Open native share sheet first so the user isn't kept waiting
    await Share.share({
      title: 'SnapTip QR Card',
      message: `Scan to leave a tip! https://snaptip.me/${username}`,
      url: uri, // used on iOS
    });

    // Save to gallery after share (non-blocking for UX)
    if (status === 'granted') {
      await MediaLibrary.saveToLibraryAsync(uri);
    }

    onSuccess?.();
  } catch (error) {
    console.error('[captureQRCard] Capture error:', error);
    onError?.();
  }
};
