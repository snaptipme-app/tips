import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const RED = '#ef4444';

const METHODS = [
  { id: 'cih', label: 'CIH Bank', icon: 'card-outline' as const },
  { id: 'cashplus', label: 'Cash Plus', icon: 'cash-outline' as const },
  { id: 'wafacash', label: 'Wafa Cash', icon: 'wallet-outline' as const },
  { id: 'other', label: 'Other Bank', icon: 'business-outline' as const },
];

interface Withdrawal {
  id: number;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState('');

  // Withdraw modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editSaving, setEditSaving] = useState(false);

  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();

  const photoSrc = localPhotoUri
    || user?.photo_base64
    || (user?.profile_image_url && user.profile_image_url.startsWith('/')
      ? `https://snaptip.me${user.profile_image_url}`
      : user?.profile_image_url)
    || '';

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      setBalance(data.balance ?? 0);
      setWithdrawals(data.withdrawals || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Photo Picker ──
  const showPhotoOptions = () => {
    Alert.alert('Change Photo', 'Choose an option', [
      { text: '📷 Take Photo', onPress: () => pickImage('camera') },
      { text: '🖼️ Choose from Gallery', onPress: () => pickImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('Camera permission is required.', 'error');
        return;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalPhotoUri(asset.uri);
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      await uploadPhoto(base64Image);
    }
  };

  const uploadPhoto = async (base64Image: string) => {
    setUploading(true);
    try {
      await api.patch('/employee/profile', { photo_base64: base64Image, photo_url: base64Image });
      if (user) {
        const updated = { ...user, photo_base64: base64Image, profile_image_url: base64Image };
        setUser(updated);
      }
      showToast('Profile photo updated! 🎉', 'success');
    } catch {
      showToast('Failed to upload. Try again.', 'error');
      setLocalPhotoUri('');
    } finally {
      setUploading(false);
    }
  };

  // ── Edit Profile ──
  const handleSaveProfile = async () => {
    if (!editName.trim()) { showToast('Name is required.', 'error'); return; }
    setEditSaving(true);
    try {
      await api.patch('/employee/profile', { full_name: editName.trim() });
      if (user) setUser({ ...user, full_name: editName.trim() });
      setShowEditModal(false);
      showToast('Profile updated successfully! ✨', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to update.', 'error');
    } finally { setEditSaving(false); }
  };

  // ── Withdrawal ──
  const handleWithdraw = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { showToast('Enter a valid amount.', 'error'); return; }
    if (a > balance) { showToast('Insufficient balance.', 'error'); return; }
    if (!accountDetails.trim()) { showToast('Enter account details.', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post('/withdrawals/request', { amount: a, method: selectedMethod, account_details: accountDetails.trim() });
      showToast('Withdrawal submitted! 💸', 'success');
      setShowWithdrawModal(false);
      setAmount('');
      setAccountDetails('');
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Withdrawal failed.', 'error');
    } finally { setSubmitting(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return GREEN;
    if (s === 'pending') return '#f59e0b';
    return RED;
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 20 }}>Account Settings</Text>

        {/* ── Profile Card ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: BORDER, marginBottom: 20 }}>
          {/* Avatar */}
          <View style={{ width: 96, height: 96, marginBottom: 14 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.15)', opacity: uploading ? 0.5 : 1 }}>
              {photoSrc ? (
                <Image source={{ uri: photoSrc }} style={{ width: 96, height: 96 }} />
              ) : (
                <Text style={{ fontSize: 36, fontWeight: '700', color: ACCENT }}>{initials}</Text>
              )}
            </View>
            {uploading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            <TouchableOpacity
              onPress={showPhotoOptions}
              disabled={uploading}
              activeOpacity={0.8}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0d0d24' }}
            >
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{user?.full_name}</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>@{user?.username}</Text>

          <TouchableOpacity
            onPress={() => { setEditName(user?.full_name || ''); setShowEditModal(true); }}
            activeOpacity={0.8}
            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: INPUT_BG, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: BORDER }}
          >
            <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Business Settings (owner only) ── */}
        {user?.account_type === 'business' && (
          <TouchableOpacity onPress={() => router.push('/business/team')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={20} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Business Settings</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Manage team & invitations</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}

        {/* ── Withdraw ── */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>Withdraw Funds</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {METHODS.map((m) => (
            <TouchableOpacity key={m.id} onPress={() => { setSelectedMethod(m.id); setShowWithdrawModal(true); }} style={{ width: '47%', backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8 }} activeOpacity={0.8}>
              <Ionicons name={m.icon} size={24} color={ACCENT} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── History ── */}
        {withdrawals.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>Recent Withdrawals</Text>
            {withdrawals.slice(0, 10).map((w) => (
              <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>${w.amount.toFixed(2)}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{w.method || 'N/A'}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: `${statusColor(w.status)}15` }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(w.status), textTransform: 'capitalize' }}>{w.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Logout ── */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}>
          <Ionicons name="log-out-outline" size={18} color={RED} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: RED }}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ═══ Withdraw Modal ═══ */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#0d0d24', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Withdraw via {selectedMethod}</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Available: ${balance.toFixed(2)}</Text>
            <TextInput style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14, marginBottom: 12 }} placeholder="Amount ($)" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
            <TextInput style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14, marginBottom: 20 }} placeholder="Account number / details" placeholderTextColor="rgba(255,255,255,0.2)" value={accountDetails} onChangeText={setAccountDetails} />
            <TouchableOpacity onPress={handleWithdraw} disabled={submitting} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: submitting ? 0.5 : 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{submitting ? 'Submitting...' : 'Confirm Withdrawal'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══ Edit Profile Modal ═══ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#0d0d24', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Full Name</Text>
            <TextInput style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14, marginBottom: 20 }} placeholder="Your full name" placeholderTextColor="rgba(255,255,255,0.2)" value={editName} onChangeText={setEditName} />
            <TouchableOpacity onPress={handleSaveProfile} disabled={editSaving} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: editSaving ? 0.5 : 1, marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{editSaving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.8} style={{ height: 44, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast {...toast} />
    </View>
  );
}
