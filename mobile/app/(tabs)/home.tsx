import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Share, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [tipCount, setTipCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const tipUrl = `https://snaptip.me/${user?.username}`;
  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();

  const photoSrc =
    user?.photo_base64 ||
    (user?.profile_image_url && user.profile_image_url.startsWith('/')
      ? `https://snaptip.me${user.profile_image_url}`
      : user?.profile_image_url) ||
    '';

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      setBalance(data.employee?.balance ?? data.balance ?? 0);
      setTotalTips(data.total_tips ?? 0);
      setTipCount(data.tip_count ?? 0);
    } catch (err: any) {
      if (err.response?.status !== 401) showToast('Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(tipUrl);
    showToast('Link copied!', 'success');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Tip me on SnapTip! ${tipUrl}` });
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flash" size={22} color={ACCENT} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>SnapTip</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@{user?.username}</Text>
            <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.15)' }}>
              {photoSrc ? (
                <Image source={{ uri: photoSrc }} style={{ width: 40, height: 40 }} />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: ACCENT }}>{initials}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Balance Card ── */}
        <LinearGradient
          colors={['#12123a', '#1a1a4e', '#12123a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(108,108,255,0.15)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="wallet" size={18} color={GREEN} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Available Balance</Text>
          </View>
          <Text style={{ fontSize: 40, fontWeight: '800', color: GREEN, marginBottom: 16, letterSpacing: -1 }}>${balance.toFixed(2)}</Text>

          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Total Earned</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>${totalTips.toFixed(2)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View>
              <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Tips Received</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{tipCount}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── QR Code Section ── */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
            <Ionicons name="qr-code-outline" size={16} color={ACCENT} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Your tip link is ready</Text>
          </View>

          <View style={{
            alignItems: 'center',
            borderRadius: 20,
            padding: 24,
            backgroundColor: CARD,
            borderWidth: 1,
            borderColor: 'rgba(108,108,255,0.2)',
            shadowColor: ACCENT,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8,
          }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16 }}>
              <QRCode value={tipUrl} size={180} color="#000" backgroundColor="#fff" />
            </View>
          </View>
        </View>

        {/* ── URL Pill ── */}
        <View style={{ borderRadius: 50, padding: 14, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>snaptip.me/{user?.username}</Text>
        </View>

        {/* ── Copy / Share ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ flex: 1, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: CARD, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <Ionicons name="copy-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Copy Link</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.8} style={{ flex: 1, height: 48, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Share QR</Text>
          </TouchableOpacity>
        </View>

        {/* ── Business Team Card ── */}
        {user?.account_type === 'business' && (
          <LinearGradient
            colors={['rgba(108,108,255,0.12)', 'rgba(108,108,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(108,108,255,0.25)', overflow: 'hidden' }}
          >
            <TouchableOpacity onPress={() => router.push('/business/team')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="people" size={22} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Manage Your Team</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Add members, send invites</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </LinearGradient>
        )}
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
