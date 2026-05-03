/**
 * Toast — Premium dark-themed notification that slides from the top.
 *
 * Features:
 *  - Renders inside a transparent <Modal> so it paints over EVERYTHING,
 *    including other Modals, bottom sheets, and system overlays
 *  - Smooth translateY slide-in from above the safe area
 *  - Ionicons SVG icons (no emojis)
 *  - Glassmorphic dark card with colored accent stripe
 *  - Auto-dismiss after 3.2 seconds
 *  - pointerEvents="none" — never blocks touches
 *
 * API is unchanged — drop-in compatible with existing useToast() callers.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, Platform, Modal, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  message: string;
  type: ToastType;
  visible: boolean;
};

const ACCENT: Record<ToastType, string> = {
  success: '#00C896',
  error:   '#ef4444',
  info:    '#1a1a1a',
};

const BG: Record<ToastType, string> = {
  success: 'rgba(0,200,150,0.12)',
  error:   'rgba(239,68,68,0.12)',
  info:    'rgba(255,255,255,0.12)',
};

const ICON_NAMES: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error:   'close-circle',
  info:    'information-circle',
};

// Status bar height fallback
const STATUS_BAR_HEIGHT = Platform.OS === 'android'
  ? (StatusBar.currentHeight ?? 24)
  : 0;

export function Toast({ message, type, visible }: ToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  // Keep the Modal mounted during slide-out animation
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: Platform.OS === 'ios' ? 54 : STATUS_BAR_HEIGHT + 12,
          useNativeDriver: true,
          speed: 14,
          bounciness: 8,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0,    duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) setModalVisible(false);
        });
      }, 2800);

      return () => clearTimeout(timer);
    } else {
      // Immediate reset when visible flips false from outside
      translateY.setValue(-120);
      opacity.setValue(0);
      setModalVisible(false);
    }
  }, [visible, message]);

  if (!message) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent           // Android: render above status bar
      hardwareAccelerated            // Android: GPU-accelerated layer
      presentationStyle="overFullScreen"  // iOS: true full-screen overlay
    >
      {/* Full-screen passthrough — doesn't intercept any touch */}
      <View
        pointerEvents="none"
        style={{ flex: 1 }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 16,
            right: 16,
            zIndex: 99999,
            elevation: 99999,
            transform: [{ translateY }],
            opacity,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'rgba(10,10,35,0.97)',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: `${ACCENT[type]}44`,
              // Shadow
              shadowColor: ACCENT[type],
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 24,
            }}
          >
            {/* Colored icon container */}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: BG[type],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name={ICON_NAMES[type]} size={18} color={ACCENT[type]} />
            </View>
            <Text
              style={{
                color: '#fff',
                fontWeight: '600',
                fontSize: 14,
                flex: 1,
                lineHeight: 19,
              }}
              numberOfLines={2}
            >
              {message}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export type ToastState = { visible: boolean; message: string; type: ToastType };

export const defaultToast: ToastState = { visible: false, message: '', type: 'success' };

export function useToast() {
  const [toast, setToast] = useState<ToastState>(defaultToast);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3200);
  };

  return { toast, showToast };
}
