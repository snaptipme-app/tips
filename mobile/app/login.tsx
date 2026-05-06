import { useState, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import api from '../lib/api';
import SnapTipLogo from '../components/SnapTipLogo';
import { Toast, useToast } from '../components/Toast';
import KeyboardAwareWrapper from '../components/KeyboardAwareWrapper';

const BG = '#1a1a1a';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#00B4D8';

const LoginInput = memo(({ icon, placeholder, value, onChangeText, secureTextEntry, right, ...props }: any) => (
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

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const { toast, showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleIdentifierChange = useCallback((v: string) => setIdentifier(v), []);
  const handlePasswordChange = useCallback((v: string) => setPassword(v), []);
  const handleTogglePw = useCallback(() => setShowPw((p) => !p), []);

  const handleLogin = useCallback(async () => {
    if (!identifier.trim() || !password) {
      showToast('All fields are required.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: identifier.trim().toLowerCase(),
        password,
      });
      await login(data.token, data.employee);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Invalid credentials.', 'error');
    } finally {
      setLoading(false);
    }
  }, [identifier, password, login, router, showToast]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAwareWrapper contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ marginBottom: 12 }}>
            <SnapTipLogo size={56} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>SnapTip</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{t('login_welcome')}</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>{t('login_email_user')}</Text>
          <LoginInput
            icon="mail-outline"
            placeholder={t('fp_email_ph')}
            value={identifier}
            onChangeText={handleIdentifierChange}
            keyboardType="email-address"
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>{t('login_password_label')}</Text>
          <LoginInput
            icon="lock-closed-outline"
            placeholder={t('login_password_label')}
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPw}
            right={
              <TouchableOpacity onPress={handleTogglePw}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            }
          />

          {/* Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1, flexDirection: 'row', gap: 8, marginTop: 6 }}
          >
            {loading && <Ionicons name="hourglass-outline" size={16} color="#fff" />}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? t('login_logging_in') : t('login_log_in')}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <TouchableOpacity onPress={() => router.push('/forgot-password')} activeOpacity={0.8}>
            <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '600', marginBottom: 16 }}>{t('login_forgot_pw')}</Text>
          </TouchableOpacity>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            {t('login_no_account')}{' '}
            <Link href="/register" style={{ color: '#fff', fontWeight: '700' }}>{t('login_sign_up')}</Link>
          </Text>
        </View>
      </KeyboardAwareWrapper>
      <Toast {...toast} />
    </View>
  );
}
