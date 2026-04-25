import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator, Modal } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { uploadProfileImage } from '../lib/uploadImage';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { Toast, useToast } from '../components/Toast';
import SnapTipLogo from '../components/SnapTipLogo';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const SHEET_BG = '#0d0d24';

const STEPS = [
  { label: 'Info', icon: 'person' },
  { label: 'Verify', icon: 'mail' },
  { label: 'Account', icon: 'key' },
  { label: 'Photo', icon: 'camera' },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   REUSABLE INPUT — memoized to prevent re-renders
   ═══════════════════════════════════════════════════════════════════════════ */
const InputField = memo(({ icon, placeholder, value, onChangeText, error, right, ...props }: any) => (
  <View style={{ marginBottom: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: error ? 'rgba(239,68,68,0.4)' : BORDER }}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.4)" />
      <TextInput
        style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        blurOnSubmit={false}
        returnKeyType="next"
        {...props}
      />
      {right}
    </View>
    {error ? <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, marginLeft: 4 }}>{error}</Text> : null}
  </View>
));

/* ═══════════════════════════════════════════════════════════════════════════
   LANGUAGE + COUNTRY DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const LANG_IMAGES: Record<string, any> = {
  en: require('../assets/images/us_icon.png'),
  fr: require('../assets/images/france_icon.png'),
  ar: require('../assets/images/uae_icon.png'),
  es: require('../assets/images/spain_icon.png'),
};

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  es: 'Español',
};

/* eslint-disable @typescript-eslint/no-require-imports */
const COUNTRY_OPTIONS = [
  { id: 'Morocco', icon: require('../assets/images/morocco_icon.png'), name: 'Morocco', currency: 'MAD' },
  { id: 'United States', icon: require('../assets/images/us_icon.png'), name: 'United States', currency: 'USD' },
  { id: 'France', icon: require('../assets/images/france_icon.png'), name: 'France', currency: 'EUR' },
  { id: 'Spain', icon: require('../assets/images/spain_icon.png'), name: 'Spain', currency: 'EUR' },
  { id: 'UAE', icon: require('../assets/images/uae_icon.png'), name: 'UAE', currency: 'AED' },
];
/* eslint-enable @typescript-eslint/no-require-imports */

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 1 — Personal Info
   ═══════════════════════════════════════════════════════════════════════════ */
const Step1 = memo(({ firstName, lastName, email, errors, onFirstName, onLastName, onEmail, onNext, loading, currentLang, onOpenLangSheet }: any) => (
  <>
    {/* Language Selector — single compact pill, right-aligned */}
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 }}>
      <TouchableOpacity
        onPress={onOpenLangSheet}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
          backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: ACCENT,
        }}
      >
        <Image source={LANG_IMAGES[currentLang]} style={{ width: 20, height: 20, borderRadius: 4 }} resizeMode="contain" />
        <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>{currentLang.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={12} color={ACCENT} />
      </TouchableOpacity>
    </View>

    <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 20 }}>Create your account</Text>
    <InputField icon="person-outline" placeholder="First name" value={firstName} onChangeText={onFirstName} error={errors.firstName} />
    <InputField icon="person-outline" placeholder="Last name" value={lastName} onChangeText={onLastName} error={errors.lastName} />
    <InputField icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={onEmail} error={errors.email} keyboardType="email-address" />
    <TouchableOpacity onPress={onNext} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send-outline" size={16} color="#fff" />}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Sending...' : 'Send Verification Code'}</Text>
    </TouchableOpacity>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 }}>
      <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.25)" />
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Secure & encrypted</Text>
    </View>
  </>
));

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 2 — OTP Verification
   ═══════════════════════════════════════════════════════════════════════════ */
