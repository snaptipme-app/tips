import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Modal, KeyboardAvoidingView, Platform, RefreshControl, AppState,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { Toast, useToast } from '../../components/Toast';
import { useScreenCaptureProtection } from '../../lib/security';
import SnapTipLogo from '../../components/SnapTipLogo';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';
import SkeletonLoader from '../../components/SkeletonLoader';
import HapticButton from '../../components/HapticButton';
import { CountryFlag } from '../../components/CountryFlag';
import { COUNTRY_CODE_MAP } from '../../lib/countryData';
import { getPayoutConfig } from '../../lib/payoutConfig';

/* -- Design tokens -- */
const BG = '#080818';
const CARD = '#080818';
const SHEET_BG = '#080818';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#00ffcc';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const RED = '#ef4444';


/* ======================================================================
   METHOD DEFINITIONS
   ====================================================================== */
interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboard: 'default' | 'phone-pad' | 'numeric';
  exactLen?: number;
  phoneValidation?: boolean;
  ibanValidation?: boolean;
  swiftValidation?: boolean;
}

interface SubMethod {
  id: string;
  label: string;
  sublabel: string;
  fee: number;
  min: number;
  fields: FieldDef[];
  processingTime: string;
}

/* ======================================================================
   UNIVERSAL WISE MANUAL PAYOUT METHOD
   ====================================================================== */
const getPayoutMethod = (_country: string, minAmount: number): SubMethod => {
  return {
    id: 'wise_manual', label: 'Manual bank transfer', sublabel: 'via Wise Business',
    fee: 0, min: minAmount, processingTime: '1-3 business days',
    fields: [],
  };
};

/* -- Status styles -- */
const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: YELLOW, bg: 'rgba(245,158,11,0.12)', label: 'pending' },
  paid: { color: GREEN, bg: 'rgba(0,200,150,0.12)', label: 'paid' },
  failed: { color: RED, bg: 'rgba(239,68,68,0.12)', label: 'rejected' },
};

interface Withdrawal { id: number; amount: number; fee: number; platform_fee_amount?: number; net_amount: number; method: string; status: string; created_at: string; }

interface StripeConnectStatus {
  connected: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsCurrentlyDue: string[];
}

interface PayoutAvailability {
  totalBalance: number;
  employeeSettledAvailable?: number;
  stripeAvailableForCurrency?: number;
  maxGrossWithdrawableFromStripe?: number;
  availableToWithdraw: number;
  pendingSettlement: number;
  currency: string;
  reason: string;
}

interface WithdrawalPreferences {
  payoutSchedule: PayoutSchedule;
  autoPayoutEnabled: boolean;
  nextPayoutAt: string | null;
  lastAutoPayoutAt: string | null;
}

type PayoutSchedule = 'weekly' | 'monthly' | 'manual';

interface PayoutDetailsStatus {
  isComplete: boolean;
  details?: {
    bankName?: string;
    detailsLast4?: string;
    isComplete?: boolean;
  } | null;
}

/* ======================================================================
   MAIN COMPONENT
   ====================================================================== */
