import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert,
  RefreshControl, Modal, ActivityIndicator, Image, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import { PrintableQRCardBusiness } from '../../components/PrintableQRCard';
import { downloadAndShareQRCard } from '../../lib/captureQRCard';

const BG = '#080818';
const CARD = '#0f0f2e';
const SHEET_BG = '#0d0d24';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const RED = '#ef4444';

interface Member {
  member_id: number;
  employee_id: number;
  username: string;
  full_name: string;
  email: string;
  balance: number;
  total_tips: number;
  role: string;
  joined_at: string;
  photo_url?: string;
  photo_base64?: string;
  profile_image_url?: string;
  job_title?: string;
}

export default function TeamManagement() {
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState('My Team');
  const [business, setBusiness] = useState<PrintableQRCardBusiness>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [capturingQR, setCapturingQR] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, bizRes, linkRes] = await Promise.all([
        api.get('/business/members'),
        api.get('/business/me'),
        api.get('/business/invite-link'),
      ]);
      setMembers(membersRes.data.members || []);
      const biz = bizRes.data.business;
      setBusinessName(biz?.business_name || 'My Team');
      setBusiness(biz || null);
      if (linkRes.data.invite_url) setInviteUrl(linkRes.data.invite_url);
    } catch (e: any) {
      if (e.response?.status === 403 || e.response?.status === 404) {
        router.replace('/business/setup');
      } else {
        showToast('Failed to load team.', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-fetch every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const openMemberSheet = (m: Member) => {
    setSelectedMember(m);
    setShowSheet(true);
  };

  const handleRemove = () => {
    if (!selectedMember) return;
    setShowSheet(false);
    Alert.alert(
      'Remove Member',
      `Remove ${selectedMember.full_name} from the team? Their account will be reset.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await api.delete(`/business/member/${selectedMember.employee_id}`);
              setMembers((prev) => prev.filter((m) => m.employee_id !== selectedMember.employee_id));
              showToast(`${selectedMember.full_name} removed from team.`, 'success');
            } catch (e: any) {
              showToast(e.response?.data?.error || 'Failed to remove.', 'error');
            } finally {
              setRemoving(false);
              setSelectedMember(null);
            }
          },
        },
      ]
    );
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) { showToast('No invite link available.', 'error'); return; }
    await Clipboard.setStringAsync(inviteUrl);
    showToast('Invite link copied!', 'success');
    setShowSheet(false);
  };

  const handleShareWhatsApp = () => {
    if (!inviteUrl) { showToast('No invite link available.', 'error'); return; }
    const msg = encodeURIComponent(`You're invited to join ${businessName} on SnapTip! Accept here: ${inviteUrl}`);
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() => {
      showToast('WhatsApp is not installed.', 'error');
    });
    setShowSheet(false);
  };

  // ── Download QR card for a specific member via PDF ────────────────────
  const handleDownloadQR = async (member: Member) => {
    setShowSheet(false);
    setCapturingQR(true);
    showToast('Preparing QR card...', 'info');

    await downloadAndShareQRCard(
      {
        username: member.username,
        full_name: member.full_name,
        photo_url: member.profile_image_url || '',
        job_title: member.job_title || '',
      },
      business,
      () => {
        showToast('QR Card ready to share!', 'success');
        setCapturingQR(false);
      },
      () => {
        showToast('Failed to generate QR card.', 'error');
        setCapturingQR(false);
      }
    );
  };

  const renderMember = ({ item }: { item: Member }) => {
    const initials = (item.full_name || 'U').charAt(0).toUpperCase();
    // photo_base64 takes priority (set via profile edit), then URL-based columns
    const photoBase64 = item.photo_base64 || '';
    const rawUrl = item.profile_image_url || item.photo_url || '';
    // Add cache-buster to URL photos so stale images are never shown
    const photoUrl = rawUrl ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : '';
    const photo = photoBase64 || photoUrl;
    const joinedDate = new Date(item.joined_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    return (
      <TouchableOpacity
        onPress={() => openMemberSheet(item)}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: CARD, borderRadius: 18, padding: 16,
          marginBottom: 10, borderWidth: 1, borderColor: BORDER,
        }}
      >
        {/* Avatar */}
        <View style={{
          width: 48, height: 48, borderRadius: 24, overflow: 'hidden',
          borderWidth: 2, borderColor: 'rgba(108,108,255,0.3)',
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(108,108,255,0.12)', marginRight: 14,
        }}>
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: 48, height: 48 }} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: '700', color: ACCENT }}>{initials}</Text>
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{item.full_name}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>@{item.username}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>Joined {joinedDate}</Text>
        </View>

        {/* Tips + Status */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: GREEN }}>${Number(item.total_tips).toFixed(2)}</Text>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50,
            backgroundColor: 'rgba(0,200,150,0.12)', borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)',
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: GREEN }}>Active</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* Capturing overlay */}
      {capturingQR && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: CARD, borderRadius: 20, padding: 28,
            alignItems: 'center', gap: 14, borderWidth: 1, borderColor: BORDER,
          }}>
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Preparing QR card...</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <LinearGradient colors={['#0d0d30', '#080818']} style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{businessName}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {members.length} member{members.length !== 1 ? 's' : ''} · tap a member for actions
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/business/invite')}
            activeOpacity={0.8}
            style={{ backgroundColor: ACCENT, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Invite</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.member_id)}
          renderItem={renderMember}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: 'rgba(108,108,255,0.08)',
                justifyContent: 'center', alignItems: 'center',
                marginBottom: 16, borderWidth: 1, borderColor: 'rgba(108,108,255,0.1)',
              }}>
                <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.15)" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.3)' }}>No team members yet</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                Invite employees to grow your team and track tips together.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/business/invite')}
                activeOpacity={0.8}
                style={{ marginTop: 24, backgroundColor: ACCENT, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="mail-outline" size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Send First Invite</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={ACCENT}
            />
          }
        />
      )}

      {/* ── Member Action Bottom Sheet ── */}
      <Modal visible={showSheet} animationType="slide" transparent>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSheet(false)}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <View style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            </View>

            {selectedMember && (
              <>
                {/* Member info header */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 24, paddingBottom: 20,
                  borderBottomWidth: 1, borderBottomColor: BORDER,
                }}>
                  <View style={{
                    width: 52, height: 52, borderRadius: 26,
                    backgroundColor: 'rgba(108,108,255,0.12)',
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: 2, borderColor: 'rgba(108,108,255,0.3)',
                  }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: ACCENT }}>
                      {(selectedMember.full_name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{selectedMember.full_name}</Text>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>@{selectedMember.username}</Text>
                    <Text style={{ fontSize: 13, color: GREEN, fontWeight: '600' }}>
                      ${Number(selectedMember.total_tips).toFixed(2)} earned
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ paddingTop: 8 }}>

                  {/* Download QR Card */}
                  <TouchableOpacity
                    onPress={() => handleDownloadQR(selectedMember)}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 16 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="qr-code-outline" size={22} color={ACCENT} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Download QR Card</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Generate &amp; share printable tip card</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 24 }} />

                  {/* Copy Invite Link */}
                  <TouchableOpacity
                    onPress={handleCopyLink}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 16 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(108,108,255,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="copy-outline" size={22} color={ACCENT} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Copy Invite Link</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Copy team invite link to clipboard</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 24 }} />

                  {/* Share via WhatsApp */}
                  <TouchableOpacity
                    onPress={handleShareWhatsApp}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 16 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(37,211,102,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Share via WhatsApp</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Send invite through WhatsApp</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 24 }} />

                  {/* Remove Member */}
                  <TouchableOpacity
                    onPress={handleRemove}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 16 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person-remove-outline" size={22} color={RED} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: RED }}>Remove Member</Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Remove from team permanently</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setShowSheet(false)}
                  activeOpacity={0.8}
                  style={{
                    marginTop: 8, marginHorizontal: 24, height: 48, borderRadius: 50,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                    justifyContent: 'center', alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast {...toast} />
    </View>
  );
}
