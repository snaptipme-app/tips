import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

export default function InviteMember() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleInvite = async () => {
    if (!email.includes('@')) return Alert.alert('Error', 'Enter a valid email.');
    setLoading(true);
    try {
      await api.post('/business/invite', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to send invitation.');
    } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,200,150,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="checkmark-circle" size={44} color={GREEN} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 }}>Invitation Sent!</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 }}>
          An email with the invite link has been sent to {email.trim().toLowerCase()}.
        </Text>
        <TouchableOpacity onPress={() => { setEmail(''); setSent(false); }} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: ACCENT, fontWeight: '600' }}>Send Another Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>← Back to Team</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Invite Member</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Send an email invitation to join your team</Text>

      <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Employee Email</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: BORDER }}>
          <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
            placeholder="employee@email.com"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity onPress={handleInvite} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, opacity: loading ? 0.5 : 1 }}>
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Sending...' : 'Send Invitation'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
