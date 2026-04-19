import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

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
      setBusinessName(bizRes.data.business?.business_name || 'My Business');
    } catch (e: any) {
      if (e.response?.status === 403 || e.response?.status === 404) {
        Alert.alert('No Business', 'Create a business first.', [
          { text: 'OK', onPress: () => router.replace('/business/setup') },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemove = (member: Member) => {
    Alert.alert('Remove Member', `Remove ${member.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/business/members/${member.employee_id}`);
            setMembers((prev) => prev.filter((m) => m.employee_id !== member.employee_id));
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed.');
          }
        },
      },
    ]);
  };

  const renderMember = ({ item }: { item: Member }) => {
    const initials = (item.full_name || 'U').charAt(0).toUpperCase();
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(108,108,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: ACCENT }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{item.full_name}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>@{item.username} · ${item.total_tips.toFixed(2)} earned</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN, marginRight: 12 }}>${item.balance.toFixed(2)}</Text>
        <TouchableOpacity onPress={() => handleRemove(item)}>
          <Ionicons name="close-circle-outline" size={22} color={RED} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: 56 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{businessName}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{members.length} team member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/business/invite')} style={{ backgroundColor: ACCENT, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
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
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.15)" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>No team members yet</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Tap "Invite" to add members</Text>
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={ACCENT} />}
      />
    </View>
  );
}
