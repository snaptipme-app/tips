import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

const TYPES = [
  { id: 'Restaurant', emoji: '🍽️' },
  { id: 'Hotel', emoji: '🏨' },
  { id: 'Transport', emoji: '🚗' },
  { id: 'Other', emoji: '🎯' },
];

export default function BusinessSetup() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [address, setAddress] = useState('');
  const [logoUri, setLogoUri] = useState('');
  const [loading, setLoading] = useState(false);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setLogoUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!name.trim()) { showToast('Business name is required.', 'error'); return; }
    if (!type) { showToast('Select a business type.', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/business/create', { business_name: name.trim(), business_type: type, address: address.trim(), logo_url: '' });
      showToast('Business created! 🎉', 'success');
      setTimeout(() => router.replace('/business/team'), 500);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to create business.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Create Business</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Set up your team account to manage employees</Text>

        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: BORDER }}>
          {/* Logo */}
          <TouchableOpacity onPress={pickLogo} activeOpacity={0.8} style={{ alignSelf: 'center', marginBottom: 24 }}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={{ width: 80, height: 80, borderRadius: 16 }} />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: INPUT_BG, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER }}>
                <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.3)" />
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Business Name */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Business Name</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
            <Ionicons name="business-outline" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }} placeholder="My Restaurant" placeholderTextColor="rgba(255,255,255,0.2)" value={name} onChangeText={setName} />
          </View>

          {/* Type Grid */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 10 }}>Business Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {TYPES.map((t) => {
              const sel = type === t.id;
              return (
                <TouchableOpacity key={t.id} onPress={() => setType(t.id)} activeOpacity={0.8} style={{
                  width: '47%', paddingVertical: 16, borderRadius: 14, backgroundColor: sel ? 'rgba(108,108,255,0.12)' : INPUT_BG,
                  borderWidth: 1.5, borderColor: sel ? ACCENT : BORDER, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>{t.emoji}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? ACCENT : '#fff' }}>{t.id}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Address */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Address <Text style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 24, borderWidth: 1, borderColor: BORDER }}>
            <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }} placeholder="123 Main St, City" placeholderTextColor="rgba(255,255,255,0.2)" value={address} onChangeText={setAddress} />
          </View>

          <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
            {loading && <ActivityIndicator color="#fff" size="small" />}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Creating...' : 'Create Business'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
