import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import api from '../../lib/api';
import { uploadProfileImage } from '../../lib/uploadImage';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const SHEET_BG = '#0d0d24';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.07)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const RED = '#ef4444';

const METHODS = ['CIH Bank', 'Cash Plus', 'Wafa Cash', 'Other Bank'];
/* eslint-disable @typescript-eslint/no-require-imports */
const LANG_IMAGES: Record<string, any> = {
  en: require('../../assets/images/us_icon.png'),
  fr: require('../../assets/images/france_icon.png'),
  ar: require('../../assets/images/morocco_icon.png'),
  es: require('../../assets/images/spain_icon.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  es: 'Español',
};

export default function MemberProfile() {
  const { user, updateUser, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const router = useRouter();
  const { toast, showToast } = useToast();

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [saving, setSaving] = useState(false);

  // Business info
  const [bizName, setBizName] = useState('');
  const [bizLogo, setBizLogo] = useState('');

  // Password change sheet
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Withdrawal settings sheet
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [wMethod, setWMethod] = useState('');
  const [wAccount, setWAccount] = useState('');
  const [savingWithdraw, setSavingWithdraw] = useState(false);

  const initials = (user?.full_name || 'M').charAt(0).toUpperCase();
  const photoSrc = user?.photo_url || user?.photo_base64 || user?.profile_image_url || '';

  useEffect(() => {
    // Fetch business info
    api.get('/employee/my-business')
      .then(res => {
        setBizName(res.data.business?.business_name || '');
        setBizLogo(res.data.business?.logo_base64 || res.data.business?.logo_url || '');
      })
      .catch(() => {});
  }, []);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.3,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const uploadResult = await uploadProfileImage(asset.uri);
        if (uploadResult.success && uploadResult.employee?.photo_url) {
          updateUser({ photo_url: uploadResult.employee.photo_url + '?t=' + Date.now() });
          Alert.alert('Success', 'Profile photo uploaded!');
        } else {
          Alert.alert('Upload Failed', JSON.stringify(uploadResult.error || 'Unknown error'));
        }
      } catch (e: any) {
        Alert.alert('Upload Failed', e?.message || 'Unknown error');
      }
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.patch('/employee/profile', { full_name: fullName.trim(), job_title: jobTitle.trim() });
      updateUser({ full_name: fullName.trim(), job_title: jobTitle.trim() });
      showToast('Profile updated!', 'success');
    } catch { showToast('Failed to save profile.', 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { showToast('Passwords do not match.', 'error'); return; }
    if (newPw.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    setChangingPw(true);
    try {
      await api.post('/auth/change-password', { current_password: currentPw, new_password: newPw });
      showToast('Password changed!', 'success');
      setShowPasswordSheet(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to change password.', 'error');
    } finally { setChangingPw(false); }
  };

  const handleSaveWithdrawal = async () => {
    if (!wMethod) { showToast('Select a method.', 'error'); return; }
    setSavingWithdraw(true);
    try {
      await api.patch('/employee/withdrawal-method', { method: wMethod, account: wAccount });
      showToast('Withdrawal settings saved!', 'success');
      setShowWithdrawSheet(false);
    } catch { showToast('Failed to save.', 'error'); }
    finally { setSavingWithdraw(false); }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('my_profile')}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t('settings_preferences')}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* ── Avatar ── */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
            <View style={{ width: 90, height: 90, borderRadius: 45, overflow: 'hidden', borderWidth: 3, borderColor: ACCENT, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              {photoSrc ? <Image source={{ uri: photoSrc }} style={{ width: 90, height: 90 }} /> : <Text style={{ fontSize: 32, fontWeight: '800', color: ACCENT }}>{initials}</Text>}
            </View>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BG }}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>@{user?.username}</Text>
        </View>

        {/* ── Profile Section ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, gap: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('personal_info')}</Text>

          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{t('full_name')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" />
              <TextInput style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }} placeholder="Full name" placeholderTextColor="rgba(255,255,255,0.2)" value={fullName} onChangeText={setFullName} />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{t('job_title')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER }}>
              <Ionicons name="briefcase-outline" size={18} color="rgba(255,255,255,0.35)" />
              <TextInput style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }} placeholder="e.g. Waiter, Guide, Driver" placeholderTextColor="rgba(255,255,255,0.2)" value={jobTitle} onChangeText={setJobTitle} />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={saving}
            activeOpacity={0.8}
            style={{ height: 48, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{saving ? t('saving') : t('save_profile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Business Info (Read-Only) ── */}
        {bizName ? (
          <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>{t('your_workplace')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER }}>
                {bizLogo ? <Image source={{ uri: bizLogo }} style={{ width: 48, height: 48 }} /> : <Ionicons name="business-outline" size={22} color="rgba(255,255,255,0.3)" />}
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{bizName}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t('member_account')}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50, backgroundColor: 'rgba(0,200,150,0.1)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: GREEN }}>{t('active')}</Text>
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 14, textAlign: 'center' }}>
              {t('workplace_note')}
            </Text>
          </View>
        ) : null}

        {/* ── Withdrawal Settings ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>{t('withdrawal_settings')}</Text>
          <TouchableOpacity
            onPress={() => setShowWithdrawSheet(true)}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: BORDER }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="card-outline" size={20} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('update_payment')}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t('payment_methods_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        </View>

        {/* ── Language ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>{t('language')}</Text>
          <View style={{ gap: 4 }}>
            {Object.keys(LANG_IMAGES).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => changeLanguage(l)}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: language === l ? ACCENT : 'rgba(255,255,255,0.06)', backgroundColor: language === l ? 'rgba(108,108,255,0.10)' : 'transparent' }}
              >
                <Image source={LANG_IMAGES[l]} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: language === l ? '#fff' : 'rgba(255,255,255,0.5)' }}>{LANG_NAMES[l]}</Text>
                {language === l && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Security ── */}
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>{t('security')}</Text>
          <TouchableOpacity
            onPress={() => setShowPasswordSheet(true)}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: BORDER }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(108,108,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="lock-closed-outline" size={20} color={ACCENT} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 }}>{t('change_password')}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={{ height: 52, borderRadius: 50, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 }}
        >
          <Ionicons name="log-out-outline" size={20} color={RED} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: RED }}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Change Password Sheet ── */}
      <Modal visible={showPasswordSheet} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => !changingPw && setShowPasswordSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 20 }}>{t('change_password')}</Text>
              {[
                { label: t('current_password'), val: currentPw, set: setCurrentPw },
                { label: t('new_password'), val: newPw, set: setNewPw },
                { label: t('confirm_password'), val: confirmPw, set: setConfirmPw },
              ].map((f) => (
                <View key={f.label} style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{f.label}</Text>
                  <View style={{ backgroundColor: INPUT_BG, borderRadius: 12, height: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, justifyContent: 'center' }}>
                    <TextInput style={{ color: '#fff', fontSize: 15 }} secureTextEntry placeholder="••••••" placeholderTextColor="rgba(255,255,255,0.2)" value={f.val} onChangeText={f.set} />
                  </View>
                </View>
              ))}
              <TouchableOpacity onPress={handleChangePassword} disabled={changingPw} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, opacity: changingPw ? 0.6 : 1, marginTop: 6 }}>
                {changingPw ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{changingPw ? t('saving') : t('save_password')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Withdrawal Method Sheet ── */}
      <Modal visible={showWithdrawSheet} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => !savingWithdraw && setShowWithdrawSheet(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 20 }}>{t('payment_method')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {METHODS.map((m) => (
                <TouchableOpacity key={m} onPress={() => setWMethod(m)} activeOpacity={0.8} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, borderWidth: 1.5, borderColor: wMethod === m ? GREEN : 'rgba(255,255,255,0.1)', backgroundColor: wMethod === m ? 'rgba(0,200,150,0.1)' : 'transparent' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: wMethod === m ? GREEN : 'rgba(255,255,255,0.4)' }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{t('rib_account')}</Text>
            <View style={{ backgroundColor: INPUT_BG, borderRadius: 12, height: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', marginBottom: 20 }}>
              <TextInput style={{ color: '#fff', fontSize: 15 }} placeholder="Enter account number" placeholderTextColor="rgba(255,255,255,0.2)" value={wAccount} onChangeText={setWAccount} keyboardType="numeric" />
            </View>
            <TouchableOpacity onPress={handleSaveWithdrawal} disabled={savingWithdraw} activeOpacity={0.8} style={{ height: 52, borderRadius: 50, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, opacity: savingWithdraw ? 0.6 : 1 }}>
              {savingWithdraw ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{t('save_method')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast {...toast} />
    </KeyboardAvoidingView>
  );
}
