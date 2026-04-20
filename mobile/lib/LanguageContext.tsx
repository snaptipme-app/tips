import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'snaptip_language';

const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    home: 'Home',
    tips: 'Tips',
    profile: 'Profile',
    // Home
    available_balance: 'Available Balance',
    total_earned: 'Total Earned',
    tips_received: 'Tips Received',
    tip_link_ready: 'Your tip link is ready',
    copy_link: 'Copy Link',
    share_qr: 'Share QR',
    manage_team: 'Manage Your Team',
    add_members: 'Add members, send invites',
    // Profile
    account_settings: 'Account Settings',
    edit_profile: 'Edit Profile',
    business_settings: 'Business Settings',
    my_team: 'My Team',
    manage_members: 'Manage team members',
    invite_members: 'Invite Members',
    send_invitations: 'Send invitations',
    withdraw_funds: 'Withdraw Funds',
    recent_withdrawals: 'Recent Withdrawals',
    logout: 'Log Out',
    language: 'Language',
    change_photo: 'Change Photo',
    take_photo: 'Take Photo',
    choose_gallery: 'Choose from Gallery',
    settings: 'Settings',
    select_language: 'Select Language',
    // QR Card
    enjoyed: 'Enjoyed the service?',
    leave_tip: 'Leave a tip!',
    secure: 'Secure payment via SnapTip',
    select_amount: 'Choose tip amount',
    pay: 'Pay',
    save: 'Save',
    // Common
    cancel: 'Cancel',
    back: 'Back',
    confirm: 'Confirm',
    link_copied: 'Link copied!',
    // Tips screen
    tip_transactions: 'Tip Transactions',
    tip_received: 'Tip Received',
    no_tips: 'No tips yet',
    share_qr_tips: 'Share your QR code to start receiving tips!',
  },
  fr: {
    home: 'Accueil',
    tips: 'Pourboires',
    profile: 'Profil',
    available_balance: 'Solde disponible',
    total_earned: 'Total gagné',
    tips_received: 'Pourboires reçus',
    tip_link_ready: 'Votre lien est prêt',
    copy_link: 'Copier le lien',
    share_qr: 'Partager QR',
    manage_team: 'Gérer votre équipe',
    add_members: 'Ajouter des membres',
    account_settings: 'Paramètres du compte',
    edit_profile: 'Modifier le profil',
    business_settings: 'Paramètres entreprise',
    my_team: 'Mon équipe',
    manage_members: 'Gérer les membres',
    invite_members: 'Inviter des membres',
    send_invitations: 'Envoyer des invitations',
    withdraw_funds: 'Retirer des fonds',
    recent_withdrawals: 'Retraits récents',
    logout: 'Se déconnecter',
    language: 'Langue',
    change_photo: 'Changer la photo',
    take_photo: 'Prendre une photo',
    choose_gallery: 'Choisir depuis la galerie',
    settings: 'Paramètres',
    select_language: 'Choisir la langue',
    enjoyed: 'Vous avez apprécié le service?',
    leave_tip: 'Laissez un pourboire!',
    secure: 'Paiement sécurisé via SnapTip',
    select_amount: 'Choisir le montant',
    pay: 'Payer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    back: 'Retour',
    confirm: 'Confirmer',
    link_copied: 'Lien copié !',
    tip_transactions: 'Transactions',
    tip_received: 'Pourboire reçu',
    no_tips: 'Pas encore de pourboires',
    share_qr_tips: 'Partagez votre QR code !',
  },
  ar: {
    home: 'الرئيسية',
    tips: 'إكراميات',
    profile: 'الملف',
    available_balance: 'الرصيد المتاح',
    total_earned: 'إجمالي الأرباح',
    tips_received: 'إكراميات مستلمة',
    tip_link_ready: 'رابط الإكرامية جاهز',
    copy_link: 'نسخ الرابط',
    share_qr: 'مشاركة QR',
    manage_team: 'إدارة فريقك',
    add_members: 'إضافة أعضاء',
    account_settings: 'إعدادات الحساب',
    edit_profile: 'تعديل الملف',
    business_settings: 'إعدادات العمل',
    my_team: 'فريقي',
    manage_members: 'إدارة الأعضاء',
    invite_members: 'دعوة أعضاء',
    send_invitations: 'إرسال دعوات',
    withdraw_funds: 'سحب الأموال',
    recent_withdrawals: 'سحوبات أخيرة',
    logout: 'تسجيل الخروج',
    language: 'اللغة',
    change_photo: 'تغيير الصورة',
    take_photo: 'التقاط صورة',
    choose_gallery: 'اختيار من المعرض',
    settings: 'الإعدادات',
    select_language: 'اختر اللغة',
    enjoyed: 'هل استمتعت بالخدمة؟',
    leave_tip: '!اترك بقشيشاً',
    secure: 'دفع آمن عبر SnapTip',
    select_amount: 'اختر المبلغ',
    pay: 'ادفع',
    save: 'حفظ',
    cancel: 'إلغاء',
    back: 'رجوع',
    confirm: 'تأكيد',
    link_copied: 'تم نسخ الرابط!',
    tip_transactions: 'المعاملات',
    tip_received: 'إكرامية مستلمة',
    no_tips: 'لا إكراميات بعد',
    share_qr_tips: 'شارك رمز QR لبدء استلام الإكراميات!',
  },
  es: {
    home: 'Inicio',
    tips: 'Propinas',
    profile: 'Perfil',
    available_balance: 'Saldo disponible',
    total_earned: 'Total ganado',
    tips_received: 'Propinas recibidas',
    tip_link_ready: 'Tu enlace está listo',
    copy_link: 'Copiar enlace',
    share_qr: 'Compartir QR',
    manage_team: 'Gestionar equipo',
    add_members: 'Añadir miembros',
    account_settings: 'Configuración',
    edit_profile: 'Editar perfil',
    business_settings: 'Ajustes de negocio',
    my_team: 'Mi equipo',
    manage_members: 'Gestionar miembros',
    invite_members: 'Invitar miembros',
    send_invitations: 'Enviar invitaciones',
    withdraw_funds: 'Retirar fondos',
    recent_withdrawals: 'Retiros recientes',
    logout: 'Cerrar sesión',
    language: 'Idioma',
    change_photo: 'Cambiar foto',
    take_photo: 'Tomar foto',
    choose_gallery: 'Elegir de galería',
    settings: 'Configuración',
    select_language: 'Seleccionar idioma',
    enjoyed: '¿Disfrutaste el servicio?',
    leave_tip: '¡Deja una propina!',
    secure: 'Pago seguro via SnapTip',
    select_amount: 'Elige el monto',
    pay: 'Pagar',
    save: 'Guardar',
    cancel: 'Cancelar',
    back: 'Volver',
    confirm: 'Confirmar',
    link_copied: '¡Enlace copiado!',
    tip_transactions: 'Transacciones',
    tip_received: 'Propina recibida',
    no_tips: 'Sin propinas aún',
    share_qr_tips: '¡Comparte tu código QR!',
  },
};

// Language labels for display
const LANG_INFO: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  fr: { label: 'Français', flag: '🇫🇷' },
  ar: { label: 'العربية', flag: '🇲🇦' },
  es: { label: 'Español', flag: '🇪🇸' },
};

type LanguageContextType = {
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
  languageLabel: string;
  LANG_INFO: Record<string, { label: string; flag: string }>;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  changeLanguage: async () => {},
  t: (key) => key,
  isRTL: false,
  languageLabel: 'English',
  LANG_INFO,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('en');
  const [loaded, setLoaded] = useState(false);

  // Load saved language on app start
  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
      if (saved && translations[saved]) {
        setLanguage(saved);
      }
      setLoaded(true);
    });
  }, []);

  const changeLanguage = useCallback(async (lang: string) => {
    if (!translations[lang]) return;
    setLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[language]?.[key] || translations['en']?.[key] || key;
    },
    [language]
  );

  const isRTL = language === 'ar';
  const languageLabel = LANG_INFO[language]?.label || 'English';

  if (!loaded) return null;

  return (
    <LanguageContext.Provider
      value={{ language, changeLanguage, t, isRTL, languageLabel, LANG_INFO }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
