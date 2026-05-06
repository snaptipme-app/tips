import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, Modal,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Toast, useToast } from '../../components/Toast';
import { getImageSource } from '../../lib/imageUtils';
import HapticButton from '../../components/HapticButton';

const BG = '#1a1a1a';
const CARD = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#00ffcc';
const GREEN = '#00C896';
const DROPDOWN_BG = '#080818';

interface SearchResult {
  id: number;
  fullName: string;
  username: string;
  profilePicture: string | null;
  photoBase64: string | null;
  currency: string;
}

function resultPhoto(u: SearchResult) {
  if (u.profilePicture) {
    return { uri: u.profilePicture.startsWith('http') ? u.profilePicture : `https://snaptip.me${u.profilePicture}` };
  }
  if (u.photoBase64) return getImageSource(u.photoBase64);
  return null;
}

export default function SplitTip() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const cur = user?.currency || 'MAD';
  const balance = user?.balance ?? 0;

  // ── Search state ──
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [verified, setVerified] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Amount state ──
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  // ── Partial search ──
  const searchUsers = useCallback(async (cleaned: string) => {
    setSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const { data } = await api.get(`/split/search?q=${encodeURIComponent(cleaned)}`);
      const results: SearchResult[] = data.results || [];
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No users found matching that name.');
      }
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    setVerified(null);
    setSearchResults([]);
    setSearchError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const cleaned = text.trim().replace(/^@/, '');
    if (cleaned.length < 2) {
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(() => searchUsers(cleaned), 500);
  }, [searchUsers]);

  const handleSelectUser = useCallback((u: SearchResult) => {
    setVerified(u);
    setSearchResults([]);
    setSearchError('');
    setSearchText(u.username);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Send split ──
  const amt = Number(amount) || 0;
  const canSend = verified && amt > 0 && amt <= balance && !sending;

  const handleSend = useCallback(async () => {
    if (!verified || amt <= 0 || amt > balance) return;

    setSending(true);
    try {
      const { data } = await api.post('/split/send', {
        recipientId: verified.id,
        amount: amt,
      });

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      showToast(data.message || `${amt.toFixed(2)} ${cur} sent!`, 'success');

      if (data.newBalance !== undefined) {
        updateUser({ balance: data.newBalance });
      }

      setSearchText('');
      setVerified(null);
      setAmount('');

      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to send split';
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  }, [verified, amt, balance, cur, showToast, updateUser, router]);

  const recipientPhoto = verified ? resultPhoto(verified) : null;

  // Border color for the search card
  const cardBorderColor = verified
    ? 'rgba(0,200,150,0.3)'
    : searchError && !searching
      ? 'rgba(239,68,68,0.3)'
      : searchResults.length > 0
        ? 'rgba(0,255,204,0.2)'
        : BORDER;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>Split Tip</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Share a portion of your balance with a colleague
              </Text>
            </View>
          </View>

          {/* ── Balance Indicator ── */}
          <View style={{
            backgroundColor: 'rgba(0,200,150,0.08)',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(0,200,150,0.2)',
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Your Balance
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: GREEN, marginTop: 2 }}>
                {balance.toFixed(2)} {cur}
              </Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,200,150,0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="wallet" size={22} color={GREEN} />
            </View>
          </View>

          {/* ── Step 1: Search Recipient ── */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Step 1 — Find Recipient
          </Text>
          <View style={{
            backgroundColor: CARD,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: cardBorderColor,
            padding: 16,
            marginBottom: 20,
          }}>
            {/* Input row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,255,204,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="search" size={20} color={ACCENT} />
              </View>
              <TextInput
                value={searchText}
                onChangeText={handleSearchChange}
                placeholder="Type a username..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '600',
                }}
              />
              {searching && (
                <ActivityIndicator size="small" color={ACCENT} />
              )}
              {verified && !searching && (
                <TouchableOpacity
                  onPress={() => { setVerified(null); setSearchText(''); setSearchResults([]); setSearchError(''); }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Searching indicator */}
            {searching && (
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 12 }}>
                Searching...
              </Text>
            )}

            {/* Autocomplete dropdown */}
            {!searching && searchResults.length > 0 && !verified && (
              <View style={{
                marginTop: 10,
                backgroundColor: DROPDOWN_BG,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}>
                {searchResults.map((u, i) => {
                  const photo = resultPhoto(u);
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => handleSelectUser(u)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        borderBottomWidth: i < searchResults.length - 1 ? 1 : 0,
                        borderBottomColor: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <View style={{
                        width: 38, height: 38, borderRadius: 19,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(0,255,204,0.12)',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        {photo ? (
                          <Image source={photo} style={{ width: 38, height: 38 }} />
                        ) : (
                          <Text style={{ fontSize: 16, fontWeight: '800', color: ACCENT }}>
                            {(u.fullName || '?')[0].toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{u.fullName}</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                          @{u.username} · {u.currency}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Error — only shown after search completes with no results */}
            {!searching && searchError && !verified && searchResults.length === 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <Ionicons name="close-circle" size={16} color="#ef4444" />
                <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '500' }}>{searchError}</Text>
              </View>
            )}

            {/* Verified User Card */}
            {verified && (
              <View style={{
                marginTop: 14,
                backgroundColor: 'rgba(0,200,150,0.06)',
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: 'rgba(0,200,150,0.15)',
              }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  overflow: 'hidden',
                  backgroundColor: 'rgba(0,255,204,0.15)',
                  justifyContent: 'center', alignItems: 'center',
                  borderWidth: 2, borderColor: GREEN,
                }}>
                  {recipientPhoto ? (
                    <Image source={recipientPhoto} style={{ width: 48, height: 48 }} />
                  ) : (
                    <Text style={{ fontSize: 20, fontWeight: '800', color: ACCENT }}>
                      {(verified.fullName || '?')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{verified.fullName}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                  </View>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                    @{verified.username} · {verified.currency}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Step 2: Amount (only when verified) ── */}
          {verified && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Step 2 — Enter Amount
              </Text>
              <View style={{
                backgroundColor: CARD,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: BORDER,
                padding: 16,
                marginBottom: 24,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,200,150,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: GREEN }}>{cur}</Text>
                  </View>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      height: 52,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      color: '#fff',
                      fontSize: 24,
                      fontWeight: '800',
                    }}
                  />
                </View>

                {/* Quick amount chips */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  {[
                    Math.min(Math.floor(balance * 0.25), balance),
                    Math.min(Math.floor(balance * 0.5), balance),
                    Math.min(Math.floor(balance * 0.75), balance),
                    Math.floor(balance),
                  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((val) => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setAmount(String(val))}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: Number(amount) === val ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: Number(amount) === val ? 'rgba(0,200,150,0.3)' : 'transparent',
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: Number(amount) === val ? GREEN : 'rgba(255,255,255,0.4)',
                      }}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Over-balance warning */}
                {amt > balance && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    <Ionicons name="warning" size={14} color="#f59e0b" />
                    <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: '500' }}>
                      Amount exceeds your balance of {balance.toFixed(2)} {cur}
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Send Button ── */}
              <HapticButton
                onPress={handleSend}
                disabled={!canSend}
                hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                style={{
                  height: 56,
                  borderRadius: 50,
                  backgroundColor: canSend ? GREEN : 'rgba(255,255,255,0.06)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 10,
                  opacity: canSend ? 1 : 0.5,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#1a1a1a" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={canSend ? '#1a1a1a' : 'rgba(255,255,255,0.3)'} />
                    <Text style={{
                      fontSize: 17,
                      fontWeight: '800',
                      color: canSend ? '#1a1a1a' : 'rgba(255,255,255,0.3)',
                    }}>
                      {amt > 0
                        ? `Confirm Split ${amt.toFixed(2)} ${cur}`
                        : 'Enter Amount'}
                    </Text>
                  </>
                )}
              </HapticButton>

              {/* ── Info note ── */}
              <Text style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.2)',
                textAlign: 'center',
                marginTop: 14,
                lineHeight: 18,
              }}>
                This is an internal balance transfer. No real money is moved.{'\n'}
                The amount will be deducted from your balance and added to {verified.fullName}'s.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast {...toast} />
    </View>
  );
}
