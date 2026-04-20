import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator, Modal } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { Toast, useToast } from '../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

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
   STEP 1 — Personal Info
   ═══════════════════════════════════════════════════════════════════════════ */
const LANGS: { key: string; label: string }[] = [
  { key: 'en', label: 'EN' },
  { key: 'fr', label: 'FR' },
  { key: 'ar', label: 'AR' },
  { key: 'es', label: 'ES' },
];

const Step1 = memo(({ firstName, lastName, email, errors, onFirstName, onLastName, onEmail, onNext, loading, currentLang, onLangChange }: any) => (
  <>
    {/* Language Pills */}
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
      {LANGS.map((l) => (
        <TouchableOpacity
          key={l.key}
          onPress={() => onLangChange(l.key)}
          activeOpacity={0.8}
          style={{
            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50,
            backgroundColor: currentLang === l.key ? 'rgba(108,108,255,0.15)' : INPUT_BG,
            borderWidth: 1.5, borderColor: currentLang === l.key ? ACCENT : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: currentLang === l.key ? ACCENT : 'rgba(255,255,255,0.4)' }}>{l.label}</Text>
        </TouchableOpacity>
      ))}
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
const Step3 = memo(({ username, password, confirmPw, showPw, accountType, usernameValid, errors,
  onUsername, onPassword, onConfirmPw, onTogglePw, onAccountType, onNext, onBack, loading }: any) => (
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

    <TouchableOpacity onPress={onNext} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
      {loading && <ActivityIndicator color="#fff" size="small" />}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Creating...' : 'Create Account'}</Text>
    </TouchableOpacity>

    <TouchableOpacity onPress={onBack} style={{ marginTop: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>← Back</Text>
    </TouchableOpacity>
  </>
));

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 4 — Profile Photo
   ═══════════════════════════════════════════════════════════════════════════ */
const Step4 = memo(({ imageUri, jobTitle, onPickPhoto, onJobTitle, onComplete, onSkip, loading }: any) => (
  <>
    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 }}>Almost done!</Text>
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

    <TouchableOpacity onPress={onComplete} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
      {loading && <ActivityIndicator color="#fff" size="small" />}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Saving...' : 'Complete Setup ✓'}</Text>
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
  const { setUser } = useAuth();
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

  // Step 4
  const [imageUri, setImageUri] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

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

  // ── Step 2 handlers ──
  const handleOtpChange = useCallback((text: string, idx: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const arr = [...prev];
      arr[idx] = digit;
      if (digit && idx === 5) {
        const code = arr.join('');
        if (code.length === 6) setTimeout(() => verifyOtpDirect(code), 200);
      }
      return arr;
    });
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }, []);

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
      await api.post('/auth/verify-otp', { email: email.trim().toLowerCase(), code });
      showToast('Email verified!', 'success');
      setStep(3);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Verification failed.', 'error');
    } finally { setLoading(false); }
  }, [email, showToast]);

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join('');
    if (code.length < 6) { showToast('Enter the full 6-digit code.', 'error'); return; }
    await verifyOtpDirect(code);
  }, [otp, verifyOtpDirect, showToast]);

  const handleResend = useCallback(async () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      showToast('New code sent!', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed.', 'error');
    } finally { setLoading(false); }
  }, [email, showToast]);

  const handleBackToStep1 = useCallback(() => { setStep(1); setOtp(['', '', '', '', '', '']); }, []);

  // ── Step 3 handler ──
  const handleStep3 = useCallback(async () => {
    const errs: Record<string, string> = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errs.username = 'Username: 3-20 chars, letters/numbers/underscores.';
    if (password.length < 6) errs.password = 'Minimum 6 characters.';
    if (password !== confirmPw) errs.confirmPw = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      console.log('Registering with account_type:', accountType);
      const { data } = await api.post('/auth/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        username: username.toLowerCase(),
        password,
        account_type: accountType,
      });
      console.log('Register response account_type:', data.employee?.account_type);
      const userData = { ...data.employee, account_type: accountType };
      await AsyncStorage.setItem('snaptip_token', data.token);
      await AsyncStorage.setItem('snaptip_user', JSON.stringify(userData));
      setUser(userData);
      showToast('Account created!', 'success');
      setStep(4);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Registration failed.', 'error');
    } finally { setLoading(false); }
  }, [username, password, confirmPw, firstName, lastName, email, accountType, setUser, showToast]);

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
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleComplete = useCallback(async () => {
    setLoading(true);
    try {
      const body: any = {};
      if (imageBase64) { body.photo_url = imageBase64; body.photo_base64 = imageBase64; }
      if (jobTitle.trim()) body.job_title = jobTitle.trim();
      if (Object.keys(body).length) await api.patch('/employee/profile', body);
      showToast('Setup complete!', 'success');
      setTimeout(() => {
        if (accountType === 'business') router.replace('/business/setup');
        else router.replace('/(tabs)/home');
      }, 500);
    } catch {
      showToast('Failed to save. Try again.', 'error');
    } finally { setLoading(false); }
  }, [imageBase64, jobTitle, accountType, router, showToast]);

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
              currentLang={language} onLangChange={changeLanguage}
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
              onUsername={handleUsernameChange} onPassword={handlePasswordChange} onConfirmPw={handleConfirmPwChange}
              onTogglePw={handleTogglePw} onAccountType={handleAccountType}
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

      {/* Photo Picker Bottom Sheet */}
      <Modal visible={showPhotoSheet} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowPhotoSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: '#0d0d24', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
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
