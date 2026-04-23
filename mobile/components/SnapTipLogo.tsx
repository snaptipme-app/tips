import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const SIZES = {
  small: 44,
  medium: 56,
  large: 80,
} as const;

interface SnapTipLogoProps {
  size?: 'small' | 'medium' | 'large';
}

export default function SnapTipLogo({ size = 'medium' }: SnapTipLogoProps) {
  const dim = SIZES[size];
  const borderRadius = size === 'small' ? 10 : size === 'medium' ? 12 : 18;
  const padding = size === 'small' ? 8 : size === 'medium' ? 10 : 14;
  const svgSize = dim - padding * 2;

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius,
        backgroundColor: '#080818',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 1024 1024"
        fill="none"
      >
        <Path
          d="M620 200 L340 580 H540 L440 840 L720 460 H520 L620 200 Z"
          fill="#00FF66"
          stroke="#00FF66"
          strokeWidth="16"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

