import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Image, Switch } from 'react-native';
import { getItem, SecureKeys } from '../../lib/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import SnapTipLogo from '../../components/SnapTipLogo';
import { getImageSource } from '../../lib/imageUtils';
import HapticButton from '../../components/HapticButton';
import DeleteAccountButton from '../../components/DeleteAccountButton';
import { CountryFlag } from '../../components/CountryFlag';
import { COUNTRY_CODE_MAP } from '../../lib/countryData';

const API_URL = 'https://snaptip.me';

const BG = '#1a1a1a';
const CARD = '#1a1a1a';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#00ffcc';
const GREEN = '#00C896';
const ON_MINT = '#04231C';
const RED = '#ef4444';
const RATING_PREF_KEY = 'snaptip_show_rating';
const DEFAULT_SHOW_RATING = false;

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
  const { user, logout, updateUser } = useAuth();
  const { language, changeLanguage, t, languageLabel, LANG_INFO } = useLanguage();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const tx = useCallback((key: string, vars: Record<string, string | number> = {}) => {
    let value = t(key);
    Object.entries(vars).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, String(replacement));
    });
    return value;
  }, [t]);
  const balance = user?.balance ?? 0;
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState('');
  const [displayPhoto, setDisplayPhoto] = useState<string | null>(
    user?.photo_url ? user.photo_url + '?t=' + Date.now() : null
  );



  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editSaving, setEditSaving] = useState(false);

  // Photo picker bottom sheet
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  // Language picker
  const [showLangModal, setShowLangModal] = useState(false);

  // Rating visibility preference
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(RATING_PREF_KEY).then(val => {
      setShowRating(val === null ? DEFAULT_SHOW_RATING : val === 'true');
    }).catch(() => {});
  }, []);

  const toggleShowRating = useCallback(async (value: boolean) => {
    setShowRating(value);
    try {
      await AsyncStorage.setItem(RATING_PREF_KEY, String(value));
    } catch (_) {}
  }, []);

  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();
  const userCountry = user?.country || 'Morocco';
  const userCountryCode = COUNTRY_CODE_MAP[userCountry] || 'MA';

  const photoSrc = displayPhoto
    ? { uri: displayPhoto }
    : (localPhotoUri
      ? { uri: localPhotoUri }
      : getImageSource(user?.photo_base64 || user?.profile_image_url));

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      const fetchedBalance = data.employee?.balance ?? data.balance ?? 0;
      updateUser({ balance: fetchedBalance });
      setWithdrawals(data.recent_withdrawals || data.withdrawals || []);
      setTotalEarned(data.total_tips ?? 0);
      setTotalWithdrawn(data.total_withdrawn ?? 0);
    } catch {} finally { setLoading(false); }
  }, [updateUser]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Sync displayPhoto from AsyncStorage on mount (handles async AuthContext load)
  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const stored = await getItem(SecureKeys.USER);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.photo_url) {
            setDisplayPhoto(parsed.photo_url + '?t=' + Date.now());
          }
        }
      } catch {}
    };
    loadPhoto();
  }, []);

  // ── Crop raw URI to centered 800×800 square ──
  // ── Photo Picker — shows native crop UI before returning ──
  const pickImage = async (source: 'camera' | 'gallery') => {
    setShowPhotoSheet(false);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('permission_required'), t('camera_permission_required'));
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('permission_required'), t('photo_library_permission_required'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (result.canceled) return;
      const uri = result.assets[0].uri;
      console.log('[profile] Image selected with crop, uri:', uri);
      setLocalPhotoUri(uri);
      await uploadPhoto(uri);
    } catch (err: any) {
      showToast(err.message || t('could_not_process_image'), 'error');
      console.error('[profile] pickImage error:', err);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      const token = await getItem(SecureKeys.TOKEN);
      console.log('[profile] Uploading photo...');

      const uploadResult = await FileSystem.uploadAsync(
        `${API_URL}/api/employee/upload-photo`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'photo',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('[profile] status:', uploadResult.status, '| body:', uploadResult.body.slice(0, 300));

      // Guard against empty / non-JSON body
      let data: any = {};
      try { data = JSON.parse(uploadResult.body); } catch {}

      if (uploadResult.status !== 200) {
        setLocalPhotoUri('');
        showToast(data.error || `${t('server_error')} (${uploadResult.status})`, 'error');
        return;
      }

      // Server returns { success, message, employee: { photo_url, ... } }
      // photo_url lives inside employee, NOT at the top level
      const photoUrl = data.employee?.photo_url || data.photo_url;

      if (photoUrl) {
        const freshUrl = photoUrl + '?t=' + Date.now();
        setDisplayPhoto(freshUrl);
        // Spread full employee so balance, job_title, etc. stay in sync too
        updateUser({ ...(data.employee || {}), photo_url: photoUrl });
        showToast(t('photo_updated'), 'success');
      } else {
        setLocalPhotoUri('');
        console.error('[profile] No photo_url in response:', uploadResult.body);
        showToast(data.error || t('no_photo_url'), 'error');
      }
    } catch (err: any) {
      const msg = err?.message || t('unknown_error');
      console.error('[profile] Upload error:', msg, err);
      showToast(tx('could_not_save_photo', { message: msg }), 'error');
      setLocalPhotoUri('');
    } finally {
      setUploading(false);
    }
  };

  // ── Edit Profile ──
  const handleSaveProfile = async () => {
    if (!editName.trim()) { showToast(t('name_required'), 'error'); return; }
    setEditSaving(true);
    try {
      await api.patch('/employee/profile', { full_name: editName.trim() });
      updateUser({ full_name: editName.trim() });
      setShowEditModal(false);
      showToast(t('profile_updated'), 'success');
    } catch (e: any) {
      showToast(e.response?.data?.error || t('failed_update'), 'error');
    } finally { setEditSaving(false); }
  };



  const handleLogout = () => {
    Alert.alert(t('logout'), t('are_you_sure'), [
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
            <View style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 2.5, borderColor: ACCENT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,255,204,0.15)', opacity: uploading ? 0.5 : 1 }}>
              {photoSrc ? (
                <Image source={photoSrc} style={{ width: 96, height: 96 }} />
              ) : (
                <Text style={{ fontSize: 36, fontWeight: '700', color: ACCENT }}>{initials}</Text>
              )}
            </View>
            {uploading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="hourglass-outline" size={18} color="#fff" />
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowPhotoSheet(true)}
              disabled={uploading}
              activeOpacity={0.8}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: CARD }}
            >
              <Ionicons name="camera" size={14} color={ON_MINT} />
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

          {/* ── Earnings Summary Rows (employees only) ── */}
          {user?.account_type !== 'business' && (
            <View style={{ width: '100%', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)' }}>{t('total_earned')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{totalEarned.toFixed(2)} {user?.currency || 'MAD'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)' }}>{t('total_withdrawn')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{totalWithdrawn.toFixed(2)} {user?.currency || 'MAD'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)' }}>{t('available_balance')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN }}>{balance.toFixed(2)} {user?.currency || 'MAD'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Withdraw Funds (non-business only) ── */}
        {user?.account_type !== 'business' && (
          <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24, overflow: 'hidden' }}>
            <HapticButton
              onPress={() => router.push('/member/withdraw')}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="cash-outline" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('withdraw_funds')}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t('cash_out_earnings')}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: GREEN, marginRight: 6 }}>{balance.toFixed(2)} {user?.currency || 'MAD'}</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
            </HapticButton>
          </View>
        )}

        {/* ── Business Settings (owner only) ── */}
        {user?.account_type === 'business' && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>{t('business_settings')}</Text>
            <View style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 24, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => router.push('/business/team')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,255,204,0.12)', justifyContent: 'center', alignItems: 'center' }}>
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
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,255,204,0.12)', justifyContent: 'center', alignItems: 'center' }}>
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
              <CountryFlag code={userCountryCode} width={24} height={18} style={{ borderRadius: 4 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('country')}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{userCountry} · {user?.currency || 'MAD'}</Text>
            </View>
          </View>

          {/* Rating visibility toggle — employees only */}
          {user?.account_type !== 'business' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="star-outline" size={18} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('show_my_rating')}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{t('show_my_rating_desc')}</Text>
              </View>
              <Switch
                value={showRating}
                onValueChange={toggleShowRating}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(245,158,11,0.4)' }}
                thumbColor={showRating ? '#f59e0b' : 'rgba(255,255,255,0.4)'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </View>
          )}

          {/* Support row */}
          <TouchableOpacity onPress={() => router.push('/support' as any)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,255,204,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="help-circle-outline" size={18} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('contact_support')}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t('contact_support_desc')}</Text>
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
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,255,204,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="arrow-up-outline" size={18} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{w.amount.toFixed(2)} {user?.currency || 'MAD'}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{w.method || 'N/A'}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: `${statusColor(w.status)}15` }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(w.status), textTransform: 'capitalize' }}>{t(w.status)}</Text>
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

        {/* ── Delete Account (Apple 5.1.1 / Google Play) ── */}
        <DeleteAccountButton />

        <Toast {...toast} />
      </ScrollView>

      {/* ═══ Language Picker Modal ═══ */}
      <Modal visible={showLangModal} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowLangModal(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
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
          <View style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            {/* Drag Handle */}
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 }}>{t('change_photo')}</Text>

            <TouchableOpacity onPress={() => pickImage('camera')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,255,204,0.12)', justifyContent: 'center', alignItems: 'center' }}>
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
          <View style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{t('edit_profile')}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>{t('full_name')}</Text>
            <TextInput style={{ height: 52, borderRadius: 12, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, color: '#fff', fontSize: 15, paddingHorizontal: 14, marginBottom: 20 }} placeholder={t('your_full_name')} placeholderTextColor="rgba(255,255,255,0.2)" value={editName} onChangeText={setEditName} />
            <TouchableOpacity onPress={handleSaveProfile} disabled={editSaving} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: editSaving ? 0.5 : 1, marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: ON_MINT }}>{editSaving ? t('saving') : t('save_changes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.8} style={{ height: 44, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast {...toast} />
    </View>
  );
}
