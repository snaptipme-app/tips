/* ──────────────────────────────────────────────────────────────────────────
   SnapTip — Marketing landing page copy
   Used by client/src/pages/LandingPage.jsx and client/src/pages/DemoTipPage.jsx

   Deliberately separate from ./translations.js: that dictionary serves the live
   guest tipping page and the payment flow, and is not worth destabilising for
   marketing copy. Language *detection* is shared, so this is still the same
   i18n layer — only the vocabulary is scoped.

   Every claim here is traceable to the codebase:
     · 29 payout countries  — server/lib/countryPayoutConfig.js (23 Stripe + 6 manual)
     · 20 payout currencies — distinct `currency` values in that same file
     · 14 tipping-page languages — top-level keys in ./translations.js
     · 10% fee at withdrawal only, full gross credited at payment time
   Do not add numbers here that cannot be pointed at in source.
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
    nav: { how: 'How it works', money: 'Pricing', business: 'For business', app: 'Get the app' },
    a11y: { skip: 'Skip to content', nav: 'Main', lang: 'Language', close: 'Close', menu: 'Menu' },

    hero: {
      eyebrow: 'Cashless tipping for hospitality',
      title: 'Try it before you read about it.',
      body: 'Point your phone camera at this code. It opens a real tipping page — the same one a guest sees. Nothing to install, on their phone or yours.',
      scanDesktop: 'Scan with your phone camera',
      scanMobile: 'Tap to open the demo',
      cardName: 'Demo server',
      cardRole: 'SnapTip demo · no real payment',
      trust: 'Powered by Stripe · No app for guests · Free to start',
    },

    seconds: {
      kicker: 'The ten seconds',
      title: 'What happens between the scan and the money.',
      rows: [
        ['0:00', 'The guest points a camera at a printed code.'],
        ['0:03', 'A tipping page opens in the browser. No app, no account.'],
        ['0:08', 'They pay by card, Apple Pay or Google Pay.'],
        ['0:10', "The full amount sits in the worker's balance."],
      ],
    },

    doors: {
      kicker: 'Three ways to land here',
      items: [
        ['You run a place', 'See what your whole team earns, without counting cash at midnight.', 'What operators get', '#operators'],
        ['You work for tips', 'Get your own code, take card tips, move the money to your bank.', 'Get the app', '#get-app'],
        ['You just scanned a code', "You're in the right place. You don't need an account or an app.", 'See the tipping page', '/demo'],
      ],
    },

    money: {
      kicker: 'Where the money goes',
      title: 'The entire fee, in one line.',
      example: 'Example — a $20 tip',
      rows: [
        ['Guest tips', '$20.00'],
        ['Credited to the worker, immediately', '$20.00'],
        ['SnapTip fee, taken at withdrawal', '−$2.00'],
      ],
      total: ['Reaches their bank', '$18.00'],
      zeros: [
        ['Monthly fee', '$0.00'],
        ['Setup cost', '$0.00'],
        ['Cost if nobody tips', '$0.00'],
      ],
      note: 'The full tip lands in the balance the moment the guest pays. The 10% comes out only when the worker moves money to their bank. If a withdrawal is rejected, the money returns to their balance.',
    },

    ops: {
      kicker: 'For operators',
      title: 'See the whole floor, not a shoebox of receipts.',
      points: [
        'Invite your team by email or one shared link.',
        'Watch tips land across the team as they happen.',
        'See who is earning, by week and by shift.',
        'Every payment keeps a record. Nothing to reconcile by hand.',
      ],
    },

    reach: {
      kicker: 'Reach',
      items: [
        ['29', 'countries staff can cash out in'],
        ['20', 'payout currencies'],
        ['14', 'languages on the tipping page'],
      ],
      note: 'In 23 countries staff link a bank account directly through Stripe. The rest are paid by bank transfer.',
    },

    trust: {
      title: 'Handled properly.',
      points: [
        'Payments run on Stripe. Card details go straight to Stripe, not to us.',
        'Bank details are encrypted before they are stored.',
        'Guests pay by card, Apple Pay or Google Pay.',
      ],
    },

    app: {
      title: 'Get the app.',
      body: 'Free to download. Free until your team earns.',
      qr: 'Scan to download',
      playEyebrow: 'Get it on',
      play: 'Google Play',
      appleEyebrow: 'Download on the',
      apple: 'App Store',
    },

    footer: { privacy: 'Privacy', terms: 'Terms', contact: 'Contact', rights: 'SnapTip by Hitte Technologies LLC.' },

    demo: {
      badge: 'Demo',
      notice: 'This is a demonstration. No card is charged and no money moves.',
      tagline: 'Enjoyed the service? Leave a tip',
      name: 'Demo server',
      role: 'Table service',
      choose: 'Choose your tip',
      popular: 'Popular',
      custom: 'Custom amount',
      rate: 'How was your experience?',
      optional: 'Optional',
      pay: 'Pay',
      secure: 'Secure payment · Powered by Stripe',
      done: 'That’s the whole flow.',
      doneBody: 'A real guest would be finished here, and the tip would already be in the worker’s balance. Nothing was charged.',
      again: 'Run it again',
      back: 'Back to snaptip.me',
      amounts: ['Quick thanks', 'Great service', 'Excellent', 'Outstanding'],
    },
  },

  /* ── Français ──────────────────────────────────────────────────────── */
  fr: {
    dir: 'ltr',
    nav: { how: 'Comment ça marche', money: 'Tarifs', business: 'Pour les entreprises', app: "Obtenir l'app" },
    a11y: { skip: 'Aller au contenu', nav: 'Principal', lang: 'Langue', close: 'Fermer', menu: 'Menu' },

    hero: {
      eyebrow: "Pourboires sans espèces pour l'hôtellerie",
      title: 'Essayez avant de lire.',
      body: "Pointez l'appareil photo de votre téléphone vers ce code. Il ouvre une vraie page de pourboire, celle que voit un client. Rien à installer, ni sur son téléphone ni sur le vôtre.",
      scanDesktop: 'Scannez avec votre téléphone',
      scanMobile: 'Touchez pour ouvrir la démo',
      cardName: 'Serveur démo',
      cardRole: 'Démo SnapTip · aucun paiement réel',
      trust: 'Propulsé par Stripe · Aucune app pour les clients · Gratuit au départ',
    },

    seconds: {
      kicker: 'Les dix secondes',
      title: "Ce qui se passe entre le scan et l'argent.",
      rows: [
        ['0:00', 'Le client pointe son appareil photo vers un code imprimé.'],
        ['0:03', "Une page de pourboire s'ouvre dans le navigateur. Sans app, sans compte."],
        ['0:08', 'Il paie par carte, Apple Pay ou Google Pay.'],
        ['0:10', "La totalité du montant est sur le solde de l'employé."],
      ],
    },

    doors: {
      kicker: "Trois façons d'arriver ici",
      items: [
        ['Vous dirigez un établissement', 'Voyez ce que gagne toute votre équipe, sans compter les espèces à minuit.', 'Ce que reçoivent les gérants', '#operators'],
        ['Vous travaillez au pourboire', "Obtenez votre code, recevez des pourboires par carte, virez l'argent sur votre compte.", "Obtenir l'app", '#get-app'],
        ['Vous venez de scanner un code', 'Vous êtes au bon endroit. Ni compte ni application nécessaires.', 'Voir la page de pourboire', '/demo'],
      ],
    },

    money: {
      kicker: "Où va l'argent",
      title: 'Tous les frais, en une ligne.',
      example: 'Exemple — un pourboire de 20 $',
      rows: [
        ['Le client laisse', '20,00 $'],
        ["Crédité à l'employé, immédiatement", '20,00 $'],
        ['Frais SnapTip, prélevés au retrait', '−2,00 $'],
      ],
      total: ['Arrive sur son compte', '18,00 $'],
      zeros: [
        ['Abonnement mensuel', '0,00 $'],
        ["Frais d'installation", '0,00 $'],
        ['Coût si personne ne laisse de pourboire', '0,00 $'],
      ],
      note: "Le pourboire entier arrive sur le solde dès que le client paie. Les 10 % ne sont prélevés qu'au moment où l'employé vire l'argent vers sa banque. Si un retrait est refusé, l'argent revient sur son solde.",
    },

    ops: {
      kicker: 'Pour les gérants',
      title: 'Voyez toute la salle, pas une boîte de tickets.',
      points: [
        'Invitez votre équipe par e-mail ou avec un seul lien.',
        'Voyez les pourboires arriver en temps réel.',
        'Sachez qui gagne quoi, par semaine et par service.',
        'Chaque paiement laisse une trace. Rien à rapprocher à la main.',
      ],
    },

    reach: {
      kicker: 'Portée',
      items: [
        ['29', 'pays où le personnel peut retirer'],
        ['20', 'devises de versement'],
        ['14', 'langues sur la page de pourboire'],
      ],
      note: 'Dans 23 pays, le personnel relie un compte bancaire directement via Stripe. Les autres sont payés par virement.',
    },

    trust: {
      title: 'Traité correctement.',
      points: [
        'Les paiements passent par Stripe. Les données de carte vont directement à Stripe, pas à nous.',
        "Les coordonnées bancaires sont chiffrées avant d'être stockées.",
        'Les clients paient par carte, Apple Pay ou Google Pay.',
      ],
    },

    app: {
      title: "Obtenez l'application.",
      body: "Téléchargement gratuit. Gratuit jusqu'à ce que votre équipe gagne.",
      qr: 'Scannez pour télécharger',
      playEyebrow: 'Disponible sur',
      play: 'Google Play',
      appleEyebrow: "Télécharger dans l'",
      apple: 'App Store',
    },

    footer: { privacy: 'Confidentialité', terms: 'Conditions', contact: 'Contact', rights: 'SnapTip par Hitte Technologies LLC.' },

    demo: {
      badge: 'Démo',
      notice: "Ceci est une démonstration. Aucune carte n'est débitée et aucun argent ne circule.",
      tagline: 'Vous avez apprécié le service ? Laissez un pourboire',
      name: 'Serveur démo',
      role: 'Service en salle',
      choose: 'Choisissez votre pourboire',
      popular: 'Populaire',
      custom: 'Montant personnalisé',
      rate: 'Comment était votre expérience ?',
      optional: 'Facultatif',
      pay: 'Payer',
      secure: 'Paiement sécurisé · Propulsé par Stripe',
      done: 'Voilà tout le parcours.',
      doneBody: "Un vrai client aurait terminé ici, et le pourboire serait déjà sur le solde de l'employé. Rien n'a été débité.",
      again: 'Recommencer',
      back: 'Retour à snaptip.me',
      amounts: ['Petit merci', 'Bon service', 'Excellent', 'Exceptionnel'],
    },
  },

  /* ── العربية (RTL) ─────────────────────────────────────────────────── */
  ar: {
    dir: 'rtl',
    nav: { how: 'كيف يعمل', money: 'الأسعار', business: 'للشركات', app: 'حمّل التطبيق' },
    a11y: { skip: 'تخطَّ إلى المحتوى', nav: 'الرئيسية', lang: 'اللغة', close: 'إغلاق', menu: 'القائمة' },

    hero: {
      eyebrow: 'إكراميات بلا نقود لقطاع الضيافة',
      title: 'جرّبه قبل أن تقرأ عنه.',
      body: 'وجّه كاميرا هاتفك إلى هذا الرمز. سيفتح صفحة إكرامية حقيقية، نفس الصفحة التي يراها الضيف. لا شيء لتثبيته، لا على هاتفه ولا على هاتفك.',
      scanDesktop: 'امسح الرمز بكاميرا هاتفك',
      scanMobile: 'اضغط لفتح العرض التجريبي',
      cardName: 'نادل تجريبي',
      cardRole: 'عرض تجريبي · لا يوجد دفع حقيقي',
      trust: 'مدعوم من Stripe · لا تطبيق للضيوف · مجاني للبدء',
    },

    seconds: {
      kicker: 'العشر ثوانٍ',
      title: 'ما يحدث بين المسح ووصول المال.',
      rows: [
        ['0:00', 'يوجّه الضيف الكاميرا إلى رمز مطبوع.'],
        ['0:03', 'تفتح صفحة إكرامية في المتصفح. بلا تطبيق وبلا حساب.'],
        ['0:08', 'يدفع ببطاقة أو Apple Pay أو Google Pay.'],
        ['0:10', 'المبلغ كاملًا في رصيد الموظف.'],
      ],
    },

    doors: {
      kicker: 'ثلاث طرق للوصول إلى هنا',
      items: [
        ['أنت تدير مكانًا', 'اطّلع على ما يكسبه فريقك بالكامل، دون عدّ النقود في آخر الليل.', 'ما الذي يحصل عليه المديرون', '#operators'],
        ['تعمل مقابل الإكراميات', 'احصل على رمزك الخاص، اقبض الإكراميات بالبطاقة، وحوّل المال إلى بنكك.', 'حمّل التطبيق', '#get-app'],
        ['لقد مسحت رمزًا للتو', 'أنت في المكان الصحيح. لا تحتاج إلى حساب ولا تطبيق.', 'شاهد صفحة الإكرامية', '/demo'],
      ],
    },

    money: {
      kicker: 'إلى أين يذهب المال',
      title: 'الرسوم كاملة، في سطر واحد.',
      example: 'مثال — إكرامية بقيمة 20 $',
      rows: [
        ['يترك الضيف', '20.00 $'],
        ['تُضاف إلى الموظف فورًا', '20.00 $'],
        ['رسوم SnapTip عند السحب', '−2.00 $'],
      ],
      total: ['تصل إلى بنكه', '18.00 $'],
      zeros: [
        ['رسوم شهرية', '0.00 $'],
        ['رسوم التسجيل', '0.00 $'],
        ['التكلفة إذا لم يترك أحد إكرامية', '0.00 $'],
      ],
      note: 'تصل الإكرامية كاملة إلى الرصيد لحظة دفع الضيف. وتُخصم نسبة 10٪ فقط عندما يحوّل الموظف المال إلى بنكه. وإذا رُفض السحب، يعود المال إلى رصيده.',
    },

    ops: {
      kicker: 'للمديرين',
      title: 'اطّلع على الصالة كاملة، لا على صندوق إيصالات.',
      points: [
        'ادعُ فريقك بالبريد الإلكتروني أو برابط واحد.',
        'تابع وصول الإكراميات لحظة بلحظة.',
        'اعرف من يكسب وكم، أسبوعيًا وحسب الوردية.',
        'كل عملية دفع لها سجل. لا شيء تتم تسويته يدويًا.',
      ],
    },

    reach: {
      kicker: 'النطاق',
      items: [
        ['29', 'دولة يمكن للموظفين السحب فيها'],
        ['20', 'عملة للتحويل'],
        ['14', 'لغة في صفحة الإكرامية'],
      ],
      note: 'في 23 دولة يربط الموظفون حسابًا بنكيًا مباشرة عبر Stripe. ويُدفع للبقية بالتحويل البنكي.',
    },

    trust: {
      title: 'مُدار كما ينبغي.',
      points: [
        'تتم المدفوعات عبر Stripe. بيانات البطاقة تذهب مباشرة إلى Stripe، لا إلينا.',
        'تُشفَّر البيانات البنكية قبل تخزينها.',
        'يدفع الضيوف بالبطاقة أو Apple Pay أو Google Pay.',
      ],
    },

    app: {
      title: 'حمّل التطبيق.',
      body: 'التحميل مجاني. ومجاني حتى يبدأ فريقك في الكسب.',
      qr: 'امسح للتحميل',
      playEyebrow: 'احصل عليه من',
      play: 'Google Play',
      appleEyebrow: 'حمّله من',
      apple: 'App Store',
    },

    footer: { privacy: 'الخصوصية', terms: 'الشروط', contact: 'اتصل بنا', rights: 'SnapTip من Hitte Technologies LLC.' },

    demo: {
      badge: 'تجريبي',
      notice: 'هذا عرض تجريبي. لا تُخصم أي بطاقة ولا ينتقل أي مال.',
      tagline: 'هل أعجبتك الخدمة؟ اترك إكرامية',
      name: 'نادل تجريبي',
      role: 'خدمة الطاولات',
      choose: 'اختر إكراميتك',
      popular: 'الأكثر شيوعًا',
      custom: 'مبلغ مخصص',
      rate: 'كيف كانت تجربتك؟',
      optional: 'اختياري',
      pay: 'ادفع',
      secure: 'دفع آمن · مدعوم من Stripe',
      done: 'هذا هو المسار كاملًا.',
      doneBody: 'كان الضيف الحقيقي سينتهي هنا، وكانت الإكرامية ستصل بالفعل إلى رصيد الموظف. لم يُخصم أي مبلغ.',
      again: 'جرّب مرة أخرى',
      back: 'العودة إلى snaptip.me',
      amounts: ['شكر سريع', 'خدمة رائعة', 'ممتاز', 'استثنائي'],
    },
  },

  /* ── Español ───────────────────────────────────────────────────────── */
  es: {
    dir: 'ltr',
    nav: { how: 'Cómo funciona', money: 'Precios', business: 'Para empresas', app: 'Descargar la app' },
    a11y: { skip: 'Ir al contenido', nav: 'Principal', lang: 'Idioma', close: 'Cerrar', menu: 'Menú' },

    hero: {
      eyebrow: 'Propinas sin efectivo para la hostelería',
      title: 'Pruébalo antes de leer sobre ello.',
      body: 'Apunta la cámara de tu teléfono a este código. Abre una página de propinas real, la misma que ve un cliente. No hay que instalar nada, ni en su teléfono ni en el tuyo.',
      scanDesktop: 'Escanea con la cámara de tu teléfono',
      scanMobile: 'Toca para abrir la demo',
      cardName: 'Camarero de demostración',
      cardRole: 'Demo de SnapTip · sin pago real',
      trust: 'Con tecnología de Stripe · Sin app para los clientes · Gratis para empezar',
    },

    seconds: {
      kicker: 'Los diez segundos',
      title: 'Qué pasa entre el escaneo y el dinero.',
      rows: [
        ['0:00', 'El cliente apunta la cámara a un código impreso.'],
        ['0:03', 'Se abre una página de propinas en el navegador. Sin app, sin cuenta.'],
        ['0:08', 'Paga con tarjeta, Apple Pay o Google Pay.'],
        ['0:10', 'El importe íntegro está en el saldo del trabajador.'],
      ],
    },

    doors: {
      kicker: 'Tres formas de llegar aquí',
      items: [
        ['Diriges un negocio', 'Mira lo que gana todo tu equipo, sin contar efectivo a medianoche.', 'Qué obtienen los gerentes', '#operators'],
        ['Trabajas con propinas', 'Consigue tu código, cobra propinas con tarjeta y pasa el dinero a tu banco.', 'Descargar la app', '#get-app'],
        ['Acabas de escanear un código', 'Estás en el sitio correcto. No necesitas cuenta ni aplicación.', 'Ver la página de propinas', '/demo'],
      ],
    },

    money: {
      kicker: 'Adónde va el dinero',
      title: 'Toda la comisión, en una línea.',
      example: 'Ejemplo: una propina de 20 $',
      rows: [
        ['El cliente deja', '20,00 $'],
        ['Se abona al trabajador, al instante', '20,00 $'],
        ['Comisión de SnapTip, al retirar', '−2,00 $'],
      ],
      total: ['Llega a su banco', '18,00 $'],
      zeros: [
        ['Cuota mensual', '0,00 $'],
        ['Coste de alta', '0,00 $'],
        ['Coste si nadie deja propina', '0,00 $'],
      ],
      note: 'La propina íntegra entra en el saldo en cuanto el cliente paga. El 10 % se cobra solo cuando el trabajador pasa el dinero a su banco. Si se rechaza una retirada, el dinero vuelve a su saldo.',
    },

    ops: {
      kicker: 'Para gerentes',
      title: 'Ve toda la sala, no una caja de tickets.',
      points: [
        'Invita a tu equipo por correo o con un solo enlace.',
        'Ve llegar las propinas en tiempo real.',
        'Sabe quién gana cuánto, por semana y por turno.',
        'Cada pago deja registro. Nada que cuadrar a mano.',
      ],
    },

    reach: {
      kicker: 'Alcance',
      items: [
        ['29', 'países donde el personal puede retirar'],
        ['20', 'divisas de pago'],
        ['14', 'idiomas en la página de propinas'],
      ],
      note: 'En 23 países el personal vincula su cuenta bancaria directamente con Stripe. El resto cobra por transferencia.',
    },

    trust: {
      title: 'Bien gestionado.',
      points: [
        'Los pagos van por Stripe. Los datos de la tarjeta van directos a Stripe, no a nosotros.',
        'Los datos bancarios se cifran antes de guardarse.',
        'Los clientes pagan con tarjeta, Apple Pay o Google Pay.',
      ],
    },

    app: {
      title: 'Descarga la app.',
      body: 'Descarga gratuita. Gratis hasta que tu equipo gane.',
      qr: 'Escanea para descargar',
      playEyebrow: 'Disponible en',
      play: 'Google Play',
      appleEyebrow: 'Consíguela en el',
      apple: 'App Store',
    },

    footer: { privacy: 'Privacidad', terms: 'Términos', contact: 'Contacto', rights: 'SnapTip de Hitte Technologies LLC.' },

    demo: {
      badge: 'Demo',
      notice: 'Esto es una demostración. No se cobra ninguna tarjeta ni se mueve dinero.',
      tagline: '¿Te ha gustado el servicio? Deja una propina',
      name: 'Camarero de demostración',
      role: 'Servicio de sala',
      choose: 'Elige tu propina',
      popular: 'Popular',
      custom: 'Importe personalizado',
      rate: '¿Cómo fue tu experiencia?',
      optional: 'Opcional',
      pay: 'Pagar',
      secure: 'Pago seguro · Con tecnología de Stripe',
      done: 'Ese es todo el recorrido.',
      doneBody: 'Un cliente real habría terminado aquí, y la propina ya estaría en el saldo del trabajador. No se cobró nada.',
      again: 'Probar otra vez',
      back: 'Volver a snaptip.me',
      amounts: ['Gracias rápidas', 'Buen servicio', 'Excelente', 'Excepcional'],
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
