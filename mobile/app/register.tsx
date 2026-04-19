import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

export default function Register() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<TextInput[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [imageUri, setImageUri] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const progress = (step / 4) * 100;

  const handleStep1 = async () => {
    if (!firstName.trim() || !lastName.trim()) return Alert.alert('Error', 'Name fields are required.');
    if (!email.includes('@')) return Alert.alert('Error', 'Enter a valid email.');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to send code.');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (text: string, idx: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const arr = [...otp];
    arr[idx] = digit;
    setOtp(arr);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      const arr = [...otp];
      arr[idx - 1] = '';
      setOtp(arr);
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleStep2 = async () => {
    const code = otp.join('');
    if (code.length < 6) return Alert.alert('Error', 'Enter the full 6-digit code.');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: email.trim().toLowerCase(), code });
      setStep(3);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Verification failed.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      Alert.alert('Sent', 'New code sent!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed.');
    } finally { setLoading(false); }
  };

  const handleStep3 = () => {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return Alert.alert('Error', 'Username: 3-20 chars, letters/numbers/underscores.');
    if (password.length < 6) return Alert.alert('Error', 'Min 6 characters.');
    if (password !== confirmPw) return Alert.alert('Error', 'Passwords do not match.');
    setStep(4);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('firstName', firstName.trim());
      fd.append('lastName', lastName.trim());
      fd.append('email', email.trim().toLowerCase());
      fd.append('username', username.toLowerCase());
      fd.append('password', password);
      if (imageUri) {
        const ext = imageUri.split('.').pop() || 'jpg';
        fd.append('profileImage', { uri: imageUri, type: `image/${ext}`, name: `photo.${ext}` } as any);
      }
      const { data } = await api.post('/auth/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await AsyncStorage.setItem('snaptip_token', data.token);
      await AsyncStorage.setItem('snaptip_user', JSON.stringify(data.employee));
      setUser(data.employee);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const InputRow = ({ icon, placeholder, value, onChangeText, secure, toggle, showToggle, ...props }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: BORDER }}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.4)" />
      <TextInput style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.2)" value={value} onChangeText={onChangeText} secureTextEntry={secure} autoCapitalize="none" {...props} />
      {toggle && (
        <TouchableOpacity onPress={showToggle}>
          <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      )}
    </View>
  );

  const GradientBtn = ({ label, onPress, disabled }: any) => (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: (disabled || loading) ? 0.5 : 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Loading...' : label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 10 }}>Step {step} of 4</Text>
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 24 }}>
          <View style={{ width: `${progress}%`, height: '100%', backgroundColor: GREEN, borderRadius: 2 }} />
        </View>

        {/* Card */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
          {/* STEP 1 */}
          {step === 1 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 }}>Create your account</Text>
              <InputRow icon="person-outline" placeholder="First name" value={firstName} onChangeText={setFirstName} />
              <InputRow icon="person-outline" placeholder="Last name" value={lastName} onChangeText={setLastName} />
              <InputRow icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
              <GradientBtn label="Send Verification Code" onPress={handleStep1} />
            </View>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 }}>Check your email</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 4 }}>6-digit code sent to</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: GREEN, textAlign: 'center', marginBottom: 20 }}>{email.trim().toLowerCase()}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                {otp.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => { if (el) otpRefs.current[i] = el; }}
                    style={{ width: 44, height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 2, borderColor: d ? GREEN : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' }}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={d}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={(e) => handleOtpKey(e, i)}
                  />
                ))}
              </View>

              <GradientBtn label="Verify Code" onPress={handleStep2} disabled={otp.join('').length < 6} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <TouchableOpacity onPress={() => { setStep(1); setOtp(['', '', '', '', '', '']); }}>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>← Change email</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResend} disabled={loading}>
                  <Text style={{ fontSize: 13, color: GREEN }}>Resend code</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 }}>Create credentials</Text>
              <InputRow icon="at-outline" placeholder="username" value={username} onChangeText={(t: string) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))} />
              <InputRow icon="lock-closed-outline" placeholder="Password (min 6)" value={password} onChangeText={setPassword} secure={!showPw} toggle showToggle={() => setShowPw(!showPw)} />
              <InputRow icon="lock-closed-outline" placeholder="Confirm password" value={confirmPw} onChangeText={setConfirmPw} secure={!showPw} />

              {/* Account Type */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 8 }}>Account Type</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {(['individual', 'business'] as const).map((t) => (
                  <TouchableOpacity key={t} onPress={() => setAccountType(t)} style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: accountType === t ? 'rgba(108,108,255,0.15)' : INPUT_BG, borderWidth: 1, borderColor: accountType === t ? ACCENT : BORDER, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: accountType === t ? ACCENT : 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 13 }}>
                      {t === 'individual' ? '👤 Individual' : '🏢 Business'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <GradientBtn label="Next →" onPress={handleStep3} />
              <TouchableOpacity onPress={() => setStep(2)} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 }}>Profile photo</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20 }}>Optional — helps customers recognize you.</Text>

              <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(0,200,150,0.25)', borderRadius: 16, padding: 28, backgroundColor: 'rgba(0,200,150,0.03)', marginBottom: 16 }}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: GREEN, marginBottom: 10 }} />
                ) : (
                  <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="camera-outline" size={36} color={GREEN} />
                  </View>
                )}
                <Text style={{ fontSize: 14, color: GREEN, fontWeight: '600' }}>{imageUri ? 'Change photo' : 'Upload photo'}</Text>
              </TouchableOpacity>

              <InputRow icon="briefcase-outline" placeholder="Job title (optional)" value={jobTitle} onChangeText={setJobTitle} />

              <GradientBtn label="Complete Registration ✓" onPress={handleSubmit} />
              {!imageUri && (
                <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Skip for now</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setStep(3)} style={{ marginTop: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', marginTop: 20, paddingBottom: 40 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#fff', fontWeight: '700' }}>Log in</Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
