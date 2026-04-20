import { Audio } from 'expo-av';

let soundInstance: Audio.Sound | null = null;

/**
 * Play the tip received sound effect.
 * Uses expo-av Audio — compatible with Expo Go.
 */
export const playTipSound = async () => {
  try {
    // Unload previous instance if still loaded
    if (soundInstance) {
      try { await soundInstance.unloadAsync(); } catch {}
      soundInstance = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/tip_received.mp3')
    );
    soundInstance = sound;

    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        soundInstance = null;
      }
    });
  } catch (error) {
    console.log('[tipSound] Error playing sound:', error);
  }
};
