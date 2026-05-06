import { memo } from 'react';
import RNCountryFlag from 'react-native-country-flag';
import { StyleProp, View, ViewStyle } from 'react-native';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "MA" */
  code: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Thin wrapper around react-native-country-flag.
 * Accepts the same `code`, `width`, `height`, `style` props used throughout
 * the app so call-sites don't need to change.
 *
 * `react-native-country-flag` renders high-quality emoji-based flags
 * via a Text element — zero native dependencies, works with Metro out of the box.
 */
export const CountryFlag = memo(function CountryFlag({
  code,
  height = 22,
  style,
}: CountryFlagProps) {
  // Convert height to an approximate font size (the lib uses `size` as fontSize)
  const size = Math.round(height * 1.4);

  return (
    <View style={[{ overflow: 'hidden', borderRadius: 4 }, style]}>
      <RNCountryFlag isoCode={code} size={size} />
    </View>
  );
});
