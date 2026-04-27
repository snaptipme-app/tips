# SnapTip — Context File for Antigravity
## Last Updated: April 25, 2026

---

## PROJECT OVERVIEW
SnapTip is a digital tipping platform. Tourists scan a QR code and tip employees without cash.
- **Business Model:** 10% commission per transaction
- **Domain:** snaptip.me
- **GitHub:** github.com/snaptipme-app/tips
- **Admin Dashboard:** snaptip.me/admin/oh (password: 3385oussama@2026)

---

## INFRASTRUCTURE
```
VPS:      Contabo (156.67.28.181, Ubuntu 24.04)
SSL:      Let's Encrypt
PM2:      process name: snaptip (id: 0)
Database: PostgreSQL (snaptipdb / user: snaptip / pass: snaptip2026)
Email:    Brevo SMTP
Project:  /var/www/snaptip
Server:   /var/www/snaptip/server
Uploads:  /var/www/snaptip/server/uploads/
```

## ENV FILE (/var/www/snaptip/server/.env)
```
PORT=5000
JWT_SECRET=sT9#mK2@pX7!qR4&nW6$vL8^jY3*hB5
NODE_ENV=production
EMAIL_USER=a8de12001@smtp-brevo.com
EMAIL_PASS=xFjK3PMXkRd0QVGT
EMAIL_FROM=snaptip.me@gmail.com
ADMIN_PASSWORD=3385oussama@2026
DATABASE_URL=postgresql://snaptip:snaptip2026@localhost:5432/snaptipdb
```

---

## TECH STACK
- **Frontend Web:** React + Vite + Tailwind → /client
- **Backend:** Node.js + Express → /server
- **Database:** PostgreSQL (pg library, NO Prisma)
- **Auth:** JWT + bcrypt
- **Email:** Brevo SMTP (smtp-relay.brevo.com:587)
- **Mobile:** React Native Expo SDK 54 + expo-router
- **Token key in AsyncStorage:** `snaptip_token`
- **User key in AsyncStorage:** `snaptip_user`
- **Admin token in localStorage:** `snaptip_admin_token`

---

## USER TYPES
| Type | account_type | Notes |
|---|---|---|
| Manager | `business` | Manages team, sees stats |
| Member | `member` / `individual` | Receives tips, withdraws |
| Tourist | — | Web only, snaptip.me/:username |
| Admin | password | snaptip.me/admin/oh |

---

## CURRENT BUGS TO FIX (PRIORITY ORDER)

### BUG 1 — Profile photo not updating in UI (CRITICAL)
**Status:** Upload works on server, UI doesn't update
**Evidence from PM2 logs:**
```
[upload-photo] employee_id=9
[upload-photo] Saved: https://snaptip.me/uploads/profile-1777074740715-338805846.jpeg
[upload-photo] Success. photo_url=https://snaptip.me/uploads/profile-1777074740715-338805846.jpeg
```
**Problem:** After uploadProfileImage() returns success, the AuthContext user object is not updated with new photo_url, so UI shows old photo.

**Fix needed in:**
- mobile/app/(tabs)/profile.tsx
- mobile/app/member/profile.tsx  
- mobile/app/register.tsx Step 4
- mobile/lib/AuthContext.tsx (updateUser must also update AsyncStorage)

**The fix:**
```typescript
// After successful upload:
const result = await uploadProfileImage(photoUri)
if (result.success && result.photo_url) {
  updateUser({ photo_url: result.photo_url })
  // updateUser must save to AsyncStorage too
}
```

**updateUser in AuthContext must be:**
```typescript
const updateUser = useCallback((updates: Partial<User>) => {
  setUser(prev => {
    if (!prev) return null
    const updated = { ...prev, ...updates }
    AsyncStorage.setItem('snaptip_user', JSON.stringify(updated))
    return updated
  })
}, [])
```

---

### BUG 2 — Missing DB columns (CRITICAL)
**Evidence from PM2 logs:**
```
[payments/mock] column "currency" of relation "payments" does not exist
[admin/withdrawals GET] column w.admin_notes does not exist
[admin/transactions] column p.currency does not exist
```

**Fix:** Add these migrations in server/db.js initDB():
```javascript
await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD'")
await pool.query("ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD'")
await pool.query("ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_note TEXT")
await pool.query("ALTER TABLE tips ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD'")
```

