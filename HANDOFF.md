# SnapTip — Project Handoff

## What Is This App
A React Native (Expo) tipping platform. Employees (waiters, guides, etc.) receive cashless tips via QR code. Businesses manage teams and view dashboards. Built as a monorepo with a mobile app and a Node.js API.

---

## Repo Structure
```
Snaptip Project/
├── mobile/          ← Expo app (this is what we work in)
│   ├── app/         ← Expo Router file-based screens
│   ├── components/  ← Shared UI components
│   ├── lib/         ← Auth, API, language, storage utilities
│   └── assets/
└── client/          ← Web admin dashboard (React)
    └── src/pages/AdminDashboard.jsx
```

---

## Tech Stack
| Dependency | Version |
|---|---|
| Expo SDK | ~54.0.33 |
| React Native | 0.81.5 |
| expo-router | ~6.0.23 |
| react-native-svg | 15.12.1 |
| expo-linear-gradient | ~15.0.8 |
| @react-native-async-storage | 2.2.0 |
| expo-notifications | ~0.32.16 |
| expo-secure-store | ~15.0.8 |
| expo-updates | ~29.0.26 |

**New Architecture enabled** (`newArchEnabled: true` in app.json).  
**Android keyboard mode:** `softwareKeyboardLayoutMode: "pan"` in app.json — required for `KeyboardAvoidingView` to work correctly on Android.

---

## Account Types
- **member** — individual employee, receives tips via QR, can withdraw
- **business** — manager, sees team dashboard, invites employees

Routing logic in `app/index.tsx`: all users go to `/(tabs)/home`. `home.tsx` lazy-requires and renders `BusinessDashboard` for business accounts, otherwise shows the member home screen.

---

## Key Files

### Screens (`app/`)
| File | Purpose |
|---|---|
| `index.tsx` | Entry: redirects to `/(tabs)/home` (or `/login` if unauthenticated) |
| `login.tsx` | Login form — uses `t()` for all strings |
| `register.tsx` | 4-step registration: Info → OTP → Credentials → Photo |
| `forgot-password.tsx` | 3-step password reset |
| `(tabs)/_layout.tsx` | Tab bar — shows Dashboard+Profile for business, Home+Tips+Profile for member |
| `(tabs)/home.tsx` | Member dashboard (polling every 15s); renders `BusinessDashboard` for business accounts |
| `(tabs)/profile.tsx` | Profile settings for both account types |
| `(tabs)/tips.tsx` | Tip transaction history (member only) |
| `business/dashboard.tsx` | Business dashboard: stats grid, 7-day sparkline, top performers, recent activity |
| `business/team.tsx` | Team management |
| `business/invite.tsx` | Invite employee by email |
| `business/transactions.tsx` | Business transaction list |
| `business/profile-settings.tsx` | Business profile/logo edit |
| `business/setup.tsx` | First-run business setup |
| `member/profile.tsx` | Member profile edit + password change modal |
| `member/qr.tsx` | QR code display + printable card |
| `member/withdraw.tsx` | Withdrawal request |
| `join/[token].tsx` | Deep-link invitation acceptance |

### Components (`components/`)
| File | Purpose |
|---|---|
| `KeyboardAwareWrapper.tsx` | Reusable `KeyboardAvoidingView + ScrollView`. iOS: `behavior="padding"`, Android: `behavior="height"` + `automaticallyAdjustKeyboardInsets` |
| `Toast.tsx` | Custom toast system. Renders via a transparent `Modal` so it appears above all other Modals. Uses `useToast()` hook |
| `HapticButton.tsx` | Animated touchable with haptic feedback |
| `SkeletonLoader.tsx` | Skeleton loading placeholders. Has `SkeletonLoader.Dashboard` for the business dashboard loading state |
| `SnapTipLogo.tsx` | SVG lightning bolt logo |
| `PrintableQRCard.tsx` | Printable tip card for download/share |

