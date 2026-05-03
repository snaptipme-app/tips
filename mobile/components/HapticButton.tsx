/**
 * HapticButton — A TouchableOpacity with:
 *  1. Light haptic feedback on press (expo-haptics)
 *  2. Subtle press-scale animation (0.97)
 *
 * Drop-in replacement for TouchableOpacity on primary actions.
 * Falls back gracefully if haptics unavailable (e.g. web/simulator).
 */
import { useRef, useCallback } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

interface HapticButtonProps extends TouchableOpacityProps {
  /** Scale value when pressed (default 0.97 — barely visible, premium feel) */
  pressScale?: number;
  /** Haptic feedback style */
  hapticStyle?: Haptics.ImpactFeedbackStyle;
}

export default function HapticButton({
  children,
  onPress,
  onPressIn,
  onPressOut,
  pressScale = 0.97,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  style,
  ...rest
}: HapticButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      Animated.spring(scale, {
        toValue: pressScale,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
      onPressIn?.(e);
    },
    [pressScale, onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 6,
      }).start();
      onPressOut?.(e);
    },
    [onPressOut, scale]
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      try { Haptics.impactAsync(hapticStyle); } catch {}
      onPress?.(e);
    },
    [hapticStyle, onPress]
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      {...rest}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style as any, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
