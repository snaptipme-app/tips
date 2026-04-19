import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const GREEN = '#00C896';

interface Tip {
  id: number;
  amount: number;
  status: string;
  created_at: string;
}

export default function Tips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast, showToast } = useToast();

  const fetchTips = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      setTips(data.tips || []);
    } catch {
      showToast('Failed to load tips.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTips(); }, [fetchTips]);

  const onRefresh = () => { setRefreshing(true); fetchTips(); };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderTip = ({ item }: { item: Tip }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name="cash-outline" size={20} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Tip Received</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: GREEN }}>+${item.amount.toFixed(2)}</Text>
    </View>
  );

  const EmptyState = () => (
    <View style={{ alignItems: 'center', paddingTop: 80 }}>
      <Ionicons name="wallet-outline" size={48} color="rgba(255,255,255,0.15)" />
      <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>No tips yet</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Share your QR code to start receiving tips!</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: 56 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', paddingHorizontal: 16, marginBottom: 16 }}>Tip Transactions</Text>
      <FlatList
        data={tips}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTip}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 }}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c6cff" />}
      />
      <Toast {...toast} />
    </View>
  );
}