const Step2 = memo(({ email, otp, otpRefs, onOtpChange, onOtpKey, onVerify, onResend, onBack, loading }: any) => (
  <>
    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 }}>Check your email</Text>
    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 4 }}>We sent a 6-digit code to</Text>
    <Text style={{ fontSize: 14, fontWeight: '600', color: GREEN, textAlign: 'center', marginBottom: 20 }}>{email}</Text>

    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
      {otp.map((d: string, i: number) => (
        <TextInput
          key={i}
          ref={(el: TextInput | null) => { if (otpRefs?.current) otpRefs.current[i] = el; }}
          style={{
            width: 48, height: 56, borderRadius: 12, backgroundColor: INPUT_BG, color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center',
            borderWidth: 2, borderColor: d ? GREEN : 'rgba(255,255,255,0.08)',
          }}
          maxLength={1}
          keyboardType="number-pad"
          value={d}
          onChangeText={(t: string) => onOtpChange(t, i)}
          onKeyPress={(e: any) => onOtpKey(e, i)}
          blurOnSubmit={false}
        />
      ))}
    </View>

    <TouchableOpacity onPress={onVerify} disabled={loading || otp.join('').length < 6} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: (loading || otp.join('').length < 6) ? 0.5 : 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
    </TouchableOpacity>

    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>← Change email</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onResend} disabled={loading}>
        <Text style={{ fontSize: 13, color: GREEN }}>Resend code</Text>
      </TouchableOpacity>
    </View>
  </>
));

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 3 — Credentials
   ═══════════════════════════════════════════════════════════════════════════ */
