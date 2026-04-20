import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Linking,
} from 'react-native';
import { Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

// ── App dark theme ──────────────────────────────────────────
const BG = '#080818';
const CARD_DARK = '#0f0f2e';
const BORDER_DARK = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

// ── Print card (white / print-friendly) ─────────────────────
const CARD_BG = '#FFFFFF';
const NAVY = '#1a1a2e';
const GRAY = '#888888';
const LIGHT_BORDER = '#e8e8e8';

interface Business {
  id: number;
  business_name: string;
  logo_url?: string;
  logo_base64?: string;
}

// ─────────────────────────────────────────────────────────────
// PrintableCard — captured as high-quality PNG
// ─────────────────────────────────────────────────────────────
interface PrintableCardProps {
  cardRef: React.RefObject<View>;
  tipUrl: string;
  fullName: string;
  username: string;
  jobTitle: string;
  photoSrc: string;
  initials: string;
  business: Business | null;
}

function PrintableCard({
  cardRef, tipUrl, fullName, username,
  jobTitle, photoSrc, initials, business,
}: PrintableCardProps) {
  const bizLogo = business?.logo_base64 || business?.logo_url || '';
  const bizName = business?.business_name || '';

  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={{
        width: 320,
        backgroundColor: CARD_BG,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* ① Business Logo / Name Pill */}
      <View style={{ marginBottom: 16, alignItems: 'center' }}>
        {bizLogo ? (
          <Image
            source={{ uri: bizLogo }}
            style={{ width: 60, height: 60, borderRadius: 30 }}
          />
        ) : bizName ? (
          <View style={{
            backgroundColor: '#f0f0ff',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 50,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>{bizName}</Text>
          </View>
        ) : null}
      </View>

      {/* ② Call to Action */}
      <Text style={{ fontSize: 14, fontWeight: '500', color: '#666', textAlign: 'center' }}>
        Enjoyed the service?
      </Text>
      <Text style={{
        fontSize: 22,
        fontWeight: '800',
        color: GREEN,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 20,
        marginTop: 2,
      }}>
        Leave a tip!
      </Text>

      {/* ③ QR Code */}
      <View style={{
        borderWidth: 1,
        borderColor: LIGHT_BORDER,
        borderRadius: 12,
        padding: 12,
        backgroundColor: CARD_BG,
      }}>
        <QRCode
          value={tipUrl}
          size={180}
          color={NAVY}
          backgroundColor={CARD_BG}
        />
      </View>

      {/* ④ Employee Info */}
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        {/* Photo */}
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: LIGHT_BORDER,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: photoSrc ? 'transparent' : ACCENT,
        }}>
          {photoSrc ? (
            <Image source={{ uri: photoSrc }} style={{ width: 48, height: 48 }} />
          ) : (
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{initials}</Text>
          )}
        </View>

        {/* Name */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: NAVY, marginTop: 8 }}>
          {fullName}
        </Text>

        {/* Job title */}
        {jobTitle ? (
          <Text style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>
            {jobTitle}
          </Text>
        ) : null}
      </View>

      {/* ⑤ Security Footer */}
      <View style={{ width: '100%', marginTop: 16 }}>
        <View style={{ height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 }} />
        <Text style={{ fontSize: 11, color: '#bbb', textAlign: 'center' }}>
          Secure payment via SnapTip
        </Text>
        <Text style={{ fontSize: 11, color: ACCENT, textAlign: 'center', marginTop: 2 }}>
          snaptip.me/{username}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function MemberQR() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const cardRef = useRef<View>(null);

  const [business, setBusiness] = useState<Business | null>(null);
  const [capturing, setCapturing] = useState(false);

  const username = user?.username || '';
  const fullName = user?.full_name || '';
  const jobTitle = user?.job_title || '';
  const tipUrl = `https://snaptip.me/${username}`;
  const initials = (fullName || 'M').charAt(0).toUpperCase();
  const photoSrc = user?.photo_base64 || user?.profile_image_url || '';

  // Fetch the business this member belongs to
  useEffect(() => {
    api.get('/business/member-business')
      .then(res => setBusiness(res.data.business || null))
      .catch(() => {});
  }, []);

  // ── Capture card → save to gallery → open share sheet ──────
  const downloadAndShare = async () => {
    if (!cardRef.current) return;
    try {
      setCapturing(true);

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();

      // Save to gallery if permitted
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        showToast('Card saved to gallery!', 'success');
      }

      // Open native share dialog
      await Share.share({
        title: 'My SnapTip QR Card',
        message: `Scan to tip me on SnapTip! https://snaptip.me/${username}`,
        url: uri, // iOS
      });
    } catch {
      showToast('Failed to capture card.', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const handlePreview = () => {
    Linking.openURL(tipUrl).catch(() => {
      showToast('Could not open browser.', 'error');
    });
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
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>My QR Card</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Download &amp; share your printable tip card
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Printable Card ── */}
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
          <PrintableCard
            cardRef={cardRef}
            tipUrl={tipUrl}
            fullName={fullName}
            username={username}
            jobTitle={jobTitle}
            photoSrc={photoSrc}
            initials={initials}
            business={business}
          />
        </View>

        {/* ── Download & Share (Primary) ── */}
        <TouchableOpacity
          onPress={downloadAndShare}
          disabled={capturing}
          activeOpacity={0.85}
          style={{ marginBottom: 12 }}
        >
          <LinearGradient
            colors={capturing ? ['#555', '#555'] : ['#6c6cff', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 52,
              borderRadius: 50,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
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
              {capturing ? 'Preparing...' : 'Download & Share Card'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Preview Payment Page (Secondary) ── */}
        <TouchableOpacity
          onPress={handlePreview}
          activeOpacity={0.8}
          style={{
            height: 48,
            borderRadius: 50,
            backgroundColor: 'rgba(108,108,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(108,108,255,0.3)',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <Ionicons name="eye-outline" size={20} color={ACCENT} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: ACCENT }}>
            Preview Tourist Page
          </Text>
        </TouchableOpacity>

        {/* ── Info Card ── */}
        <View style={{
          backgroundColor: 'rgba(108,108,255,0.06)',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(108,108,255,0.12)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="print-outline" size={16} color={ACCENT} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>Printing tip</Text>
          </View>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 20 }}>
            Download the card and print it to place on tables. Customers scan
            the QR code to tip you — no app needed on their side.
          </Text>
        </View>
      </ScrollView>

      <Toast {...toast} />
    </View>
  );
}
