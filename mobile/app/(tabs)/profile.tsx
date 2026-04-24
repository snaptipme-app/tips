import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Image, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import api from '../../lib/api';
import { uploadProfileImage } from '../../lib/uploadImage';
import { Toast, useToast } from '../../components/Toast';
import SnapTipLogo from '../../components/SnapTipLogo';
import { getImageSource } from '../../lib/imageUtils';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const RED = '#ef4444';

/* eslint-disable @typescript-eslint/no-require-imports */
const COUNTRY_FLAG_IMAGES: Record<string, any> = {
  'Morocco': require('../../assets/images/morocco_icon.png'),
  'United States': require('../../assets/images/us_icon.png'),
  'France': require('../../assets/images/france_icon.png'),
  'Spain': require('../../assets/images/spain_icon.png'),
  'UAE': require('../../assets/images/uae_icon.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable @typescript-eslint/no-require-imports */
const LANG_IMAGES: Record<string, any> = {
  en: require('../../assets/images/us_icon.png'),
  fr: require('../../assets/images/france_icon.png'),
  ar: require('../../assets/images/uae_icon.png'),
  es: require('../../assets/images/spain_icon.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

interface Withdrawal {
  id: number;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const { language, changeLanguage, t, languageLabel, LANG_INFO } = useLanguage();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState('');



  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editSaving, setEditSaving] = useState(false);

  // Photo picker bottom sheet
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  // Language picker
  const [showLangModal, setShowLangModal] = useState(false);

  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();

  const photoSrc = localPhotoUri
    ? { uri: localPhotoUri }
    : getImageSource(user?.photo_base64 || user?.profile_image_url);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      setBalance(data.employee?.balance ?? data.balance ?? 0);
      setWithdrawals(data.recent_withdrawals || data.withdrawals || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Photo Picker (Bottom Sheet) ──
  const pickImage = async (source: 'camera' | 'gallery') => {
    setShowPhotoSheet(false);
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('Camera permission is required.', 'error');
        return;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.3 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.3 });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('[profile] Image picked, uri:', asset.uri);
      setLocalPhotoUri(asset.uri);
      await uploadPhoto(asset.uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      console.log('[profile] Calling uploadProfileImage...');
      const result = await uploadProfileImage(uri);

      if (!result.success || !result.employee) {
        throw new Error(result.error || 'Upload failed — no employee returned');
      }

      // Sync AuthContext with the real server-saved photo_url (absolute https:// URL)
      const currentUserJson = await AsyncStorage.getItem('snaptip_user');
      const currentUser = currentUserJson ? JSON.parse(currentUserJson) : (user || {});
      const mergedUser = {
        ...currentUser,
        ...result.employee,
        account_type: currentUser.account_type || result.employee.account_type,
        country: currentUser.country || result.employee.country,
        currency: currentUser.currency || result.employee.currency,
      };
      await AsyncStorage.setItem('snaptip_user', JSON.stringify(mergedUser));
      setUser(mergedUser);

      showToast('Profile photo updated!', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      console.error('[profile] Upload failed:', msg);
      Alert.alert('Upload Failed', `Could not save your photo.\n\nReason: ${msg}`, [{ text: 'OK' }]);
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
      showToast('Profile updated!', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to update.', 'error');
    } finally { setEditSaving(false); }
  };



  const handleLogout = () => {
    Alert.alert(t('logout'), 'Are you sure?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <SnapTipLogo size={36} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('account_settings')}</Text>
        </View>

        {/* ── Profile Card ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER, marginBottom: 24 }}>
          {/* Avatar */}
          <View style={{ width: 96, height: 96, marginBottom: 14 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 2.5, borderColor: ACCENT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(108,108,255,0.15)', opacity: uploading ? 0.5 : 1 }}>
              {photoSrc ? (
                <Image source={photoSrc} style={{ width: 96, height: 96 }} />
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
              onPress={() => setShowPhotoSheet(true)}
              disabled={uploading}
              activeOpacity={0.8}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: CARD }}
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
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>{t('edit_profile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Withdraw Funds (non-business only) ── */}
        {user?.account_type !== 'business' && (
          <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => router.push('/member/withdraw')}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="cash-outline" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('withdraw_funds') || 'Withdraw Funds'}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Cash out your earnings</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN, marginRight: 6 }}>{Math.floor(balance)} {user?.currency || 'MAD'}</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Business Settings (owner only) ── */}
        {user?.account_type === 'business' && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>{t('business_settings')}</Text>
            <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => router.push('/business/team')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={18} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('my_team')}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t('manage_members')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/business/invite')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person-add-outline" size={18} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('invite_members')}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t('send_invitations')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Language & Settings ── */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>{t('settings')}</Text>
        <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24, overflow: 'hidden' }}>
          <TouchableOpacity onPress={() => setShowLangModal(true)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="language-outline" size={18} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('language')}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{languageLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>

          {/* Country info row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              {COUNTRY_FLAG_IMAGES[user?.country || 'Morocco'] ? (
                <Image source={COUNTRY_FLAG_IMAGES[user?.country || 'Morocco']} style={{ width: 24, height: 24, borderRadius: 4 }} resizeMode="contain" />
              ) : (
                <Ionicons name="flag-outline" size={18} color={GREEN} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Country</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{user?.country || 'Morocco'} · {user?.currency || 'MAD'}</Text>
            </View>
          </View>

          {/* Support row */}
          <TouchableOpacity onPress={() => router.push('/support' as any)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="help-circle-outline" size={18} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Contact Support</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Get help from our team</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        </View>

        {/* ── History ── */}
        {user?.account_type !== 'business' && withdrawals.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>{t('recent_withdrawals')}</Text>
            {withdrawals.slice(0, 10).map((w) => (
              <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(108,108,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="arrow-up-outline" size={18} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{w.amount.toFixed(2)} {user?.currency || 'MAD'}</Text>
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
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.06)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}>
          <Ionicons name="log-out-outline" size={18} color={RED} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: RED }}>{t('logout')}</Text>
        </TouchableOpacity>
        <Toast {...toast} />
      </ScrollView>

      {/* ═══ Language Picker Modal ═══ */}
      <Modal visible={showLangModal} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowLangModal(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: '#0d0d24', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 }}>{t('select_language')}</Text>
            {Object.keys(LANG_INFO).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => { changeLanguage(l); setShowLangModal(false); }}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 }}
              >
                <Image source={LANG_IMAGES[l]} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' }}>{LANG_INFO[l].label}</Text>
                {language === l && <Ionicons name="checkmark-circle" size={22} color={GREEN} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowLangModal(false)} activeOpacity={0.8} style={{ marginTop: 8, marginHorizontal: 24, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Photo Picker Bottom Sheet ═══ */}
      <Modal visible={showPhotoSheet} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowPhotoSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: '#0d0d24', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            {/* Drag Handle */}
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 }}>{t('change_photo')}</Text>

            <TouchableOpacity onPress={() => pickImage('camera')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="camera-outline" size={22} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>{t('take_photo')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => pickImage('gallery')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="images-outline" size={22} color={GREEN} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>{t('choose_gallery')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowPhotoSheet(false)} activeOpacity={0.8} style={{ marginTop: 8, marginHorizontal: 24, height: 48, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>



      {/* ═══ Edit Profile Modal ═══ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#0d0d24', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
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
