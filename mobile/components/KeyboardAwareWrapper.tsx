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
  /**
   * Set to true when this wrapper is rendered inside a <Modal>.
   * Android: uses behavior="height" because windowSoftInputMode=adjustResize
   * has no effect inside Modal windows.
   */
  isModal?: boolean;
  /** Passed directly to the ScrollView for pull-to-refresh. */
  refreshControl?: ReactElement<React.ComponentProps<typeof RefreshControl>>;
};

/**
 * Drop-in replacement for the KeyboardAvoidingView + ScrollView pattern used
 * across form screens. Handles platform differences so call sites don't have to:
 *   - iOS:              behavior="padding" + automaticallyAdjustKeyboardInsets
 *   - Android screens:  behavior=undefined  (OS adjustResize handles it)
 *   - Android modals:   behavior="height"   (adjustResize doesn't apply in Modals)
 */
export default function KeyboardAwareWrapper({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  isModal = false,
  refreshControl,
}: Props) {
  const behavior = Platform.OS === 'ios' ? 'padding' : isModal ? 'height' : undefined;

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={[{ flex: 1 }, style]}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
