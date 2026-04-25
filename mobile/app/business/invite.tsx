import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';

const BG = '#080818';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.06)';
const INPUT_BG = 'rgba(255,255,255,0.08)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';

interface Invite {
  email: string;
  sentAt: string;
}

export default function InviteMember() {
  const router = useRouter();
  const { toast, showToast } = useToast();

  // Link invite
  const [inviteUrl, setInviteUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState('');

  // Email invite
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sent, setSent] = useState<Invite[]>([]);

  // Fetch business info + invite link on mount
  useEffect(() => {
    (async () => {
      // Fetch business info first
      try {
        const bizRes = await api.get('/business/me');
        console.log('[invite] business/me response:', JSON.stringify(bizRes.data));
        setBusinessName(bizRes.data.business?.business_name || 'My Team');
      } catch (e: any) {
        console.warn('[invite] Failed to fetch business info:', e.response?.data || e.message);
      }

      // Fetch invite link
      try {
        const linkRes = await api.get('/business/invite-link');
        console.log('[invite] invite-link response:', JSON.stringify(linkRes.data));
        if (linkRes.data.invite_url) {
          setInviteUrl(linkRes.data.invite_url);
        } else {
          console.warn('[invite] invite_url is empty in response');
          showToast('Failed to generate invite link.', 'error');
        }
      } catch (e: any) {
        console.error('[invite] Failed to fetch invite link:', e.response?.status, e.response?.data || e.message);
        showToast(e.response?.data?.error || 'Failed to load invite link.', 'error');
      }

      setLinkLoading(false);
    })();
  }, []);

  // ── Copy link ──
  const copyLink = useCallback(async () => {
    if (!inviteUrl) { showToast('No invite link available.', 'error'); return; }
    await Clipboard.setStringAsync(inviteUrl);
    showToast('Link copied!', 'success');
  }, [inviteUrl, showToast]);

  // ── Share link ──
  const shareLink = useCallback(async () => {
    if (!inviteUrl) { showToast('No invite link available.', 'error'); return; }
    try {
      await Share.share({
        message: `You're invited to join ${businessName} on SnapTip! Click the link to accept: ${inviteUrl}`,
      });
    } catch {}
  }, [inviteUrl, businessName, showToast]);

  // ── Refresh link ──
  const refreshLink = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await api.post('/business/refresh-invite-link');
      setInviteUrl(data.invite_url);
      showToast('New invite link generated!', 'success');
    } catch {
      showToast('Failed to refresh link.', 'error');
    } finally { setRefreshing(false); }
  }, [showToast]);

  // ── Send email invite ──
  const handleEmailInvite = useCallback(async () => {
    if (!email.includes('@')) { showToast('Enter a valid email address.', 'error'); return; }
    setSendingEmail(true);
    try {
      await api.post('/business/invite', { email: email.trim().toLowerCase() });
      setSent((p) => [{ email: email.trim().toLowerCase(), sentAt: new Date().toISOString() }, ...p]);
      showToast(`Invitation sent to ${email.trim()}`, 'success');
      setEmail('');
    } catch (e: any) {
      console.error('[invite] Email invite error:', e.response?.status, e.response?.data || e.message);
      showToast(e.response?.data?.error || 'Failed to send invitation.', 'error');
    } finally { setSendingEmail(false); }
  }, [email, showToast]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Truncate URL for display
  const displayUrl = inviteUrl.length > 42 ? inviteUrl.slice(0, 30) + '...' + inviteUrl.slice(-10) : inviteUrl;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Invite Team Members</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Invite employees via link or email</Text>

        {/* ═══════════ SHARE INVITE LINK ═══════════ */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 10 }}>Share Invite Link</Text>
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 24 }}>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18, marginBottom: 16 }}>
            Share this link with your employees. Anyone with this link can join your team.
          </Text>

          {linkLoading ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* Link Pill */}
              <View style={{ backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }} numberOfLines={1}>{displayUrl}</Text>
              </View>

              {/* Copy + Share Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity onPress={copyLink} activeOpacity={0.8} style={{
                  flex: 1, height: 44, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
                }}>
                  <Ionicons name="copy-outline" size={16} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={shareLink} activeOpacity={0.8} style={{
                  flex: 1, height: 44, borderRadius: 50, backgroundColor: ACCENT,
                  justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
                }}>
                  <Ionicons name="share-social-outline" size={16} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Expiry info + Refresh */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1 }}>Link expires in 48h - Tap refresh to generate new link</Text>
                <TouchableOpacity onPress={refreshLink} disabled={refreshing} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10 }}>
                  {refreshing
                    ? <ActivityIndicator size="small" color={ACCENT} />
                    : <Ionicons name="refresh" size={14} color={ACCENT} />
                  }
                  <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ═══════════ EMAIL INVITE ═══════════ */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 10 }}>Invite via Email</Text>
        <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 6 }}>Employee Email</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, height: 52, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={{ flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 }}
              placeholder="employee@email.com"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              blurOnSubmit={false}
              returnKeyType="send"
            />
          </View>

          <TouchableOpacity onPress={handleEmailInvite} disabled={sendingEmail} activeOpacity={0.8} style={{ height: 48, borderRadius: 50, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', opacity: sendingEmail ? 0.5 : 1, flexDirection: 'row', gap: 8 }}>
            {sendingEmail ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send-outline" size={16} color="#fff" />}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{sendingEmail ? 'Sending...' : 'Send Invitation'}</Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════ PENDING INVITATIONS ═══════════ */}
        {sent.length > 0 && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>Pending Invitations</Text>
            {sent.map((inv, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER }}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.3)" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#fff' }}>{inv.email}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{formatDate(inv.sentAt)}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: 'rgba(245,158,11,0.12)' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>Pending</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}