export default function MemberWithdraw() {
  // Screen contains bank/account details - block screenshots & screen recording
  // for the lifetime of this screen (auto-released on unmount).
  useScreenCaptureProtection();

  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { t, language } = useLanguage();
  const { toast, showToast } = useToast();
  const tx = useCallback((key: string, vars: Record<string, string | number> = {}) => {
    let value = t(key);
    Object.entries(vars).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, String(replacement));
    });
    return value;
  }, [t]);
  const fieldText = useCallback((prefix: string, key: string, fallback: string) => {
    const translated = t(`${prefix}_${key}`);
    return translated === `${prefix}_${key}` ? fallback : translated;
  }, [t]);

  const userCountry = user?.country || 'Morocco';
  const cur = user?.currency || 'MAD';
  const countryCode = COUNTRY_CODE_MAP[userCountry] || 'MA';
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';
  const formatMoney = useCallback((value: number) => Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: cur === 'JPY' ? 0 : 2,
    maximumFractionDigits: cur === 'JPY' ? 0 : 2,
  }), [cur, locale]);
  const payoutCfg = getPayoutConfig(countryCode);
  const minWithdrawal = payoutCfg.minAmount;
  const payoutMethod = useMemo(() => getPayoutMethod(userCountry, minWithdrawal), [userCountry, minWithdrawal]);
  const stripePayoutMethod = useMemo<SubMethod>(() => ({
    id: 'stripe_connect',
    label: 'Stripe Express',
    sublabel: 'Payout to your connected Stripe Express account',
    fee: 0,
    min: minWithdrawal,
    processingTime: 'Based on your payout schedule',
    fields: [],
  }), [minWithdrawal]);
  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form sheet
  const [showForm, setShowForm] = useState(false);
  const [activeMethod, setActiveMethod] = useState<SubMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [payoutAvailability, setPayoutAvailability] = useState<PayoutAvailability | null>(null);
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>('manual');
  const [preferences, setPreferences] = useState<WithdrawalPreferences | null>(null);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetailsStatus | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState<PayoutSchedule>('manual');
  const [savingPreferences, setSavingPreferences] = useState(false);
  const connectStatusCheckPending = useRef(false);
  const initialConnectCheckDone = useRef(false);

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastResult, setLastResult] = useState<{
    amount: number; fee: number; net: number; method: string; currency: string; processingTime: string;
  } | null>(null);

  const isStripeConnectPayout = payoutCfg.payoutMethod === 'stripe_connect';
  const availableToWithdraw = isStripeConnectPayout
    ? (payoutAvailability?.availableToWithdraw ?? balance)
    : balance;
  const pendingSettlement = isStripeConnectPayout
    ? (payoutAvailability?.pendingSettlement ?? 0)
    : 0;
  const availabilityReason = payoutAvailability?.reason;
  const stripeCapacityCapped = isStripeConnectPayout && availabilityReason === 'stripe_capacity_capped';
  const hasSettlingFunds = isStripeConnectPayout
    && pendingSettlement > 0
    && (availabilityReason === 'funds_settling' || availabilityReason === 'partially_available' || stripeCapacityCapped);
  const stripeFundsSettling = isStripeConnectPayout
    && Boolean(connectStatus?.detailsSubmitted && connectStatus?.payoutsEnabled)
    && balance > 0
    && availableToWithdraw <= 0;
  const activeAvailableToWithdraw = activeMethod?.id === 'stripe_connect' ? availableToWithdraw : balance;
  const settlingMessage = 'Your payout is not ready yet. Funds are still settling and will be available soon.';
  const stripeCapacityMessage = 'Some settled funds are waiting for Stripe payout availability.';
  const limitedAvailabilityMessage = stripeCapacityCapped
    ? stripeCapacityMessage
    : settlingMessage;
  const preferenceLabel = payoutSchedule.charAt(0).toUpperCase() + payoutSchedule.slice(1);

  /* -- Data -- */
  const fetchPayoutAvailability = useCallback(async () => {
    try {
      const { data } = await api.get('/withdrawals/availability');
      setPayoutAvailability(data);
      return data as PayoutAvailability;
    } catch {
      return null;
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data } = await api.get('/withdrawals/preferences');
      setPreferences(data);
      const nextSchedule = (data?.payoutSchedule || 'manual') as PayoutSchedule;
      setPayoutSchedule(nextSchedule);
      setDraftSchedule(nextSchedule);
      return data as WithdrawalPreferences;
    } catch {
      return null;
    }
  }, []);

  const fetchPayoutDetails = useCallback(async () => {
    if (payoutCfg.payoutMethod === 'stripe_connect') return null;
    try {
      const { data } = await api.get('/payout-details');
      setPayoutDetails(data);
      return data as PayoutDetailsStatus;
    } catch {
      setPayoutDetails(null);
      return null;
    }
  }, [payoutCfg.payoutMethod]);

  useFocusEffect(useCallback(() => {
    fetchPayoutDetails();
  }, [fetchPayoutDetails]));

  const fetchData = useCallback(async () => {
    try {
      const [{ data }] = await Promise.all([
        api.get('/dashboard'),
        fetchPayoutAvailability(),
        fetchPreferences(),
        fetchPayoutDetails(),
      ]);
      const b = data.employee?.balance ?? data.balance ?? 0;
      setBalance(b);
      setWithdrawals(data.recent_withdrawals ?? []);
      if (data.employee?.payout_schedule) setPayoutSchedule(data.employee.payout_schedule);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [fetchPayoutAvailability, fetchPreferences, fetchPayoutDetails]);
  useEffect(() => { fetchData(); }, [fetchData]);

  /* -- Handlers -- */
  const openForm = (method: SubMethod) => {
    const maxAmount = method.id === 'stripe_connect' ? availableToWithdraw : balance;
    setActiveMethod(method);
    setFieldValues({});
    setFieldErrors({});
    setAmount(maxAmount > 0 ? String(Math.floor(maxAmount)) : '');
    setShowForm(true);
  };

  const checkStripeConnectStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/onboarding/stripe-connect/status');
      setConnectStatus(data);
      return data as StripeConnectStatus;
    } catch {
      showToast('Could not check payout setup. Please try again.', 'error');
      return null;
    }
  }, [showToast]);

  const startStripeConnect = useCallback(async () => {
    setConnectLoading(true);
    connectStatusCheckPending.current = true;
    try {
      const { data } = await api.post('/onboarding/stripe-connect', { countryCode });
      if (!data?.url) throw new Error('Missing onboarding URL');

      await WebBrowser.openBrowserAsync(data.url);
      const status = await checkStripeConnectStatus();
      connectStatusCheckPending.current = false;

      if (status?.detailsSubmitted || status?.payoutsEnabled) {
        showToast('Stripe payout setup connected.', 'success');
        fetchPayoutAvailability();
      }
    } catch (e: any) {
      connectStatusCheckPending.current = false;
      const message = e.response?.data?.error || 'Could not start payout setup. Please try again.';
      showToast(message, 'error');
    } finally {
      setConnectLoading(false);
    }
  }, [checkStripeConnectStatus, countryCode, fetchPayoutAvailability, showToast]);

  useEffect(() => {
    if (payoutCfg.payoutMethod === 'stripe_connect' && !initialConnectCheckDone.current) {
      initialConnectCheckDone.current = true;
      checkStripeConnectStatus();
    }
  }, [checkStripeConnectStatus, payoutCfg.payoutMethod]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && connectStatusCheckPending.current) {
        checkStripeConnectStatus().finally(() => {
          fetchPayoutAvailability();
          connectStatusCheckPending.current = false;
          setConnectLoading(false);
        });
      }
    });
    return () => sub.remove();
  }, [checkStripeConnectStatus, fetchPayoutAvailability]);

  const saveWithdrawalPreferences = async () => {
    setSavingPreferences(true);
    try {
      const { data } = await api.put('/withdrawals/preferences', { payoutSchedule: draftSchedule });
      setPreferences(data);
      setPayoutSchedule((data?.payoutSchedule || draftSchedule) as PayoutSchedule);
      setShowPreferences(false);
      showToast('Withdrawal preferences saved.', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Could not save preferences.', 'error');
    } finally {
      setSavingPreferences(false);
    }
  };

  const openStripePayout = () => {
    if (!connectStatus?.detailsSubmitted || !connectStatus?.payoutsEnabled) {
      showToast('Complete Stripe Express setup before requesting payouts.', 'error');
      return;
    }
    if (stripeFundsSettling) {
      showToast(settlingMessage, 'info');
      return;
    }
    if (availableToWithdraw < minWithdrawal) {
      showToast(hasSettlingFunds
        ? stripeCapacityCapped
          ? stripeCapacityMessage
          : `Only ${formatMoney(availableToWithdraw)} ${cur} is currently available to withdraw. The rest is still settling.`
        : tx('minimum_withdrawal_is', { amount: minWithdrawal, currency: cur }), hasSettlingFunds ? 'info' : 'error');
      return;
    }
    openForm(stripePayoutMethod);
  };

  const openManualPayout = () => {
    if (balance <= 0) { showToast(t('no_funds_withdraw'), 'error'); return; }
    if (balance < minWithdrawal) {
      showToast(tx('minimum_withdrawal_balance', { amount: minWithdrawal.toLocaleString(locale), balance: balance.toFixed(2), currency: cur }), 'error');
      return;
    }
    if (!payoutDetails?.isComplete) {
      showToast('Add your bank details before requesting a withdrawal.', 'info');
      router.push('/member/bank-details' as any);
      return;
    }
    openForm(payoutMethod);
  };

  const openInternational = () => {
    if (payoutCfg.payoutMethod === 'stripe_connect') {
      startStripeConnect();
      return;
    }
    if (payoutCfg.payoutMethod === 'review_needed') {
      showToast('Automatic payouts are not available for this country yet. You can continue with manual payout review.', 'info');
      return;
    }
    openManualPayout();
  };

  const setField = (key: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [key]: val }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  /* -- SnapTip platform fee calc, applied only when withdrawing. */
  const withdrawalAmount = parseFloat(amount) > 0 ? parseFloat(amount) : 0;
  const effectiveFee = Math.round(withdrawalAmount * 0.10 * 100) / 100;
  const receiveAmount = Math.max(0, Math.round((withdrawalAmount - effectiveFee) * 100) / 100);

  /* -- Validation -- */
  const validate = (): boolean => {
    if (!activeMethod) return false;
    const errors: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { showToast(t('enter_valid_amount'), 'error'); return false; }
    if (amt < activeMethod.min) { showToast(tx('minimum_is_for_method', { amount: activeMethod.min, currency: cur, method: activeMethod.label }), 'error'); return false; }
    if (amt > balance) { showToast(t('insufficient_balance'), 'error'); return false; }
    if (activeMethod.id === 'stripe_connect' && amt > availableToWithdraw) {
      showToast(stripeCapacityCapped
        ? `Only ${formatMoney(availableToWithdraw)} ${cur} is currently available to withdraw. ${stripeCapacityMessage}`
        : `Only ${formatMoney(availableToWithdraw)} ${cur} is currently available to withdraw. The rest is still settling.`, 'info');
      return false;
    }

    for (const f of activeMethod.fields) {
      const val = (fieldValues[f.key] || '').trim();
      if (!val) { errors[f.key] = tx('field_required', { field: fieldText('withdraw_field', f.key, f.label) }); continue; }
      if (f.exactLen && val.length !== f.exactLen) errors[f.key] = tx('must_be_exact_digits', { count: f.exactLen });
      if (f.phoneValidation) {
        const cleaned = val.replace(/\s/g, '');
        if (!/^0[67]\d{8}$/.test(cleaned)) errors[f.key] = t('morocco_phone_error');
      }
      if (f.ibanValidation) {
        const cleaned = val.replace(/\s/g, '');
        if (!/^[A-Za-z]{2}/.test(cleaned) || cleaned.length < 15) errors[f.key] = t('iban_error');
      }
      if (f.swiftValidation) {
        const cleaned = val.replace(/\s/g, '');
        if (cleaned.length !== 8 && cleaned.length !== 11) errors[f.key] = t('swift_error');
      }
    }

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); showToast(t('fix_errors_below'), 'error'); return false; }
    return true;
  };

  /* -- Submit -- */
  const handleSubmit = async () => {
    if (!validate() || !activeMethod) return;
    setSubmitting(true);
    const amt = parseFloat(amount);
    const feeToStore = Math.round(amt * 0.10 * 100) / 100;
    const net = Math.max(0, Math.round((amt - feeToStore) * 100) / 100);

    const details: Record<string, string> = activeMethod.id === 'stripe_connect'
      ? {}
      : {
          fullName: (fieldValues.fullName || '').trim(),
          bankName: (fieldValues.bankName || '').trim(),
          accountNumber: (fieldValues.accountNumber || '').trim(),
          country: userCountry,
          currency: cur,
        };

    const contactPhone = activeMethod.id === 'stripe_connect'
      ? ''
      : (fieldValues.accountNumber || '').trim();

    try {
      const { data } = await api.post('/withdrawals/request', {
        amount: amt,
        method: activeMethod.label,
        payout_type: activeMethod.id,
        payout_schedule: payoutSchedule,
        country: userCountry,
        account_details: details,
        contact_phone: contactPhone,
      });
      const newBalance = data.new_balance ?? (balance - amt);
      setBalance(newBalance);
      if (user) updateUser({ balance: newBalance });
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      setLastResult({ amount: amt, fee: feeToStore, net, method: activeMethod.label, currency: cur, processingTime: activeMethod.processingTime });
      fetchPayoutAvailability();
      setShowForm(false);
      setShowSuccess(true);
    } catch (e: any) {
      const response = e.response?.data;
      if (response?.availability) setPayoutAvailability(response.availability);
      if (response?.code === 'funds_settling' || response?.severity === 'info') {
        showToast(response?.message || settlingMessage, 'info');
      } else if (response?.code === 'payout_details_required') {
        showToast(response?.error || 'Add your bank details before requesting a withdrawal.', 'info');
        router.push('/member/bank-details' as any);
      } else {
        showToast(response?.error || t('failed_submit'), 'error');
      }
    } finally { setSubmitting(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  const connectReady = Boolean(connectStatus?.detailsSubmitted || connectStatus?.payoutsEnabled);
  const stripePayoutReady = Boolean(connectStatus?.detailsSubmitted && connectStatus?.payoutsEnabled);
  const connectButtonLabel = connectLoading
    ? 'Opening Stripe...'
    : stripePayoutReady
      ? (stripeFundsSettling ? 'Funds settling' : 'Request payout')
      : connectReady
        ? 'Continue setup'
      : connectStatus
        ? 'Setup incomplete'
        : 'Set up automatic payouts';

  /* ======================================================================
     RENDER
     ====================================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={ACCENT} />}>

        {/* -- Header -- */}
        <LinearGradient colors={['#0d0d30', '#1a1a1a']} style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <SnapTipLogo size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('withdraw_title')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t('balance_deducted_on_request')}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(0,200,150,0.12)', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{balance.toFixed(2)} {cur}</Text>
            </View>
          </View>

          {/* Country info row - display only, not a selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            {countryCode && <CountryFlag code={countryCode} width={20} height={14} style={{ borderRadius: 2 }} />}
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{userCountry}  -  {cur}</Text>
          </View>

          {/* Balance card */}
          <LinearGradient colors={['#0a2a20', '#0d3328']} style={{ borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="wallet" size={16} color={GREEN} />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total balance</Text>
            </View>
            <Text style={{ fontSize: 44, fontWeight: '800', color: GREEN, letterSpacing: -2, marginBottom: 4 }}>{balance.toFixed(2)}</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: isStripeConnectPayout ? 14 : 0 }}>{cur}</Text>
            {isStripeConnectPayout && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>Available to withdraw</Text>
                  <Text style={{ fontSize: 13, color: GREEN, fontWeight: '800' }}>{formatMoney(availableToWithdraw)} {cur}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>Pending settlement</Text>
                  <Text style={{ fontSize: 13, color: hasSettlingFunds ? YELLOW : 'rgba(255,255,255,0.45)', fontWeight: '800' }}>{formatMoney(pendingSettlement)} {cur}</Text>
                </View>
                {hasSettlingFunds && (
                  <View style={{ marginTop: 4, padding: 10, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.18)' }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', lineHeight: 16 }}>{limitedAvailabilityMessage}</Text>
                  </View>
                )}
              </View>
            )}
          </LinearGradient>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>

          <View style={{ backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginTop: 18, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,255,204,0.08)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="options-outline" size={19} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Withdrawal preferences</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
                  Current value: <Text style={{ color: ACCENT, fontWeight: '800' }}>{preferenceLabel}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setDraftSchedule(payoutSchedule); setShowPreferences(true); }} activeOpacity={0.85}
                style={{ height: 34, paddingHorizontal: 14, borderRadius: 50, backgroundColor: 'rgba(0,255,204,0.1)', borderWidth: 1, borderColor: 'rgba(0,255,204,0.2)', justifyContent: 'center' }}>
                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '800' }}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isStripeConnectPayout && (
            <View style={{ backgroundColor: payoutDetails?.isComplete ? 'rgba(0,200,150,0.07)' : 'rgba(245,158,11,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: payoutDetails?.isComplete ? 'rgba(0,200,150,0.18)' : 'rgba(245,158,11,0.18)', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: payoutDetails?.isComplete ? 'rgba(0,200,150,0.12)' : 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={payoutDetails?.isComplete ? 'shield-checkmark-outline' : 'alert-circle-outline'} size={19} color={payoutDetails?.isComplete ? GREEN : YELLOW} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>Bank details</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                    {payoutDetails?.isComplete
                      ? `${payoutDetails.details?.bankName || 'Saved'}${payoutDetails.details?.detailsLast4 ? ` - ending ${payoutDetails.details.detailsLast4}` : ''}`
                      : 'Add your bank details before requesting a withdrawal.'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/member/bank-details' as any)} activeOpacity={0.85}
                  style={{ height: 34, paddingHorizontal: 14, borderRadius: 50, backgroundColor: 'rgba(0,255,204,0.1)', borderWidth: 1, borderColor: 'rgba(0,255,204,0.2)', justifyContent: 'center' }}>
                  <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '900' }}>{payoutDetails?.isComplete ? 'Edit' : 'Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* === Payment Methods === */}
          <Text style={sectionTitle}>{t('transfer_method')}</Text>

          {payoutCfg.payoutMethod === 'stripe_connect' ? (
            <View style={{ marginBottom: 28 }}>
              <View style={{ backgroundColor: 'rgba(0,255,204,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,255,204,0.15)', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="flash-outline" size={16} color={ACCENT} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>Automatic payouts</Text>
                </View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 18 }}>
                  {stripePayoutReady
                    ? 'Stripe Express is connected and payouts are enabled.'
                    : 'Connect a Stripe Express account before requesting payouts.'}
                </Text>
                {payoutSchedule !== 'manual' && (
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 18, marginTop: 6 }}>
                    Automatic withdrawals are enabled. You can still withdraw manually anytime.
                  </Text>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <Text style={{ fontSize: 11, color: connectStatus?.detailsSubmitted ? GREEN : YELLOW, fontWeight: '700' }}>
                    {connectStatus?.detailsSubmitted ? 'Connected' : 'Setup incomplete'}
                  </Text>
                  <Text style={{ fontSize: 11, color: connectStatus?.payoutsEnabled ? GREEN : YELLOW, fontWeight: '700' }}>
                    {connectStatus?.payoutsEnabled ? 'Payouts enabled' : 'Payouts disabled'}
                  </Text>
                </View>
                {hasSettlingFunds && (
                  <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.18)' }}>
                    <Text style={{ fontSize: 12, color: YELLOW, fontWeight: '800', marginBottom: 4 }}>{stripeCapacityCapped ? 'Payout availability' : 'Funds settling'}</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 17 }}>{limitedAvailabilityMessage}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={stripePayoutReady ? openStripePayout : startStripeConnect} disabled={connectLoading || stripeFundsSettling} activeOpacity={0.85}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: stripeFundsSettling ? 'rgba(245,158,11,0.35)' : connectReady ? 'rgba(0,200,150,0.35)' : BORDER, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: connectLoading || stripeFundsSettling ? 0.75 : 1 }}>
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: stripeFundsSettling ? 'rgba(245,158,11,0.12)' : connectReady ? 'rgba(0,200,150,0.12)' : 'rgba(0,255,204,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={stripeFundsSettling ? 'time-outline' : connectReady ? 'checkmark-circle-outline' : 'card-outline'} size={26} color={stripeFundsSettling ? YELLOW : connectReady ? GREEN : ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Stripe Express</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {connectButtonLabel}
                  </Text>
                </View>
                <Ionicons name={connectLoading ? 'hourglass-outline' : 'chevron-forward'} size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          ) : payoutCfg.payoutMethod === 'review_needed' ? (
            <View style={{ marginBottom: 28 }}>
              <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="time-outline" size={16} color={YELLOW} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: YELLOW }}>Payouts under review</Text>
                </View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 18 }}>
                  Automatic payouts are not available for this country yet. You can continue with manual payout review.
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 18, marginTop: 6 }}>
                  Manual payouts are processed after review.
                </Text>
                {payoutSchedule !== 'manual' && (
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 18, marginTop: 6 }}>
                    Automatic withdrawals are enabled. You can still withdraw manually anytime.
                  </Text>
                )}
              </View>

              <TouchableOpacity onPress={openManualPayout} activeOpacity={0.85}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="document-text-outline" size={26} color={YELLOW} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Manual payout review</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{payoutMethod.label}  -  {t('min')} {payoutMethod.min} {cur}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginBottom: 28 }}>
              <View style={{ backgroundColor: 'rgba(0,255,204,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,255,204,0.15)', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="bulb-outline" size={16} color={ACCENT} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>
                    Manual bank transfer
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 18 }}>
                  Manual payouts are processed via Wise Business. Processing: {payoutMethod.processingTime}.
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 18, marginTop: 6 }}>
                  Manual payouts are reviewed and processed by SnapTip.
                </Text>
                {payoutSchedule !== 'manual' && (
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 18, marginTop: 6 }}>
                    Automatic withdrawals are enabled. You can still withdraw manually anytime.
                  </Text>
                )}
              </View>

              <TouchableOpacity onPress={openInternational} activeOpacity={0.85}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(0,255,204,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="business-outline" size={26} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{payoutMethod.label}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{payoutMethod.sublabel}  -  {t('min')} {payoutMethod.min} {cur}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          )}

          {/* === Withdrawal History === */}
          <Text style={sectionTitle}>{t('withdrawal_history')}</Text>
          {loading ? <View style={{ marginTop: 20 }}><SkeletonLoader.TeamList /></View>
          : withdrawals.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="receipt-outline" size={44} color="rgba(255,255,255,0.1)" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>{t('no_withdrawals')}</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' }}>
              {withdrawals.map((w, idx) => {
                const s = STATUS_STYLES[w.status] || STATUS_STYLES.pending;
                return (
                  <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: idx < withdrawals.length - 1 ? 1 : 0, borderBottomColor: BORDER }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: s.bg, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <Ionicons name="arrow-up-outline" size={18} color={s.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{w.method}</Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{formatDate(w.created_at)}</Text>
                      {Number(w.platform_fee_amount || w.fee) > 0 && <Text style={{ fontSize: 11, color: YELLOW, marginTop: 1 }}>SnapTip fee: {Number(w.platform_fee_amount || w.fee).toFixed(2)} {cur}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>-{Number(w.amount).toFixed(2)} {cur}</Text>
                      {Number(w.net_amount) > 0 && Number(w.net_amount) !== Number(w.amount) && <Text style={{ fontSize: 11, color: GREEN }}>{'->'} {Number(w.net_amount).toFixed(2)} {cur}</Text>}
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, backgroundColor: s.bg }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: s.color }}>{t(s.label)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* === Withdrawal Preferences === */}
      <Modal visible={showPreferences} animationType="slide" transparent statusBarTranslucent>
        <TouchableOpacity activeOpacity={1} onPress={() => !savingPreferences && setShowPreferences(false)}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 42 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} /></View>
            <View style={{ paddingHorizontal: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(0,255,204,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="options-outline" size={21} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Edit withdrawal preferences</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 2 }}>Choose how you want to receive your earnings.</Text>
                </View>
                <TouchableOpacity onPress={() => setShowPreferences(false)} disabled={savingPreferences}><Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
              </View>

              {([
                ['manual', 'Manual', 'Withdraw whenever you want once funds are available.'],
                ['weekly', 'Weekly', 'Automatically withdraw available funds once per week.'],
                ['monthly', 'Monthly', 'Automatically withdraw available funds once per month.'],
              ] as [PayoutSchedule, string, string][]).map(([value, label, description]) => {
                const selected = draftSchedule === value;
                return (
                  <TouchableOpacity key={value} onPress={() => setDraftSchedule(value)} activeOpacity={0.85}
                    style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, marginBottom: 10, borderRadius: 16, borderWidth: 1.5, borderColor: selected ? 'rgba(0,255,204,0.45)' : BORDER, backgroundColor: selected ? 'rgba(0,255,204,0.10)' : 'rgba(255,255,255,0.04)' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? ACCENT : 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' }}>
                      {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17, marginTop: 3 }}>{description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 18, marginTop: 6, marginBottom: 16 }}>
                SnapTip fee is applied only when a withdrawal is processed.
              </Text>

              <HapticButton onPress={saveWithdrawalPreferences} disabled={savingPreferences}>
                <LinearGradient colors={['#4facfe', '#00ffcc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ height: 54, borderRadius: 50, justifyContent: 'center', alignItems: 'center', opacity: savingPreferences ? 0.65 : 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{savingPreferences ? 'Saving...' : 'Save preferences'}</Text>
                </LinearGradient>
              </HapticButton>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* === Withdrawal Form Sheet === */}
      <Modal visible={showForm} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {
              // Only close if form is empty (no data entered)
              const hasData = amount !== '' || Object.values(fieldValues).some(v => v !== '');
              if (!submitting && !hasData) setShowForm(false);
            }} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44, maxHeight: '92%' }}>
              <View style={{ alignItems: 'center', paddingVertical: 12 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} /></View>
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              >
                {activeMethod && (<>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,255,204,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={activeMethod.id === 'stripe_connect' ? 'card-outline' : 'business-outline'} size={20} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>{activeMethod.label}</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        {t('available')} <Text style={{ color: GREEN, fontWeight: '700' }}>{formatMoney(activeAvailableToWithdraw)} {cur}</Text>
                        {'  -  '}{t('min')}: <Text style={{ color: 'rgba(255,255,255,0.5)' }}>{activeMethod.min} {cur}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
                  </View>

                  {/* Amount */}
                  <Text style={fieldLabelStyle}>{tx('amount_currency', { currency: cur })}</Text>
                  <View style={inputWrapperStyle}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: GREEN, marginRight: 8 }}>{cur}</Text>
                    <TextInput style={{ flex: 1, color: '#fff', fontSize: 20, fontWeight: '700' }} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={amount} onChangeText={setAmount} />
                    <TouchableOpacity onPress={() => setAmount(String(Math.floor(activeAvailableToWithdraw)))}><Text style={{ fontSize: 12, color: ACCENT, fontWeight: '700' }}>{t('max')}</Text></TouchableOpacity>
                  </View>
                  {activeMethod.id === 'stripe_connect' && hasSettlingFunds && (
                    <Text style={{ fontSize: 11, color: YELLOW, marginBottom: 14, lineHeight: 16 }}>
                      Only {formatMoney(availableToWithdraw)} {cur} is currently available to withdraw. {stripeCapacityCapped ? stripeCapacityMessage : 'The rest is still settling.'}
                    </Text>
                  )}

                  {/* -- Summary Card -- */}
                  {parseFloat(amount) > 0 && (
                    <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)', marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={summaryLabelStyle}>Withdraw</Text>
                        <Text style={summaryValueStyle}>{parseFloat(amount || '0').toFixed(2)} {cur}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={summaryLabelStyle}>SnapTip fee (10%)</Text>
                        <Text style={[summaryValueStyle, { color: YELLOW }]}>-{effectiveFee.toFixed(2)} {cur}</Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>You receive</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: GREEN }}>{receiveAmount.toFixed(2)} {cur}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={summaryLabelStyle}>{t('payment_method_label')}</Text>
                        <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>{activeMethod.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={summaryLabelStyle}>{t('processing_time')}</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{activeMethod.processingTime}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>Your full withdrawal amount is deducted from balance.</Text>
                    </View>
                  )}

                  {/* -- Dynamic Fields -- */}
                  {activeMethod.fields.map(f => (
                    <View key={f.key} style={{ marginBottom: 14 }}>
                      <Text style={[fieldLabelStyle, fieldErrors[f.key] ? { color: RED } : {}]}>{fieldText('withdraw_field', f.key, f.label)}</Text>
                      <View style={[inputRowStyle, fieldErrors[f.key] ? { borderColor: 'rgba(239,68,68,0.5)' } : {}]}>
                        <TextInput style={{ flex: 1, color: '#fff', fontSize: 15 }} placeholder={fieldText('withdraw_placeholder', f.key, f.placeholder)} placeholderTextColor="rgba(255,255,255,0.2)" value={fieldValues[f.key] || ''} onChangeText={val => setField(f.key, val)} keyboardType={f.keyboard} />
                      </View>
                      {fieldErrors[f.key] ? <Text style={{ fontSize: 11, color: RED, marginTop: 4, paddingLeft: 4 }}>{fieldErrors[f.key]}</Text> : null}
                    </View>
                  ))}

                  {/* Submit */}
                  <HapticButton onPress={handleSubmit} disabled={submitting || (activeMethod.id === 'stripe_connect' && activeAvailableToWithdraw <= 0)} style={{ marginTop: 8 }}>
                    <LinearGradient colors={['#4facfe', '#00ffcc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: 56, borderRadius: 50, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, opacity: submitting || (activeMethod.id === 'stripe_connect' && activeAvailableToWithdraw <= 0) ? 0.6 : 1 }}>
                      <Ionicons name={submitting ? 'hourglass-outline' : 'checkmark-circle'} size={20} color="#fff" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{submitting ? t('submitting') : activeMethod.id === 'stripe_connect' && activeAvailableToWithdraw <= 0 ? 'Funds settling' : t('request_withdrawal')}</Text>
                    </LinearGradient>
                  </HapticButton>
                </>)}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* === Success Modal === */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: 24 }}>
          <View style={{ backgroundColor: CARD, borderRadius: 28, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Circle cx="40" cy="40" r="38" stroke="#00C896" strokeWidth="3" fill="none" />
                <SvgPath d="M22 40 L34 52 L58 28" stroke="#00C896" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>{t('withdrawal_requested')}</Text>
            {lastResult && (
              <>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                  {tx('withdrawal_success_body', { amount: lastResult.amount.toFixed(2), currency: lastResult.currency, time: lastResult.processingTime })}
                </Text>
                <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={summaryLabelStyle}>{t('requested')}</Text><Text style={summaryValueStyle}>{lastResult.amount.toFixed(2)} {lastResult.currency}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={summaryLabelStyle}>SnapTip fee (10%)</Text><Text style={[summaryValueStyle, { color: YELLOW }]}>{lastResult.fee.toFixed(2)} {lastResult.currency}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{t('you_receive')}</Text><Text style={{ fontSize: 15, fontWeight: '800', color: GREEN }}>{lastResult.net.toFixed(2)} {lastResult.currency}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, textAlign: 'center' }}>{tx('via_method', { method: lastResult.method })}</Text>
                </View>
              </>
            )}
            <TouchableOpacity onPress={() => { setShowSuccess(false); setLastResult(null); fetchData(); router.back(); }} activeOpacity={0.8}
              style={{ width: '100%', height: 52, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.12)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: GREEN }}>{t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast {...toast} />
    </View>
  );
}

/* -- Shared styles -- */
const sectionTitle = { fontSize: 13 as const, fontWeight: '700' as const, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 14, marginTop: 8 };
const fieldLabelStyle = { fontSize: 12 as const, fontWeight: '600' as const, color: 'rgba(255,255,255,0.5)' as const, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.4 };
const inputWrapperStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, height: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 };
const inputRowStyle = { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, height: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, justifyContent: 'center' as const };
const summaryLabelStyle = { fontSize: 13 as const, color: 'rgba(255,255,255,0.5)' as const };
const summaryValueStyle = { fontSize: 13 as const, fontWeight: '600' as const, color: '#fff' as const };
