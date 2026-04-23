import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Image,
  Modal, ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { Toast, useToast } from '../../components/Toast';
import SnapTipLogo from '../../components/SnapTipLogo';

/* ── Design tokens ── */
const BG = '#080818';
const CARD = '#0f0f2e';
const SHEET_BG = '#0d0d24';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const RED = '#ef4444';

/* ══════════════════════════════════════════════════════════════════════
   COUNTRY → FLAG MAP
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @typescript-eslint/no-require-imports */
const COUNTRY_FLAG_IMAGES: Record<string, any> = {
  'Morocco': require('../../assets/images/morocco_icon.png'),
  'United States': require('../../assets/images/us_icon.png'),
  'France': require('../../assets/images/france_icon.png'),
  'Spain': require('../../assets/images/spain_icon.png'),
  'UAE': require('../../assets/images/uae_icon.png'),
};

/* ══════════════════════════════════════════════════════════════════════
   METHOD DEFINITIONS
   ══════════════════════════════════════════════════════════════════════ */
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

const INTERNATIONAL_METHOD: SubMethod = {
  id: 'international_wire', label: 'International Bank Transfer', sublabel: 'via Wise',
  fee: 0, min: 50, processingTime: '1-3 business days',
  fields: [
    { key: 'full_name', label: 'Account Holder Full Name', placeholder: 'Your full legal name', keyboard: 'default' },
    { key: 'iban', label: 'IBAN', placeholder: 'FR76 3000 1007 9412 3456 7890 185', keyboard: 'default', ibanValidation: true },
    { key: 'swift', label: 'SWIFT / BIC Code', placeholder: 'BNPAFRPPXXX', keyboard: 'default', swiftValidation: true },
    { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Bank of America', keyboard: 'default' },
    { key: 'contact_phone', label: 'Contact Phone Number', placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
  ],
};
/* eslint-enable @typescript-eslint/no-require-imports */

/* ── Status styles ── */
const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: YELLOW, bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
  paid: { color: GREEN, bg: 'rgba(0,200,150,0.12)', label: 'Paid' },
  failed: { color: RED, bg: 'rgba(239,68,68,0.12)', label: 'Rejected' },
};

interface Withdrawal { id: number; amount: number; fee: number; net_amount: number; method: string; status: string; created_at: string; }

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export default function MemberWithdraw() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const { toast, showToast } = useToast();

  const userCountry = user?.country || 'Morocco';
  const cur = user?.currency || 'MAD';
  const isMorocco = userCountry === 'Morocco';
  const countryFlagSource = COUNTRY_FLAG_IMAGES[userCountry] || null;

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

  /* ── Data ── */
  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      const b = data.employee?.balance ?? data.balance ?? 0;
      setBalance(b);
      setWithdrawals(data.recent_withdrawals ?? []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Handlers ── */
  const onMainMethodTap = (m: MainMethod) => {
    if (balance <= 0) { showToast('No funds to withdraw.', 'error'); return; }
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
    if (balance <= 0) { showToast('No funds to withdraw.', 'error'); return; }
    openForm(INTERNATIONAL_METHOD);
  };

  const setField = (key: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [key]: val }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  /* ── Wise fee calc ── */
  const wiseFee = !isMorocco && parseFloat(amount) > 0 ? parseFloat(amount) * 0.005 : 0;
  const effectiveFee = isMorocco ? (activeMethod?.fee ?? 0) : wiseFee;

  /* ── Validation ── */
  const validate = (): boolean => {
    if (!activeMethod) return false;
    const errors: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { showToast('Enter a valid amount.', 'error'); return false; }
    if (amt < activeMethod.min) { showToast(`Minimum is ${activeMethod.min} ${cur} for ${activeMethod.label}.`, 'error'); return false; }
    if (amt > balance) { showToast('Insufficient balance.', 'error'); return false; }

    for (const f of activeMethod.fields) {
      const val = (fieldValues[f.key] || '').trim();
      if (!val) { errors[f.key] = `${f.label} is required.`; continue; }
      if (f.exactLen && val.length !== f.exactLen) errors[f.key] = `Must be exactly ${f.exactLen} digits.`;
      if (f.phoneValidation && isMorocco) {
        const cleaned = val.replace(/\s/g, '');
        if (!/^0[67]\d{8}$/.test(cleaned)) errors[f.key] = 'Must start with 06 or 07 and be 10 digits.';
      }
      if (f.ibanValidation) {
        const cleaned = val.replace(/\s/g, '');
        if (!/^[A-Za-z]{2}/.test(cleaned) || cleaned.length < 15) errors[f.key] = 'IBAN must start with 2 letters, min 15 characters.';
      }
      if (f.swiftValidation) {
        const cleaned = val.replace(/\s/g, '');
        if (cleaned.length !== 8 && cleaned.length !== 11) errors[f.key] = 'SWIFT/BIC must be 8 or 11 characters.';
      }
    }

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); showToast('Please fix the errors below.', 'error'); return false; }
    return true;
  };

  /* ── Submit ── */
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
        account_details: details,
        contact_phone: contactPhone,
      });
      const newBalance = data.new_balance ?? (balance - amt);
      setBalance(newBalance);
      if (user) setUser({ ...user, balance: newBalance });
      if (data.withdrawals) setWithdrawals(data.withdrawals);
      setLastResult({ amount: amt, fee: feeToStore, net, method: activeMethod.label, currency: cur, processingTime: activeMethod.processingTime });
      setShowForm(false);
      setShowSuccess(true);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to submit.', 'error');
    } finally { setSubmitting(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={ACCENT} />}>

        {/* ── Header ── */}
        <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <SnapTipLogo size="small" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Withdraw Earnings</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Balance deducted immediately on request</Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(0,200,150,0.12)', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{balance.toFixed(2)} {cur}</Text>
            </View>
          </View>

          {/* Country info row — display only, not a selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            {countryFlagSource && <Image source={countryFlagSource} style={{ width: 20, height: 20, borderRadius: 4 }} resizeMode="contain" />}
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{userCountry} · {cur}</Text>
          </View>

          {/* Balance card */}
          <LinearGradient colors={['#0a2a20', '#0d3328']} style={{ borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="wallet" size={16} color={GREEN} />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Available Balance</Text>
            </View>
            <Text style={{ fontSize: 44, fontWeight: '800', color: GREEN, letterSpacing: -2, marginBottom: 4 }}>{balance.toFixed(2)}</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{cur} · Available to withdraw</Text>
          </LinearGradient>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>

          {/* ═══ Payment Methods ═══ */}
          <Text style={sectionTitle}>{isMorocco ? 'Select Payment Method' : 'Transfer Method'}</Text>

          {isMorocco ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
              {MOROCCAN_METHODS.map(m => (
                <TouchableOpacity key={m.id} onPress={() => onMainMethodTap(m)} activeOpacity={0.8}
                  style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: BORDER }}>
                  {m.logo ? <Image source={m.logo} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="contain" />
                  : <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.1)', justifyContent: 'center', alignItems: 'center' }}><Ionicons name="business-outline" size={24} color="#94a3b8" /></View>}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{m.label}</Text>
                  {m.subMethods && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Tap to choose option</Text>}
                  {m.directMethod && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: m.directMethod.fee > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(0,200,150,0.1)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: m.directMethod.fee > 0 ? YELLOW : GREEN }}>{m.directMethod.fee > 0 ? `Fee ${m.directMethod.fee} MAD` : 'No Fee'}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Min {m.directMethod.min} MAD</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* ── International ── */
            <View style={{ marginBottom: 28 }}>
              <View style={{ backgroundColor: 'rgba(108,108,255,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(108,108,255,0.15)', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 16 }}>💡</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>International Transfers</Text>
                </View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 18 }}>
                  Transfers processed via Wise. Processing time: 1-3 business days. Wise fees (~0.5%) will be deducted from your amount.
                </Text>
              </View>
              <TouchableOpacity onPress={openInternational} activeOpacity={0.85}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="globe-outline" size={26} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>International Bank Transfer</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>via Wise · Min {INTERNATIONAL_METHOD.min} {cur}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          )}

          {/* ═══ Withdrawal History ═══ */}
          <Text style={sectionTitle}>{t('withdrawal_history') || 'Withdrawal History'}</Text>
          {loading ? <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
          : withdrawals.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="receipt-outline" size={44} color="rgba(255,255,255,0.1)" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>No withdrawals yet</Text>
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
                      {Number(w.fee) > 0 && <Text style={{ fontSize: 11, color: YELLOW, marginTop: 1 }}>Fee: {Number(w.fee).toFixed(2)} {cur}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>-{Number(w.amount).toFixed(2)} {cur}</Text>
                      {Number(w.net_amount) > 0 && Number(w.net_amount) !== Number(w.amount) && <Text style={{ fontSize: 11, color: GREEN }}>→ {Number(w.net_amount).toFixed(2)} {cur}</Text>}
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, backgroundColor: s.bg }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: s.color }}>{s.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═══ Sub-Method Picker ═══ */}
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
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Choose how to receive your funds</Text>
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
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sm.fee > 0 ? YELLOW : GREEN }}>{sm.fee > 0 ? `${sm.fee} MAD` : 'No Fee'}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Min {sm.min} MAD</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>)}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Withdrawal Form Sheet ═══ */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => !submitting && setShowForm(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44, maxHeight: '92%' }}>
              <View style={{ alignItems: 'center', paddingVertical: 12 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} /></View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
                {activeMethod && (<>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(108,108,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={isMorocco ? 'card-outline' : 'globe-outline'} size={20} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>{activeMethod.label}</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        Available: <Text style={{ color: GREEN, fontWeight: '700' }}>{balance.toFixed(2)} {cur}</Text>
                        {'  ·  Min: '}<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{activeMethod.min} {cur}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
                  </View>

                  {/* Amount */}
                  <Text style={fieldLabelStyle}>Amount ({cur})</Text>
                  <View style={inputWrapperStyle}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: GREEN, marginRight: 8 }}>{cur}</Text>
                    <TextInput style={{ flex: 1, color: '#fff', fontSize: 20, fontWeight: '700' }} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={amount} onChangeText={setAmount} />
                    <TouchableOpacity onPress={() => setAmount(String(Math.floor(balance)))}><Text style={{ fontSize: 12, color: ACCENT, fontWeight: '700' }}>MAX</Text></TouchableOpacity>
                  </View>

                  {/* ── Summary Card ── */}
                  {parseFloat(amount) > 0 && (
                    <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)', marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={summaryLabelStyle}>Requested</Text>
                        <Text style={summaryValueStyle}>{parseFloat(amount || '0').toFixed(2)} {cur}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={summaryLabelStyle}>{isMorocco ? 'Processing Fee' : 'Wise Fee (~0.5%)'}</Text>
                        <Text style={[summaryValueStyle, { color: effectiveFee > 0 ? YELLOW : GREEN }]}>
                          {effectiveFee > 0 ? `-${effectiveFee.toFixed(2)} ${cur}` : 'Free'}
                        </Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{isMorocco ? 'You will receive' : 'Estimated received'}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: GREEN }}>{Math.max(0, parseFloat(amount || '0') - effectiveFee).toFixed(2)} {cur}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={summaryLabelStyle}>Payment Method</Text>
                        <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>{activeMethod.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={summaryLabelStyle}>Processing Time</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{activeMethod.processingTime}</Text>
                      </View>
                      {!isMorocco && <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>Note: Actual Wise fees may vary slightly</Text>}
                    </View>
                  )}

                  {/* ── Dynamic Fields ── */}
                  {activeMethod.fields.map(f => (
                    <View key={f.key} style={{ marginBottom: 14 }}>
                      <Text style={[fieldLabelStyle, fieldErrors[f.key] ? { color: RED } : {}]}>{f.label}</Text>
                      <View style={[inputRowStyle, fieldErrors[f.key] ? { borderColor: 'rgba(239,68,68,0.5)' } : {}]}>
                        <TextInput style={{ flex: 1, color: '#fff', fontSize: 15 }} placeholder={f.placeholder} placeholderTextColor="rgba(255,255,255,0.2)" value={fieldValues[f.key] || ''} onChangeText={val => setField(f.key, val)} keyboardType={f.keyboard} />
                      </View>
                      {fieldErrors[f.key] ? <Text style={{ fontSize: 11, color: RED, marginTop: 4, paddingLeft: 4 }}>{fieldErrors[f.key]}</Text> : null}
                    </View>
                  ))}

                  {/* Submit */}
                  <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.85} style={{ marginTop: 8 }}>
                    <LinearGradient colors={['#4facfe', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: 56, borderRadius: 50, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, opacity: submitting ? 0.6 : 1 }}>
                      {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{submitting ? 'Submitting...' : 'Request Withdrawal'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>)}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Success Modal ═══ */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: 24 }}>
          <View style={{ backgroundColor: CARD, borderRadius: 28, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(0,200,150,0.3)' }}>
              <Text style={{ fontSize: 32 }}>✅</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Withdrawal Requested!</Text>
            {lastResult && (
              <>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                  Your request for {lastResult.amount.toFixed(2)} {lastResult.currency} has been submitted.
                  {'\n'}We'll process it within {lastResult.processingTime}.
                  {'\n'}You'll receive an email confirmation.
                </Text>
                <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={summaryLabelStyle}>Requested</Text><Text style={summaryValueStyle}>{lastResult.amount.toFixed(2)} {lastResult.currency}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={summaryLabelStyle}>Fee</Text><Text style={[summaryValueStyle, { color: YELLOW }]}>{lastResult.fee.toFixed(2)} {lastResult.currency}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>You receive</Text><Text style={{ fontSize: 15, fontWeight: '800', color: GREEN }}>{lastResult.net.toFixed(2)} {lastResult.currency}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, textAlign: 'center' }}>via {lastResult.method}</Text>
                </View>
              </>
            )}
            <TouchableOpacity onPress={() => { setShowSuccess(false); setLastResult(null); fetchData(); router.back(); }} activeOpacity={0.8}
              style={{ width: '100%', height: 52, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.12)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: GREEN }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast {...toast} />
    </View>
  );
}

/* ── Shared styles ── */
const sectionTitle = { fontSize: 13 as const, fontWeight: '700' as const, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 14, marginTop: 8 };
const fieldLabelStyle = { fontSize: 12 as const, fontWeight: '600' as const, color: 'rgba(255,255,255,0.5)' as const, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.4 };
const inputWrapperStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, height: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 };
const inputRowStyle = { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, height: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, justifyContent: 'center' as const };
const summaryLabelStyle = { fontSize: 13 as const, color: 'rgba(255,255,255,0.5)' as const };
const summaryValueStyle = { fontSize: 13 as const, fontWeight: '600' as const, color: '#fff' as const };
