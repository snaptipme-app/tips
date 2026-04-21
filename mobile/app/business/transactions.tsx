import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

type Filter = 'today' | 'week' | 'month' | 'all';

interface Transaction {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  employee_name: string;
  employee_username: string;
  photo_url?: string;
  photo_base64?: string;
  profile_image_url?: string;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

function filterTransactions(transactions: Transaction[], filter: Filter): Transaction[] {
  const now = new Date();
  return transactions.filter((tx) => {
    const date = new Date(tx.created_at);
    if (filter === 'today') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }
    if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }
    if (filter === 'month') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }
    return true; // all
  });
}

export default function Transactions() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast, showToast } = useToast();
  const [allTx, setAllTx] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data } = await api.get('/business/transactions');
      setAllTx(data.transactions || []);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to load transactions.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const transactions = filterTransactions(allTx, filter);

  const total = transactions.reduce((acc, tx) => acc + Number(tx.amount), 0);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderTx = ({ item }: { item: Transaction }) => {
    const initials = (item.employee_name || 'U').charAt(0).toUpperCase();
    const photoSrc = item.photo_base64 || item.profile_image_url || item.photo_url || '';
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: CARD,
          borderRadius: 16,
          padding: 14,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: BORDER,
        }}
      >
        {/* Avatar */}
        <View style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1.5, borderColor: 'rgba(108,108,255,0.25)' }}>
          {photoSrc ? (
            <Image source={{ uri: photoSrc }} style={{ width: 42, height: 42 }} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: ACCENT }}>{initials}</Text>
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{item.employee_name}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            @{item.employee_username} · {formatDate(item.created_at)}
          </Text>
        </View>

        {/* Amount */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: GREEN }}>+{Number(item.amount).toFixed(2)} {user?.currency || 'MAD'}</Text>
          <View style={{ marginTop: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.1)' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: GREEN, textTransform: 'capitalize' }}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Transactions</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>All team payment history</Text>
          </View>
        </View>

        {/* Summary card */}
        {!loading && (
          <View style={{ backgroundColor: 'rgba(0,200,150,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="trending-up" size={22} color={GREEN} />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Period Total</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: GREEN }}>{total.toFixed(2)} {user?.currency || 'MAD'}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{transactions.length} transactions</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Filter Pills */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 50,
              backgroundColor: filter === f.key ? ACCENT : 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: filter === f.key ? ACCENT : 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.key ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTx}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,108,255,0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
                <Ionicons name="receipt-outline" size={36} color="rgba(255,255,255,0.12)" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.3)' }}>No transactions yet</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 8, textAlign: 'center', paddingHorizontal: 48 }}>
                Transactions will appear here once your team starts receiving tips.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTransactions(); }}
              tintColor={ACCENT}
            />
          }
        />
      )}

      <Toast {...toast} />
    </View>
  );
}
