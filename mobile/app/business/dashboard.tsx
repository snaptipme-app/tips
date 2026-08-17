import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  RefreshControl, ImageSourcePropType,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Circle, Line as SvgLine, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import { getImageSource } from '../../lib/imageUtils';
import SnapTipLogo from '../../components/SnapTipLogo';
import SkeletonLoader from '../../components/SkeletonLoader';
import HapticButton from '../../components/HapticButton';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#1a1a1a';
const CARD    = 'rgba(255,255,255,0.05)';
const BORDER  = 'rgba(255,255,255,0.08)';
const ACCENT  = '#00ffcc';
const GREEN   = '#00C896';
const ON_MINT = '#04231C';
const YELLOW  = '#f59e0b';
const PURPLE  = '#00ffcc';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Stats {
  total_tips: number;
  total_transactions: number;
  active_members: number;
  business_name: string;
  team_average_rating: number | null;
  team_total_ratings: number;
  top_performers: {
    id: number;
    full_name: string;
    username: string;
    total_tips: number | string;
    photo_base64?: string;
    profile_image_url?: string;
    average_rating?: number | null;
    total_ratings?: number;
  }[];
}

interface Transaction {
  id: number;
  amount: number | string;
  status: string;
  created_at: string;
  employee_name: string;
  employee_username: string;
  photo_base64?: string;
  profile_image_url?: string;
}

interface BusinessInfo {
  id: number;
  business_name: string;
  logo_url?: string;
  logo_base64?: string;
}

