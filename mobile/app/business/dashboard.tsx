import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import SnapTipLogo from '../../components/SnapTipLogo';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';

interface Stats {
  total_tips: number;
  total_transactions: number;
  active_members: number;
  business_name: string;
  top_performers: {
    id: number;
    full_name: string;
    username: string;
    total_tips: number;
    photo_base64?: string;
    profile_image_url?: string;
  }[];
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
const RANK_ICONS = ['trophy', 'medal', 'ribbon'] as const;

export default function BusinessDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const initials = (user?.full_name || 'B').charAt(0).toUpperCase();
  const photoSrc = user?.photo_base64 || user?.profile_image_url || '';

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/business/stats');
      setStats(data);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to load stats.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  const kpiCards = stats ? [
    {
      label: 'Total Tips',
      value: `${stats.total_tips.toFixed(2)} ${user?.currency || 'MAD'}`,
      icon: 'cash-outline' as const,
      color: GREEN,
      bg: 'rgba(0,200,150,0.1)',
      gradient: ['#0a2a20', '#0d3025'] as const,
    },
    {
      label: 'Transactions',
      value: String(stats.total_transactions),
      icon: 'receipt-outline' as const,
      color: ACCENT,
      bg: 'rgba(108,108,255,0.1)',
      gradient: ['#131330', '#181848'] as const,
    },
    {
      label: 'Team Members',
      value: String(stats.active_members),
      icon: 'people-outline' as const,
      color: YELLOW,
      bg: 'rgba(245,158,11,0.1)',
      gradient: ['#2a2000', '#2e2400'] as const,
    },
  ] : [];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={ACCENT} />
        }
      >
        {/* ── Top Header Bar ── */}
        <LinearGradient
          colors={['#0d0d30', '#080818']}
          style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, overflow: 'hidden' }}>
                <SnapTipLogo size={36} />
              </View>
              <View>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>SnapTip Business</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }} numberOfLines={1}>
                  {stats?.business_name || '...'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.15)' }}>
                {photoSrc ? (
                  <Image source={{ uri: photoSrc }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: ACCENT }}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            Here's your team's performance overview
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── KPI Cards ── */}
          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 40 }} />
          ) : (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
                Performance Overview
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
                {kpiCards.map((kpi) => (
                  <LinearGradient
                    key={kpi.label}
                    colors={kpi.gradient}
                    style={{
                      flex: 1,
                      borderRadius: 18,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'flex-start',
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: kpi.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name={kpi.icon} size={20} color={kpi.color} />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: kpi.color, marginBottom: 4 }}>{kpi.value}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.4)' }}>{kpi.label}</Text>
                  </LinearGradient>
                ))}
              </View>

              {/* ── Free Badge ── */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.08)', borderWidth: 1, borderColor: GREEN }}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: GREEN }}>100% Free for your business</Text>
                </View>
              </View>

              {/* ── Top Performers Leaderboard ── */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
                Top Performers
              </Text>
              <View style={{ backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 28, overflow: 'hidden' }}>
                {stats?.top_performers.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 32 }}>
                    <Ionicons name="podium-outline" size={36} color="rgba(255,255,255,0.15)" />
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>No tips received yet</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Invite employees to get started</Text>
                  </View>
                ) : stats?.top_performers.map((perf, idx) => {
                  const rankColor = RANK_COLORS[idx] || 'rgba(255,255,255,0.3)';
                  const initials2 = (perf.full_name || 'U').charAt(0).toUpperCase();
                  const rawUrl = perf.profile_image_url || '';
                  const photoUrl = rawUrl ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : '';
                  const photo = perf.photo_base64 || photoUrl;
                  return (
                    <View
                      key={perf.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        borderBottomWidth: idx < (stats.top_performers.length - 1) ? 1 : 0,
                        borderBottomColor: BORDER,
                      }}
                    >
                      {/* Rank */}
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${rankColor}18`, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Ionicons name={RANK_ICONS[idx]} size={18} color={rankColor} />
                      </View>
                      {/* Avatar */}
                      <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: `${rankColor}40`, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.12)', marginRight: 12 }}>
                        {photo ? (
                          <Image source={{ uri: photo }} style={{ width: 40, height: 40 }} />
                        ) : (
                          <Text style={{ fontSize: 16, fontWeight: '700', color: rankColor }}>{initials2}</Text>
                        )}
                      </View>
                      {/* Name */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{perf.full_name}</Text>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>@{perf.username}</Text>
                      </View>
                      {/* Amount */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: rankColor }}>{Number(perf.total_tips).toFixed(2)} {user?.currency || 'MAD'}</Text>
                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>in tips</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Quick Nav Cards ── */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Management
          </Text>

          {[
            {
              label: 'Team Members',
              sub: 'Manage your staff',
              icon: 'people' as const,
              color: ACCENT,
              route: '/business/team',
            },
            {
              label: 'Invite Employees',
              sub: 'Send link or email invite',
              icon: 'person-add' as const,
              color: GREEN,
              route: '/business/invite',
            },
            {
              label: 'Transactions',
              sub: 'All payment history',
              icon: 'receipt' as const,
              color: YELLOW,
              route: '/business/transactions',
            },
            {
              label: 'Business Settings',
              sub: 'Logo, name, thank-you message',
              icon: 'settings' as const,
              color: '#a855f7',
              route: '/business/profile-settings',
            },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: CARD,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: BORDER,
                gap: 14,
              }}
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
