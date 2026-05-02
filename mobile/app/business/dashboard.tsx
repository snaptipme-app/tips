import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  RefreshControl, ActivityIndicator,
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

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const PURPLE = '#a855f7';

const COMMISSION_RATE = 0.10;
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_ICONS = ['trophy', 'medal', 'ribbon'] as const;

interface Stats {
  total_tips: number;
  total_transactions: number;
  active_members: number;
  business_name: string;
  top_performers: {
    id: number;
    full_name: string;
    username: string;
    total_tips: number | string;
    photo_base64?: string;
    profile_image_url?: string;
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
  logo_base64?: string;
  logo_url?: string;
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = user?.currency || 'MAD';
  const initials = (user?.full_name || 'B').charAt(0).toUpperCase();
  const photoSrc = getImageSource(user?.photo_base64 || user?.profile_image_url);
  const businessLogoSrc = getImageSource(business?.logo_base64 || business?.logo_url);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, txRes, bizRes] = await Promise.all([
        api.get('/business/stats'),
        api.get('/business/transactions').catch(() => ({ data: { transactions: [] } })),
        api.get('/business/me').catch(() => ({ data: { business: null } })),
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data.transactions || []);
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

  const totalTips = stats?.total_tips || 0;
  const totalTx = stats?.total_transactions || 0;
  const teamSize = stats?.active_members || 0;
  const avgTip = totalTx > 0 ? totalTips / totalTx : 0;
  const commission = totalTips * COMMISSION_RATE;
  const businessName = business?.business_name || stats?.business_name || 'My Business';

  // ── 7-day chart data (daily totals) ──
  const chartData = useMemo(() => {
    const days: { label: string; iso: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <LinearGradient
          colors={['#0d0d30', '#080818']}
          style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' }}>
                {businessLogoSrc ? (
                  <Image source={businessLogoSrc} style={{ width: 44, height: 44 }} resizeMode="cover" />
                ) : (
                  <SnapTipLogo size={28} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>SnapTip Business</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 }} numberOfLines={1}>
                  {businessName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
              <View style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.15)' }}>
                {photoSrc ? (
                  <Image source={photoSrc} style={{ width: 42, height: 42 }} />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: ACCENT }}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            Here's how your team is performing
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
          {/* ═══════════ HERO METRIC ═══════════ */}
          <LinearGradient
            colors={['#0d2a22', '#102e26', '#0a1f1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 22,
              borderWidth: 1,
              borderColor: 'rgba(0,200,150,0.18)',
              marginBottom: 14,
              overflow: 'hidden',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 0.6, textTransform: 'uppercase' }}>Total Tips Earned</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={{ fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
                    {totalTips.toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.55)' }}>{currency}</Text>
                </View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  Across {totalTx} {totalTx === 1 ? 'transaction' : 'transactions'}
                </Text>
              </View>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(0,200,150,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,200,150,0.3)' }}>
                <Ionicons name="cash-outline" size={26} color={GREEN} />
              </View>
            </View>
          </LinearGradient>

          {/* ═══════════ KPI GRID (3 cards) ═══════════ */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <KpiCard
              icon="receipt-outline"
              color={ACCENT}
              label="Transactions"
              value={String(totalTx)}
            />
            <KpiCard
              icon="people-outline"
              color={YELLOW}
              label="Team"
              value={String(teamSize)}
            />
            <KpiCard
              icon="trending-up-outline"
              color={PURPLE}
              label="Avg Tip"
              value={`${avgTip.toFixed(0)}`}
              suffix={currency}
            />
          </View>

          {/* ═══════════ COMMISSION CARD ═══════════ */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 22, gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>Platform commission (10%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 }}>{commission.toFixed(2)} {currency}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.1)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.25)' }}>
              <Ionicons name="checkmark-circle" size={12} color={GREEN} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: GREEN }}>Free for you</Text>
            </View>
          </View>

          {/* ═══════════ 7-DAY CHART ═══════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Last 7 Days
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              Total: {chartData.reduce((a, d) => a + d.amount, 0).toFixed(2)} {currency}
            </Text>
          </View>
          <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24 }}>
            <SparkChart data={chartData} max={chartMax} />
          </View>

          {/* ═══════════ TOP PERFORMERS ═══════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Top Performers
            </Text>
            <TouchableOpacity onPress={() => router.push('/business/team')} activeOpacity={0.6}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24, overflow: 'hidden' }}>
            {(stats?.top_performers || []).length === 0 ? (
              <View style={{ alignItems: 'center', padding: 28 }}>
                <Ionicons name="podium-outline" size={36} color="rgba(255,255,255,0.15)" />
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>No tips received yet</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Invite employees to get started</Text>
              </View>
            ) : (
              stats!.top_performers.map((perf, idx) => {
                const rankColor = RANK_COLORS[idx] || 'rgba(255,255,255,0.3)';
                const initials2 = (perf.full_name || 'U').charAt(0).toUpperCase();
                const photo = perf.photo_base64 || perf.profile_image_url || '';
                return (
                  <View
                    key={perf.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderBottomWidth: idx < (stats!.top_performers.length - 1) ? 1 : 0,
                      borderBottomColor: BORDER,
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${rankColor}1a`, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name={RANK_ICONS[idx]} size={16} color={rankColor} />
                    </View>
                    <View style={{ width: 38, height: 38, borderRadius: 19, overflow: 'hidden', borderWidth: 2, borderColor: `${rankColor}40`, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.12)', marginRight: 12 }}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={{ width: 38, height: 38 }} />
                      ) : (
                        <Text style={{ fontSize: 15, fontWeight: '700', color: rankColor }}>{initials2}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }} numberOfLines={1}>{perf.full_name}</Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }} numberOfLines={1}>@{perf.username}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: rankColor }}>
                        {Number(perf.total_tips).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{currency}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ═══════════ RECENT TRANSACTIONS ═══════════ */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => router.push('/business/transactions')} activeOpacity={0.6}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24, overflow: 'hidden' }}>
            {recentTx.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 28 }}>
                <Ionicons name="receipt-outline" size={32} color="rgba(255,255,255,0.15)" />
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>No transactions yet</Text>
              </View>
            ) : (
              recentTx.map((tx, idx) => {
                const txInitials = (tx.employee_name || 'U').charAt(0).toUpperCase();
                const txPhoto = tx.photo_base64 || tx.profile_image_url || '';
                return (
                  <View
                    key={tx.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderBottomWidth: idx < recentTx.length - 1 ? 1 : 0,
                      borderBottomColor: BORDER,
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 19, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,200,150,0.1)', marginRight: 12 }}>
                      {txPhoto ? (
                        <Image source={{ uri: txPhoto }} style={{ width: 38, height: 38 }} />
                      ) : (
                        <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{txInitials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
                        {tx.employee_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        {formatTime(tx.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: GREEN }}>
                        +{Number(tx.amount).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{currency}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ═══════════ QUICK ACTIONS ═══════════ */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <QuickAction
              icon="person-add-outline"
              color={GREEN}
              label="Invite"
              onPress={() => router.push('/business/invite')}
            />
            <QuickAction
              icon="people-outline"
              color={ACCENT}
              label="Team"
              onPress={() => router.push('/business/team')}
            />
            <QuickAction
              icon="receipt-outline"
              color={YELLOW}
              label="Transactions"
              onPress={() => router.push('/business/transactions')}
            />
          </View>

          {/* ═══════════ SETTINGS ROW ═══════════ */}
          <TouchableOpacity
            onPress={() => router.push('/business/profile-settings')}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: CARD,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: BORDER,
              gap: 14,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(168,85,247,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="settings-outline" size={20} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Business Settings</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Logo, name, thank-you message</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({ icon, color, label, value, suffix }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: CARD,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: BORDER,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}1a`, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }} numberOfLines={1}>
        {value}{suffix && <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}> {suffix}</Text>}
      </Text>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, color, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${color}1a`, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function SparkChart({ data, max }: { data: { label: string; iso: string; amount: number }[]; max: number }) {
  const width = 280;
  const height = 110;
  const padX = 8;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * innerW;
    const y = padY + innerH - (d.amount / max) * innerH;
    return { x, y, amount: d.amount };
  });

  const polylinePts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    `M ${points[0].x.toFixed(1)},${(padY + innerH).toFixed(1)} ` +
    points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1].x.toFixed(1)},${(padY + innerH).toFixed(1)} Z`;

  return (
    <View>
      <View style={{ alignItems: 'center' }}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <SvgLinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={GREEN} stopOpacity="0.35" />
              <Stop offset="1" stopColor={GREEN} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          {/* Baseline grid */}
          <SvgLine
            x1={padX}
            y1={padY + innerH}
            x2={padX + innerW}
            y2={padY + innerH}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          {/* Filled area under line */}
          <Path d={areaPath} fill="url(#sparkFill)" />
          {/* Line */}
          <Polyline
            points={polylinePts}
            fill="none"
            stroke={GREEN}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dots on points with data */}
          {points.map((p, i) =>
            p.amount > 0 ? (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill={GREEN} stroke="#0a1f1a" strokeWidth="1.5" />
            ) : null
          )}
        </Svg>
      </View>
      {/* Day labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
