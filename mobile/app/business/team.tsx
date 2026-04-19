import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const RED = '#ef4444';

interface Member {
  member_id: number;
  employee_id: number;
  username: string;
  full_name: string;
  balance: number;
  total_tips: number;
  role: string;
}

export default function TeamManagement() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, bizRes] = await Promise.all([
        api.get('/business/members'),
        api.get('/business/me'),
      ]);
      setMembers(membersRes.data.members || []);
      setBusinessName(bizRes.data.business?.business_name || 'My Team');
    } catch (e: any) {
      if (e.response?.status === 403 || e.response?.status === 404) {
        showToast('Create a business first.', 'info');
        router.replace('/business/setup');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemove = (member: Member) => {
    Alert.alert('Remove Member', `Remove ${member.full_name} from the team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/business/members/${member.employee_id}`);
            setMembers((prev) => prev.filter((m) => m.employee_id !== member.employee_id));
            showToast(`${member.full_name} removed.`, 'success');
          } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to remove.', 'error');
          }
        },
      },
    ]);
  };

  const renderMember = ({ item }: { item: Member }) => {
    const initials = (item.full_name || 'U').charAt(0).toUpperCase();
    return (
      <TouchableOpacity onLongPress={() => handleRemove(item)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: ACCENT }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{item.full_name}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>@{item.username} · ${item.total_tips.toFixed(2)} total</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: GREEN }}>${item.balance.toFixed(2)}</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>balance</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: 56 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{businessName}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} · Long-press to remove
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/business/invite')} activeOpacity={0.8} style={{ backgroundColor: ACCENT, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Invite</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => String(item.member_id)}
        renderItem={renderMember}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,108,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.15)" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.3)' }}>No team members yet</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>Invite your first employee to start managing your team!</Text>
              <TouchableOpacity onPress={() => router.push('/business/invite')} activeOpacity={0.8} style={{ marginTop: 20, backgroundColor: ACCENT, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mail-outline" size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Send First Invite</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={ACCENT} />}
      />
      <Toast {...toast} />
    </View>
  );
}
