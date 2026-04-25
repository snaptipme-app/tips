import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import { getImageSource } from '../../lib/imageUtils';
import Logo from '../../components/Logo';
import { playTipSound } from '../../lib/tipSound';

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

interface DashData {
  balance: number;
  total_tips: number;
  tip_count: number;
  recent_tips: Tip[];
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bizName, setBizName] = useState('');
  const prevBalanceRef = useRef<number | null>(null);

  const initials = (user?.full_name || 'M').charAt(0).toUpperCase();
  const photoSrc = getImageSource(user?.photo_base64 || user?.profile_image_url);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, bizRes] = await Promise.allSettled([
        api.get('/dashboard'),
        api.get('/employee/my-business'),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setData({
          balance: d.employee?.balance ?? d.balance ?? 0,
          total_tips: d.total_tips ?? 0,
          tip_count: d.tip_count ?? 0,
          recent_tips: d.recent_tips ?? [],
        });
      }
      if (bizRes.status === 'fulfilled') {
        setBizName(bizRes.value.data.business?.business_name || '');
      }
    } catch (e: any) {
      if (e.response?.status !== 401) showToast('Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 30-second polling for real-time balance updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/dashboard');
        const d = res.data;
        const newBalance = d.employee?.balance ?? d.balance ?? 0;
        const newTipCount = d.tip_count ?? 0;

        // Detect new tip
        if (prevBalanceRef.current !== null && newBalance > prevBalanceRef.current) {
          const diff = newBalance - prevBalanceRef.current;
          playTipSound();
          showToast(`You received a ${diff.toFixed(2)} ${user?.currency || 'MAD'} tip! 💸`, 'success');
        }
        prevBalanceRef.current = newBalance;

        setData({
          balance: newBalance,
          total_tips: d.total_tips ?? 0,
          tip_count: newTipCount,
          recent_tips: d.recent_tips ?? [],
        });
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={ACCENT} />
        }
      >
        {/* ── Header ── */}
        <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Logo size="medium" />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                  {bizName || 'SnapTip Member'}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                  {user?.full_name || 'Welcome back'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/member/profile')} activeOpacity={0.8}>
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: GREEN, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,200,150,0.12)' }}>
                {photoSrc ? (
                  <Image source={photoSrc} style={{ width: 40, height: 40 }} />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: GREEN }}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Balance Card ── */}
          {loading ? (
            <ActivityIndicator color={GREEN} />
          ) : (
            <LinearGradient
              colors={['#0a2a20', '#0d3328']}
              style={{ borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="wallet" size={18} color={GREEN} />
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{t('available_balance')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
                  <Text style={{ fontSize: 10, color: GREEN, fontWeight: '600' }}>Live</Text>
                </View>
              </View>
              <Text style={{ fontSize: 48, fontWeight: '800', color: GREEN, letterSpacing: -2, marginBottom: 4 }}>
                {(data?.balance ?? 0).toFixed(2)} {user?.currency || 'MAD'}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
                {t('total_earned')}: <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>{(data?.total_tips ?? 0).toFixed(2)} {user?.currency || 'MAD'}</Text>
                {'  '}·{'  '}
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>{data?.tip_count ?? 0}</Text> {t('tips')}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => router.push('/member/withdraw')}
                  activeOpacity={0.8}
                  style={{ flex: 1, height: 46, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
                >
                  <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{t('cash_out')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/member/qr')}
                  activeOpacity={0.8}
                  style={{ height: 46, paddingHorizontal: 18, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(0,200,150,0.4)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <Ionicons name="qr-code-outline" size={18} color={GREEN} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: GREEN }}>{t('my_qr')}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          )}
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Recent Tips ── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {t('recent_tips')}
            </Text>
            {(data?.tip_count ?? 0) > 0 && (
              <TouchableOpacity onPress={() => router.push('/member/withdraw')}>
                <Text style={{ fontSize: 13, color: ACCENT, fontWeight: '600' }}>{t('view_all')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={ACCENT} />
          ) : data?.recent_tips.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="wallet-outline" size={44} color="rgba(255,255,255,0.1)" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>{t('no_tips_yet')}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                {t('no_tips_desc')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/member/qr')}
                activeOpacity={0.8}
                style={{ marginTop: 20, backgroundColor: ACCENT, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="qr-code-outline" size={16} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{t('show_my_qr')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' }}>
              {data?.recent_tips.slice(0, 10).map((tip, idx) => (
                <View
                  key={tip.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: idx < Math.min((data?.recent_tips.length ?? 0) - 1, 9) ? 1 : 0,
                    borderBottomColor: BORDER,
                  }}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name="arrow-down" size={18} color={GREEN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('tip_received')}</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{formatDate(tip.created_at)}</Text>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: GREEN }}>+{Number(tip.amount).toFixed(2)} {user?.currency || 'MAD'}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Quick Nav ── */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 28, marginBottom: 12 }}>
            {t('quick_actions')}
          </Text>
          {[
            { label: t('my_qr_code_action'), sub: t('share_download_qr'), icon: 'qr-code' as const, color: ACCENT, route: '/member/qr' },
            { label: t('withdraw_earnings'), sub: t('request_earnings_payout'), icon: 'cash' as const, color: GREEN, route: '/member/withdraw' },
            { label: t('profile_settings'), sub: t('photo_name_language'), icon: 'person' as const, color: '#a855f7', route: '/member/profile' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER, gap: 14 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${item.color}15`, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
