import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import SnapTipLogo from '../components/SnapTipLogo';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const GREEN = '#00C896';
const ACCENT = '#6c6cff';

const SUBJECTS = [
  'Account Issue',
  'Payment Problem',
  'QR Code Help',
  'Withdrawal Support',
  'Business Account',
  'Technical Bug',
  'Feature Request',
  'Other',
];

function SuccessCheckmark() {
  return (
    <Svg width={88} height={88} viewBox="0 0 88 88">
      <Circle cx={44} cy={44} r={44} fill={GREEN} opacity={0.15} />
      <Circle cx={44} cy={44} r={36} fill={GREEN} />
      <Path
        d="M28 44l12 12 20-20"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default function SupportScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.full_name || '');
  const [email, setEmail] = useState((user as any)?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await api.post('/support/contact', {
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
      });
      setSent(true);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <SuccessCheckmark />
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 24, marginBottom: 8, textAlign: 'center' }}>
          Message Sent!
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22, marginBottom: 36 }}>
          We'll get back to you as soon as possible.
        </Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} style={{ width: '100%' }}>
          <LinearGradient
            colors={['#00C896', '#00FF66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 52, borderRadius: 50, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#080818' }}>Back to Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <SnapTipLogo size={36} />
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Contact Support</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>We usually reply within 24 hours</Text>
            </View>
          </View>

          {/* Form card */}
          <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, gap: 16 }}>

            {/* Name */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Your Name</Text>
              <TextInput
                style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14 }}
                placeholder="Full name"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Email Address</Text>
              <TextInput
                style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14 }}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Subject picker */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Subject</Text>
              <TouchableOpacity
                onPress={() => setShowSubjectPicker(true)}
                activeOpacity={0.8}
                style={{
                  height: 52, borderRadius: 12, backgroundColor: INPUT_BG,
                  borderWidth: 1, borderColor: subject ? 'rgba(108,108,255,0.4)' : BORDER,
                  paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 15, color: subject ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                  {subject || 'Select a subject'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>

            {/* Message */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Message</Text>
              <TextInput
                style={{
                  height: 120, borderRadius: 12, backgroundColor: INPUT_BG,
                  borderWidth: 1, borderColor: BORDER, color: '#fff',
                  fontSize: 15, paddingHorizontal: 14, paddingTop: 14,
                  textAlignVertical: 'top',
                }}
                placeholder="Describe your issue in detail..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
              />
            </View>

            {error ? (
              <Text style={{ fontSize: 13, color: '#ef4444', textAlign: 'center' }}>{error}</Text>
            ) : null}

            {/* Send button */}
            <TouchableOpacity onPress={handleSend} disabled={sending} activeOpacity={0.85} style={{ opacity: sending ? 0.6 : 1 }}>
              <LinearGradient
                colors={[ACCENT, '#a855f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 52, borderRadius: 50, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
              >
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                  {sending ? 'Sending...' : 'Send Message'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Subject picker modal */}
      <Modal visible={showSubjectPicker} animationType="slide" transparent>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSubjectPicker(false)}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <View style={{ backgroundColor: '#0d0d24', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 16 }}>
              Select Subject
            </Text>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => { setSubject(s); setShowSubjectPicker(false); }}
                activeOpacity={0.8}
                style={{ paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: 15, fontWeight: subject === s ? '700' : '400', color: subject === s ? GREEN : '#fff' }}>
                  {s}
                </Text>
                {subject === s && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowSubjectPicker(false)}
              activeOpacity={0.8}
              style={{ marginTop: 8, marginHorizontal: 24, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
