import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.07)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

const BIZ_TYPES = [
  { id: 'Restaurant', icon: 'restaurant-outline' as const },
  { id: 'Hotel', icon: 'bed-outline' as const },
  { id: 'Guide', icon: 'compass-outline' as const },
  { id: 'Transport', icon: 'car-outline' as const },
];

interface Business {
  id: number;
  business_name: string;
  business_type: string;
  address: string;
  thank_you_message: string;
  logo_url: string;
  logo_base64: string;
}

export default function BusinessProfileSettings() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [bizType, setBizType] = useState('');
  const [address, setAddress] = useState('');
  const [thankYou, setThankYou] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [localLogoUri, setLocalLogoUri] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/business/me');
        const biz: Business = data.business;
        setBusiness(biz);
        setName(biz.business_name || '');
        setBizType(biz.business_type || '');
        setAddress(biz.address || '');
        setThankYou(biz.thank_you_message || '');
        setLogoBase64(biz.logo_base64 || '');
      } catch (e: any) {
        showToast(e.response?.data?.error || 'Failed to load business.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalLogoUri(asset.uri);
      setLogoBase64(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Business name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        business_name: name.trim(),
        business_type: bizType,
        address: address.trim(),
        thank_you_message: thankYou.trim(),
      };
      if (logoBase64 && logoBase64.startsWith('data:image')) {
        payload.logo_base64 = logoBase64;
      }
      await api.patch('/business/update', payload);
      showToast('Business settings saved!', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const logoSrc = localLogoUri || logoBase64 || business?.logo_url || '';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: BG }}
    >
      {/* Header */}
      <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Business Settings</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Edit your business profile</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo Upload ── */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <TouchableOpacity onPress={pickLogo} activeOpacity={0.85}>
            <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 3, borderColor: ACCENT, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              {logoSrc ? (
                <Image source={{ uri: logoSrc }} style={{ width: 100, height: 100 }} />
              ) : (
                <Ionicons name="business-outline" size={36} color="rgba(108,108,255,0.5)" />
              )}
            </View>
            <View style={{ position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BG }}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>Tap to change logo</Text>
        </View>

        {/* ── Form ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, gap: 20 }}>
          {/* Business Name */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              Business Name <Text style={{ color: ACCENT }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="business-outline" size={18} color="rgba(255,255,255,0.35)" />
              <TextInput
                style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
                placeholder="My Business"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Business Type — pill selector */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>Business Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {BIZ_TYPES.map((bt) => {
                const sel = bizType === bt.id;
                return (
                  <TouchableOpacity
                    key={bt.id}
                    onPress={() => setBizType(bt.id)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 50,
                      backgroundColor: sel ? 'rgba(108,108,255,0.12)' : 'rgba(255,255,255,0.05)',
                      borderWidth: 1.5,
                      borderColor: sel ? ACCENT : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Ionicons name={bt.icon} size={16} color={sel ? ACCENT : 'rgba(255,255,255,0.4)'} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? ACCENT : 'rgba(255,255,255,0.5)' }}>{bt.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* City / Address */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              City / Address <Text style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '400' }}>(optional)</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.35)" />
              <TextInput
                style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
                placeholder="123 Main St, City"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Thank You Message */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              Thank-You Message
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
              Shown to tourists after they send a tip
            </Text>
            <View style={{ backgroundColor: INPUT_BG, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER, minHeight: 100 }}>
              <TextInput
                style={{ color: '#fff', fontSize: 14, lineHeight: 22 }}
                placeholder="Thank you for your generosity! Your tip means a lot to our team."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={thankYou}
                onChangeText={setThankYou}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'right' }}>
              {thankYou.length}/200
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          style={{
            marginTop: 24,
            height: 54,
            borderRadius: 50,
            backgroundColor: ACCENT,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
            flexDirection: 'row',
            gap: 10,
            shadowColor: ACCENT,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          )}
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        {/* Navigation */}
        <View style={{ marginTop: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.25)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Navigation
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/business/team')}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: BORDER }}
          >
            <Ionicons name="people-outline" size={20} color={ACCENT} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 }}>Manage Team Members</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast {...toast} />
    </KeyboardAvoidingView>
  );
}
