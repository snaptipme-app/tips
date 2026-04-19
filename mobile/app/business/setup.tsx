import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';

const TYPES = ['Restaurant', 'Hotel', 'Transport', 'Café', 'Other'];

export default function BusinessSetup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [address, setAddress] = useState('');
  const [logoUri, setLogoUri] = useState('');
  const [loading, setLoading] = useState(false);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setLogoUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!name.trim() || !type) return Alert.alert('Error', 'Name and type are required.');
    setLoading(true);
    try {
      await api.post('/business/create', { business_name: name.trim(), business_type: type, address: address.trim(), logo_url: '' });
      Alert.alert('Success', 'Business created!');
      router.replace('/business/team');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed.');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Create Business</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Set up your team account</Text>

      <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
        {/* Logo */}
        <TouchableOpacity onPress={pickLogo} style={{ alignSelf: 'center', marginBottom: 20 }}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={{ width: 80, height: 80, borderRadius: 16 }} />
          ) : (
            <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: INPUT_BG, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="camera-outline" size={28} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Business Name */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Business Name</Text>
        <TextInput style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14, marginBottom: 14 }} placeholder="My Business" placeholderTextColor="rgba(255,255,255,0.2)" value={name} onChangeText={setName} />

        {/* Type */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 8 }}>Business Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t} onPress={() => setType(t)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, backgroundColor: type === t ? 'rgba(108,108,255,0.15)' : INPUT_BG, borderWidth: 1, borderColor: type === t ? ACCENT : BORDER }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: type === t ? ACCENT : 'rgba(255,255,255,0.5)' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Address */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Address</Text>
        <TextInput style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14, marginBottom: 20 }} placeholder="123 Main St" placeholderTextColor="rgba(255,255,255,0.2)" value={address} onChangeText={setAddress} />

        <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.5 : 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{loading ? 'Creating...' : 'Create Business'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
