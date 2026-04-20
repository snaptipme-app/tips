import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Image,
  Modal, ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const SHEET_BG = '#0d0d24';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const RED = '#ef4444';

/* ── Method definitions ──────────────────────────────────────────────── */
/* eslint-disable @typescript-eslint/no-require-imports */
const METHODS = [
  {
    id: 'cashplus_agency',
    label: 'Cash Plus (Agency)',
    logo: require('../../assets/images/cashplus_icon.png'),
    fee: 35, min: 400,
    fields: [
      { key: 'full_name',     label: 'Full Name (as in ID)', placeholder: 'Your full legal name', keyboard: 'default' as const },
      { key: 'contact_phone', label: 'Contact Phone',         placeholder: '06XXXXXXXX',           keyboard: 'phone-pad' as const },
      { key: 'cin',           label: 'CIN (ID Number)',       placeholder: 'AB123456',              keyboard: 'default' as const },
    ],
  },
  {
    id: 'cashplus_app',
    label: 'Cash Plus (App)',
    logo: require('../../assets/images/cashplus_icon.png'),
    fee: 0, min: 400,
    fields: [
      { key: 'phone',         label: 'Phone Number (linked to app)', placeholder: '06XXXXXXXX', keyboard: 'phone-pad' as const },
      { key: 'contact_phone', label: 'Contact Phone',                 placeholder: '06XXXXXXXX', keyboard: 'phone-pad' as const },
    ],
  },
  {
    id: 'wafacash_agency',
    label: 'Wafacash (Agency)',
    logo: require('../../assets/images/wafacash_icon.png'),
    fee: 35, min: 400,
    fields: [
      { key: 'full_name',     label: 'Full Name (as in ID)', placeholder: 'Your full legal name', keyboard: 'default' as const },
      { key: 'contact_phone', label: 'Contact Phone',         placeholder: '06XXXXXXXX',           keyboard: 'phone-pad' as const },
      { key: 'cin',           label: 'CIN (ID Number)',       placeholder: 'AB123456',              keyboard: 'default' as const },
    ],
  },
  {
    id: 'wafacash_jibi',
    label: 'Wafacash (Jibi App)',
    logo: require('../../assets/images/wafacash_icon.png'),
    fee: 0, min: 400,
    fields: [
      { key: 'phone',         label: 'Phone Number (linked to Jibi)', placeholder: '06XXXXXXXX', keyboard: 'phone-pad' as const },
      { key: 'contact_phone', label: 'Contact Phone',                  placeholder: '06XXXXXXXX', keyboard: 'phone-pad' as const },
    ],
  },
  {
    id: 'cih',
    label: 'CIH Bank',
    logo: require('../../assets/images/cih_icon.png'),
    fee: 0, min: 100,
    fields: [
      { key: 'full_name',     label: 'Full Name',        placeholder: 'Your full name',          keyboard: 'default' as const },
      { key: 'rib',           label: 'RIB (16 digits)',  placeholder: '0000000000000000',         keyboard: 'numeric' as const, exactLen: 16 },
      { key: 'contact_phone', label: 'Contact Phone',    placeholder: '06XXXXXXXX',               keyboard: 'phone-pad' as const },
    ],
  },
  {
    id: 'other_bank',
    label: 'Other Moroccan Bank',
    logo: null,
    fee: 16, min: 100,
    fields: [
      { key: 'bank_name',     label: 'Bank Name',         placeholder: 'e.g. Attijariwafa Bank', keyboard: 'default' as const },
      { key: 'full_name',     label: 'Account Holder',    placeholder: 'Your full name',          keyboard: 'default' as const },
      { key: 'rib',           label: 'RIB (24 digits)',   placeholder: '000000000000000000000000', keyboard: 'numeric' as const, exactLen: 24 },
      { key: 'contact_phone', label: 'Contact Phone',     placeholder: '06XXXXXXXX',               keyboard: 'phone-pad' as const },
    ],
  },
];
/* eslint-enable @typescript-eslint/no-require-imports */

type MethodDef = typeof METHODS[0];

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: YELLOW, bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
  paid:    { color: GREEN,  bg: 'rgba(0,200,150,0.12)',  label: 'Paid' },
  failed:  { color: RED,    bg: 'rgba(239,68,68,0.12)',  label: 'Rejected' },
};

interface Withdrawal {
  id: number;
  amount: number;
  fee: number;
  net_amount: number;
  method: string;
  status: string;
  created_at: string;
}

