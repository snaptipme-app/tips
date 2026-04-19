import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) return Alert.alert('Error', 'All fields are required.');
    setLoading(true);
    try {
      await login(identifier.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#080818' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(108,108,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="flash" size={28} color="#6c6cff" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>SnapTip</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Welcome back</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Identifier */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Email or Username</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Password</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{ height: 52, borderRadius: 50, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1 }}
            activeOpacity={0.8}
          >
            <View style={{ position: 'absolute', inset: 0, borderRadius: 50, backgroundColor: '#6c6cff' }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Logging in...' : 'Log In'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: '#fff', fontWeight: '700' }}>Sign up</Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
