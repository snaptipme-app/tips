import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList, Image,
  RefreshControl, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
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

/* eslint-disable @typescript-eslint/no-require-imports */
const METHODS = [
  {
    id: 'cih', label: 'CIH Bank',
    logo: require('../../assets/images/cih_icon.png'),
    placeholder: 'RIB number (24 digits)',
    keyboardType: 'numeric' as const,
  },
  {
    id: 'cashplus', label: 'Cash Plus',
    logo: require('../../assets/images/cashplus_icon.png'),
    placeholder: 'Phone number',
    keyboardType: 'phone-pad' as const,
  },
  {
    id: 'wafacash', label: 'Wafa Cash',
    logo: require('../../assets/images/wafacash_icon.png'),
    placeholder: 'Phone number',
    keyboardType: 'phone-pad' as const,
  },
  {
    id: 'other', label: 'Other Bank',
    logo: null,
    placeholder: 'RIB or account details',
    keyboardType: 'default' as const,
  },
];
/* eslint-enable @typescript-eslint/no-require-imports */

interface Withdrawal {
  id: number;
  amount: number;
  method: string;
  account_details: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: YELLOW, bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
  completed: { color: GREEN,  bg: 'rgba(0,200,150,0.12)',  label: 'Completed' },
  failed:    { color: RED,    bg: 'rgba(239,68,68,0.12)',   label: 'Rejected' },
  rejected:  { color: RED,    bg: 'rgba(239,68,68,0.12)',   label: 'Rejected' },
};

export default function MemberWithdraw() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const { toast, showToast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet state
  const [showSheet, setShowSheet] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<typeof METHODS[0] | null>(null);
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      setBalance(data.employee?.balance ?? data.balance ?? 0);
      setWithdrawals(data.recent_withdrawals ?? []);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openMethodSheet = (m: typeof METHODS[0]) => {
    setSelectedMethod(m);
    setAmount(balance > 0 ? String(balance) : '');
    setAccountDetails('');
    setShowSheet(true);
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast('Enter a valid amount.', 'error'); return; }
    if (amt > balance) { showToast('Insufficient balance.', 'error'); return; }
    if (!accountDetails.trim()) { showToast('Enter your account details.', 'error'); return; }
    if (!selectedMethod) return;

    setSubmitting(true);
    try {
      await api.post('/withdrawals/request', {
        amount: amt,
        method: selectedMethod.label,
        account_details: accountDetails.trim(),
      });
      const newBalance = balance - amt;
      setBalance(newBalance);
      if (user) setUser({ ...user, balance: newBalance });
      showToast('Withdrawal request submitted!', 'success');
      setShowSheet(false);
      setAmount('');
      setAccountDetails('');
      setSelectedMethod(null);
      fetchData();
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
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={ACCENT}
          />
        }
      >
        {/* ── Header ── */}
        <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('withdraw_title')}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t('request_payout')}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(0,200,150,0.12)', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: GREEN }}>${balance.toFixed(2)}</Text>
            </View>
          </View>

          {/* ── Available Balance Card ── */}
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
              </View>
              <Text style={{ fontSize: 48, fontWeight: '800', color: GREEN, letterSpacing: -2, marginBottom: 4 }}>
                ${balance.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                {t('available_to_withdraw') || 'Available to withdraw'}
              </Text>
            </LinearGradient>
          )}
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Select Payment Method ── */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14, marginTop: 8 }}>
            {t('select_method') || 'Select Payment Method'}
          </Text>

          {/* 2×2 Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            {METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => balance > 0 ? openMethodSheet(m) : showToast('No funds available.', 'error')}
                activeOpacity={0.8}
                style={{
                  width: '48%',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: selectedMethod?.id === m.id ? 'rgba(108,108,255,0.5)' : BORDER,
                  gap: 10,
                }}
              >
                {m.logo ? (
                  <Image source={m.logo} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="business-outline" size={24} color="#94a3b8" />
                  </View>
                )}
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Withdrawal History ── */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            {t('withdrawal_history')}
          </Text>

          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
          ) : withdrawals.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="receipt-outline" size={44} color="rgba(255,255,255,0.1)" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>{t('no_withdrawals')}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                {t('no_withdrawals_desc')}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' }}>
              {withdrawals.map((w, idx) => {
                const s = STATUS_STYLES[w.status] || STATUS_STYLES.pending;
                return (
                  <View
                    key={w.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 16,
                      borderBottomWidth: idx < withdrawals.length - 1 ? 1 : 0,
                      borderBottomColor: BORDER,
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: s.bg, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <Ionicons name="arrow-up-outline" size={18} color={s.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{w.method}</Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{formatDate(w.created_at)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>-${Number(w.amount).toFixed(2)}</Text>
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

      {/* ═══ Withdrawal Bottom Sheet ═══ */}
      <Modal visible={showSheet} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => !submitting && setShowSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              </View>

              <View style={{ paddingHorizontal: 24 }}>
                {/* Method header */}
                {selectedMethod && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                    {selectedMethod.logo ? (
                      <Image source={selectedMethod.logo} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="contain" />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="business-outline" size={22} color="#94a3b8" />
                      </View>
                    )}
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{selectedMethod.label}</Text>
                      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                        {t('available')}: <Text style={{ color: GREEN, fontWeight: '700' }}>${balance.toFixed(2)}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowSheet(false)} style={{ marginLeft: 'auto' }}>
                      <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Amount */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{t('amount')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, height: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: GREEN, marginRight: 8 }}>$</Text>
                  <TextInput
                    style={{ flex: 1, color: '#fff', fontSize: 22, fontWeight: '700' }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <TouchableOpacity onPress={() => setAmount(String(balance))}>
                    <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '700' }}>MAX</Text>
                  </TouchableOpacity>
                </View>

                {/* Account Details */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  {selectedMethod?.id === 'cih' || selectedMethod?.id === 'other' ? t('rib_account') : t('phone_number') || 'Phone Number'}
                </Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, height: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', marginBottom: 24 }}>
                  <TextInput
                    style={{ color: '#fff', fontSize: 16 }}
                    placeholder={selectedMethod?.placeholder || 'Enter details'}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={accountDetails}
                    onChangeText={setAccountDetails}
                    keyboardType={selectedMethod?.keyboardType || 'default'}
                  />
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
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
                      {submitting ? t('submitting') : t('submit_request')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Toast {...toast} />
    </View>
  );
}
