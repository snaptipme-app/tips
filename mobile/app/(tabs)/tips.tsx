import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

interface Tip {
  id: number;
  amount: number;
  status: string;
  created_at: string;
}

export default function Tips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [totalTips, setTotalTips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast, showToast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Core fetch function using direct fetch for reliability ──
  const fetchTips = useCallback(async () => {
    try {
      console.log('[tips-polling] Fetching tips...');
      const token = await AsyncStorage.getItem('snaptip_token');
      if (!token) {
        console.log('[tips-polling] No token found, skipping');
        return;
      }

      const response = await fetch('https://snaptip.me/api/dashboard', {
        headers: { 'Authorization': 'Bearer ' + token },
      });

      if (!response.ok) {
        console.log('[tips-polling] Failed:', response.status);
        return;
      }

      const data = await response.json();
      const tipsList = data.recent_tips || data.tips || [];
      const total = data.total_tips ?? 0;

      console.log('[tips-polling] Got', tipsList.length, 'tips, total:', total);

      setTips(tipsList);
      setTotalTips(total);
    } catch (error: any) {
      console.log('[tips-polling] Error:', error?.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Refresh on focus ──
  useFocusEffect(
    useCallback(() => {
      fetchTips();
    }, [fetchTips])
  );

  // ── 15-second polling ──
  useEffect(() => {
    pollingRef.current = setInterval(fetchTips, 15000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchTips]);

  // ── Refresh when app comes back to foreground ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        console.log('[tips-polling] App became active, refreshing...');
        fetchTips();
      }
    });
    return () => subscription.remove();
  }, [fetchTips]);

  const onRefresh = () => { setRefreshing(true); fetchTips(); };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderTip = ({ item }: { item: Tip }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CARD,
      borderRadius: 16,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: BORDER,
    }}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name="arrow-down-outline" size={20} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('tip_received')}</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={{ fontSize: 17, fontWeight: '800', color: GREEN }}>+{item.amount.toFixed(2)} {user?.currency || 'MAD'}</Text>
    </View>
  );

  const EmptyState = () => (
    <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 }}>
      <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(108,108,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(108,108,255,0.15)' }}>
        <Ionicons name="wallet-outline" size={36} color="rgba(108,108,255,0.4)" />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{t('no_tips')}</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 20 }}>
        {t('share_qr_tips')}
      </Text>
    </View>
  );

  const HeaderComponent = () => (
    <>
      {/* Summary Card */}
      {tips.length > 0 && (
        <View style={{
          backgroundColor: CARD,
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: BORDER,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="trending-up" size={22} color={GREEN} />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{t('total_earned')}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: GREEN }}>{totalTips.toFixed(2)} {user?.currency || 'MAD'}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{tips.length} tips</Text>
          </View>
        </View>
      )}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: 56 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', paddingHorizontal: 16, marginBottom: 16 }}>{t('tip_transactions')}</Text>
      <FlatList
        data={tips}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTip}
        ListHeaderComponent={<HeaderComponent />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 }}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      />
      <Toast {...toast} />
    </View>
  );
}
