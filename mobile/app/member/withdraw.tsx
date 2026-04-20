import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  RefreshControl, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const SHEET_BG = '#0d0d24';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const RED = '#ef4444';

const METHODS = ['CIH Bank', 'Cash Plus', 'Wafa Cash', 'Other Bank'];

interface Withdrawal {
  id: number;
  amount: number;
  method: string;
  account_details: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: any }> = {
  pending:   { color: YELLOW, bg: 'rgba(245,158,11,0.12)', icon: 'time-outline' },
  completed: { color: GREEN,  bg: 'rgba(0,200,150,0.12)',  icon: 'checkmark-circle' },
  failed:    { color: RED,    bg: 'rgba(239,68,68,0.12)',   icon: 'close-circle' },
};

export default function MemberWithdraw() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { toast, showToast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
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

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast('Enter a valid amount.', 'error'); return; }
    if (amt > balance) { showToast('Insufficient balance.', 'error'); return; }
    if (!method) { showToast('Select a withdrawal method.', 'error'); return; }
    if (!accountDetails.trim()) { showToast('Enter your account details.', 'error'); return; }

    setSubmitting(true);
    try {
      await api.post('/withdrawals/request', { amount: amt, method, account_details: accountDetails.trim() });
      const newBalance = balance - amt;
      setBalance(newBalance);
      if (user) setUser({ ...user, balance: newBalance });
      showToast('Withdrawal request submitted!', 'success');
      setShowSheet(false);
      setAmount('');
      setMethod('');
      setAccountDetails('');
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to submit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderWithdrawal = ({ item, index }: { item: Withdrawal; index: number }) => {
    const s = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', padding: 16,
        borderBottomWidth: index < withdrawals.length - 1 ? 1 : 0,
        borderBottomColor: BORDER,
      }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: s.bg, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
          <Ionicons name={s.icon} size={20} color={s.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{item.method}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>-${Number(item.amount).toFixed(2)}</Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, backgroundColor: s.bg }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: s.color, textTransform: 'capitalize' }}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Withdraw Earnings</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Request your payout</Text>
          </View>
        </View>

        {/* Balance Summary */}
        <LinearGradient colors={['#0a2a20', '#0d3025']} style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Available Balance</Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: GREEN }}>${balance.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => balance > 0 ? setShowSheet(true) : showToast('No funds available to withdraw.', 'error')}
            activeOpacity={0.8}
            style={{ backgroundColor: GREEN, borderRadius: 50, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="arrow-up-circle" size={18} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Cash Out</Text>
          </TouchableOpacity>
        </LinearGradient>
      </LinearGradient>

      {/* Withdrawal History */}
      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={withdrawals}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderWithdrawal}
          contentContainerStyle={{ marginHorizontal: 20, borderRadius: 20, borderWidth: withdrawals.length > 0 ? 1 : 0, borderColor: BORDER, overflow: 'hidden', backgroundColor: withdrawals.length > 0 ? CARD : 'transparent', flexGrow: 1, marginTop: 20 }}
          ListHeaderComponent={
            withdrawals.length > 0 ? (
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Withdrawal History</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="receipt-outline" size={44} color="rgba(255,255,255,0.1)" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>No withdrawals yet</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>Your withdrawal history will appear here</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={ACCENT} />
          }
        />
      )}

      {/* ── Cash Out Bottom Sheet ── */}
      <Modal visible={showSheet} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => !submitting && setShowSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              </View>

              <View style={{ paddingHorizontal: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Cash Out</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                  Available: <Text style={{ color: GREEN, fontWeight: '700' }}>${balance.toFixed(2)}</Text>
                </Text>

                {/* Amount */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Amount</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, height: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: GREEN, marginRight: 8 }}>$</Text>
                  <TextInput
                    style={{ flex: 1, color: '#fff', fontSize: 20, fontWeight: '700' }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <TouchableOpacity onPress={() => setAmount(String(balance))}>
                    <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>MAX</Text>
                  </TouchableOpacity>
                </View>

                {amount && parseFloat(amount) > 0 && (
                  <View style={{ backgroundColor: 'rgba(0,200,150,0.06)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(0,200,150,0.15)', marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                      You will receive: <Text style={{ color: GREEN, fontWeight: '700' }}>${parseFloat(amount || '0').toFixed(2)}</Text>
                    </Text>
                  </View>
                )}

                {/* Method */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Method</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {METHODS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setMethod(m)}
                      activeOpacity={0.8}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1.5, borderColor: method === m ? ACCENT : 'rgba(255,255,255,0.1)', backgroundColor: method === m ? 'rgba(108,108,255,0.12)' : 'transparent' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: method === m ? ACCENT : 'rgba(255,255,255,0.4)' }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Account Details */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>RIB / Account Number</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, height: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', marginBottom: 20 }}>
                  <TextInput
                    style={{ color: '#fff', fontSize: 15 }}
                    placeholder="Enter account details"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={accountDetails}
                    onChangeText={setAccountDetails}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                  style={{ height: 52, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
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
