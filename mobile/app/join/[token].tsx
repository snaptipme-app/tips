import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  ScrollView, Image, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.07)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const RED = '#ef4444';

type Step = 'loading' | 'error' | 'preview' | 'register' | 'withdrawal' | 'success';

const METHODS = ['CIH Bank', 'Cash Plus', 'Wafa Cash', 'Other Bank'];

export default function JoinBusiness() {
  const params = useLocalSearchParams();
  const inviteToken = params.token as string;
  const { token: authToken, user, setUser, login } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoB64, setPhotoB64] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Withdrawal fields
  const [wMethod, setWMethod] = useState('');
  const [wAccount, setWAccount] = useState('');
  const [wLoading, setWLoading] = useState(false);
  const [joinedEmployee, setJoinedEmployee] = useState<any>(null);
  const [joinToken, setJoinToken] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateStep = (fn: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  // Step 0: Fetch invite info
  useEffect(() => {
    if (!inviteToken) { setError('Invalid invitation link — no token found.'); setStep('error'); return; }

    (async () => {
      try {
        const { data } = await api.get(`/business/invite-info/${inviteToken}`);
        setBusinessName(data.business_name || 'Unknown Business');
        setBusinessType(data.business_type || '');
        if (data.email && data.email !== 'link_invite') {
          setInviteEmail(data.email);
          setEmail(data.email);
        }
        setStep('preview');
      } catch (e: any) {
        setError(e.response?.data?.error || 'This invitation is invalid or has expired.');
        setStep('error');
      }
    })();
  }, [inviteToken]);

  // If user is already logged in, join button goes directly
  const handleLoggedInJoin = async () => {
    setRegLoading(true);
    try {
      const { data } = await api.post(`/business/join/${inviteToken}`);
      if (data.employee && user) {
        setUser({ ...user, ...data.employee, account_type: 'member' });
      }
      setBusinessName(data.business_name || businessName);
      animateStep(() => setStep('success'));
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to join.', 'error');
    } finally { setRegLoading(false); }
  };

  // Register + join
  const handleRegisterAndJoin = async () => {
    if (!fullName.trim()) { showToast('Full name is required.', 'error'); return; }
    if (!email.trim() || !email.includes('@')) { showToast('Valid email is required.', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    if (!photoB64) { showToast('Profile photo is required — customers will see it when tipping you.', 'error'); return; }

    setRegLoading(true);
    try {
      // Register
      const regRes = await api.post('/auth/register', {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        photo_base64: photoB64,
        account_type: 'individual',
      });
      const regToken = regRes.data.token;
      setJoinToken(regToken);

      // Join business using the new token
      const joinRes = await api.post(`/business/join/${inviteToken}`, {}, {
        headers: { Authorization: `Bearer ${regToken}` },
      });

      const emp = joinRes.data.employee || regRes.data.employee;
      setJoinedEmployee({ ...emp, account_type: 'member' });
      setBusinessName(joinRes.data.business_name || businessName);

      animateStep(() => setStep('withdrawal'));
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Registration failed.', 'error');
    } finally { setRegLoading(false); }
  };

  // Save withdrawal details (optional step)
  const handleSaveWithdrawal = async (skip = false) => {
    if (!skip) {
      if (!wMethod) { showToast('Please select a method.', 'error'); return; }
    }
    setWLoading(true);
    try {
      if (!skip && wMethod && joinToken) {
        await api.patch('/employee/withdrawal-method', { method: wMethod, account: wAccount }, {
          headers: { Authorization: `Bearer ${joinToken}` },
        });
      }
      // Complete login
      if (joinedEmployee && joinToken) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('snaptip_token', joinToken);
        setUser({ ...joinedEmployee, photo_base64: photoB64 });
      }
      animateStep(() => setStep('success'));
    } catch {
      animateStep(() => setStep('success')); // even if this fails, proceed
    } finally { setWLoading(false); }
  };

  const goToDashboard = () => router.replace('/member/dashboard');

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoB64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const BizIcon = () => {
    const iconMap: Record<string, any> = { Restaurant: 'restaurant-outline', Hotel: 'bed-outline', Transport: 'car-outline', Guide: 'compass-outline' };
    return <Ionicons name={iconMap[businessType] || 'business-outline'} size={36} color={ACCENT} />;
  };

  // ── Loading ──
  if (step === 'loading') return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 14 }}>Loading invitation...</Text>
    </View>
  );

  // ── Error ──
  if (step === 'error') return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: RED }}>
        <Ionicons name="alert-circle" size={44} color={RED} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 }}>Invitation Error</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>{error}</Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={{ height: 48, paddingHorizontal: 28, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Go to Home</Text>
      </TouchableOpacity>
      <Toast {...toast} />
    </View>
  );

  // ── Success ──
  if (step === 'success') return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: GREEN }}>
        <Ionicons name="star" size={48} color={GREEN} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Welcome to the team!</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textAlign: 'center' }}>You've successfully joined</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: ACCENT, marginBottom: 32 }}>{businessName}</Text>
      <TouchableOpacity
        onPress={goToDashboard}
        activeOpacity={0.8}
        style={{ height: 54, paddingHorizontal: 40, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 }}
      >
        <Ionicons name="home" size={20} color="#fff" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Go to My Dashboard</Text>
      </TouchableOpacity>
      <Toast {...toast} />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: BG }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
          {/* Step indicator */}
          {(step === 'register' || step === 'withdrawal') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <TouchableOpacity onPress={() => animateStep(() => setStep(step === 'withdrawal' ? 'register' : 'preview'))}>
                <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <View style={{ flex: 1, height: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ height: 3, borderRadius: 10, backgroundColor: ACCENT, width: step === 'register' ? '50%' : '100%' }} />
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{step === 'register' ? '1 / 2' : '2 / 2'}</Text>
            </View>
          )}
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>
            {step === 'preview' && 'You\'re Invited!'}
            {step === 'register' && 'Create Account'}
            {step === 'withdrawal' && 'Payout Setup'}
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {step === 'preview' && `Join ${businessName} on SnapTip`}
            {step === 'register' && 'Your photo will be shown to customers when they tip you'}
            {step === 'withdrawal' && 'Where should we send your earnings?'}
          </Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

          {/* ─────────── STEP: PREVIEW ─────────── */}
          {step === 'preview' && (
            <>
              {/* Business Card */}
              <View style={{ backgroundColor: CARD, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: BORDER, alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: ACCENT }}>
                  <BizIcon />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, textAlign: 'center' }}>{businessName}</Text>
                {businessType ? <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{businessType}</Text> : null}
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 }}>
                  has invited you to join their team and start receiving digital tips from customers.
                </Text>
              </View>

              {authToken ? (
                /* Already logged in */
                <>
                  {user?.full_name && (
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 16 }}>
                      Joining as <Text style={{ color: '#fff', fontWeight: '700' }}>{user.full_name}</Text>
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={handleLoggedInJoin}
                    disabled={regLoading}
                    activeOpacity={0.8}
                    style={{ height: 54, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, opacity: regLoading ? 0.6 : 1, marginBottom: 12 }}
                  >
                    {regLoading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{regLoading ? 'Joining...' : `Join ${businessName}`}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center', padding: 12 }}>
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Decline</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Not logged in */
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => animateStep(() => setStep('register'))}
                    activeOpacity={0.8}
                    style={{ height: 54, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 }}
                  >
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Create Account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/login')}
                    activeOpacity={0.8}
                    style={{ height: 54, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 }}
                  >
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>I already have an account</Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 4 }}>
                    You need a SnapTip account to join this team
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ─────────── STEP: REGISTER ─────────── */}
          {step === 'register' && (
            <View style={{ gap: 16 }}>
              {/* Photo Upload — required */}
              <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 3, borderColor: photoB64 ? GREEN : ACCENT, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  {photoB64 ? (
                    <Image source={{ uri: photoB64 }} style={{ width: 100, height: 100 }} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Ionicons name="camera" size={28} color="rgba(108,108,255,0.5)" />
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Required</Text>
                    </View>
                  )}
                </View>
                {photoB64 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                    <Text style={{ fontSize: 12, color: GREEN }}>Photo added</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>Tap to add your profile photo</Text>
                )}
              </TouchableOpacity>

              {[
                { label: 'Full Name', val: fullName, set: setFullName, placeholder: 'Your full name', icon: 'person-outline' as const, keyboard: 'default' as const },
                { label: 'Email', val: email, set: setEmail, placeholder: 'your@email.com', icon: 'mail-outline' as const, keyboard: 'email-address' as const },
                { label: 'Password', val: password, set: setPassword, placeholder: 'Min. 6 characters', icon: 'lock-closed-outline' as const, keyboard: 'default' as const },
              ].map((f) => (
                <View key={f.label}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{f.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER }}>
                    <Ionicons name={f.icon} size={18} color="rgba(255,255,255,0.35)" />
                    <TextInput
                      style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
                      placeholder={f.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={f.val}
                      onChangeText={f.set}
                      keyboardType={f.keyboard}
                      secureTextEntry={f.label === 'Password'}
                      autoCapitalize={f.label === 'Email' ? 'none' : 'words'}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                onPress={handleRegisterAndJoin}
                disabled={regLoading}
                activeOpacity={0.8}
                style={{ height: 54, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 8, opacity: regLoading ? 0.6 : 1 }}
              >
                {regLoading ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-forward-circle" size={20} color="#fff" />}
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{regLoading ? 'Creating account...' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─────────── STEP: WITHDRAWAL ─────────── */}
          {step === 'withdrawal' && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Choose withdrawal method</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setWMethod(m)}
                    activeOpacity={0.8}
                    style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 50, borderWidth: 1.5, borderColor: wMethod === m ? GREEN : 'rgba(255,255,255,0.1)', backgroundColor: wMethod === m ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.04)' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: wMethod === m ? GREEN : 'rgba(255,255,255,0.4)' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>RIB / Account Number</Text>
                <View style={{ backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, justifyContent: 'center' }}>
                  <TextInput
                    style={{ color: '#fff', fontSize: 15 }}
                    placeholder="Enter account number"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={wAccount}
                    onChangeText={setWAccount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', flex: 1, lineHeight: 20 }}>
                  You won't be able to withdraw without these details. You can always add them later in your profile.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleSaveWithdrawal(false)}
                disabled={wLoading}
                activeOpacity={0.8}
                style={{ height: 54, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, opacity: wLoading ? 0.6 : 1 }}
              >
                {wLoading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{wLoading ? 'Saving...' : 'Save & Continue'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSaveWithdrawal(true)}
                disabled={wLoading}
                style={{ padding: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </Animated.View>
      <Toast {...toast} />
    </KeyboardAvoidingView>
  );
}
