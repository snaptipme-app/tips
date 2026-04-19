import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const RED = '#ef4444';

export default function JoinBusiness() {
  const { token: inviteToken } = useLocalSearchParams<{ token: string }>();
  const { token: authToken } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authToken) {
      showToast('Please log in or create an account first.', 'info');
      setTimeout(() => router.replace(`/login`), 800);
    }
  }, [authToken]);

  // Fetch invitation info on mount
  useEffect(() => {
    if (!authToken) return;
    (async () => {
      try {
        const { data } = await api.get(`/business/invite-info/${inviteToken}`);
        setBusinessName(data.business_name);
        setBusinessType(data.business_type);
      } catch (e: any) {
        const msg = e.response?.data?.error || 'Invalid invitation link.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteToken, authToken]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const { data } = await api.post(`/business/join/${inviteToken}`);
      setJoined(true);
      setBusinessName(data.business_name || businessName);
      showToast('Welcome to the team! 🎉', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to join.', 'error');
    } finally { setJoining(false); }
  };

  // Not authenticated — show nothing (redirect is happening)
  if (!authToken) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14 }}>Redirecting to login...</Text>
        <Toast {...toast} />
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14 }}>Loading invitation...</Text>
      </View>
    );
  }

  // Error (expired / invalid)
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(239,68,68,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: RED }}>
          <Ionicons name="alert-circle" size={44} color={RED} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Invitation Error</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 28, lineHeight: 20, paddingHorizontal: 20 }}>{error}</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.8} style={{ height: 48, paddingHorizontal: 32, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Go to Dashboard</Text>
        </TouchableOpacity>
        <Toast {...toast} />
      </View>
    );
  }

  // Success
  if (joined) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: GREEN }}>
          <Ionicons name="checkmark-circle" size={48} color={GREEN} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 }}>You're in! 🎉</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 4 }}>You've successfully joined</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: ACCENT, marginBottom: 28 }}>{businessName}</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.8} style={{ height: 52, paddingHorizontal: 40, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Go to Dashboard</Text>
        </TouchableOpacity>
        <Toast {...toast} />
      </View>
    );
  }

  // Join Preview
  const typeEmoji = businessType === 'Restaurant' ? '🍽️' : businessType === 'Hotel' ? '🏨' : businessType === 'Transport' ? '🚗' : '🏢';

  return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      {/* Business Card */}
      <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center', width: '100%', marginBottom: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: ACCENT }}>
          <Text style={{ fontSize: 36 }}>{typeEmoji}</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, textAlign: 'center' }}>{businessName}</Text>
        {businessType ? <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{businessType}</Text> : null}
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
          has invited you to join their team on SnapTip and start receiving digital tips.
        </Text>
      </View>

      {/* Join Button */}
      <TouchableOpacity onPress={handleJoin} disabled={joining} activeOpacity={0.8} style={{
        height: 52, width: '100%', borderRadius: 50, backgroundColor: GREEN,
        justifyContent: 'center', alignItems: 'center', opacity: joining ? 0.5 : 1,
        flexDirection: 'row', gap: 8, marginBottom: 14,
      }}>
        {joining ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{joining ? 'Joining...' : `Join ${businessName}`}</Text>
      </TouchableOpacity>

      {/* Decline */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Decline</Text>
      </TouchableOpacity>

      <Toast {...toast} />
    </View>
  );
}