---

### BUG 3 — Delete user fails with foreign key error
**Evidence:**
```
[admin/users/delete] update or delete on table "employees" violates foreign key constraint "tips_employee_id_fkey" on table "tips"
```

**Fix in server/routes/admin.js DELETE /api/admin/users/:id:**
Delete in this exact order:
```javascript
await pool.query('DELETE FROM tips WHERE employee_id = $1', [userId])
await pool.query('DELETE FROM payments WHERE employee_id = $1', [userId])
await pool.query('DELETE FROM withdrawals WHERE employee_id = $1', [userId])
await pool.query('DELETE FROM team_members WHERE employee_id = $1', [userId])
await pool.query('DELETE FROM invitations WHERE employee_id = $1', [userId])
await pool.query('DELETE FROM employees WHERE id = $1', [userId])
```

---

### BUG 4 — Join business fails with foreign key error
**Evidence:**
```
[business/join] insert or update on table "team_members" violates foreign key constraint "team_members_employee_id_fkey"
```

**Fix in server/routes/business.js POST /api/business/join/:token:**
Verify employee exists before inserting into team_members.

---

### BUG 5 — Business create foreign key error
**Evidence:**
```
[business/create] insert or update on table "businesses" violates foreign key constraint "businesses_owner_id_fkey"
```

**Fix:** Make sure owner_id uses req.employee.id from JWT, not from request body.

---

## KEY FILES STRUCTURE

### Backend (/server):
```
server/
├── index.js              # Entry point, dotenv FIRST line
├── db.js                 # PostgreSQL pool + initDB()
├── middleware/
│   ├── auth.js           # JWT verify + is_suspended check
│   ├── adminAuth.js      # Admin JWT verify
│   └── upload.js         # Multer config for image uploads
├── routes/
│   ├── auth.js           # Register/Login/OTP/ForgotPW
│   ├── business.js       # Business + invites
│   ├── admin.js          # Admin endpoints
│   ├── payments.js       # Mock payments
│   ├── tips.js           # Tips history
│   ├── withdrawals.js    # Withdraw requests
│   ├── employee.js       # Profile + upload-photo endpoint
│   ├── dashboard.js      # Member dashboard
│   └── analytics.js
├── lib/
│   └── processPayment.js # processSuccessfulPayment(employeeId, amount, currency, method, transactionId, touristEmail)
└── utils/
    └── sendEmail.js      # Brevo SMTP
```

### Mobile (/mobile):
```
mobile/
├── app/
│   ├── index.tsx         # Routes based on auth (NO expo-router at top level imports in lib/)
│   ├── login.tsx
│   ├── register.tsx      # 4 steps, ALL state at TOP LEVEL
│   ├── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx   # Bottom tabs logic, expo-router imported HERE only
│   │   ├── home.tsx      # Member home
│   │   ├── tips.tsx
│   │   └── profile.tsx
│   ├── business/
│   │   ├── dashboard.tsx
│   │   ├── team.tsx
│   │   ├── invite.tsx
│   │   ├── transactions.tsx
│   │   └── settings.tsx
│   ├── member/
│   │   ├── qr.tsx
│   │   └── withdraw.tsx
│   ├── join/[token].tsx
│   └── support.tsx
├── components/
│   ├── SnapTipLogo.tsx   # SVG lightning bolt logo
│   ├── PrintableQRCard.tsx
│   └── Toast.tsx
└── lib/
    ├── AuthContext.tsx   # NO expo-router imports here
    ├── LanguageContext.tsx
    ├── api.ts            # NO expo-router imports here (uses callback pattern)
    ├── uploadImage.ts    # Uses expo-file-system/legacy uploadAsync
    └── captureQRCard.ts
```

---

## CRITICAL ARCHITECTURE RULES

### expo-router circular dependency fix:
**NEVER import expo-router in lib/ files.**
expo-router must ONLY be imported in app/ files.

**api.ts uses callback pattern:**
```typescript
// api.ts - NO expo-router import
let _navigateToLogin: (() => void) | null = null
export const setNavigateToLogin = (fn: () => void) => { _navigateToLogin = fn }
```

