import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

interface Invite {
  email: string;
  sentAt: string;
}

export default function InviteMember() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<Invite[]>([]);

  const handleInvite = async () => {
    if (!email.includes('@')) { showToast('Enter a valid email address.', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/business/invite', { email: email.trim().toLowerCase() });
      setSent((p) => [{ email: email.trim().toLowerCase(), sentAt: new Date().toISOString() }, ...p]);
      showToast(`Invitation sent to ${email.trim()} 📨`, 'success');
      setEmail('');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to send invitation.', 'error');
    } finally { setLoading(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Invite Team Member</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Send an email invitation to join your business</Text>

        {/* Invite Card */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: BORDER, marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Employee Email</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 56, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: BORDER }}>
            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={{ flex: 1, color: '#fff', fontSize: 16, marginLeft: 10 }}
              placeholder="employee@email.com"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
          </View>

          <TouchableOpacity onPress={handleInvite} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send-outline" size={16} color="#fff" />}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Sending...' : 'Send Invitation 📨'}</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Invitations */}
        {sent.length > 0 && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>Pending Invitations</Text>
            {sent.map((inv, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.3)" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#fff' }}>{inv.email}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{formatDate(inv.sentAt)}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: 'rgba(245,158,11,0.12)' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>Pending</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
