/* ──────────────────────────────────────────────────────────────────────────
   SnapTip — Marketing landing page copy
   Used by client/src/pages/LandingPage.jsx

   Deliberately separate from ./translations.js: that dictionary serves the live
   guest tipping page and the payment flow, and is not worth destabilising for
   marketing copy. Language *detection* is shared, so this is still the same
   i18n layer — only the vocabulary is scoped.

   Every claim here is traceable to the codebase:
     · 29 payout countries  — server/lib/countryPayoutConfig.js (23 Stripe + 6 manual)
     · 20 payout currencies — distinct `currency` values in that same file
     · 14 tipping-page languages — top-level keys in ./translations.js
     · 10% fee at withdrawal only, full gross credited at payment time
   Do not add numbers here that cannot be pointed at in source. No testimonials,
   user counts, press logos or ratings — we do not have them yet.
   ────────────────────────────────────────────────────────────────────────── */

import { getLanguageCode } from './translations';

export const LANDING_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'es', label: 'Español' },
];

const SUPPORTED = LANDING_LANGUAGES.map((l) => l.code);
const OVERRIDE_KEY = 'snaptip_landing_lang';

export const landingCopy = {
  /* ── English ───────────────────────────────────────────────────────── */
  en: {
    dir: 'ltr',
    nav: { how: 'How it works', staff: 'For staff', business: 'For business', pricing: 'Pricing', app: 'Get the app' },
    a11y: { skip: 'Skip to content', nav: 'Main', lang: 'Language' },

    hero: {
      eyebrow: 'Cashless tipping for hospitality',
      title: 'Great service deserves a tip. Even when nobody carries cash.',
      body: 'SnapTip gives every waiter, guide, driver and hotel worker a personal QR code. Guests scan it, pay in seconds, and the money lands straight in your balance.',
      trust: 'Free to start · No app for guests · Powered by Stripe',
      alt: 'SnapTip app screens for guests, staff and business owners',
    },

    stats: [
      ['29', 'Countries'],
      ['20', 'Currencies'],
      ['14', 'Languages'],
      ['10%', 'Only when you cash out'],
    ],

    how: {
      kicker: 'How it works',
      title: 'Three steps. That’s it.',
      steps: [
        ['Get your code', 'Download the app, sign up, and your personal QR code is ready to print, display or share.'],
        ['Guests scan and pay', 'No app and no account for them. Card, Apple Pay or Google Pay in about ten seconds.'],
        ['Cash out to your bank', 'Tips land in your balance instantly. Withdraw whenever you want.'],
      ],
    },

    guest: {
      kicker: 'For guests',
      title: 'Tipping takes ten seconds.',
      body: 'Your guests point a camera at your code and a clean payment page opens in their browser. No download, no sign-up, no awkward moment at the table.',
      points: ['Works with any phone camera', 'Card, Apple Pay and Google Pay', 'Optional rating and email receipt'],
      alt: 'SnapTip guest tipping page showing tip amounts and payment options',
    },

    staff: {
      kicker: 'For staff',
      title: 'Watch your tips land, live.',
      body: 'Every tip appears in your balance the moment a guest pays — the full amount, with nothing taken up front. Your phone buzzes and the number goes up.',
      points: ['Full tip credited immediately', 'Live balance and monthly totals', 'Split a tip with a teammate'],
      alt: 'SnapTip employee home screen showing balance and recent tips',
    },

    business: {
      kicker: 'For business',
      title: 'See what your whole team earns.',
      body: 'Invite your staff with one link. Watch tips come in across the floor, spot your top performers, and keep a clean record of every payment.',
      points: ['Invite your team by email or link', 'Team totals, trends and leaderboard', 'Full history — no cash to count'],
      alt: 'SnapTip business dashboard showing team totals and top performers',
    },

    payout: {
      kicker: 'Getting paid',
      title: 'Your money, on your terms.',
      body: 'Link a bank account and withdraw whenever you like, or set it to pay out automatically every week or every month.',
      points: ['Bank payouts in 29 countries', 'Automatic weekly or monthly payouts', 'Bank details encrypted, screens protected'],
      alt: 'SnapTip profile and payout settings screen',
    },

    pricing: {
      kicker: 'Pricing',
      title: 'Free until you earn.',
      body: 'No monthly fee. No setup cost. No card on file. SnapTip takes 10% only when you move money to your bank — so if your team earns nothing, you pay nothing.',
      points: ['$0 to download and set up', '$0 monthly, forever', '10% only at withdrawal'],
      note: 'Example: a $20 tip is credited to your balance in full. When you withdraw, $2 goes to SnapTip and $18 reaches your bank.',
    },

    trust: {
      kicker: 'Trust',
      title: 'Payments handled properly.',
      points: [
        'Payments run on Stripe — card details go straight to Stripe, never to us.',
        'Bank details are encrypted before they are stored.',
        'Banking screens block screenshots and screen recording.',
      ],
    },

    app: {
      title: 'Start taking card tips today.',
      body: 'Free to download. Free until your team earns.',
      qr: 'Scan to download',
      playEyebrow: 'Get it on',
      play: 'Google Play',
      appleEyebrow: 'Download on the',
      apple: 'App Store',
    },

    footer: {
      tagline: 'Cashless tipping for modern hospitality.',
      privacy: 'Privacy',
      terms: 'Terms',
      contact: 'Contact',
      rights: 'SnapTip by Hitte Technologies LLC.',
    },
  },

  /* ── Français ──────────────────────────────────────────────────────── */
  fr: {
    dir: 'ltr',
    nav: { how: 'Comment ça marche', staff: 'Pour le personnel', business: 'Pour les entreprises', pricing: 'Tarifs', app: "Obtenir l'app" },
    a11y: { skip: 'Aller au contenu', nav: 'Principal', lang: 'Langue' },

    hero: {
      eyebrow: "Pourboires sans espèces pour l'hôtellerie",
      title: 'Un bon service mérite un pourboire. Même sans espèces.',
      body: "SnapTip donne à chaque serveur, guide, chauffeur et employé d'hôtel un QR code personnel. Les clients le scannent, paient en quelques secondes, et l'argent arrive directement sur votre solde.",
      trust: 'Gratuit au départ · Aucune app pour les clients · Propulsé par Stripe',
      alt: "Écrans de l'app SnapTip pour les clients, le personnel et les gérants",
    },

    stats: [
      ['29', 'Pays'],
      ['20', 'Devises'],
      ['14', 'Langues'],
      ['10 %', 'Seulement au retrait'],
    ],

    how: {
      kicker: 'Comment ça marche',
      title: 'Trois étapes. C’est tout.',
      steps: [
        ['Obtenez votre code', "Téléchargez l'app, inscrivez-vous, et votre QR code personnel est prêt à imprimer, afficher ou partager."],
        ['Le client scanne et paie', 'Ni app ni compte pour lui. Carte, Apple Pay ou Google Pay en une dizaine de secondes.'],
        ['Virez sur votre compte', 'Les pourboires arrivent instantanément sur votre solde. Retirez quand vous voulez.'],
      ],
    },

    guest: {
      kicker: 'Pour les clients',
      title: 'Laisser un pourboire prend dix secondes.',
      body: "Vos clients pointent leur appareil photo vers votre code et une page de paiement s'ouvre dans leur navigateur. Sans téléchargement, sans inscription, sans moment gênant à table.",
      points: ["Fonctionne avec n'importe quel appareil photo", 'Carte, Apple Pay et Google Pay', 'Note et reçu par e-mail en option'],
      alt: 'Page de pourboire SnapTip avec les montants et les moyens de paiement',
    },

    staff: {
      kicker: 'Pour le personnel',
      title: 'Voyez vos pourboires arriver en direct.',
      body: "Chaque pourboire apparaît sur votre solde dès que le client paie — le montant entier, sans rien prélevé d'avance. Votre téléphone vibre et le chiffre monte.",
      points: ['Pourboire entier crédité immédiatement', 'Solde en direct et totaux mensuels', 'Partagez un pourboire avec un collègue'],
      alt: "Écran d'accueil SnapTip avec le solde et les derniers pourboires",
    },

    business: {
      kicker: 'Pour les entreprises',
      title: 'Voyez ce que gagne toute votre équipe.',
      body: 'Invitez votre personnel avec un seul lien. Suivez les pourboires dans toute la salle, repérez vos meilleurs éléments et gardez une trace claire de chaque paiement.',
      points: ['Invitez votre équipe par e-mail ou par lien', 'Totaux, tendances et classement', 'Historique complet — plus rien à compter'],
      alt: "Tableau de bord SnapTip avec les totaux de l'équipe et le classement",
    },

    payout: {
      kicker: 'Être payé',
      title: 'Votre argent, à vos conditions.',
      body: 'Reliez un compte bancaire et retirez quand vous le souhaitez, ou programmez un versement automatique chaque semaine ou chaque mois.',
      points: ['Versements bancaires dans 29 pays', 'Versements automatiques hebdomadaires ou mensuels', 'Coordonnées chiffrées, écrans protégés'],
      alt: 'Écran de profil et de paramètres de versement SnapTip',
    },

    pricing: {
      kicker: 'Tarifs',
      title: "Gratuit jusqu'à ce que vous gagniez.",
      body: "Aucun abonnement. Aucun frais d'installation. Aucune carte enregistrée. SnapTip prend 10 % uniquement quand vous virez l'argent vers votre banque — si votre équipe ne gagne rien, vous ne payez rien.",
      points: ['0 $ pour télécharger et démarrer', '0 $ par mois, pour toujours', '10 % uniquement au retrait'],
      note: "Exemple : un pourboire de 20 $ est crédité en entier sur votre solde. Au retrait, 2 $ vont à SnapTip et 18 $ arrivent sur votre compte.",
    },

    trust: {
      kicker: 'Confiance',
      title: 'Des paiements traités correctement.',
      points: [
        'Les paiements passent par Stripe — les données de carte vont directement à Stripe, jamais à nous.',
        "Les coordonnées bancaires sont chiffrées avant d'être stockées.",
        "Les écrans bancaires bloquent les captures et l'enregistrement d'écran.",
      ],
    },

    app: {
      title: 'Commencez à recevoir des pourboires par carte.',
      body: "Téléchargement gratuit. Gratuit jusqu'à ce que votre équipe gagne.",
      qr: 'Scannez pour télécharger',
      playEyebrow: 'Disponible sur',
      play: 'Google Play',
      appleEyebrow: "Télécharger dans l'",
      apple: 'App Store',
    },

    footer: {
      tagline: "Pourboires sans espèces pour l'hôtellerie moderne.",
      privacy: 'Confidentialité',
      terms: 'Conditions',
      contact: 'Contact',
      rights: 'SnapTip par Hitte Technologies LLC.',
    },
  },

  /* ── العربية (RTL) ─────────────────────────────────────────────────── */
  ar: {
    dir: 'rtl',
    nav: { how: 'كيف يعمل', staff: 'للموظفين', business: 'للشركات', pricing: 'الأسعار', app: 'حمّل التطبيق' },
    a11y: { skip: 'تخطَّ إلى المحتوى', nav: 'الرئيسية', lang: 'اللغة' },

    hero: {
      eyebrow: 'إكراميات بلا نقود لقطاع الضيافة',
      title: 'الخدمة الجيدة تستحق إكرامية. حتى لو لم يحمل أحد نقودًا.',
      body: 'يمنح SnapTip كل نادل ومرشد وسائق وموظف فندق رمز QR خاصًا به. يمسحه الضيوف، ويدفعون في ثوانٍ، ويصل المال مباشرة إلى رصيدك.',
      trust: 'مجاني للبدء · لا تطبيق للضيوف · مدعوم من Stripe',
      alt: 'شاشات تطبيق SnapTip للضيوف والموظفين وأصحاب الأعمال',
    },

    stats: [
      ['29', 'دولة'],
      ['20', 'عملة'],
      ['14', 'لغة'],
      ['10٪', 'عند السحب فقط'],
    ],

    how: {
      kicker: 'كيف يعمل',
      title: 'ثلاث خطوات. هذا كل شيء.',
      steps: [
        ['احصل على رمزك', 'حمّل التطبيق وسجّل، وسيكون رمز QR الخاص بك جاهزًا للطباعة أو العرض أو المشاركة.'],
        ['الضيف يمسح ويدفع', 'بلا تطبيق وبلا حساب. بطاقة أو Apple Pay أو Google Pay في نحو عشر ثوانٍ.'],
        ['حوّل إلى بنكك', 'تصل الإكراميات إلى رصيدك فورًا. اسحب متى شئت.'],
      ],
    },

    guest: {
      kicker: 'للضيوف',
      title: 'ترك الإكرامية يستغرق عشر ثوانٍ.',
      body: 'يوجّه ضيوفك الكاميرا إلى رمزك فتفتح صفحة دفع في متصفحهم. بلا تحميل، بلا تسجيل، وبلا لحظة محرجة على الطاولة.',
      points: ['يعمل مع أي كاميرا هاتف', 'بطاقة و Apple Pay و Google Pay', 'تقييم وإيصال بالبريد اختياريًا'],
      alt: 'صفحة الإكرامية في SnapTip مع المبالغ وطرق الدفع',
    },

    staff: {
      kicker: 'للموظفين',
      title: 'تابع وصول إكرامياتك مباشرة.',
      body: 'تظهر كل إكرامية في رصيدك لحظة دفع الضيف — المبلغ كاملًا دون أي خصم مسبق. يهتز هاتفك ويرتفع الرقم.',
      points: ['الإكرامية كاملة تُضاف فورًا', 'رصيد مباشر وإجماليات شهرية', 'شارك إكرامية مع زميل'],
      alt: 'الشاشة الرئيسية لموظف SnapTip مع الرصيد وآخر الإكراميات',
    },

    business: {
      kicker: 'للشركات',
      title: 'اطّلع على ما يكسبه فريقك بالكامل.',
      body: 'ادعُ موظفيك برابط واحد. تابع الإكراميات في الصالة كلها، واكتشف الأفضل أداءً، واحتفظ بسجل واضح لكل عملية دفع.',
      points: ['ادعُ فريقك بالبريد أو برابط', 'إجماليات واتجاهات ولوحة ترتيب', 'سجل كامل — لا نقود تُعدّ'],
      alt: 'لوحة تحكم أعمال SnapTip مع إجماليات الفريق والأفضل أداءً',
    },

    payout: {
      kicker: 'استلام المال',
      title: 'مالك، بشروطك.',
      body: 'اربط حسابًا بنكيًا واسحب متى شئت، أو اضبطه ليحوّل تلقائيًا كل أسبوع أو كل شهر.',
      points: ['تحويلات بنكية في 29 دولة', 'تحويلات تلقائية أسبوعية أو شهرية', 'بيانات مشفّرة وشاشات محمية'],
      alt: 'شاشة الملف الشخصي وإعدادات التحويل في SnapTip',
    },

    pricing: {
      kicker: 'الأسعار',
      title: 'مجاني حتى تبدأ في الكسب.',
      body: 'لا رسوم شهرية. لا رسوم تسجيل. لا بطاقة محفوظة. يأخذ SnapTip نسبة 10٪ فقط عندما تحوّل المال إلى بنكك — فإذا لم يكسب فريقك شيئًا، لن تدفع شيئًا.',
      points: ['0 $ للتحميل والإعداد', '0 $ شهريًا، إلى الأبد', '10٪ عند السحب فقط'],
      note: 'مثال: إكرامية بقيمة 20 $ تُضاف إلى رصيدك كاملة. وعند السحب، يذهب 2 $ إلى SnapTip ويصل 18 $ إلى بنكك.',
    },

    trust: {
      kicker: 'الثقة',
      title: 'مدفوعات تُدار كما ينبغي.',
      points: [
        'تتم المدفوعات عبر Stripe — بيانات البطاقة تذهب مباشرة إلى Stripe، لا إلينا أبدًا.',
        'تُشفَّر البيانات البنكية قبل تخزينها.',
        'تمنع الشاشات البنكية التقاط الصور وتسجيل الشاشة.',
      ],
    },

    app: {
      title: 'ابدأ في قبول الإكراميات بالبطاقة اليوم.',
      body: 'التحميل مجاني. ومجاني حتى يبدأ فريقك في الكسب.',
      qr: 'امسح للتحميل',
      playEyebrow: 'احصل عليه من',
      play: 'Google Play',
      appleEyebrow: 'حمّله من',
      apple: 'App Store',
    },

    footer: {
      tagline: 'إكراميات بلا نقود لضيافة العصر.',
      privacy: 'الخصوصية',
      terms: 'الشروط',
      contact: 'اتصل بنا',
      rights: 'SnapTip من Hitte Technologies LLC.',
    },
  },

  /* ── Español ───────────────────────────────────────────────────────── */
  es: {
    dir: 'ltr',
    nav: { how: 'Cómo funciona', staff: 'Para el personal', business: 'Para empresas', pricing: 'Precios', app: 'Descargar la app' },
    a11y: { skip: 'Ir al contenido', nav: 'Principal', lang: 'Idioma' },

    hero: {
      eyebrow: 'Propinas sin efectivo para la hostelería',
      title: 'Un buen servicio merece propina. Aunque nadie lleve efectivo.',
      body: 'SnapTip da a cada camarero, guía, conductor y empleado de hotel su propio código QR. Los clientes lo escanean, pagan en segundos y el dinero llega directo a tu saldo.',
      trust: 'Gratis para empezar · Sin app para los clientes · Con tecnología de Stripe',
      alt: 'Pantallas de la app SnapTip para clientes, personal y gerentes',
    },

    stats: [
      ['29', 'Países'],
      ['20', 'Divisas'],
      ['14', 'Idiomas'],
      ['10 %', 'Solo al retirar'],
    ],

    how: {
      kicker: 'Cómo funciona',
      title: 'Tres pasos. Ya está.',
      steps: [
        ['Consigue tu código', 'Descarga la app, regístrate y tu código QR personal estará listo para imprimir, mostrar o compartir.'],
        ['El cliente escanea y paga', 'Sin app y sin cuenta para él. Tarjeta, Apple Pay o Google Pay en unos diez segundos.'],
        ['Pasa el dinero a tu banco', 'Las propinas llegan al instante a tu saldo. Retira cuando quieras.'],
      ],
    },

    guest: {
      kicker: 'Para los clientes',
      title: 'Dejar propina tarda diez segundos.',
      body: 'Tus clientes apuntan la cámara a tu código y se abre una página de pago en su navegador. Sin descargas, sin registro y sin momentos incómodos en la mesa.',
      points: ['Funciona con cualquier cámara de móvil', 'Tarjeta, Apple Pay y Google Pay', 'Valoración y recibo por correo opcionales'],
      alt: 'Página de propinas de SnapTip con importes y métodos de pago',
    },

    staff: {
      kicker: 'Para el personal',
      title: 'Mira llegar tus propinas en directo.',
      body: 'Cada propina aparece en tu saldo en cuanto el cliente paga — el importe íntegro, sin descuentos por adelantado. Tu móvil vibra y la cifra sube.',
      points: ['Propina íntegra abonada al instante', 'Saldo en directo y totales mensuales', 'Comparte una propina con un compañero'],
      alt: 'Pantalla de inicio de SnapTip con el saldo y las últimas propinas',
    },

    business: {
      kicker: 'Para empresas',
      title: 'Mira lo que gana todo tu equipo.',
      body: 'Invita a tu personal con un solo enlace. Sigue las propinas de toda la sala, detecta a los que más destacan y guarda un registro limpio de cada pago.',
      points: ['Invita a tu equipo por correo o enlace', 'Totales, tendencias y clasificación', 'Historial completo — nada que contar'],
      alt: 'Panel de negocio de SnapTip con totales del equipo y mejores resultados',
    },

    payout: {
      kicker: 'Cobrar',
      title: 'Tu dinero, como tú quieras.',
      body: 'Vincula una cuenta bancaria y retira cuando quieras, o programa un pago automático cada semana o cada mes.',
      points: ['Pagos bancarios en 29 países', 'Pagos automáticos semanales o mensuales', 'Datos cifrados y pantallas protegidas'],
      alt: 'Pantalla de perfil y ajustes de pago de SnapTip',
    },

    pricing: {
      kicker: 'Precios',
      title: 'Gratis hasta que ganes.',
      body: 'Sin cuota mensual. Sin coste de alta. Sin tarjeta guardada. SnapTip cobra el 10 % solo cuando pasas el dinero a tu banco: si tu equipo no gana nada, no pagas nada.',
      points: ['0 $ para descargar y configurar', '0 $ al mes, para siempre', '10 % solo al retirar'],
      note: 'Ejemplo: una propina de 20 $ se abona íntegra en tu saldo. Al retirar, 2 $ van a SnapTip y 18 $ llegan a tu banco.',
    },

    trust: {
      kicker: 'Confianza',
      title: 'Pagos bien gestionados.',
      points: [
        'Los pagos van por Stripe: los datos de la tarjeta van directos a Stripe, nunca a nosotros.',
        'Los datos bancarios se cifran antes de guardarse.',
        'Las pantallas bancarias bloquean capturas y grabación de pantalla.',
      ],
    },

    app: {
      title: 'Empieza a cobrar propinas con tarjeta hoy.',
      body: 'Descarga gratuita. Gratis hasta que tu equipo gane.',
      qr: 'Escanea para descargar',
      playEyebrow: 'Disponible en',
      play: 'Google Play',
      appleEyebrow: 'Consíguela en el',
      apple: 'App Store',
    },

    footer: {
      tagline: 'Propinas sin efectivo para la hostelería moderna.',
      privacy: 'Privacidad',
      terms: 'Términos',
      contact: 'Contacto',
      rights: 'SnapTip de Hitte Technologies LLC.',
    },
  },
};

/* ── Language resolution ───────────────────────────────────────────────
   Reads a landing-scoped override first so the on-page switcher can work
   without touching detectLang() in ./translations.js — the tipping page keeps
   following the browser, and the payment flow is unaffected either way. */

export function getLandingLang() {
  try {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(OVERRIDE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch { /* private mode — fall through to detection */ }

  const detected = getLanguageCode();
  return SUPPORTED.includes(detected) ? detected : 'en';
}

export function setLandingLang(code) {
  if (!SUPPORTED.includes(code)) return;
  try {
    localStorage.setItem(OVERRIDE_KEY, code);
  } catch { /* nothing we can do; the choice just won't persist */ }
}

export function getLandingCopy(lang) {
  return landingCopy[lang || getLandingLang()] || landingCopy.en;
}

export function isLandingRTL(lang) {
  return (landingCopy[lang || getLandingLang()] || landingCopy.en).dir === 'rtl';
}
