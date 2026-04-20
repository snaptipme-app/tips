import { useRef } from 'react';
import { View, Text, TouchableOpacity, Share, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../lib/AuthContext';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

export default function MemberQR() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const qrRef = useRef<any>(null);

  const tipUrl = `https://snaptip.me/${user?.username}`;
  const initials = (user?.full_name || 'M').charAt(0).toUpperCase();
  const photoSrc = user?.photo_base64 || user?.profile_image_url || '';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Tip me on SnapTip! ${tipUrl}`,
        url: tipUrl,
      });
    } catch {}
  };

  const handlePreview = async () => {
    await WebBrowser.openBrowserAsync(tipUrl);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
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
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>My QR Code</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Share to receive tips</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* QR Card */}
        <View style={{ backgroundColor: CARD, borderRadius: 28, padding: 28, borderWidth: 1, borderColor: BORDER, alignItems: 'center', marginBottom: 24 }}>
          {/* Employee name above QR */}
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 }}>{user?.full_name}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>@{user?.username}</Text>

          {/* QR Code with avatar overlay */}
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18 }}>
              <QRCode value={tipUrl} size={210} color="#000" backgroundColor="#fff" />
            </View>
            {/* Avatar overlay in QR center */}
            {photoSrc ? (
              <View style={{
                position: 'absolute',
                width: 52,
                height: 52,
                borderRadius: 26,
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: '#fff',
              }}>
                <Image source={{ uri: photoSrc }} style={{ width: 52, height: 52 }} />
              </View>
            ) : (
              <View style={{
                position: 'absolute',
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: ACCENT,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 3,
                borderColor: '#fff',
              }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{initials}</Text>
              </View>
            )}
          </View>

          {/* URL pill */}
          <View style={{ marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>snaptip.me/{user?.username}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.8}
          style={{
            height: 54,
            borderRadius: 50,
            backgroundColor: ACCENT,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 10,
            marginBottom: 12,
            shadowColor: ACCENT,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Ionicons name="share-social-outline" size={20} color="#fff" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Share Link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePreview}
          activeOpacity={0.8}
          style={{
            height: 54,
            borderRadius: 50,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.15)',
            backgroundColor: CARD,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <Ionicons name="open-outline" size={20} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Preview Payment Page</Text>
        </TouchableOpacity>

        {/* Tips */}
        <View style={{ marginTop: 28, backgroundColor: 'rgba(108,108,255,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(108,108,255,0.12)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={ACCENT} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>How it works</Text>
          </View>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 20 }}>
            Show or share your QR code. When customers scan it, they can tip you directly to your SnapTip balance.
          </Text>
        </View>
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