**_layout.tsx registers the callback:**
```typescript
// _layout.tsx - expo-router imported HERE safely
import { router } from 'expo-router'
import { setNavigateToLogin } from '../lib/api'
useEffect(() => {
  setNavigateToLogin(() => router.replace('/login'))
}, [])
```

---

## IMAGE UPLOAD SYSTEM

### Mobile (lib/uploadImage.ts):
Uses `expo-file-system/legacy` (NOT regular expo-file-system) because:
- SDK 54 moved uploadAsync to legacy submodule
- Android Scoped Storage prevents fetch/axios from reading file:// paths
- FileSystem.uploadAsync bypasses the React Native network bridge

```typescript
import * as FileSystem from 'expo-file-system/legacy'
// Uses FileSystem.FileSystemUploadType.MULTIPART
```

### Backend endpoint:
- POST /api/employee/upload-photo (protected, uses multer)
- POST /api/business/upload-logo (protected, uses multer)
- Files saved to /var/www/snaptip/server/uploads/
- Served via Nginx at /uploads/

### Nginx config (already configured):
```nginx
location /uploads/ {
    alias /var/www/snaptip/server/uploads/;
    access_log off;
    expires max;
}
```

---

## DATABASE SCHEMA (PostgreSQL)

```sql
employees (id SERIAL, first_name, last_name, full_name, email UNIQUE, 
           password, username UNIQUE, photo_url, job_title, account_type,
           country, currency, balance, total_tips, otp_code, otp_expires BIGINT,
           reset_code, reset_code_expires BIGINT, is_verified, is_suspended,
           last_login, custom_message, show_photo_on_card, created_at)

businesses (id, owner_id→employees, business_name, business_type, 
            logo_url, address, thank_you_message, created_at)

team_members (id, business_id→businesses, employee_id→employees, joined_at)

invitations (id, business_id→businesses, email, token UNIQUE, status,
             expires_at BIGINT, required_country, created_at)

payments (id, employee_id→employees, amount, currency, fee,
          payment_method, stripe_payment_id, tourist_email, status, created_at)

withdrawals (id, employee_id→employees, amount, currency, fee, net_amount,
             method, account_details, contact_phone, status, admin_note, created_at)

tips (id, employee_id→employees, amount, currency, ...)
```

---

## MULTI-CURRENCY SYSTEM
- Each employee has their own currency (MAD/USD/EUR/AED) based on country
- Payments store amount + currency separately
- NEVER sum different currencies together
- Tourist page shows prices in employee's currency
- Admin sees totals grouped BY currency:
  ```
  MAD: 1,500 MAD (150 MAD commission)
  EUR: 350 EUR (35 EUR commission)
  ```

---

## VPS COMMANDS
```bash
# Update project
cd /var/www/snaptip && git pull && npm run build --prefix client && pm2 restart snaptip

# Check logs
pm2 logs snaptip --lines 20

# PostgreSQL
sudo -u postgres psql snaptipdb

# Restart server (reads .env correctly)
cd /var/www/snaptip/server && pm2 delete snaptip && pm2 start index.js --name snaptip && pm2 save
```

## MOBILE BUILD
```powershell
# EAS Build (recommended - uses Expo servers)
cd "C:\Users\espacegamers\Downloads\Snaptip Project\mobile"
eas build --platform android --profile preview
```
Note: Local build fails due to Windows path length limit (260 chars). Always use EAS Build.

---

## WHAT'S WORKING ✅
- App opens and runs (circular dependency fixed)
- Login / Register / OTP verification
- Business creation and team management  
- Tourist page (snaptip.me/:username)
- Mock payments (updates balance)
- Withdrawal requests
- Admin dashboard (snaptip.me/admin/oh)
- Email notifications via Brevo
- Image upload to server (files saved correctly)
- Multi-language (EN/FR/AR/ES)
- Multi-currency display

## WHAT NEEDS FIXING ❌
1. Profile photo not showing in UI after upload (upload works, UI doesn't refresh)
2. Missing DB columns: payments.currency, withdrawals.currency, withdrawals.admin_note
3. Delete user fails: missing DELETE FROM tips before DELETE FROM employees
4. Join business fails: foreign key constraint
5. Business create fails for some accounts: owner_id = 0 instead of actual ID
