import { useState, useRef, useCallback, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';
import api from '../lib/api';
import { Toast, useToast } from '../components/Toast';
import SnapTipLogo from '../components/SnapTipLogo';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

const FPInput = memo(({ icon, placeholder, value, onChangeText, secureTextEntry, right, ...props }: any) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: BORDER }}>
    <Ionicons name={icon} size={18} color="rgba(255,255,255,0.4)" />
    <TextInput
      style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.2)"
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      secureTextEntry={secureTextEntry}
      blurOnSubmit={false}
      returnKeyType="next"
      {...props}
    />
    {right}
  </View>
));

export default function ForgotPassword() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSendCode = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast('Enter a valid email address.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      showToast('Reset code sent to your email.', 'success');
      setStep(2);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send reset code.', 'error');
    } finally {
      setLoading(false);
    }
  }, [email, showToast]);

  const handleOtpChange = useCallback((text: string, idx: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const arr = [...prev];
      arr[idx] = digit;
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

  const handleResetPassword = useCallback(async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showToast('Enter the full 6-digit code.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPw) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code,
        newPassword,
      });
      showToast('Password reset successfully!', 'success');
      setStep(3);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to reset password.', 'error');
    } finally {
      setLoading(false);
    }
  }, [otp, newPassword, confirmPw, email, showToast]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: BG }}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ marginBottom: 12 }}>
            <SnapTipLogo size={56} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>
            {step === 3 ? 'All Done!' : 'Reset Password'}
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4, textAlign: 'center' }}>
            {step === 1 && 'Enter your email to receive a reset code'}
            {step === 2 && `We sent a 6-digit code to ${email.trim().toLowerCase()}`}
            {step === 3 && 'Your password has been reset'}
          </Text>
        </View>

        {/* Step 1: Email */}
        {step === 1 && (
          <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Email Address</Text>
            <FPInput
              icon="mail-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TouchableOpacity
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.8}
              style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1, flexDirection: 'row', gap: 8, marginTop: 6 }}
            >
              {loading && <ActivityIndicator color="#fff" size="small" />}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Code + New Password */}
        {step === 2 && (
          <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 12 }}>Verification Code</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { otpRefs.current[i] = r; }}
                  style={{
                    width: 44, height: 52, borderRadius: 12,
                    backgroundColor: INPUT_BG,
                    borderWidth: 1.5,
                    borderColor: digit ? GREEN : BORDER,
                    color: '#fff', fontSize: 20, fontWeight: '700',
                    textAlign: 'center',
                  }}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(t) => handleOtpChange(t, i)}
                  onKeyPress={(e) => handleOtpKey(e, i)}
                />
              ))}
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>New Password</Text>
            <FPInput
              icon="lock-closed-outline"
              placeholder="Min 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPw}
              right={
                <TouchableOpacity onPress={() => setShowPw((p) => !p)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              }
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Confirm Password</Text>
            <FPInput
              icon="lock-closed-outline"
              placeholder="Confirm password"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry={!showPw}
            />

            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
              style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1, flexDirection: 'row', gap: 8, marginTop: 6 }}
            >
              {loading && <ActivityIndicator color="#fff" size="small" />}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep(1); setOtp(['', '', '', '', '', '']); }} activeOpacity={0.8} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Back to email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ marginBottom: 24 }}>
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Circle cx="40" cy="40" r="38" stroke="#00C896" strokeWidth="3" fill="none" />
                <SvgPath d="M22 40 L34 52 L58 28" stroke="#00C896" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: GREEN, marginBottom: 8 }}>Password Reset Successfully!</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, textAlign: 'center' }}>
              You can now log in with your new password.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/login')}
              activeOpacity={0.8}
              style={{ width: '100%', height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Login with New Password</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Back to Login */}
        {step !== 3 && (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                <Ionicons name="arrow-back" size={14} color="rgba(255,255,255,0.4)" /> Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <Toast {...toast} />
    </KeyboardAvoidingView>
  );
}
