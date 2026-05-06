import { memo } from 'react';
import { SvgXml } from 'react-native-svg';
import { StyleProp, ViewStyle } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports */
const FLAG_STRINGS: Record<string, string> = {
  MA: require('country-flag-icons/string/3x2/MA'),
  AE: require('country-flag-icons/string/3x2/AE'),
  US: require('country-flag-icons/string/3x2/US'),
  FR: require('country-flag-icons/string/3x2/FR'),
  ES: require('country-flag-icons/string/3x2/ES'),
  DE: require('country-flag-icons/string/3x2/DE'),
  IT: require('country-flag-icons/string/3x2/IT'),
  PH: require('country-flag-icons/string/3x2/PH'),
  ID: require('country-flag-icons/string/3x2/ID'),
  TH: require('country-flag-icons/string/3x2/TH'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

interface CountryFlagProps {
  code: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const CountryFlag = memo(function CountryFlag({ code, width = 32, height = 22, style }: CountryFlagProps) {
  const xml = FLAG_STRINGS[code];
  if (!xml) return null;
  return <SvgXml xml={xml} width={width} height={height} style={style} />;
});
