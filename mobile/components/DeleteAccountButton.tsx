/**
 * DeleteAccountButton — in-app account deletion entry point.
 *
 * Required by Apple App Store Guideline 5.1.1(v) and Google Play's data-deletion
 * policy: if an app lets you create an account, it must let you delete it from
 * inside the app.
 *
 * Flow:
 *   1. Two-step Alert.alert confirmation (destructive styling, cancel first).
 *   2. POST /api/employee/delete-account — soft-deletes the row (sets deleted_at)
 *      and emails a recovery code. The account is locked out immediately; the
 *      hard purge runs after the 30-day GDPR grace period via
 *      server/scripts/purge-deleted-accounts.js.
 *   3. Clear local auth storage (SecureStore + AsyncStorage, via logout()) and
 *      send the user back to /login.
 *
 * Rendered on both settings screens so the option is discoverable regardless of
 * which profile screen the user (or an app reviewer) lands on.
 */
import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import api from '../lib/api';

const RED = '#ef4444';

interface DeleteAccountButtonProps {
  /** Extra spacing above the section (defaults to the 24pt rhythm used on both profile screens) */
  marginTop?: number;
}

export default function DeleteAccountButton({ marginTop = 24 }: DeleteAccountButtonProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const balance = user?.balance ?? 0;
  const currency = user?.currency || 'MAD';

  // The 30-day window and the unwithdrawn-balance warning are the two things the
  // user genuinely needs before confirming, so both go in the first alert body.
  const buildWarning = () => {
    let body = t('delete_account_confirm_body');
    if (balance > 0) {
      body +=
        '\n\n' +
        t('delete_account_balance_warning')
          .replace('{balance}', balance.toFixed(2))
          .replace('{currency}', currency);
    }
    return body;
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      await api.post('/employee/delete-account');
      // logout() clears TOKEN, USER and PUSH from SecureStore *and* AsyncStorage.
      await logout();
      router.replace('/login');
      Alert.alert(t('delete_account_done_title'), t('delete_account_done_body'));
    } catch (e: any) {
      setDeleting(false);
      Alert.alert(
        t('delete_account_failed_title'),
        e?.response?.data?.error || t('delete_account_failed_body')
      );
    }
  };

  const confirmFinal = () => {
    Alert.alert(t('delete_account_final_title'), t('delete_account_final_body'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete_account_final_cta'), style: 'destructive', onPress: performDelete },
    ]);
  };

  const handlePress = () => {
    if (deleting) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
    Alert.alert(t('delete_account_confirm_title'), buildWarning(), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete_account_cta'), style: 'destructive', onPress: confirmFinal },
    ]);
  };

  // Deliberately minimal: a text-only action with no card, border or fill. The
  // destructive weight comes from the confirmation flow, not from the chrome.
  return (
    <View style={{ marginTop, alignItems: 'center' }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={deleting}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        style={{ paddingVertical: 8, paddingHorizontal: 16, opacity: deleting ? 0.5 : 1 }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: RED, textAlign: 'center' }}>
          {deleting ? t('deleting') : t('delete_account')}
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 12,
          lineHeight: 17,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          marginTop: 6,
          paddingHorizontal: 24,
        }}
      >
        {t('delete_account_desc')}
      </Text>
    </View>
  );
}
