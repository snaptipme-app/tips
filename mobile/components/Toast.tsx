import { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  message: string;
  type: ToastType;
  visible: boolean;
};

const COLORS: Record<ToastType, string> = {
  success: '#00C896',
  error: '#ef4444',
  info: '#6c6cff',
};

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
};

export function Toast({ message, type, visible }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible, message]);

  if (!visible && !message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: COLORS[type],
        borderRadius: 14,
        padding: 16,
        opacity,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: COLORS[type],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <Text style={{ fontSize: 18 }}>{ICONS[type]}</Text>
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, flex: 1 }}>{message}</Text>
    </Animated.View>
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
