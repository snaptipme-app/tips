import Svg, { Rect, Path } from 'react-native-svg';

interface SnapTipLogoProps {
  size?: number;
}

export default function SnapTipLogo({ size = 44 }: SnapTipLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Rect width="1024" height="1024" rx="225" fill="#080818" />
      <Path
        d="M620 200 L340 580 H540 L440 840 L720 460 H520 L620 200 Z"
        fill="#00FF66"
        stroke="#00FF66"
        strokeWidth="15"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
