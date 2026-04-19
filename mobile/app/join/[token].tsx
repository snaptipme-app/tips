import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';

const BG = '#080818';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

export default function JoinBusiness() {
  const { token: inviteToken } = useLocalSearchParams<{ token: string }>();
  const { token: authToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!authToken) {
      Alert.alert('Login Required', 'Please log in first to accept this invitation.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }
    setLoading(true);
    try {
      await api.post(`/business/join/${inviteToken}`);
      setJoined(true);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to join.');
    } finally { setLoading(false); }
  };

  if (joined) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,200,150,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="checkmark-circle" size={44} color={GREEN} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 }}>You're in! 🎉</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 }}>You've successfully joined the team.</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={{ height: 48, paddingHorizontal: 32, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,108,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
        <Ionicons name="people" size={36} color={ACCENT} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Team Invitation</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 }}>You've been invited to join a business on SnapTip.</Text>

      {error ? (
        <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, marginBottom: 16, width: '100%' }}>
          <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity onPress={handleJoin} disabled={loading} activeOpacity={0.8} style={{ height: 52, paddingHorizontal: 40, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Joining...' : 'Accept Invitation'}</Text>
      </TouchableOpacity>
    </View>
  );
}