### Lib (`lib/`)
| File | Purpose |
|---|---|
| `AuthContext.tsx` | JWT auth state. Token stored in `expo-secure-store`. Provides `user`, `login()`, `logout()`, `updateUser()` |
| `LanguageContext.tsx` | Full i18n system. 4 languages (en/fr/ar/es). `useLanguage()` hook gives `t(key)`, `changeLanguage()`, `isRTL`, `language`. Persists to AsyncStorage. Calls `I18nManager.forceRTL()` on change |
| `api.ts` | Axios instance pointing at `https://snaptip.me/api`. Auto-attaches JWT from SecureStore |
| `secureStorage.ts` | Wrapper for `expo-secure-store` with keys enum |
| `imageUtils.ts` | `getImageSource()` — handles both base64 and URL image sources |
| `uploadImage.ts` | Uploads profile photo via multipart form |
| `tipSound.ts` | Plays tip received sound via `expo-av` |
| `notifications.ts` | Push notification setup (Expo Notifications) |

---

## Design System
```
Background:   #1a1a1a
Cards:        rgba(255,255,255,0.05)  border: rgba(255,255,255,0.08)
Accent:       #00ffcc  (bright cyan)
Green:        #00C896  (primary action, success, tips)
Yellow:       #f59e0b
Blue:         #00ffcc
Tab bar bg:   #1a1a1a
Sheet bg:     #1a1a1a
Border:       rgba(255,255,255,0.06–0.08)
Input bg:     rgba(255,255,255,0.08)
```
No emojis anywhere. All icons are `Ionicons` from `@expo/vector-icons`.

---

## i18n System
- **No i18next** — uses a custom `LanguageContext` (simpler, already complete)
- Languages: `en`, `fr`, `ar`, `es`
- Keys stored as flat strings in `lib/LanguageContext.tsx`
- Auth screens (login, register, forgot-password) fully translated
- App/profile/dashboard screens use `t()` via `useLanguage()`
- RTL: `I18nManager.forceRTL(true)` called when Arabic selected — **requires app reload to take effect**
- Language persisted to AsyncStorage under key `snaptip_language`

---

## Work Completed (This Session Series)

### Keyboard Fix
- Created `components/KeyboardAwareWrapper.tsx` — drop-in for all form screens
- Added `softwareKeyboardLayoutMode: "pan"` to `app.json` (Android)
- Applied to: `login`, `register`, `forgot-password`, `business/invite`, `business/profile-settings`, `member/profile`
- **Requires new EAS build to take effect** (native config change)

### Routing Fix
- `index.tsx` now always routes to `/(tabs)/home` — business users no longer go outside the tab group
- Tab bar (profile icon) is always visible for all account types

### Business Dashboard Redesign
- Full JSX rewrite of `app/business/dashboard.tsx`
- Layout: gradient header → 3-card stats (Total Tips hero + Transactions/Team Members row) → 7-day sparkline → top performers with progress bars → recent activity → 3 action buttons
- Commission stat removed from the dashboard
- All API/state/hook logic preserved

### i18n Auth Screens
- 60+ translation keys added per language to `LanguageContext`
- `register.tsx`: Step1–Step4 converted to block-body memo components so each calls `useLanguage()`
- `login.tsx`, `forgot-password.tsx`: fully translated

---

## Pending / Known Issues

### Needs EAS Build
The `softwareKeyboardLayoutMode: "pan"` change in `app.json` is a native config — it requires a new EAS build to take effect on Android. Current OTA updates will NOT apply this fix.
```bash
eas build --platform android --profile preview
```

### RTL Layout on Arabic
`I18nManager.forceRTL(true)` is called correctly but React Native requires a full app restart after changing. The UI flips RTL on next launch, not immediately.

### Admin Dashboard (Web)
There is a plan file at `~/.claude/plans/piped-dancing-pnueli.md` for redesigning `client/src/pages/AdminDashboard.jsx` with recharts. Not started — requires `npm install recharts` in `client/`.

---

## API Base URL
`https://snaptip.me/api`

Key endpoints used:
- `POST /auth/login`, `/auth/register`, `/auth/send-otp`, `/auth/verify-otp`
- `POST /auth/forgot-password`, `/auth/reset-password`
- `GET /dashboard` (member — polled every 15s)
- `GET /business/stats`, `/business/transactions`, `/business/me`
- `GET/POST /business/team`, `/business/invite`
- `PATCH /employee/profile`
- `POST /employee/photo`

---

## Git Branch
`main` — all work committed directly to main, no feature branches.

Recent commits:
```
139af00 feat: wire full i18n into auth screens
fc75d73 fix: route business users through tabs + remove commission stat
f019cbd feat: redesign business dashboard UI
83a57cf fix: keyboard covering inputs on Android
b504eeb refactor: add KeyboardAwareWrapper
```
