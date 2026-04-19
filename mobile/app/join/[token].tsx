import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

export default function JoinBusiness() {
  const { token: inviteToken } = useLocalSearchParams<{ token: string }>();
  const { token: authToken } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    if (!authToken) {
      showToast('Please log in first.', 'info');
      setTimeout(() => router.replace('/login'), 800);
      return;
    }
    setLoading(true);
    try {
      await api.post(`/business/join/${inviteToken}`);
      setJoined(true);
      showToast('Welcome to the team! 🎉', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to join.', 'error');
    } finally { setLoading(false); }
  };

  if (joined) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: GREEN }}>
          <Ionicons name="checkmark-circle" size={48} color={GREEN} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 }}>You're in! 🎉</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>You've successfully joined the team. Start receiving tips now!</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.8} style={{ height: 52, paddingHorizontal: 40, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Go to Dashboard</Text>
        </TouchableOpacity>
        <Toast {...toast} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: ACCENT }}>
        <Ionicons name="people" size={40} color={ACCENT} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Team Invitation</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 32, lineHeight: 20, paddingHorizontal: 20 }}>You've been invited to join a business on SnapTip. Accept to start receiving tips!</Text>

      <TouchableOpacity onPress={handleJoin} disabled={loading} activeOpacity={0.8} style={{ height: 52, paddingHorizontal: 40, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Joining...' : 'Join Team'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Decline</Text>
      </TouchableOpacity>

      <Toast {...toast} />
    </View>
  );
}
