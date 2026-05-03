import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView } from 'react-native';
import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Applied to the outer KeyboardAvoidingView (e.g. background color). flex:1 is always set. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the inner ScrollView's contentContainerStyle. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra offset for screens behind a native navigation header. Default: 0. */
  keyboardVerticalOffset?: number;
  /** Passed directly to the ScrollView for pull-to-refresh. */
  refreshControl?: ReactElement<React.ComponentProps<typeof RefreshControl>>;
};

/**
 * Drop-in replacement for the KeyboardAvoidingView + ScrollView pattern used
 * across form screens. Handles platform differences so call sites don't have to.
 *
 * Android note: app.json sets softwareKeyboardLayoutMode="pan" so the OS does NOT
 * resize the window. KeyboardAvoidingView behavior="height" takes full ownership of
 * the adjustment, and automaticallyAdjustKeyboardInsets scrolls the focused input
 * into view — exactly mirroring the iOS flow.
 *
 *   - iOS:     behavior="padding", automaticallyAdjustKeyboardInsets scrolls to focused input
 *   - Android: behavior="height",  automaticallyAdjustKeyboardInsets scrolls to focused input
 *   - Modal:   isModal=true keeps the same behaviors (both platforms already correct)
 */
export default function KeyboardAwareWrapper({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  refreshControl,
}: Props) {
  const behavior = Platform.OS === 'ios' ? 'padding' : 'height';

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={[{ flex: 1 }, style]}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