const Step3 = memo(({ username, password, confirmPw, showPw, accountType, usernameValid, errors, selectedCountry,
  onUsername, onPassword, onConfirmPw, onTogglePw, onAccountType, onOpenCountrySheet, onNext, onBack, loading }: any) => {
  const country = selectedCountry ? COUNTRY_OPTIONS.find(c => c.id === selectedCountry) : null;
  return (
    <>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 20 }}>Create credentials</Text>

      <InputField
        icon="at-outline" placeholder="username" value={username} onChangeText={onUsername}
        error={errors.username}
        right={usernameValid !== null ? <Ionicons name={usernameValid ? 'checkmark-circle' : 'close-circle'} size={18} color={usernameValid ? GREEN : '#ef4444'} /> : null}
      />
      <InputField
        icon="lock-closed-outline" placeholder="Password (min 6 characters)" value={password} onChangeText={onPassword}
        error={errors.password} secureTextEntry={!showPw}
        right={<TouchableOpacity onPress={onTogglePw}><Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" /></TouchableOpacity>}
      />
      <InputField
        icon="lock-closed-outline" placeholder="Confirm password" value={confirmPw} onChangeText={onConfirmPw}
        error={errors.confirmPw} secureTextEntry={!showPw}
      />

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 10 }}>Account Type</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'individual', icon: 'person-outline' as const, title: 'Individual', desc: 'I work alone' },
          { key: 'business', icon: 'business-outline' as const, title: 'Business', desc: 'I manage a team' },
        ].map((opt) => {
          const sel = accountType === opt.key;
          return (
            <TouchableOpacity key={opt.key} onPress={() => onAccountType(opt.key)} activeOpacity={0.8} style={{
              flex: 1, padding: 14, borderRadius: 14, backgroundColor: sel ? 'rgba(108,108,255,0.12)' : INPUT_BG,
              borderWidth: 1.5, borderColor: sel ? ACCENT : BORDER, alignItems: 'center',
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sel ? 'rgba(108,108,255,0.15)' : 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name={opt.icon} size={22} color={sel ? ACCENT : 'rgba(255,255,255,0.4)'} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? ACCENT : '#fff' }}>{opt.title}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{opt.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Country Selector — single dropdown button */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 10 }}>Select Your Country</Text>
      <TouchableOpacity
        onPress={onOpenCountrySheet}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: INPUT_BG, borderRadius: 14, height: 56, paddingHorizontal: 16,
          borderWidth: 1.5, borderColor: errors.country ? 'rgba(239,68,68,0.4)' : (country ? ACCENT : BORDER), marginBottom: errors.country ? 4 : 20,
        }}
      >
        {country ? (
          <>
            <Image source={country.icon} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{country.name}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(108,108,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: ACCENT }}>{country.currency}</Text>
            </View>
          </>
        ) : (
          <>
            <Ionicons name="globe-outline" size={24} color="rgba(255,255,255,0.3)" />
            <Text style={{ flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>Select your country</Text>
          </>
        )}
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
      {errors.country ? <Text style={{ fontSize: 12, color: '#ef4444', marginBottom: 16, marginLeft: 4 }}>{errors.country}</Text> : null}

      <TouchableOpacity onPress={onNext} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
        {loading && <ActivityIndicator color="#fff" size="small" />}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Creating...' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack} style={{ marginTop: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>← Back</Text>
      </TouchableOpacity>
    </>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 4 — Profile Photo
   ═══════════════════════════════════════════════════════════════════════════ */
const Step4 = memo(({ imageUri, jobTitle, onPickPhoto, onJobTitle, onComplete, onSkip, loading }: any) => (
  <>
    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 }}>Add your photo</Text>
    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 }}>Add a photo so customers can recognize you.</Text>

    <TouchableOpacity onPress={onPickPhoto} activeOpacity={0.8} style={{ alignSelf: 'center', marginBottom: 20 }}>
      <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 3, borderColor: imageUri ? GREEN : 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,200,150,0.06)' }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: 100, height: 100 }} />
        ) : (
          <Ionicons name="camera-outline" size={36} color={GREEN} />
        )}
      </View>
      <Text style={{ fontSize: 13, color: GREEN, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>{imageUri ? 'Change photo' : 'Add photo'}</Text>
    </TouchableOpacity>

    <InputField icon="briefcase-outline" placeholder="Job title (e.g. Waiter, Tour Guide)" value={jobTitle} onChangeText={onJobTitle} />

    <TouchableOpacity onPress={onComplete} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
      {loading && <ActivityIndicator color="#fff" size="small" />}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Saving...' : 'Complete Setup'}</Text>
    </TouchableOpacity>

    <TouchableOpacity onPress={onSkip} style={{ marginTop: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Skip for now</Text>
    </TouchableOpacity>
  </>
));

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN REGISTER COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Register() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Step 3
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [usernameValid, setUsernameValid] = useState<null | boolean>(null);
  const [selectedCountry, setSelectedCountry] = useState('');

  // Step 4
  const [imageUri, setImageUri] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const imageBase64Ref = useRef(''); // ref to avoid stale closure in handleComplete
  const [jobTitle, setJobTitle] = useState('');
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  // Bottom sheets
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [showCountrySheet, setShowCountrySheet] = useState(false);

  const progress = (step / 4) * 100;

  // Username validation
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameValid(null); return; }
    setUsernameValid(/^[a-zA-Z0-9_]{3,20}$/.test(username));
  }, [username]);

  // ── Memoized handlers ──
  const handleFirstNameChange = useCallback((t: string) => setFirstName(t), []);
  const handleLastNameChange = useCallback((t: string) => setLastName(t), []);
  const handleEmailChange = useCallback((t: string) => setEmail(t), []);
  const handleUsernameChange = useCallback((t: string) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)), []);
  const handlePasswordChange = useCallback((t: string) => setPassword(t), []);
  const handleConfirmPwChange = useCallback((t: string) => setConfirmPw(t), []);
  const handleJobTitleChange = useCallback((t: string) => setJobTitle(t), []);
  const handleTogglePw = useCallback(() => setShowPw((p) => !p), []);
  const handleAccountType = useCallback((t: 'individual' | 'business') => setAccountType(t), []);
  const handleCountryChange = useCallback((c: string) => { setSelectedCountry(c); setShowCountrySheet(false); }, []);
  const handleOpenLangSheet = useCallback(() => setShowLangSheet(true), []);
  const handleOpenCountrySheet = useCallback(() => setShowCountrySheet(true), []);

  // ── Step 1 handler ──
  const handleStep1 = useCallback(async () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim() || !email.includes('@')) errs.email = 'Enter a valid email.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      showToast(`Code sent to ${email.trim().toLowerCase()}`, 'success');
      setStep(2);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to send code.', 'error');
    } finally { setLoading(false); }
  }, [firstName, lastName, email, showToast]);

  // Keep a ref to the current email to avoid stale closures
  const emailRef = useRef(email);
  useEffect(() => { emailRef.current = email; }, [email]);

  // ── Step 2 handlers ──
  const handleOtpChange = useCallback((text: string, idx: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const arr = [...prev];
      arr[idx] = digit;
      if (digit && idx === 5) {
        const code = arr.join('');
        if (code.length === 6) {
          // Use emailRef.current to get the LATEST email value
          setTimeout(() => {
            const currentEmail = emailRef.current.trim().toLowerCase();
            console.log('=== AUTO-VERIFY OTP ===');
            console.log('Email from ref:', currentEmail, '| code:', code);
            if (!currentEmail) {
              console.error('Email is empty — cannot verify!');
              return;
            }
            api.post('/auth/verify-otp', { email: currentEmail, otp: code })
              .then(() => { showToast('Email verified!', 'success'); setStep(3); })
              .catch((e: any) => { showToast(e.response?.data?.error || 'Verification failed.', 'error'); });
          }, 200);
        }
      }
      return arr;
    });
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }, [showToast]);

  const handleOtpKey = useCallback((e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      setOtp((prev) => {
        if (!prev[idx] && idx > 0) {
          const arr = [...prev];
          arr[idx - 1] = '';
          otpRefs.current[idx - 1]?.focus();
          return arr;
        }
        return prev;
      });
    }
  }, []);

  const verifyOtpDirect = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const trimmedEmail = emailRef.current.trim().toLowerCase();
      console.log('=== VERIFY OTP DEBUG ===');
      console.log('Email:', trimmedEmail, '| length:', trimmedEmail.length);
      console.log('OTP code:', code, '| length:', code.length);
      await api.post('/auth/verify-otp', { email: trimmedEmail, otp: code });
      showToast('Email verified!', 'success');
      setStep(3);
    } catch (e: any) {
      console.log('Verify error response:', e.response?.data);
      showToast(e.response?.data?.error || 'Verification failed.', 'error');
    } finally { setLoading(false); }
  }, [showToast]);

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join('');
    console.log('=== HANDLE VERIFY OTP ===');
    console.log('Email state:', email, '| OTP joined:', code);
    if (code.length < 6) { showToast('Enter the full 6-digit code.', 'error'); return; }
    await verifyOtpDirect(code);
  }, [otp, verifyOtpDirect, showToast, email]);

  const handleResend = useCallback(async () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      const currentEmail = emailRef.current.trim().toLowerCase();
      console.log('[resend] Sending new OTP to:', currentEmail);
      await api.post('/auth/send-otp', { email: currentEmail });
      showToast('New code sent!', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed.', 'error');
    } finally { setLoading(false); }
  }, [showToast]);

  const handleBackToStep1 = useCallback(() => { setStep(1); setOtp(['', '', '', '', '', '']); }, []);

  // ── Step 3 handler ──
  const handleStep3 = useCallback(async () => {
    const errs: Record<string, string> = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errs.username = 'Username: 3-20 chars, letters/numbers/underscores.';
    if (password.length < 6) errs.password = 'Minimum 6 characters.';
    if (password !== confirmPw) errs.confirmPw = 'Passwords do not match.';
    if (!selectedCountry) errs.country = 'Please select your country.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const countryInfo = COUNTRY_OPTIONS.find(c => c.id === selectedCountry) || COUNTRY_OPTIONS[0];
      console.log('Registering with account_type:', accountType, 'country:', selectedCountry);
      const { data } = await api.post('/auth/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        username: username.toLowerCase(),
        password,
        account_type: accountType,
        country: selectedCountry,
        currency: countryInfo.currency,
      });
      console.log('Register response account_type:', data.employee?.account_type);
      const userData = { ...data.employee, account_type: accountType, country: selectedCountry, currency: countryInfo.currency };
      await AsyncStorage.setItem('snaptip_token', data.token);
      await AsyncStorage.setItem('snaptip_user', JSON.stringify(userData));
      updateUser(userData);
      showToast('Account created!', 'success');
      setStep(4);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Registration failed.', 'error');
    } finally { setLoading(false); }
  }, [username, password, confirmPw, firstName, lastName, email, accountType, selectedCountry, updateUser, showToast]);

  const handleBackToStep2 = useCallback(() => setStep(2), []);

  // ── Step 4 handlers ──
  const showPhotoOptions = useCallback(() => {
    setShowPhotoSheet(true);
  }, []);

  const pickImage = async (source: 'camera' | 'gallery') => {
    setShowPhotoSheet(false);
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { showToast('Camera permission required.', 'error'); return; }
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.3 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.3 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      imageBase64Ref.current = uri; // reuse ref to store URI instead of base64
      console.log('[register] Image picked, uri:', uri);
    }
  };

  const handleComplete = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Upload text fields (job_title) if any
      if (jobTitle.trim()) {
        await api.patch('/employee/profile', { job_title: jobTitle.trim() });
      }

      // 2. Upload photo via expo-file-system if an image was selected
      const photoUri = imageBase64Ref.current || imageUri;
      if (photoUri) {
        console.log('[register] Calling uploadProfileImage, uri:', photoUri);
        const uploadResult = await uploadProfileImage(photoUri);

        if (!uploadResult.success || !uploadResult.employee) {
          throw new Error(uploadResult.error || 'Photo upload failed');
        }

        const serverEmployee = uploadResult.employee;
        const freshPhotoUrl = serverEmployee.photo_url
          ? serverEmployee.photo_url + '?t=' + Date.now()
          : undefined;
        updateUser({
          ...serverEmployee,
          photo_url: freshPhotoUrl,
        });
      }

      showToast('Setup complete!', 'success');
      setTimeout(() => {
        if (accountType === 'business') router.replace('/business/setup');
        else router.replace('/(tabs)/home');
      }, 500);
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      console.error('[register] handleComplete failed:', msg);
      Alert.alert(
        'Setup Failed',
        `❌ Could not save your profile.\n\nReason: ${msg}`,
        [{ text: 'OK' }]
      );
    } finally { setLoading(false); }
  }, [imageUri, jobTitle, accountType, router, showToast, updateUser]);

  const handleSkip = useCallback(() => {
    if (accountType === 'business') router.replace('/business/setup');
    else router.replace('/(tabs)/home');
  }, [accountType, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: BG }}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 56 }}
      >
        {/* ── Logo ── */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <SnapTipLogo size={44} />
        </View>

        {/* ── Progress Bar ── */}
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 16 }}>
          <View style={{ width: `${progress}%`, height: '100%', backgroundColor: GREEN, borderRadius: 2 }} />
        </View>

        {/* ── Step Indicator ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, position: 'relative' }}>
          <View style={{ position: 'absolute', top: 20, left: '15%', right: '15%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          {STEPS.map((s, i) => {
            const si = i + 1;
            const done = si < step;
            const active = si === step;
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center', zIndex: 1 }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: active ? 'rgba(0,200,150,0.15)' : done ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 2, borderColor: active || done ? GREEN : 'transparent',
                }}>
                  {done ? <Ionicons name="checkmark" size={18} color={GREEN} /> : <Ionicons name={s.icon as any} size={16} color={active ? GREEN : 'rgba(255,255,255,0.3)'} />}
                </View>
                <Text style={{ fontSize: 10, fontWeight: active ? '700' : '500', color: active || done ? GREEN : 'rgba(255,255,255,0.3)', marginTop: 4 }}>{s.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Card ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: BORDER }}>
          {step === 1 && (
            <Step1
              firstName={firstName} lastName={lastName} email={email} errors={errors}
              onFirstName={handleFirstNameChange} onLastName={handleLastNameChange} onEmail={handleEmailChange}
              onNext={handleStep1} loading={loading}
              currentLang={language} onOpenLangSheet={handleOpenLangSheet}
            />
          )}
          {step === 2 && (
            <Step2
              email={email.trim().toLowerCase()} otp={otp} otpRefs={otpRefs}
              onOtpChange={handleOtpChange} onOtpKey={handleOtpKey}
              onVerify={handleVerifyOtp} onResend={handleResend} onBack={handleBackToStep1}
              loading={loading}
            />
          )}
          {step === 3 && (
            <Step3
              username={username} password={password} confirmPw={confirmPw} showPw={showPw}
              accountType={accountType} usernameValid={usernameValid} errors={errors}
              selectedCountry={selectedCountry}
              onUsername={handleUsernameChange} onPassword={handlePasswordChange} onConfirmPw={handleConfirmPwChange}
              onTogglePw={handleTogglePw} onAccountType={handleAccountType} onOpenCountrySheet={handleOpenCountrySheet}
              onNext={handleStep3} onBack={handleBackToStep2} loading={loading}
            />
          )}
          {step === 4 && (
            <Step4
              imageUri={imageUri} jobTitle={jobTitle}
              onPickPhoto={showPhotoOptions} onJobTitle={handleJobTitleChange}
              onComplete={handleComplete} onSkip={handleSkip} loading={loading}
            />
          )}
        </View>

        {/* Footer */}
        {step <= 2 && (
          <View style={{ alignItems: 'center', marginTop: 20, paddingBottom: 40 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#fff', fontWeight: '700' }}>Log in</Link>
            </Text>
          </View>
        )}
      </ScrollView>
      <Toast {...toast} />

      {/* ═══ Language Bottom Sheet ═══ */}
      <Modal visible={showLangSheet} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowLangSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 }}>Select Language</Text>
            {Object.keys(LANG_IMAGES).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => { changeLanguage(l); setShowLangSheet(false); }}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 }}
              >
                <Image source={LANG_IMAGES[l]} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' }}>{LANG_NAMES[l]}</Text>
                {language === l && <Ionicons name="checkmark-circle" size={22} color={GREEN} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowLangSheet(false)} activeOpacity={0.8} style={{ marginTop: 8, marginHorizontal: 24, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Country Picker Bottom Sheet ═══ */}
      <Modal visible={showCountrySheet} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowCountrySheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 }}>Select Country</Text>
            {COUNTRY_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => handleCountryChange(c.id)}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 }}
              >
                <Image source={c.icon} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: selectedCountry === c.id ? '#fff' : 'rgba(255,255,255,0.5)', flex: 1 }}>{c.name}</Text>
                <View style={{ backgroundColor: selectedCountry === c.id ? 'rgba(108,108,255,0.2)' : 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: selectedCountry === c.id ? ACCENT : 'rgba(255,255,255,0.3)' }}>{c.currency}</Text>
                </View>
                {selectedCountry === c.id && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowCountrySheet(false)} activeOpacity={0.8} style={{ marginTop: 8, marginHorizontal: 24, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo Picker Bottom Sheet */}
      <Modal visible={showPhotoSheet} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowPhotoSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 }}>Profile Photo</Text>
            <TouchableOpacity onPress={() => pickImage('camera')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="camera-outline" size={22} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickImage('gallery')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="images-outline" size={22} color={GREEN} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPhotoSheet(false)} activeOpacity={0.8} style={{ marginTop: 8, marginHorizontal: 24, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}
