import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/AuthContext';
import Logo from '../../components/Logo';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import { playTipSound } from '../../lib/tipSound';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

interface Tip {
  id: number;
  amount: number;
  created_at: string;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [tipCount, setTipCount] = useState(0);
  const [recentTips, setRecentTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const prevBalanceRef = useRef<number | null>(null);

  const cur = user?.currency || 'MAD';
  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();
  const photoSrc =
    user?.photo_base64 ||
    (user?.profile_image_url && user.profile_image_url.startsWith('/')
      ? `https://snaptip.me${user.profile_image_url}`
      : user?.profile_image_url) ||
    '';

  // Business owners go to manager dashboard
  useEffect(() => {
    if (user?.account_type === 'business') {
      router.replace('/business/dashboard');
    }
  }, [user?.account_type]);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      const b = data.employee?.balance ?? data.balance ?? 0;

      if (prevBalanceRef.current !== null && b > prevBalanceRef.current) {
        const diff = b - prevBalanceRef.current;
        playTipSound();
        showToast(`+${diff.toFixed(2)} ${cur} tip received!`, 'success');
      }
      prevBalanceRef.current = b;

      setBalance(b);
      setTotalEarned(data.total_tips ?? 0);
      setTipCount(data.tip_count ?? 0);
      setRecentTips((data.recent_tips || data.tips || []).slice(0, 4));
    } catch {
      // Silently handle — new users just see empty state, no error toast
    } finally {
      setLoading(false);
    }
  }, [cur, showToast]);

  useFocusEffect(useCallback(() => {
    fetchData();
  }, [fetchData]));

  // 30-second polling for real-time balance updates
  useEffect(() => {
    if (user?.account_type === 'business') return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/dashboard');
        const d = res.data;
        const b = d.employee?.balance ?? d.balance ?? 0;
        if (prevBalanceRef.current !== null && b > prevBalanceRef.current) {
          const diff = b - prevBalanceRef.current;
          playTipSound();
          showToast(`+${diff.toFixed(2)} ${cur} tip received!`, 'success');
        }
        prevBalanceRef.current = b;
        setBalance(b);
        setTotalEarned(d.total_tips ?? 0);
        setTipCount(d.tip_count ?? 0);
        setRecentTips((d.recent_tips || d.tips || []).slice(0, 4));
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.account_type, cur, showToast]);

  if (user?.account_type === 'business') return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Logo size="small" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>SnapTip</Text>
              <View style={{ backgroundColor: 'rgba(108,108,255,0.12)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: ACCENT }}>Member</Text>
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 }}>
              {user?.full_name || 'Welcome'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.15)' }}>
              {photoSrc ? (
                <Image source={{ uri: photoSrc }} style={{ width: 44, height: 44 }} />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '700', color: ACCENT }}>{initials}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Available Balance Card ── */}
        <LinearGradient
          colors={['#0a2a20', '#0d3328', '#0a2a20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="wallet" size={18} color={GREEN} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', flex: 1 }}>Available Balance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
              <Text style={{ fontSize: 10, color: GREEN, fontWeight: '600' }}>Live</Text>
            </View>
          </View>

          <Text style={{ fontSize: 42, fontWeight: '800', color: GREEN, marginBottom: 16, letterSpacing: -1 }}>
            {balance.toFixed(2)} {cur}
          </Text>

          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              Total Earned: <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>{totalEarned.toFixed(2)} {cur}</Text>
            </Text>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              Tips: <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>{tipCount}</Text>
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.push('/member/withdraw')}
              activeOpacity={0.85}
              style={{ flex: 1, height: 52, borderRadius: 50, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
            >
              <Ionicons name="arrow-up-circle" size={20} color="#080818" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#080818' }}>Cash Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/member/qr')}
              activeOpacity={0.85}
              style={{ flex: 1, height: 52, borderRadius: 50, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#00C896', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
            >
              <Ionicons name="qr-code-outline" size={20} color="#00C896" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#00C896' }}>My QR</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Recent Tips ── */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Recent Tips</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tips')} activeOpacity={0.8}>
              <Text style={{ fontSize: 13, color: ACCENT, fontWeight: '600' }}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
          ) : recentTips.length === 0 ? (
            <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center' }}>
              <Ionicons name="wallet-outline" size={36} color="rgba(255,255,255,0.12)" />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
                No tips yet. Share your QR to start receiving tips!
              </Text>
            </View>
          ) : (
            recentTips.map((tip) => (
              <View
                key={tip.id}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="arrow-down-outline" size={18} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Tip received</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{formatDate(tip.created_at)}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: GREEN }}>+{Number(tip.amount).toFixed(2)} {cur}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Quick Actions ── */}
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12 }}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push('/member/qr')}
            activeOpacity={0.8}
            style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="qr-code-outline" size={22} color={ACCENT} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>My QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/member/withdraw')}
            activeOpacity={0.8}
            style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="cash-outline" size={22} color={GREEN} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Withdraw</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
