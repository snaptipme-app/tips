/**
 * SkeletonLoader — Shimmer skeleton placeholders (Notion/Linear aesthetic).
 *
 * Matches the app's dark theme (#1a1a1a background).
 * Usage:
 *   <SkeletonLoader.Card />      — full-width content card placeholder
 *   <SkeletonLoader.Line />      — single text-line placeholder
 *   <SkeletonLoader.Circle />    — avatar placeholder
 *   <SkeletonLoader.Dashboard /> — full dashboard skeleton (balance + tips)
 */
import { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';

const SHIMMER_DURATION = 1200;

// Pulse between two opacity levels for a subtle breathing shimmer
function useShimmer() {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: SHIMMER_DURATION, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: SHIMMER_DURATION, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

function ShimmerBlock({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[
        { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, opacity },
        style,
      ]}
    />
  );
}

// ── Individual primitives ──

function Line({ width = '100%', height = 12, style }: { width?: string | number; height?: number; style?: ViewStyle }) {
  return <ShimmerBlock style={[{ width: width as any, height, borderRadius: 6, marginBottom: 8 }, style]} />;
}

function Circle({ size = 44, style }: { size?: number; style?: ViewStyle }) {
  return <ShimmerBlock style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
}

function Card({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.04)',
      gap: 12,
    }, style]}>
      <Line width="40%" height={10} />
      <Line width="70%" height={28} />
      <Line width="55%" height={10} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <ShimmerBlock style={{ flex: 1, height: 46, borderRadius: 50 }} />
        <ShimmerBlock style={{ flex: 1, height: 46, borderRadius: 50 }} />
      </View>
    </View>
  );
}

// ── Dashboard skeleton (balance card + tip rows) ──

function Dashboard() {
  return (
    <View style={{ gap: 20 }}>
      {/* Balance Card */}
      <Card />

      {/* Section label */}
      <Line width="30%" height={10} style={{ marginBottom: 0 }} />

      {/* Tip rows */}
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <ShimmerBlock style={{ width: 38, height: 38, borderRadius: 10 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Line width="60%" height={12} style={{ marginBottom: 0 }} />
            <Line width="40%" height={8} style={{ marginBottom: 0 }} />
          </View>
          <ShimmerBlock style={{ width: 70, height: 16, borderRadius: 6 }} />
        </View>
      ))}

      {/* Quick actions */}
      <Line width="30%" height={10} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <ShimmerBlock style={{ flex: 1, height: 90, borderRadius: 16 }} />
        <ShimmerBlock style={{ flex: 1, height: 90, borderRadius: 16 }} />
      </View>
    </View>
  );
}

// ── Business dashboard skeleton ──

function BusinessDashboard() {
  return (
    <View style={{ gap: 16 }}>
      {/* Greeting */}
      <Line width="45%" height={22} />
      <Line width="60%" height={10} />

      {/* Stats grid */}
      <View style={{ gap: 10, marginTop: 8 }}>
        <ShimmerBlock style={{ height: 100, borderRadius: 16 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ShimmerBlock style={{ flex: 1, height: 100, borderRadius: 16 }} />
          <ShimmerBlock style={{ flex: 1, height: 100, borderRadius: 16 }} />
        </View>
      </View>

      {/* Chart */}
      <Line width="25%" height={10} style={{ marginTop: 8 }} />
      <ShimmerBlock style={{ height: 140, borderRadius: 16 }} />

      {/* List */}
      <Line width="30%" height={10} style={{ marginTop: 8 }} />
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            padding: 14,
          }}
        >
          <Circle size={40} />
          <View style={{ flex: 1, gap: 6 }}>
            <Line width="50%" height={12} style={{ marginBottom: 0 }} />
            <Line width="30%" height={8} style={{ marginBottom: 0 }} />
          </View>
          <ShimmerBlock style={{ width: 60, height: 24, borderRadius: 8 }} />
        </View>
      ))}
    </View>
  );
}

// ── Team list skeleton ──

function TeamList() {
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: 18, padding: 16,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <Circle size={48} />
          <View style={{ flex: 1, gap: 6 }}>
            <Line width="55%" height={13} style={{ marginBottom: 0 }} />
            <Line width="35%" height={10} style={{ marginBottom: 0 }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <ShimmerBlock style={{ width: 60, height: 14, borderRadius: 6 }} />
            <ShimmerBlock style={{ width: 42, height: 18, borderRadius: 50 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const SkeletonLoader = {
  Line,
  Circle,
  Card,
  Dashboard,
  BusinessDashboard,
  TeamList,
  ShimmerBlock,
};

export default SkeletonLoader;
