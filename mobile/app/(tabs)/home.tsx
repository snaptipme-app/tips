import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, AppState, Animated } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, SecureKeys } from '../../lib/secureStorage';
import { useAuth } from '../../lib/AuthContext';
import SnapTipLogo from '../../components/SnapTipLogo';
import { getImageSource } from '../../lib/imageUtils';
import { Toast, useToast } from '../../components/Toast';
import { playTipSound } from '../../lib/tipSound';
import SkeletonLoader from '../../components/SkeletonLoader';
import HapticButton from '../../components/HapticButton';
import { useLanguage } from '../../lib/LanguageContext';

const BG = '#1a1a1a';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#00ffcc';
const GREEN = '#00C896';
const ON_MINT = '#04231C';
const RATING_PREF_KEY = 'snaptip_show_rating';
const DEFAULT_SHOW_RATING = false;

interface Tip {
  id: number;
  amount: number;
  created_at: string;
  payment_method?: string | null;
  sender_name?: string | null;
}

interface RatingStats {
  average_rating: number | null;
  total_ratings: number;
  rating_breakdown: { [key: string]: number };
}

export default function Home() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const { t, language, isRTL } = useLanguage();
  const { joinedBusiness } = useLocalSearchParams<{ joinedBusiness?: string }>();
  const joinToastShown = useRef(false);
  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [tipCount, setTipCount] = useState(0);
  const [recentTips, setRecentTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [ratingVisible, setRatingVisible] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load rating visibility preference from AsyncStorage on mount and on focus
  const loadRatingPref = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(RATING_PREF_KEY);
      // Default false if not yet set — user must opt-in via profile settings
      setRatingVisible(val === null ? DEFAULT_SHOW_RATING : val === 'true');
    } catch (_) {}
  }, []);

  // Load pref on mount
  useEffect(() => { loadRatingPref(); }, [loadRatingPref]);

  // Re-read pref every time screen comes into focus (user may have changed it in profile)
  useFocusEffect(useCallback(() => { loadRatingPref(); }, [loadRatingPref]));

  // Post-join confirmation. The invite screen replaces into this route with the
  // business name attached, so the toast lands here — after the dashboard has
  // painted — rather than on the join screen that is busy unmounting. The short
  // delay lets the navigation transition settle so the slide-in isn't clipped,
  // and the ref plus cleared param keep it to exactly one showing.
  useEffect(() => {
    if (!joinedBusiness || joinToastShown.current) return;
    joinToastShown.current = true;
    const timer = setTimeout(() => {
      showToast(`Successfully joined ${joinedBusiness}`, 'success');
      router.setParams({ joinedBusiness: '' });
    }, 350);
    return () => clearTimeout(timer);
  }, [joinedBusiness, showToast, router]);

  const cur = user?.currency || 'MAD';
  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();
  const photoSrc = user?.photo_url
    ? { uri: user.photo_url }
    : getImageSource(user?.photo_base64 || user?.profile_image_url);

  // Monthly earnings computed from recent tips
  const monthlyEarned = useMemo(() => {
    const now = new Date();
    return recentTips
      .filter((t) => {
        const d = new Date(t.created_at || '');
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [recentTips]);

  // ── Core fetch function using direct fetch for reliability ──
  const fetchDashboard = useCallback(async () => {
    try {
      console.log('[polling] Fetching dashboard...');
      const token = await getItem(SecureKeys.TOKEN);
      if (!token) {
        console.log('[polling] No token found, skipping');
        return;
      }

      const response = await fetch('https://snaptip.me/api/dashboard', {
        headers: { 'Authorization': 'Bearer ' + token },
      });

      if (!response.ok) {
        console.log('[polling] Failed:', response.status);
        return;
      }

      const data = await response.json();
      const b = data.employee?.balance ?? data.balance ?? 0;
      const tips = data.total_tips ?? 0;
      const count = data.tip_count ?? 0;
      const recent = (data.recent_tips || data.tips || []).slice(0, 4);
      const rs: RatingStats = data.rating_stats || { average_rating: null, total_ratings: 0, rating_breakdown: {} };

      console.log('[polling] Balance:', b, '| Tips:', count, '| Avg Rating:', rs.average_rating);

      // Detect new tip — play sound + toast
      if (prevBalanceRef.current !== null && b > prevBalanceRef.current) {
        const diff = b - prevBalanceRef.current;
        playTipSound();
        showToast(
          t('tip_received_toast')
            .replace('{amount}', diff.toFixed(2))
            .replace('{currency}', cur),
          'success'
        );
      }
      prevBalanceRef.current = b;

      // Update local state
      setBalance(b);
      setTotalEarned(tips);
      setTipCount(count);
      setRecentTips(recent);
      setRatingStats(rs);

      // Sync balance to AuthContext (persists to AsyncStorage)
      updateUser({ balance: b, total_tips: tips });
    } catch (error: any) {
      console.log('[polling] Error:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [cur, showToast, t, updateUser]);

  // ── Fetch on mount + 15-second polling ──
  useEffect(() => {
    if (user?.account_type === 'business') return;

    fetchDashboard(); // immediate fetch on mount

    pollingRef.current = setInterval(fetchDashboard, 15000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchDashboard, user?.account_type]);

  // ── Refresh when screen comes into focus ──
  useFocusEffect(
    useCallback(() => {
      if (user?.account_type !== 'business') {
        fetchDashboard();
      }
    }, [fetchDashboard, user?.account_type])
  );

  // ── Refresh when app comes back to foreground ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && user?.account_type !== 'business') {
        console.log('[polling] App became active, refreshing...');
        fetchDashboard();
      }
    });
    return () => subscription.remove();
  }, [fetchDashboard, user?.account_type]);

  // Business owners: render business dashboard
  if (user?.account_type === 'business') {
    // Lazy require to avoid circular deps
    const BusinessDashboard = require('../business/dashboard').default;
    return <BusinessDashboard />;
  }

  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
              <SnapTipLogo size={36} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>SnapTip</Text>
              <View style={{ backgroundColor: 'rgba(0,255,204,0.12)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: ACCENT }}>{t('member')}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2, textAlign }}>
              {user?.full_name || t('welcome')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,255,204,0.15)' }}>
              {photoSrc ? (
                <Image source={photoSrc} style={{ width: 44, height: 44 }} />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '700', color: ACCENT }}>{initials}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <SkeletonLoader.Dashboard />
        ) : (
          <>
            {/* ── Available Balance Card + Content ── */}
            <LinearGradient
              colors={['#0a2a20', '#0d3328', '#0a2a20']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 20, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}
            >
              <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="wallet" size={18} color={GREEN} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', flex: 1, textAlign }}>{t('available_balance')}</Text>
                <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
                  <Text style={{ fontSize: 10, color: GREEN, fontWeight: '600' }}>{t('live')}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 42, fontWeight: '800', color: GREEN, marginBottom: 16, letterSpacing: -1 }}>
                {balance.toFixed(2)} {cur}
              </Text>

              <View style={{ flexDirection: rowDirection, gap: 20, marginBottom: 20 }}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                  {t('this_month')}: <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>{monthlyEarned.toFixed(2)} {cur}</Text>
                </Text>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                  {t('tips_count_label')}: <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>{tipCount}</Text>
                </Text>
              </View>

              <View style={{ flexDirection: rowDirection, gap: 12 }}>
                <HapticButton
                  onPress={() => router.push('/member/withdraw')}
                  style={{ flex: 1, height: 52, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', flexDirection: rowDirection, gap: 8 }}
                >
                  <Ionicons name="arrow-up-circle" size={20} color={ON_MINT} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: ON_MINT }}>{t('cash_out')}</Text>
                </HapticButton>
                <HapticButton
                  onPress={() => router.push('/member/qr')}
                  style={{ flex: 1, height: 52, borderRadius: 50, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#00C896', justifyContent: 'center', alignItems: 'center', flexDirection: rowDirection, gap: 8 }}
                >
                  <Ionicons name="qr-code-outline" size={20} color="#00C896" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#00C896' }}>{t('my_qr')}</Text>
                </HapticButton>
              </View>
            </LinearGradient>

            {/* ── Rating Card ── */}
            {ratingStats && ratingVisible && (
              <View style={{
                backgroundColor: CARD, borderRadius: 20, padding: 20,
                marginBottom: 20, borderWidth: 1, borderColor: BORDER,
              }}>
                <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="star" size={18} color="#f59e0b" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>{t('my_rating')}</Text>
                </View>

                {ratingStats.average_rating !== null && ratingStats.total_ratings > 0 ? (
                  <>
                    {/* Large average display */}
                    <View style={{ flexDirection: rowDirection, alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
                      <Text style={{ fontSize: 48, fontWeight: '800', color: '#f59e0b', letterSpacing: -2, lineHeight: 52 }}>
                        {Number(ratingStats.average_rating).toFixed(1)}
                      </Text>
                      <View style={{ paddingBottom: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}>
                          {[1,2,3,4,5].map(n => (
                            <Ionicons
                              key={n}
                              name={n <= Math.round(ratingStats.average_rating!) ? 'star' : 'star-outline'}
                              size={16} color="#f59e0b"
                            />
                          ))}
                        </View>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign }}>
                          {ratingStats.total_ratings} {ratingStats.total_ratings === 1 ? t('rating_singular') : t('rating_plural')}
                        </Text>
                      </View>
                    </View>

                    {/* Star breakdown bars */}
                    <View style={{ gap: 6 }}>
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = ratingStats.rating_breakdown?.[star] || 0;
                        const pct = ratingStats.total_ratings > 0 ? (count / ratingStats.total_ratings) * 100 : 0;
                        return (
                          <View key={star} style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 14, textAlign: 'right' }}>{star}</Text>
                            <Ionicons name="star" size={10} color="#f59e0b" />
                            <View style={{ flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                              <View style={{ width: `${pct}%`, height: 5, borderRadius: 3, backgroundColor: '#f59e0b', opacity: 0.8 }} />
                            </View>
                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 22, textAlign: 'right' }}>{count}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Ionicons name="star-outline" size={28} color="rgba(255,255,255,0.15)" />
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 8, textAlign: 'center' }}>
                      {t('no_ratings_yet')}{`\n`}{t('receive_tips_collect_ratings')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Recent Tips ── */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{t('recent_tips')}</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/tips')} activeOpacity={0.8}>
                  <Text style={{ fontSize: 13, color: ACCENT, fontWeight: '600' }}>{t('view_all')}</Text>
                </TouchableOpacity>
              </View>

              {recentTips.length === 0 ? (
                <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center' }}>
                  <Ionicons name="wallet-outline" size={36} color="rgba(255,255,255,0.12)" />
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
                    {t('share_qr_tips')}
                  </Text>
                </View>
              ) : (
                recentTips.map((tip) => {
                  const isSplit = tip.payment_method === 'split_in';
                  return (
                    <View
                      key={tip.id}
                      style={{ flexDirection: rowDirection, alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}
                    >
                      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: isSplit ? 'rgba(0,255,204,0.1)' : 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Ionicons name={isSplit ? 'people' : 'arrow-down-outline'} size={18} color={isSplit ? ACCENT : GREEN} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                          {isSplit ? `${t('received_from')} ${tip.sender_name || t('colleague')}` : t('tip_received')}
                        </Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{formatDate(tip.created_at)}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: isSplit ? ACCENT : GREEN }}>+{Number(tip.amount).toFixed(2)} {cur}</Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* ── Quick Actions ── */}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign }}>{t('quick_actions')}</Text>
            <View style={{ flexDirection: rowDirection, gap: 10 }}>
              <TouchableOpacity
                onPress={() => router.push('/member/qr')}
                activeOpacity={0.8}
                style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,255,204,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="qr-code-outline" size={22} color={ACCENT} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{t('my_qr_code_action')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/member/split')}
                activeOpacity={0.8}
                style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,255,204,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={22} color={ACCENT} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{t('split_tip')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/member/withdraw')}
                activeOpacity={0.8}
                style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="cash-outline" size={22} color={GREEN} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{t('withdraw')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
