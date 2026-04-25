import { useState, useCallback, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import SnapTipLogo from '../components/SnapTipLogo';
import { Toast, useToast } from '../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';

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
  const { toast, showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleIdentifierChange = useCallback((t: string) => setIdentifier(t), []);
  const handlePasswordChange = useCallback((t: string) => setPassword(t), []);
  const handleTogglePw = useCallback(() => setShowPw((p) => !p), []);

  const handleLogin = useCallback(async () => {
    if (!identifier.trim() || !password) {
      showToast('All fields are required.', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(identifier.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Invalid credentials.', 'error');
    } finally {
      setLoading(false);
    }
  }, [identifier, password, login, router, showToast]);

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
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ marginBottom: 12 }}>
            <SnapTipLogo size={56} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>SnapTip</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Welcome back</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Email or Username</Text>
          <LoginInput
            icon="mail-outline"
            placeholder="you@example.com"
            value={identifier}
            onChangeText={handleIdentifierChange}
            keyboardType="email-address"
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Password</Text>
          <LoginInput
            icon="lock-closed-outline"
            placeholder="Password"
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
            {loading && <ActivityIndicator color="#fff" size="small" />}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Logging in...' : 'Log In'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <TouchableOpacity onPress={() => router.push('/forgot-password')} activeOpacity={0.8}>
            <Text style={{ color: '#6c6cff', fontSize: 14, fontWeight: '600', marginBottom: 16 }}>Forgot your password?</Text>
          </TouchableOpacity>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: '#fff', fontWeight: '700' }}>Sign up</Link>
          </Text>
        </View>
      </ScrollView>
      <Toast {...toast} />
    </KeyboardAvoidingView>
  );
}
