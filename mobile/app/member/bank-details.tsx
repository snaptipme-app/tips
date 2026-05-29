import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { Toast, useToast } from '../../components/Toast';
import SnapTipLogo from '../../components/SnapTipLogo';
import { CountryFlag } from '../../components/CountryFlag';
import { COUNTRY_CODE_MAP } from '../../lib/countryData';
import { getPayoutConfig } from '../../lib/payoutConfig';
import {
  getWisePayoutDetailsConfig,
  validateWisePayoutDetails,
  WisePayoutFieldKey,
} from '../../lib/wisePayoutDetails';
import { useScreenCaptureProtection } from '../../lib/security';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.045)';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#00ffcc';
const GREEN = '#00C896';
const RED = '#ef4444';
const YELLOW = '#f59e0b';

export default function BankDetailsScreen() {
  useScreenCaptureProtection();
  const router = useRouter();
  const { user } = useAuth();
  const { toast, showToast } = useToast();

  const userCountry = user?.country || 'Morocco';
  const userCurrency = user?.currency || 'MAD';
  const countryCode = COUNTRY_CODE_MAP[userCountry] || 'MA';
  const payoutCfg = getPayoutConfig(countryCode);
  const config = useMemo(() => getWisePayoutDetailsConfig(countryCode), [countryCode]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSummary, setSavedSummary] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    api.get('/payout-details')
      .then(({ data }) => {
        if (!mounted) return;
        const details = data?.details;
        setSavedSummary(details || null);
        setIsConfirmed(Boolean(details?.isConfirmed));
        setValues(prev => ({
          ...prev,
          account_holder_name: details?.accountHolderName || '',
          account_holder_name_en: details?.accountHolderNameEn || '',
          bank_name: details?.bankName || '',
        }));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const setField = (key: WisePayoutFieldKey, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleSave = async () => {
    if (!config) return;
    const nextErrors = validateWisePayoutDetails(countryCode, values, isConfirmed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('Please check the highlighted fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...values,
        is_confirmed: isConfirmed,
      };
      const { data } = await api.put('/payout-details', payload);
      setSavedSummary(data.details || null);
      showToast(data.message || 'Bank details saved successfully.', 'success');
      setTimeout(() => router.back(), 450);
    } catch (e: any) {
      const response = e.response?.data;
      if (response?.errors) setErrors(response.errors);
      showToast(response?.error || 'Could not save bank details.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || loading || !config || payoutCfg.payoutMethod === 'stripe_connect';

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <SnapTipLogo size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 21, fontWeight: '900' }}>Bank Details</Text>
                <Text style={{ color: 'rgba(255,255,255,0.46)', fontSize: 12, marginTop: 2 }}>Add your bank details so SnapTip can send your earnings manually.</Text>
              </View>
            </View>

            <View style={{ marginTop: 20, backgroundColor: 'rgba(0,200,150,0.08)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.18)', borderRadius: 18, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CountryFlag code={countryCode} width={24} height={16} style={{ borderRadius: 3 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{userCountry}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{userCurrency} - Wise Manual payout</Text>
                </View>
                {savedSummary?.isComplete && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.12)' }}>
                    <Text style={{ color: GREEN, fontSize: 11, fontWeight: '900' }}>Saved</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            {!config || payoutCfg.payoutMethod === 'stripe_connect' ? (
              <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 18 }}>
                <Ionicons name="card-outline" size={24} color={ACCENT} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 10 }}>Bank details are not required</Text>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 19, marginTop: 6 }}>
                  Your country uses Stripe Express payouts.
                </Text>
              </View>
            ) : (
              <>
                {savedSummary?.detailsLast4 && (
                  <View style={{ backgroundColor: 'rgba(0,200,150,0.08)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.18)', borderRadius: 16, padding: 14, marginBottom: 14 }}>
                    <Text style={{ color: GREEN, fontSize: 12, fontWeight: '900' }}>Current details saved</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12, marginTop: 4 }}>Bank details ending in {savedSummary.detailsLast4}. Re-enter sensitive fields to update them.</Text>
                  </View>
                )}

                <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 }}>
                  {config.fields.map(field => {
                    const value = values[field.key] || '';
                    const error = errors[field.key];
                    return (
                      <View key={field.key} style={{ marginBottom: 16 }}>
                        <Text style={{ color: error ? RED : 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>{field.label}</Text>
                        <View style={{ minHeight: field.multiline ? 94 : 52, borderRadius: 14, borderWidth: 1.4, borderColor: error ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.055)', paddingHorizontal: 14, paddingVertical: field.multiline ? 12 : 0, justifyContent: field.multiline ? 'flex-start' : 'center' }}>
                          <TextInput
                            value={value}
                            onChangeText={text => setField(field.key, text)}
                            placeholder={field.placeholder}
                            placeholderTextColor="rgba(255,255,255,0.24)"
                            keyboardType={field.keyboardType || 'default'}
                            autoCapitalize={field.key === 'contact_email' ? 'none' : 'words'}
                            multiline={field.multiline}
                            style={{ color: '#fff', fontSize: 15, minHeight: field.multiline ? 68 : undefined, textAlignVertical: field.multiline ? 'top' : 'center' }}
                          />
                        </View>
                        {field.helper && <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, lineHeight: 16, marginTop: 6 }}>{field.helper}</Text>}
                        {error && <Text style={{ color: RED, fontSize: 11, marginTop: 6, fontWeight: '700' }}>{error}</Text>}
                      </View>
                    );
                  })}

                  <TouchableOpacity onPress={() => { setIsConfirmed(v => !v); if (errors.is_confirmed) setErrors(prev => ({ ...prev, is_confirmed: '' })); }} activeOpacity={0.85}
                    style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: errors.is_confirmed ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: isConfirmed ? GREEN : 'rgba(255,255,255,0.28)', backgroundColor: isConfirmed ? 'rgba(0,200,150,0.14)' : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                      {isConfirmed && <Ionicons name="checkmark" size={15} color={GREEN} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 18 }}>I confirm these bank details are correct and the account belongs to me.</Text>
                      {errors.is_confirmed && <Text style={{ color: RED, fontSize: 11, marginTop: 6, fontWeight: '700' }}>{errors.is_confirmed}</Text>}
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 14, backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.18)', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10 }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={YELLOW} />
                  <Text style={{ color: 'rgba(255,255,255,0.52)', fontSize: 12, lineHeight: 18, flex: 1 }}>
                    SnapTip will never ask for your bank password, card number, CVV, OTP, or Wise login.
                  </Text>
                </View>

                <TouchableOpacity onPress={handleSave} disabled={disabled} activeOpacity={0.86}
                  style={{ marginTop: 18, height: 54, borderRadius: 18, backgroundColor: disabled ? 'rgba(255,255,255,0.08)' : GREEN, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: disabled ? 'rgba(255,255,255,0.35)' : '#061812', fontSize: 15, fontWeight: '900' }}>
                    {saving ? 'Saving...' : 'Save Bank Details'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast {...toast} />
    </View>
  );
}