function normalizeImageSource(source: { uri: string } | string | null): ImageSourcePropType | null {
  if (!source) return null;
  return typeof source === 'string' ? { uri: source } : source;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BusinessDashboard() {
  const { user } = useAuth();
  const router   = useRouter();
  const { toast, showToast } = useToast();

  const [stats,        setStats]        = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [business,     setBusiness]     = useState<BusinessInfo | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const currency        = user?.currency || 'MAD';
  const initials        = (user?.full_name || 'B').charAt(0).toUpperCase();
  const photoSrc        = getImageSource(user?.photo_base64 || user?.profile_image_url);
  const businessLogoUrl = business?.logo_base64 || business?.logo_url?.trim() || '';
  const businessLogoSrc = normalizeImageSource(getImageSource(businessLogoUrl));

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, txRes, bizRes] = await Promise.all([
        api.get('/business/stats'),
        api.get('/business/transactions').catch(() => ({ data: { transactions: [] } })),
        api.get('/business/me').catch(() => ({ data: { business: null } })),
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data.transactions || []);
      console.log('Business Logo URL fetched:', bizRes.data?.business?.logo_url);
      console.log('[DEBUG logo_url]', bizRes.data?.business?.logo_url);
      console.log('[DEBUG businessLogoSrc]', getImageSource(bizRes.data?.business?.logo_url?.trim() || ''));
      setBusiness(bizRes.data.business || null);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Derived values (all logic preserved) ────────────────────────────────────
  const totalTips    = stats?.total_tips || 0;
  const totalTx      = stats?.total_transactions || 0;
  const teamSize     = stats?.active_members || 0;
  const businessName = business?.business_name || stats?.business_name || 'My Business';

  const chartData = useMemo(() => {
    const days: { label: string; iso: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso   = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
      days.push({ label, iso, amount: 0 });
    }
    transactions.forEach((t) => {
      const day = (t.created_at || '').slice(0, 10);
      const idx = days.findIndex((x) => x.iso === day);
      if (idx >= 0) days[idx].amount += Number(t.amount) || 0;
    });
    return days;
  }, [transactions]);

  const chartMax = Math.max(...chartData.map((d) => d.amount), 1);
  const recentTx = transactions.slice(0, 5);

  // Current month tips (computed from already-fetched transactions)
  const monthlyTips = useMemo(() => {
    const now = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    return transactions
      .filter((t) => {
        const d = new Date(t.created_at || '');
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const formatTime = (iso: string) => {
    const d       = new Date(iso);
    const now     = new Date();
    const diffMs  = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1)  return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr  < 24) return `${diffHr}h ago`;
    if (diffDay < 7)  return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, paddingHorizontal: 20, paddingTop: 100 }}>
        <SkeletonLoader.BusinessDashboard />
      </View>
    );
  }

  // ── Leaderboard bar scale ────────────────────────────────────────────────────
  const maxPerformerTips = stats?.top_performers?.[0]
    ? Math.max(Number(stats.top_performers[0].total_tips), 1)
    : 1;

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
      >

        {/* ════════════ HEADER ════════════ */}
        <LinearGradient
          colors={['#0c0c26', BG]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={{ paddingTop: 54, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 26 }}>
            {/* Business logo */}
            <View style={{
              width: 46, height: 46, borderRadius: 14,
              backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
              overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
              marginRight: 12,
            }}>
              {businessLogoSrc
                ? <Image
                    source={businessLogoSrc}
                    style={{ width: 46, height: 46 }}
                    resizeMode="cover"
                    onError={(event) => console.log('Business Logo image failed:', event.nativeEvent.error)}
                  />
                : <SnapTipLogo size={26} />
              }
            </View>

            {/* Business name */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.38)', letterSpacing: 0.9, textTransform: 'uppercase' }}>
                SnapTip Business
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', marginTop: 2 }} numberOfLines={1}>
                {businessName}
              </Text>
            </View>

            {/* Manager avatar */}
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.75}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: 'rgba(0,255,204,0.15)',
                borderWidth: 2, borderColor: ACCENT,
                overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
              }}>
                {photoSrc
                  ? <Image source={photoSrc} style={{ width: 44, height: 44 }} />
                  : <Text style={{ fontSize: 17, fontWeight: '800', color: ACCENT }}>{initials}</Text>
                }
              </View>
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <Text style={{ fontSize: 25, fontWeight: '800', color: '#fff', letterSpacing: -0.4 }}>
            {user?.full_name ? `Hey, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>
            Here's how your team is performing
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>

          {/* ════════════ QUICK STATS ════════════ */}
          <Label>Quick Stats</Label>
          <View style={{ gap: 10, marginBottom: 28 }}>
            <StatCard
              icon="cash-outline"
              color={GREEN}
              label="Total Tips"
              value={monthlyTips.toFixed(2)}
              suffix={currency}
              subtitle="This Month"
              highlight
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatCard
                icon="receipt-outline"
                color={ACCENT}
                label="Transactions"
                value={String(totalTx)}
              />
              <StatCard
                icon="people-outline"
                color={YELLOW}
                label="Team Members"
                value={String(teamSize)}
              />
            </View>
            {/* Team average rating */}
            {stats?.team_average_rating !== null && stats?.team_average_rating !== undefined && (
              <View style={{
                backgroundColor: CARD, borderRadius: 16, padding: 16,
                borderWidth: 1, borderColor: BORDER,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="star" size={20} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 }}>Team Average Rating</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: '#f59e0b', letterSpacing: -0.5 }}>
                      {Number(stats.team_average_rating).toFixed(1)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1,2,3,4,5].map(n => (
                        <Ionicons key={n} name={n <= Math.round(stats!.team_average_rating!) ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
                      ))}
                    </View>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                      ({stats.team_total_ratings || 0} ratings)
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ════════════ 7-DAY TREND ════════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label inline>7-Day Trend</Label>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
              {chartData.reduce((a, d) => a + d.amount, 0).toFixed(2)} {currency} total
            </Text>
          </View>
          <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 28 }}>
            <SparkChart data={chartData} max={chartMax} />
          </View>

          {/* ════════════ TOP PERFORMERS ════════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label inline>Top Performers</Label>
            <TouchableOpacity onPress={() => router.push('/business/team')} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 28 }}>
            {(stats?.top_performers || []).length === 0 ? (
              <EmptyState icon="podium-outline" text="No tips received yet" sub="Invite employees to get started" />
            ) : (
              stats!.top_performers.map((perf, idx) => {
                const rankColor   = RANK_COLORS[idx] || 'rgba(255,255,255,0.3)';
                const perfInitial = (perf.full_name || 'U').charAt(0).toUpperCase();
                const photo       = perf.photo_base64 || perf.profile_image_url || '';
                const barPct      = Math.max((Number(perf.total_tips) / maxPerformerTips) * 100, 3);
                const isLast      = idx === stats!.top_performers.length - 1;

                return (
                  <View
                    key={perf.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: BORDER,
                    }}
                  >
                    {/* Rank number */}
                    <View style={{ width: 26, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: rankColor, letterSpacing: -0.2 }}>
                        #{idx + 1}
                      </Text>
                    </View>

                    {/* Avatar */}
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      overflow: 'hidden',
                      backgroundColor: `${rankColor}18`,
                      borderWidth: 2, borderColor: `${rankColor}55`,
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      {photo
                        ? <Image source={{ uri: photo }} style={{ width: 40, height: 40 }} />
                        : <Text style={{ fontSize: 15, fontWeight: '800', color: rankColor }}>{perfInitial}</Text>
                      }
                    </View>

                    {/* Name + progress bar + rating */}
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 }} numberOfLines={1}>
                          {perf.full_name}
                        </Text>
                        {perf.average_rating !== null && perf.average_rating !== undefined && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="star" size={11} color="#f59e0b" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>
                              {Number(perf.average_rating).toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                        <View style={{ width: `${barPct}%`, height: 4, borderRadius: 2, backgroundColor: rankColor, opacity: 0.85 }} />
                      </View>
                    </View>

                    {/* Amount */}
                    <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: rankColor }}>
                        {Number(perf.total_tips).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{currency}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ════════════ RECENT ACTIVITY ════════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label inline>Recent Activity</Label>
            <TouchableOpacity onPress={() => router.push('/business/transactions')} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 28 }}>
            {recentTx.length === 0 ? (
              <EmptyState icon="receipt-outline" text="No transactions yet" />
            ) : (
              recentTx.map((tx, idx) => {
                const txInitial = (tx.employee_name || 'U').charAt(0).toUpperCase();
                const txPhoto   = tx.photo_base64 || tx.profile_image_url || '';
                const isLast    = idx === recentTx.length - 1;

                return (
                  <View
                    key={tx.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 16, paddingVertical: 13, gap: 12,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: BORDER,
                    }}
                  >
                    {/* Employee avatar */}
                    <View style={{
                      width: 42, height: 42, borderRadius: 21,
                      overflow: 'hidden',
                      backgroundColor: 'rgba(0,200,150,0.1)',
                      borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)',
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      {txPhoto
                        ? <Image source={{ uri: txPhoto }} style={{ width: 42, height: 42 }} />
                        : <Text style={{ fontSize: 15, fontWeight: '800', color: GREEN }}>{txInitial}</Text>
                      }
                    </View>

                    {/* Name + time */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
                        {tx.employee_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        {formatTime(tx.created_at)}
                      </Text>
                    </View>

                    {/* Amount badge */}
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <View style={{
                        backgroundColor: 'rgba(0,200,150,0.12)',
                        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: GREEN }}>
                          +{Number(tx.amount).toFixed(2)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textAlign: 'right' }}>
                        {currency}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ════════════ ACTION BUTTONS ════════════ */}
          <Label>Actions</Label>

          {/* Invite Employee — filled green */}
          <HapticButton
            onPress={() => router.push('/business/invite')}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: GREEN, borderRadius: 16,
              paddingHorizontal: 16, paddingVertical: 15,
              gap: 14, marginBottom: 10,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(4,35,28,0.14)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="person-add-outline" size={20} color={ON_MINT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: ON_MINT }}>Invite Employee</Text>
              <Text style={{ fontSize: 12, color: 'rgba(4,35,28,0.72)', marginTop: 1 }}>Send a link or email invite</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(4,35,28,0.55)" />
          </HapticButton>

          {/* View Team — outlined blue */}
          <TouchableOpacity
            onPress={() => router.push('/business/team')}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: CARD,
              borderWidth: 1, borderColor: 'rgba(0,255,204,0.35)',
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15,
              gap: 14, marginBottom: 10,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,255,204,0.15)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={20} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>View Team</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>Manage your staff members</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(0,255,204,0.45)" />
          </TouchableOpacity>

          {/* Business Settings — ghost */}
          <TouchableOpacity
            onPress={() => router.push('/business/profile-settings')}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: CARD,
              borderWidth: 1, borderColor: BORDER,
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15,
              gap: 14,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,255,204,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="settings-outline" size={20} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Business Settings</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Logo, name, thank-you message</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>

        </View>
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

/** Uppercase section label. Pass `inline` when paired with a sibling element in a row. */
function Label({ children, inline = false }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.38)',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      marginBottom: inline ? 0 : 12,
    }}>
      {children}
    </Text>
  );
}

/** 2 × 2 grid stat card. */
function StatCard({ icon, color, label, value, suffix, subtitle, highlight = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  suffix?: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: CARD,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: highlight ? `${color}4d` : BORDER,
      gap: 10,
    }}>
      {/* Icon pill */}
      <View style={{
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: `${color}20`,
        justifyContent: 'center', alignItems: 'center',
        alignSelf: 'flex-start',
      }}>
        <Ionicons name={icon} size={19} color={color} />
      </View>

      {/* Value */}
      <View>
        <Text
          style={{ fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {value}
        </Text>
        {suffix ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
            {suffix}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.38)' }}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(0,200,150,0.7)', letterSpacing: 0.3 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Shared empty state for leaderboard and transactions. */
function EmptyState({ icon, text, sub }: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  sub?: string;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon} size={28} color="rgba(255,255,255,0.14)" />
      </View>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{text}</Text>
      {sub ? <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>{sub}</Text> : null}
    </View>
  );
}

/** 7-day area sparkline (SVG). Data computation lives in the parent. */
function SparkChart({ data, max }: { data: { label: string; iso: string; amount: number }[]; max: number }) {
  const W = 280, H = 108, pX = 8, pY = 10;
  const iW = W - pX * 2;
  const iH = H - pY * 2;

  const pts = data.map((d, i) => ({
    x: pX + (i / (data.length - 1)) * iW,
    y: pY + iH - (d.amount / max) * iH,
    v: d.amount,
  }));

  const polyPts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area =
    `M ${pts[0].x.toFixed(1)},${(pY + iH).toFixed(1)} ` +
    pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[pts.length - 1].x.toFixed(1)},${(pY + iH).toFixed(1)} Z`;

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <SvgLinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={GREEN} stopOpacity="0.32" />
            <Stop offset="1"   stopColor={GREEN} stopOpacity="0"    />
          </SvgLinearGradient>
        </Defs>
        <SvgLine x1={pX} y1={pY + iH} x2={pX + iW} y2={pY + iH} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <Path d={area} fill="url(#fill)" />
        <Polyline points={polyPts} fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) =>
          p.v > 0
            ? <Circle key={i} cx={p.x} cy={p.y} r={3} fill={GREEN} stroke="#0a1f1a" strokeWidth="1.5" />
            : null
        )}
      </Svg>
      {/* Day labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', fontWeight: '600' }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
