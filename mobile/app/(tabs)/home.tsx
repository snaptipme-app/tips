import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const ACCENT = '#6c6cff';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [loading, setLoading] = useState(true);

  const tipUrl = `https://snaptip.me/${user?.username}`;
  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      setBalance(data.balance ?? 0);
      setTotalTips(data.total_tips ?? 0);
    } catch (err: any) {
      if (err.response?.status !== 401) showToast('Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(tipUrl);
    showToast('Link copied! 📋', 'success');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Tip me on SnapTip! ${tipUrl}`, url: tipUrl });
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flash" size={22} color={ACCENT} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>SnapTip</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@{user?.username}</Text>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>{initials}</Text>
            </View>
          </View>
        </View>

        {/* Balance Card */}
        <View style={{ borderRadius: 18, padding: 20, marginBottom: 20, backgroundColor: '#12123a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Available Balance</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 12 }}>${balance.toFixed(2)}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>Total Earnings</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>${totalTips.toFixed(2)}</Text>
        </View>

        {/* QR Code */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ borderRadius: 18, padding: 20, backgroundColor: CARD, borderWidth: 2, borderColor: 'rgba(108,108,255,0.4)', alignItems: 'center', width: '85%' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16 }}>
              <QRCode value={tipUrl} size={180} color="#000" backgroundColor="#fff" />
            </View>
          </View>
        </View>

        {/* URL pill */}
        <View style={{ borderRadius: 50, padding: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>snaptip.me/{user?.username}</Text>
        </View>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ flex: 1, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <Ionicons name="copy-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Copy Link</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.8} style={{ flex: 1, height: 48, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Share QR</Text>
          </TouchableOpacity>
        </View>

        {/* Business Team Card */}
        {user?.account_type === 'business' && (
          <TouchableOpacity onPress={() => router.push('/business/team')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(108,108,255,0.1)', borderWidth: 1, borderColor: 'rgba(108,108,255,0.3)', padding: 16, gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="people" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Manage Your Team</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Add members, send invites</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
