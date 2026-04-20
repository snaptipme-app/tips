import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'fr' | 'ar' | 'es';

const translations: Record<string, Record<Lang, string>> = {
  // Navigation
  home: { en: 'Home', fr: 'Accueil', ar: 'الرئيسية', es: 'Inicio' },
  tips: { en: 'Tips', fr: 'Pourboires', ar: 'إكراميات', es: 'Propinas' },
  profile: { en: 'Profile', fr: 'Profil', ar: 'الملف', es: 'Perfil' },

  // Home
  available_balance: { en: 'Available Balance', fr: 'Solde disponible', ar: 'الرصيد المتاح', es: 'Saldo disponible' },
  total_earned: { en: 'Total Earned', fr: 'Total gagné', ar: 'إجمالي الأرباح', es: 'Total ganado' },
  tips_received: { en: 'Tips Received', fr: 'Pourboires reçus', ar: 'إكراميات مستلمة', es: 'Propinas recibidas' },
  tip_link_ready: { en: 'Your tip link is ready', fr: 'Votre lien est prêt', ar: 'رابط الإكرامية جاهز', es: 'Tu enlace está listo' },
  copy_link: { en: 'Copy Link', fr: 'Copier le lien', ar: 'نسخ الرابط', es: 'Copiar enlace' },
  share_qr: { en: 'Share QR', fr: 'Partager QR', ar: 'مشاركة QR', es: 'Compartir QR' },
  manage_team: { en: 'Manage Your Team', fr: 'Gérer votre équipe', ar: 'إدارة فريقك', es: 'Gestionar equipo' },
  add_members: { en: 'Add members, send invites', fr: 'Ajouter des membres', ar: 'إضافة أعضاء', es: 'Añadir miembros' },

  // Profile
  account_settings: { en: 'Account Settings', fr: 'Paramètres du compte', ar: 'إعدادات الحساب', es: 'Configuración' },
  edit_profile: { en: 'Edit Profile', fr: 'Modifier le profil', ar: 'تعديل الملف', es: 'Editar perfil' },
  business_settings: { en: 'Business Settings', fr: 'Paramètres entreprise', ar: 'إعدادات العمل', es: 'Ajustes de negocio' },
  my_team: { en: 'My Team', fr: 'Mon équipe', ar: 'فريقي', es: 'Mi equipo' },
  manage_members: { en: 'Manage team members', fr: 'Gérer les membres', ar: 'إدارة الأعضاء', es: 'Gestionar miembros' },
  invite_members: { en: 'Invite Members', fr: 'Inviter des membres', ar: 'دعوة أعضاء', es: 'Invitar miembros' },
  send_invitations: { en: 'Send invitations', fr: 'Envoyer des invitations', ar: 'إرسال دعوات', es: 'Enviar invitaciones' },
  withdraw_funds: { en: 'Withdraw Funds', fr: 'Retirer des fonds', ar: 'سحب الأموال', es: 'Retirar fondos' },
  recent_withdrawals: { en: 'Recent Withdrawals', fr: 'Retraits récents', ar: 'سحوبات أخيرة', es: 'Retiros recientes' },
  logout: { en: 'Log Out', fr: 'Déconnexion', ar: 'تسجيل الخروج', es: 'Cerrar sesión' },
  language: { en: 'Language', fr: 'Langue', ar: 'اللغة', es: 'Idioma' },
  change_photo: { en: 'Change Photo', fr: 'Changer la photo', ar: 'تغيير الصورة', es: 'Cambiar foto' },
  take_photo: { en: 'Take Photo', fr: 'Prendre une photo', ar: 'التقاط صورة', es: 'Tomar foto' },
  choose_gallery: { en: 'Choose from Gallery', fr: 'Choisir depuis la galerie', ar: 'اختيار من المعرض', es: 'Elegir de galería' },

  // Common
  save: { en: 'Save', fr: 'Enregistrer', ar: 'حفظ', es: 'Guardar' },
  cancel: { en: 'Cancel', fr: 'Annuler', ar: 'إلغاء', es: 'Cancelar' },
  back: { en: 'Back', fr: 'Retour', ar: 'رجوع', es: 'Volver' },
  confirm: { en: 'Confirm', fr: 'Confirmer', ar: 'تأكيد', es: 'Confirmar' },
  link_copied: { en: 'Link copied!', fr: 'Lien copié !', ar: 'تم نسخ الرابط!', es: '¡Enlace copiado!' },

  // Tips screen
  tip_transactions: { en: 'Tip Transactions', fr: 'Transactions', ar: 'المعاملات', es: 'Transacciones' },
  tip_received: { en: 'Tip Received', fr: 'Pourboire reçu', ar: 'إكرامية مستلمة', es: 'Propina recibida' },
  no_tips: { en: 'No tips yet', fr: 'Pas encore de pourboires', ar: 'لا إكراميات بعد', es: 'Sin propinas aún' },
  share_qr_tips: { en: 'Share your QR code to start receiving tips!', fr: 'Partagez votre QR code !', ar: 'شارك رمز QR لبدء استلام الإكراميات!', es: '¡Comparte tu código QR!' },
};

const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  es: 'Español',
};

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: (key: string) => string;
  langLabel: string;
  LANG_LABELS: Record<Lang, string>;
}

const LanguageContext = createContext<LangContextType>({
  lang: 'en',
  setLang: async () => {},
  t: (key) => key,
  langLabel: 'English',
  LANG_LABELS,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('snaptip_lang');
      if (saved && ['en', 'fr', 'ar', 'es'].includes(saved)) {
        setLangState(saved as Lang);
      }
    })();
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem('snaptip_lang', l);
    const shouldRTL = l === 'ar';
    if (I18nManager.isRTL !== shouldRTL) {
      I18nManager.forceRTL(shouldRTL);
      I18nManager.allowRTL(shouldRTL);
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] || translations[key]?.en || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, langLabel: LANG_LABELS[lang], LANG_LABELS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