export default function MemberWithdraw() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const { toast, showToast } = useToast();

  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sheet state
  const [selectedMethod, setSelectedMethod] = useState<MethodDef | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastWithdrawal, setLastWithdrawal] = useState<{ amount: number; fee: number; net: number; method: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      const newBalance = data.employee?.balance ?? data.balance ?? 0;
      setBalance(newBalance);
      setWithdrawals(data.recent_withdrawals ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openMethod = (m: MethodDef) => {
    setSelectedMethod(m);
    setFieldValues({});
    setFieldErrors({});
    setAmount(balance > 0 ? String(Math.floor(balance)) : '');
    setShowSheet(true);
  };

  const setField = (key: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [key]: val }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    if (!selectedMethod) return false;
    const errors: Record<string, string> = {};

    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { showToast('Enter a valid amount.', 'error'); return false; }
    if (amt < selectedMethod.min) { showToast(`Minimum is $${selectedMethod.min} for ${selectedMethod.label}.`, 'error'); return false; }
    if (amt > balance) { showToast('Insufficient balance.', 'error'); return false; }

    for (const f of selectedMethod.fields) {
      const val = (fieldValues[f.key] || '').trim();
      if (!val) { errors[f.key] = `${f.label} is required.`; continue; }
      if (f.exactLen && val.length !== f.exactLen) {
        errors[f.key] = `${f.label} must be exactly ${f.exactLen} digits.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fix the errors above.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedMethod) return;
    setSubmitting(true);

    const amt = parseFloat(amount);
    const fee = selectedMethod.fee;
    const net = amt - fee;

    // Build account_details object from field values
    const details: Record<string, string> = {};
    for (const f of selectedMethod.fields) {
      if (f.key !== 'contact_phone') {
        details[f.label] = (fieldValues[f.key] || '').trim();
      }
    }
    const contactPhone = (fieldValues['contact_phone'] || '').trim();

    try {
      const { data } = await api.post('/withdrawals/request', {
        amount: amt,
        method: selectedMethod.label,
        account_details: details,
        contact_phone: contactPhone,
      });

      // Update balance in state
      const newBalance = data.new_balance ?? (balance - amt);
      setBalance(newBalance);
      if (user) setUser({ ...user, balance: newBalance });

      if (data.withdrawals) setWithdrawals(data.withdrawals);

      setLastWithdrawal({ amount: amt, fee, net, method: selectedMethod.label });
      setShowSheet(false);
      setShowSuccess(true);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to submit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={ACCENT} />}
      >
        {/* ── Header ── */}
        <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('withdraw_title') || 'Withdraw Funds'}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Balance deducted immediately on request</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(0,200,150,0.12)', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>${balance.toFixed(2)}</Text>
            </View>
          </View>

          {/* Balance card */}
          <LinearGradient colors={['#0a2a20', '#0d3328']} style={{ borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="wallet" size={16} color={GREEN} />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Available Balance</Text>
            </View>
            <Text style={{ fontSize: 46, fontWeight: '800', color: GREEN, letterSpacing: -2, marginBottom: 4 }}>${balance.toFixed(2)}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Available to withdraw</Text>
          </LinearGradient>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Method Grid ── */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8, marginBottom: 14 }}>
            Select Payment Method
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            {METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => balance > 0 ? openMethod(m) : showToast('No funds to withdraw.', 'error')}
                activeOpacity={0.8}
                style={{
                  width: '48%',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 16, padding: 18,
                  alignItems: 'center', gap: 10,
                  borderWidth: 1.5, borderColor: BORDER,
                }}
              >
                {m.logo ? (
                  <Image source={m.logo} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="business-outline" size={24} color="#94a3b8" />
                  </View>
                )}
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{m.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: m.fee > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(0,200,150,0.1)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: m.fee > 0 ? YELLOW : GREEN }}>
                      {m.fee > 0 ? `Fee $${m.fee}` : 'No Fee'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Min ${m.min}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Withdrawal History ── */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            {t('withdrawal_history') || 'Withdrawal History'}
          </Text>

          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
          ) : withdrawals.length === 0 ? (
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
                      {Number(w.fee) > 0 && (
                        <Text style={{ fontSize: 11, color: YELLOW, marginTop: 1 }}>Fee: ${Number(w.fee).toFixed(2)}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>-${Number(w.amount).toFixed(2)}</Text>
                      {Number(w.net_amount) > 0 && Number(w.net_amount) !== Number(w.amount) && (
                        <Text style={{ fontSize: 11, color: GREEN }}>→ ${Number(w.net_amount).toFixed(2)}</Text>
                      )}
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

      {/* ═══ Method Form Bottom Sheet ═══ */}
      <Modal visible={showSheet} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => !submitting && setShowSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44, maxHeight: '92%' }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </View>

              <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
                {selectedMethod && (
                  <>
                    {/* Method header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                      {selectedMethod.logo ? (
                        <Image source={selectedMethod.logo} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="contain" />
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="business-outline" size={22} color="#94a3b8" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>{selectedMethod.label}</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                          Available: <Text style={{ color: GREEN, fontWeight: '700' }}>${balance.toFixed(2)}</Text>
                          {'  ·  Minimum: '}<Text style={{ color: 'rgba(255,255,255,0.5)' }}>${selectedMethod.min}</Text>
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowSheet(false)}>
                        <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
                      </TouchableOpacity>
                    </View>

                    {/* Amount */}
                    <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, height: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: GREEN, marginRight: 8 }}>$</Text>
                      <TextInput
                        style={{ flex: 1, color: '#fff', fontSize: 20, fontWeight: '700' }}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={amount}
                        onChangeText={setAmount}
                      />
                      <TouchableOpacity onPress={() => setAmount(String(Math.floor(balance)))}>
                        <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '700' }}>MAX</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Summary Card */}
                    {parseFloat(amount) > 0 && (
                      <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)', marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Requested</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>${parseFloat(amount || '0').toFixed(2)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Processing Fee</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: selectedMethod.fee > 0 ? YELLOW : GREEN }}>
                            {selectedMethod.fee > 0 ? `-$${selectedMethod.fee}` : 'Free'}
                          </Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>You will receive</Text>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: GREEN }}>
                            ${Math.max(0, parseFloat(amount || '0') - selectedMethod.fee).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Dynamic Fields */}
                    {selectedMethod.fields.map(f => (
                      <View key={f.key} style={{ marginBottom: 14 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: fieldErrors[f.key] ? RED : 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          {f.label}
                        </Text>
                        <View style={{
                          backgroundColor: 'rgba(255,255,255,0.07)',
                          borderRadius: 14, height: 52, paddingHorizontal: 16,
                          borderWidth: 1, borderColor: fieldErrors[f.key] ? 'rgba(239,68,68,0.5)' : BORDER,
                          justifyContent: 'center',
                        }}>
                          <TextInput
                            style={{ color: '#fff', fontSize: 15 }}
                            placeholder={f.placeholder}
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={fieldValues[f.key] || ''}
                            onChangeText={val => setField(f.key, val)}
                            keyboardType={f.keyboard}
                          />
                        </View>
                        {fieldErrors[f.key] ? (
                          <Text style={{ fontSize: 11, color: RED, marginTop: 4 }}>{fieldErrors[f.key]}</Text>
                        ) : null}
                      </View>
                    ))}

                    {/* Submit */}
                    <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.85} style={{ marginTop: 8 }}>
                      <LinearGradient
                        colors={['#4facfe', '#a855f7']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{
                          height: 56, borderRadius: 50,
                          justifyContent: 'center', alignItems: 'center',
                          flexDirection: 'row', gap: 10,
                          opacity: submitting ? 0.6 : 1,
                        }}
                      >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                          {submitting ? 'Submitting...' : 'Request Withdrawal'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Success Modal ═══ */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: 24 }}>
          <View style={{ backgroundColor: CARD, borderRadius: 28, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
            {/* Icon */}
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(0,200,150,0.3)' }}>
              <Text style={{ fontSize: 32 }}>💸</Text>
            </View>

            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Request Submitted!</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              Your withdrawal request is pending admin review. You'll receive an email confirmation once it's processed.
            </Text>

            {lastWithdrawal && (
              <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Requested</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>${lastWithdrawal.amount.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Fee</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: YELLOW }}>${lastWithdrawal.fee.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>You will receive</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: GREEN }}>${lastWithdrawal.net.toFixed(2)}</Text>
                </View>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, textAlign: 'center' }}>via {lastWithdrawal.method}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => { setShowSuccess(false); setLastWithdrawal(null); }}
              activeOpacity={0.8}
              style={{ width: '100%', height: 52, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.12)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: GREEN }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast {...toast} />
    </View>
  );
}
