import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking,
  TextInput, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import PrintableQRCard, { PrintableQRCardBusiness } from '../../components/PrintableQRCard';
import { downloadAndShareQRCard } from '../../lib/captureQRCard';
import SnapTipLogo from '../../components/SnapTipLogo';

const BG = '#080818';
const CARD_DARK = '#0f0f2e';
const BORDER_DARK = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';

export default function MemberQR() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [business, setBusiness] = useState<PrintableQRCardBusiness>(null);
  const [capturing, setCapturing] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [showPhoto, setShowPhoto] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const username = user?.username || '';
  const tipUrl = `https://snaptip.me/${username}`;

  const employee = {
    username,
    full_name: user?.full_name || '',
    photo_url: user?.photo_base64 || user?.profile_image_url || '',
    job_title: user?.job_title || '',
  };

  useEffect(() => {
    api.get('/business/member-business')
      .then(res => setBusiness(res.data.business || null))
      .catch(() => {});
    // Load saved QR settings
    api.get(`/employee/${user?.username}`)
      .then(res => {
        if (res.data.custom_message) setCustomMessage(res.data.custom_message);
        if (res.data.show_photo_on_card !== undefined) setShowPhoto(res.data.show_photo_on_card !== 0);
      })
      .catch(() => {});
  }, [user?.username]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.patch('/employee/qr-settings', {
        custom_message: customMessage.trim() || null,
        show_photo_on_card: showPhoto,
      });
      showToast('Card settings saved!', 'success');
    } catch {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDownload = async () => {
    setCapturing(true);
    await downloadAndShareQRCard(
      employee,
      business,
      () => showToast('QR Card ready!', 'success'),
      () => showToast('Failed to generate card.', 'error'),
      customMessage,
      showPhoto,
    );
    setCapturing(false);
  };

  const handlePreview = () => {
    Linking.openURL(tipUrl).catch(() =>
      showToast('Could not open browser.', 'error')
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#0d0d30', '#080818']}
        style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.06)',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <SnapTipLogo size={36} />
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{t('my_qr_card')}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {t('download_share_subtitle')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Dark container housing the white card (display only) ── */}
        <View style={{
          backgroundColor: CARD_DARK,
          borderRadius: 28,
          padding: 24,
          borderWidth: 1,
          borderColor: BORDER_DARK,
          marginBottom: 24,
          alignItems: 'center',
          shadowColor: ACCENT,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 10,
        }}>
          <PrintableQRCard employee={employee} business={business} customMessage={customMessage} showPhoto={showPhoto} />
        </View>

        {/* ── Customize Your Card ── */}
        <View style={{
          backgroundColor: CARD_DARK, borderRadius: 20, padding: 20,
          borderWidth: 1, borderColor: BORDER_DARK, marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Ionicons name="color-palette-outline" size={18} color={ACCENT} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Customize Your Card</Text>
          </View>

          {/* Custom message */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Custom Message
          </Text>
          <TextInput
            style={{
              height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
              color: '#fff', fontSize: 14, paddingHorizontal: 14, marginBottom: 16,
            }}
            placeholder="Leave a tip!  (default)"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={customMessage}
            onChangeText={setCustomMessage}
            maxLength={40}
          />

          {/* Show photo toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Show Profile Photo</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Display your photo on the card</Text>
            </View>
            <Switch
              value={showPhoto}
              onValueChange={setShowPhoto}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(0,200,150,0.4)' }}
              thumbColor={showPhoto ? '#00C896' : 'rgba(255,255,255,0.4)'}
            />
          </View>

          {/* Apply button */}
          <TouchableOpacity
            onPress={handleSaveSettings}
            disabled={savingSettings}
            activeOpacity={0.8}
            style={{
              height: 44, borderRadius: 50, borderWidth: 1,
              borderColor: 'rgba(108,108,255,0.4)',
              backgroundColor: 'rgba(108,108,255,0.1)',
              justifyContent: 'center', alignItems: 'center',
              opacity: savingSettings ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>
              {savingSettings ? 'Saving...' : 'Apply Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Download & Share (Primary) ── */}
        <TouchableOpacity
          onPress={handleDownload}
          disabled={capturing}
          activeOpacity={0.85}
          style={{ marginBottom: 12 }}
        >
          <LinearGradient
            colors={capturing ? ['#444', '#444'] : ['#6c6cff', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 52, borderRadius: 50,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
              shadowColor: '#6c6cff',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: capturing ? 0 : 0.35,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {capturing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
              {capturing ? t('preparing') : t('download_share_card')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Preview Payment Page (Secondary) ── */}
        <TouchableOpacity
          onPress={handlePreview}
          activeOpacity={0.8}
          style={{
            height: 48, borderRadius: 50,
            backgroundColor: 'rgba(108,108,255,0.1)',
            borderWidth: 1, borderColor: 'rgba(108,108,255,0.3)',
            flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
            marginBottom: 28,
          }}
        >
          <Ionicons name="eye-outline" size={20} color={ACCENT} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: ACCENT }}>{t('preview_tourist_page')}</Text>
        </TouchableOpacity>

        {/* ── Info ── */}
        <View style={{
          backgroundColor: 'rgba(108,108,255,0.06)',
          borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: 'rgba(108,108,255,0.12)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="print-outline" size={16} color={ACCENT} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>{t('printing_tip')}</Text>
          </View>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 20 }}>
            {t('printing_tip_desc')}
          </Text>
        </View>
      </ScrollView>

      <Toast {...toast} />
    </View>
  );
}
