import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Image,
  Modal, KeyboardAvoidingView, Platform, RefreshControl, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
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
const BG = '#1a1a1a';
const CARD = '#1a1a1a';
const SHEET_BG = '#1a1a1a';
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

interface MainMethod {
  id: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logo: any;
  subMethods?: SubMethod[];
  directMethod?: SubMethod;
}

const MOROCCAN_METHODS: MainMethod[] = [
  {
    id: 'cashplus', label: 'Cash Plus',
    logo: require('../../assets/images/cashplus_icon.png'),
    subMethods: [
      {
        id: 'cashplus_agency', label: 'Cash Plus Agency', sublabel: 'Pick up cash at any agency',
        fee: 35, min: 400, processingTime: '1 business day',
        fields: [
          { key: 'full_name', label: 'Full Name (as in ID)', placeholder: 'Your full legal name', keyboard: 'default' },
          { key: 'cin', label: 'CIN (ID Number)', placeholder: 'AB123456', keyboard: 'default' },
          { key: 'contact_phone', label: 'Contact Phone', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
        ],
      },
      {
        id: 'cashplus_app', label: 'Cash Plus App', sublabel: 'Receive in your Cash Plus wallet',
        fee: 0, min: 400, processingTime: '1 business day',
        fields: [
          { key: 'phone', label: 'Phone (linked to app)', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
          { key: 'contact_phone', label: 'Contact Phone', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
        ],
      },
    ],
  },
  {
    id: 'wafacash', label: 'Wafacash',
    logo: require('../../assets/images/wafacash_icon.png'),
    subMethods: [
      {
        id: 'wafacash_agency', label: 'Wafacash Agency', sublabel: 'Pick up cash at any agency',
        fee: 35, min: 400, processingTime: '1 business day',
        fields: [
          { key: 'full_name', label: 'Full Name (as in ID)', placeholder: 'Your full legal name', keyboard: 'default' },
          { key: 'cin', label: 'CIN (ID Number)', placeholder: 'AB123456', keyboard: 'default' },
          { key: 'contact_phone', label: 'Contact Phone', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
        ],
      },
      {
        id: 'wafacash_jibi', label: 'Wafacash Jibi App', sublabel: 'Receive in your Jibi wallet',
        fee: 0, min: 400, processingTime: '1 business day',
        fields: [
          { key: 'phone', label: 'Phone (linked to Jibi)', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
          { key: 'contact_phone', label: 'Contact Phone', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
        ],
      },
    ],
  },
  {
    id: 'cih', label: 'CIH Bank',
    logo: require('../../assets/images/cih_icon.png'),
    directMethod: {
      id: 'cih_bank', label: 'CIH Bank', sublabel: 'Direct bank transfer',
      fee: 0, min: 100, processingTime: '1 business day',
      fields: [
        { key: 'full_name', label: 'Full Name', placeholder: 'Your full name', keyboard: 'default' },
        { key: 'rib', label: 'RIB (16 digits)', placeholder: '0000000000000000', keyboard: 'numeric', exactLen: 16 },
        { key: 'contact_phone', label: 'Contact Phone', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
      ],
    },
  },
  {
    id: 'other_bank', label: 'Other Bank',
    logo: null,
    directMethod: {
      id: 'other_moroccan_bank', label: 'Other Moroccan Bank', sublabel: 'Any Moroccan bank',
      fee: 16, min: 100, processingTime: '1 business day',
      fields: [
        { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Attijariwafa Bank', keyboard: 'default' },
        { key: 'full_name', label: 'Account Holder', placeholder: 'Your full name', keyboard: 'default' },
        { key: 'rib', label: 'RIB (24 digits)', placeholder: '000000000000000000000000', keyboard: 'numeric', exactLen: 24 },
        { key: 'contact_phone', label: 'Contact Phone', placeholder: '06XXXXXXXX', keyboard: 'phone-pad', phoneValidation: true },
      ],
    },
  },
];

/* eslint-enable @typescript-eslint/no-require-imports */

/* ======================================================================
   COUNTRY-SPECIFIC PAYOUT METHODS (via Wise Business)
   ====================================================================== */
const EWALLET_NAMES: Record<string, string> = {
  Philippines: 'GCash',
  Indonesia: 'GoPay / OVO / DANA',
  Thailand: 'PromptPay',
};

const EWALLET_PLACEHOLDERS: Record<string, string> = {
  Philippines: '+63 9XX XXX XXXX',
  Indonesia: '+62 8XX XXXX XXXX',
  Thailand: '+66 8X XXX XXXX',
};

const getPayoutMethod = (country: string, minAmount: number): SubMethod => {
  // Europe + UAE -> IBAN only
  if (['France', 'Spain', 'Germany', 'Italy', 'UAE'].includes(country)) {
    const ph = country === 'UAE'
      ? 'AE07 0331 2345 6789 0123 456'
      : 'FR76 3000 1007 9412 3456 7890 185';
    return {
      id: 'iban_transfer', label: 'Bank Transfer (IBAN)', sublabel: 'via Wise Business',
      fee: 0, min: minAmount, processingTime: '1-2 business days',
      fields: [
        { key: 'full_name', label: 'Account Holder Full Name', placeholder: 'Your full legal name', keyboard: 'default' },
        { key: 'iban', label: 'IBAN', placeholder: ph, keyboard: 'default', ibanValidation: true },
        { key: 'contact_phone', label: 'Contact Phone Number', placeholder: '+XX XXX XXX XXXX', keyboard: 'phone-pad' },
      ],
    };
  }
  // USA -> ACH (Routing Number + Account Number)
  if (country === 'United States') {
    return {
      id: 'us_ach', label: 'US Bank Transfer (ACH)', sublabel: 'via Wise Business',
      fee: 0, min: minAmount, processingTime: '1-2 business days',
      fields: [
        { key: 'full_name', label: 'Account Holder Full Name', placeholder: 'Your full legal name', keyboard: 'default' },
        { key: 'routing_number', label: 'Routing Number (9 digits)', placeholder: '021000021', keyboard: 'numeric', exactLen: 9 },
        { key: 'account_number', label: 'Account Number', placeholder: 'Your bank account number', keyboard: 'numeric' },
        { key: 'contact_phone', label: 'Contact Phone Number', placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
      ],
    };
  }
  // Asia -> E-Wallet
  if (EWALLET_NAMES[country]) {
    const walletName = EWALLET_NAMES[country];
    const phonePh = EWALLET_PLACEHOLDERS[country] || '+XX XXX XXX XXXX';
    return {
      id: 'ewallet', label: `E-Wallet (${walletName})`, sublabel: 'via Wise Business',
      fee: 0, min: minAmount, processingTime: '1-2 business days',
      fields: [
        { key: 'full_name', label: 'Full Name (as registered)', placeholder: 'Your full legal name', keyboard: 'default' },
        { key: 'phone', label: `${walletName} Phone Number`, placeholder: phonePh, keyboard: 'phone-pad' },
        { key: 'contact_phone', label: 'Contact Phone (if different)', placeholder: phonePh, keyboard: 'phone-pad' },
      ],
    };
  }
  // Fallback -> full international wire
  return {
    id: 'international_wire', label: 'International Bank Transfer', sublabel: 'via Wise Business',
    fee: 0, min: minAmount, processingTime: '1-3 business days',
    fields: [
      { key: 'full_name', label: 'Account Holder Full Name', placeholder: 'Your full legal name', keyboard: 'default' },
      { key: 'iban', label: 'IBAN', placeholder: 'XX00 0000 0000 0000 0000 000', keyboard: 'default', ibanValidation: true },
      { key: 'swift', label: 'SWIFT / BIC Code', placeholder: 'BNPAFRPPXXX', keyboard: 'default', swiftValidation: true },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Bank of America', keyboard: 'default' },
      { key: 'contact_phone', label: 'Contact Phone Number', placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
    ],
  };
};

/* -- Status styles -- */
const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: YELLOW, bg: 'rgba(245,158,11,0.12)', label: 'pending' },
  paid: { color: GREEN, bg: 'rgba(0,200,150,0.12)', label: 'paid' },
  failed: { color: RED, bg: 'rgba(239,68,68,0.12)', label: 'rejected' },
};

interface Withdrawal { id: number; amount: number; fee: number; net_amount: number; method: string; status: string; created_at: string; }

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
  const isMorocco = userCountry === 'Morocco';
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';
  const payoutCfg = getPayoutConfig(countryCode);
  const minWithdrawal = payoutCfg.minAmount;
  const payoutMethod = useMemo(() => getPayoutMethod(userCountry, minWithdrawal), [userCountry, minWithdrawal]);
  const isEWallet = !!EWALLET_NAMES[userCountry];

  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sub-method picker (Cash Plus / Wafacash)
  const [showSubPicker, setShowSubPicker] = useState(false);
  const [subPickerMethod, setSubPickerMethod] = useState<MainMethod | null>(null);

  // Form sheet
  const [showForm, setShowForm] = useState(false);
  const [activeMethod, setActiveMethod] = useState<SubMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastResult, setLastResult] = useState<{
    amount: number; fee: number; net: number; method: string; currency: string; processingTime: string;
  } | null>(null);

  /* -- Data -- */
  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      const b = data.employee?.balance ?? data.balance ?? 0;
      setBalance(b);
      setWithdrawals(data.recent_withdrawals ?? []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  /* -- Handlers -- */
  const onMainMethodTap = (m: MainMethod) => {
    const min = m.directMethod?.min || 0;
    if (balance <= 0) { showToast(t('no_funds_withdraw'), 'error'); return; }
    if (balance < min) {
      showToast(tx('minimum_withdrawal_is', { amount: min, currency: cur }), 'error'); return;
    }
    if (m.subMethods) { setSubPickerMethod(m); setShowSubPicker(true); }
    else if (m.directMethod) openForm(m.directMethod);
  };

  const openForm = (method: SubMethod) => {
    setActiveMethod(method);
    setFieldValues({});
    setFieldErrors({});
    setAmount(balance > 0 ? String(Math.floor(balance)) : '');
    setShowSubPicker(false);
    setShowForm(true);
  };

  const openInternational = () => {
    if (balance <= 0) { showToast(t('no_funds_withdraw'), 'error'); return; }
    if (balance < minWithdrawal) {
      showToast(tx('minimum_withdrawal_balance', { amount: minWithdrawal.toLocaleString(locale), balance: balance.toFixed(2), currency: cur }), 'error');
      return;
    }
    openForm(payoutMethod);
  };

  const setField = (key: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [key]: val }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  /* -- Wise fee calc -- */
  const wiseFee = !isMorocco && parseFloat(amount) > 0 ? parseFloat(amount) * 0.005 : 0;
  const effectiveFee = isMorocco ? (activeMethod?.fee ?? 0) : wiseFee;

  /* -- Validation -- */
  const validate = (): boolean => {
    if (!activeMethod) return false;
    const errors: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { showToast(t('enter_valid_amount'), 'error'); return false; }
    if (amt < activeMethod.min) { showToast(tx('minimum_is_for_method', { amount: activeMethod.min, currency: cur, method: activeMethod.label }), 'error'); return false; }
    if (amt > balance) { showToast(t('insufficient_balance'), 'error'); return false; }

    for (const f of activeMethod.fields) {
      const val = (fieldValues[f.key] || '').trim();
      if (!val) { errors[f.key] = tx('field_required', { field: fieldText('withdraw_field', f.key, f.label) }); continue; }
      if (f.exactLen && val.length !== f.exactLen) errors[f.key] = tx('must_be_exact_digits', { count: f.exactLen });
      if (f.phoneValidation && isMorocco) {
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
    const feeToStore = isMorocco ? activeMethod.fee : Math.round(wiseFee * 100) / 100;
    const net = amt - feeToStore;

    const details: Record<string, string> = {};
    for (const f of activeMethod.fields) {
      if (f.key !== 'contact_phone') details[f.label] = (fieldValues[f.key] || '').trim();
    }
    details['Country'] = userCountry;
    details['Currency'] = cur;
    if (!isMorocco) details['Wise Fee'] = `${feeToStore.toFixed(2)} ${cur}`;

    const contactPhone = (fieldValues['contact_phone'] || '').trim();

    try {
      const { data } = await api.post('/withdrawals/request', {
        amount: amt,
        method: activeMethod.label,
        payout_type: activeMethod.id,
        country: userCountry,
        account_details: details,
        contact_phone: contactPhone,
      });
      const newBalance = data.new_balance ?? (balance - amt);
      setBalance(newBalance);
      if (user) updateUser({ balance: newBalance });
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      setLastResult({ amount: amt, fee: feeToStore, net, method: activeMethod.label, currency: cur, processingTime: activeMethod.processingTime });
      setShowForm(false);
      setShowSuccess(true);
    } catch (e: any) {
      showToast(e.response?.data?.error || t('failed_submit'), 'error');
    } finally { setSubmitting(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

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
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('available_balance')}</Text>
            </View>
            <Text style={{ fontSize: 44, fontWeight: '800', color: GREEN, letterSpacing: -2, marginBottom: 4 }}>{balance.toFixed(2)}</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{cur}  -  {t('available_to_withdraw')}</Text>
          </LinearGradient>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>

          {/* === Payment Methods === */}
          <Text style={sectionTitle}>{isMorocco ? t('select_payment_method') : t('transfer_method')}</Text>

          {isMorocco ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
              {MOROCCAN_METHODS.map(m => (
                <TouchableOpacity key={m.id} onPress={() => onMainMethodTap(m)} activeOpacity={0.8}
                  style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: BORDER }}>
                  {m.logo ? <Image source={m.logo} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="contain" />
                  : <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.1)', justifyContent: 'center', alignItems: 'center' }}><Ionicons name="business-outline" size={24} color="#94a3b8" /></View>}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{m.label}</Text>
                  {m.subMethods && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{t('tap_to_choose_option')}</Text>}
                  {m.directMethod && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: m.directMethod.fee > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(0,200,150,0.1)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: m.directMethod.fee > 0 ? YELLOW : GREEN }}>{m.directMethod.fee > 0 ? `${t('fee')} ${m.directMethod.fee} MAD` : t('no_fee')}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{t('min')} {m.directMethod.min} MAD</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* -- International (dynamic per country) -- */
            <View style={{ marginBottom: 28 }}>
              {/* Info Card */}
              <View style={{ backgroundColor: 'rgba(0,255,204,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,255,204,0.15)', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name={isEWallet ? 'phone-portrait-outline' : 'bulb-outline'} size={16} color={ACCENT} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>
                    {isEWallet
                      ? `E-Wallet Transfer (${EWALLET_NAMES[userCountry]})`
                      : payoutMethod.id === 'us_ach'
                        ? 'ACH Bank Transfer'
                        : payoutMethod.id === 'iban_transfer'
                          ? 'IBAN Bank Transfer'
                          : 'International Transfer'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 18 }}>
                  {isEWallet
                    ? `Funds sent directly to your ${EWALLET_NAMES[userCountry]} wallet via Wise Business. Processing: ${payoutMethod.processingTime}.`
                    : payoutMethod.id === 'us_ach'
                      ? `Transfers via ACH to your US bank account through Wise Business. Processing: ${payoutMethod.processingTime}. Wise fees (~0.5%) may apply.`
                      : `Transfers processed via Wise Business. Processing: ${payoutMethod.processingTime}. Wise fees (~0.5%) may apply.`}
                </Text>
              </View>

              {/* Method Card */}
              <TouchableOpacity onPress={openInternational} activeOpacity={0.85}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(0,255,204,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  {isEWallet ? (
                    <Ionicons name="phone-portrait-outline" size={26} color={ACCENT} />
                  ) : payoutMethod.id === 'us_ach' ? (
                    <Ionicons name="card-outline" size={26} color={ACCENT} />
                  ) : (
                    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                      <SvgPath d="M3 21h18v-2H3v2zm0-4h2v-4H3v4zm4 0h2v-4H7v4zm4 0h2v-4h-2v4zm4 0h2v-4h-2v4zm4 0h2v-4h-2v4zM1 11l11-7 11 7H1z" fill={ACCENT} />
                    </Svg>
                  )}
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
                      {Number(w.fee) > 0 && <Text style={{ fontSize: 11, color: YELLOW, marginTop: 1 }}>{t('fee')}: {Number(w.fee).toFixed(2)} {cur}</Text>}
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

      {/* === Sub-Method Picker === */}
      <Modal visible={showSubPicker} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowSubPicker(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} /></View>
            <View style={{ paddingHorizontal: 24 }}>
              {subPickerMethod && (<>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                  {subPickerMethod.logo && <Image source={subPickerMethod.logo} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="contain" />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{subPickerMethod.label}</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t('choose_receive_funds')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowSubPicker(false)}><Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
                </View>
                {subPickerMethod.subMethods?.map(sm => (
                  <TouchableOpacity key={sm.id} onPress={() => openForm(sm)} activeOpacity={0.85}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: 1.5, borderColor: BORDER, gap: 14 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: sm.fee > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(0,200,150,0.08)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={sm.fee > 0 ? 'storefront-outline' : 'phone-portrait-outline'} size={22} color={sm.fee > 0 ? YELLOW : GREEN} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{sm.label}</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sm.sublabel}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={{ backgroundColor: sm.fee > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(0,200,150,0.12)', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sm.fee > 0 ? YELLOW : GREEN }}>{sm.fee > 0 ? `${sm.fee} MAD` : t('no_fee')}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{t('min')} {sm.min} MAD</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>)}
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
                      <Ionicons name={isMorocco ? 'card-outline' : 'globe-outline'} size={20} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>{activeMethod.label}</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        {t('available')} <Text style={{ color: GREEN, fontWeight: '700' }}>{balance.toFixed(2)} {cur}</Text>
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
                    <TouchableOpacity onPress={() => setAmount(String(Math.floor(balance)))}><Text style={{ fontSize: 12, color: ACCENT, fontWeight: '700' }}>{t('max')}</Text></TouchableOpacity>
                  </View>

                  {/* -- Summary Card -- */}
                  {parseFloat(amount) > 0 && (
                    <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)', marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={summaryLabelStyle}>{t('requested')}</Text>
                        <Text style={summaryValueStyle}>{parseFloat(amount || '0').toFixed(2)} {cur}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={summaryLabelStyle}>{isMorocco ? t('processing_fee') : t('wise_fee')}</Text>
                        <Text style={[summaryValueStyle, { color: effectiveFee > 0 ? YELLOW : GREEN }]}>
                          {effectiveFee > 0 ? `-${effectiveFee.toFixed(2)} ${cur}` : t('free')}
                        </Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{isMorocco ? t('you_will_receive') : t('estimated_received')}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: GREEN }}>{Math.max(0, parseFloat(amount || '0') - effectiveFee).toFixed(2)} {cur}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={summaryLabelStyle}>{t('payment_method_label')}</Text>
                        <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>{activeMethod.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={summaryLabelStyle}>{t('processing_time')}</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{activeMethod.processingTime}</Text>
                      </View>
                      {!isMorocco && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>{t('wise_fee_note')}</Text>}
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
                  <HapticButton onPress={handleSubmit} disabled={submitting} style={{ marginTop: 8 }}>
                    <LinearGradient colors={['#4facfe', '#00ffcc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: 56, borderRadius: 50, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, opacity: submitting ? 0.6 : 1 }}>
                      <Ionicons name={submitting ? 'hourglass-outline' : 'checkmark-circle'} size={20} color="#fff" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{submitting ? t('submitting') : t('request_withdrawal')}</Text>
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
                    <Text style={summaryLabelStyle}>{t('fee')}</Text><Text style={[summaryValueStyle, { color: YELLOW }]}>{lastResult.fee.toFixed(2)} {lastResult.currency}</Text>
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
