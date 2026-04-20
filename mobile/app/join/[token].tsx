import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
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
  const params = useLocalSearchParams();
  const inviteToken = params.token as string;
  const { token: authToken, user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');

  console.log('[join] params:', JSON.stringify(params));
  console.log('[join] inviteToken:', inviteToken);
  console.log('[join] authToken exists:', !!authToken);

  // Fetch invitation info on mount (public endpoint — no auth needed)
  useEffect(() => {
    if (!inviteToken) {
      console.error('[join] No invite token found in route params');
      setError('Invalid invitation link — no token found.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        console.log('[join] Fetching invite-info for token:', inviteToken);
        const { data } = await api.get(`/business/invite-info/${inviteToken}`);
        console.log('[join] invite-info response:', JSON.stringify(data));
        setBusinessName(data.business_name || 'Unknown Business');
        setBusinessType(data.business_type || '');
      } catch (e: any) {
        console.error('[join] invite-info error:', e.response?.status, e.response?.data || e.message);
        const msg = e.response?.data?.error || 'Invalid invitation link.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteToken]);

  // Handle join
  const handleJoin = async () => {
    if (!authToken) {
      showToast('Please log in or create an account first.', 'info');
      setTimeout(() => router.push('/login'), 500);
      return;
    }

    setJoining(true);
    try {
      console.log('[join] Joining with token:', inviteToken);
      const { data } = await api.post(`/business/join/${inviteToken}`);
      console.log('[join] join response:', JSON.stringify(data));
      setJoined(true);
      setBusinessName(data.business_name || businessName);
      showToast('Welcome to the team!', 'success');
    } catch (e: any) {
      console.error('[join] join error:', e.response?.status, e.response?.data || e.message);
      showToast(e.response?.data?.error || 'Failed to join.', 'error');
    } finally { setJoining(false); }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 14 }}>Loading invitation...</Text>
      </SafeAreaView>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(239,68,68,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: RED }}>
          <Ionicons name="alert-circle" size={44} color={RED} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Invitation Error</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 28, lineHeight: 20, paddingHorizontal: 20 }}>{error}</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.8} style={{ height: 48, paddingHorizontal: 32, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Go to Dashboard</Text>
        </TouchableOpacity>
        <Toast {...toast} />
      </SafeAreaView>
    );
  }

  // ── Success State ──
  if (joined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: GREEN }}>
          <Ionicons name="checkmark-circle" size={48} color={GREEN} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 }}>You're in!</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 4 }}>You've successfully joined</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: ACCENT, marginBottom: 28 }}>{businessName}</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.8} style={{ height: 52, paddingHorizontal: 40, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Go to Dashboard</Text>
        </TouchableOpacity>
        <Toast {...toast} />
      </SafeAreaView>
    );
  }

  // ── Join Preview ──
  const typeIconMap: Record<string, string> = { Restaurant: 'restaurant-outline', Hotel: 'bed-outline', Transport: 'car-outline' };
  const typeIcon = (typeIconMap[businessType] || 'business-outline') as any;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      {/* Business Preview Card */}
      <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center', width: '100%', marginBottom: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: ACCENT }}>
          <Ionicons name={typeIcon} size={36} color={ACCENT} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, textAlign: 'center' }}>{businessName}</Text>
        {businessType ? <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{businessType}</Text> : null}
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
          has invited you to join their team on SnapTip and start receiving digital tips.
        </Text>
      </View>

      {/* Not logged in — show login/register options */}
      {!authToken ? (
        <View style={{ width: '100%', gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.8} style={{
            height: 52, width: '100%', borderRadius: 50, backgroundColor: GREEN,
            justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8,
          }}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Log in to Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')} activeOpacity={0.8} style={{
            height: 52, width: '100%', borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
            justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8,
          }}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Create Account</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 8 }}>
            You need a SnapTip account to join the team
          </Text>
        </View>
      ) : (
        /* Logged in — show join button */
        <>
          {user?.full_name && (
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
              Joining as <Text style={{ color: '#fff', fontWeight: '600' }}>{user.full_name}</Text>
            </Text>
          )}
          <TouchableOpacity onPress={handleJoin} disabled={joining} activeOpacity={0.8} style={{
            height: 52, width: '100%', borderRadius: 50, backgroundColor: GREEN,
            justifyContent: 'center', alignItems: 'center', opacity: joining ? 0.5 : 1,
            flexDirection: 'row', gap: 8, marginBottom: 14,
          }}>
            {joining ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{joining ? 'Joining...' : `Join ${businessName}`}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Decline</Text>
          </TouchableOpacity>
        </>
      )}

      <Toast {...toast} />
    </SafeAreaView>
  );
}
