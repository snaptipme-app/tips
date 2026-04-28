# Mobile App — Security Notes

## TLS / Certificate Pinning (deferred — Phase 2.2)

Certificate pinning is NOT enabled in this build. Rationale:

- `snaptip.me` is fronted by Cloudflare. Cloudflare rotates leaf certificates
  frequently (every ~90 days) and can swap intermediates without notice.
  Pinning the leaf or intermediate would brick every shipped APK/IPA the next
  time Cloudflare rotates, with no remote-config remediation possible.
- Pinning Cloudflare's root CA SPKI hash is safer (rare rotation) but still
  carries risk of an emergency rotation locking users out.
- The app already enforces:
    - HTTPS-only via iOS App Transport Security (`NSAllowsArbitraryLoads=false`,
      `NSExceptionMinimumTLSVersion=TLSv1.2` for `snaptip.me`).
    - Android System CA validation through OkHttp default trust manager.
    - JWT auth with short tokens (no long-lived secrets pinned to identity).

**To enable pinning later** (only after a cert rotation runbook is in place):

1. Capture SPKI hashes for the Cloudflare roots used by `snaptip.me`:
   ```sh
   openssl s_client -connect snaptip.me:443 -showcerts < /dev/null 2>/dev/null \
     | openssl x509 -pubkey -noout \
     | openssl pkey -pubin -outform der \
     | openssl dgst -sha256 -binary \
     | openssl enc -base64
   ```
   Run this for the root cert and at least one backup root.
2. Pick an implementation. With Expo + EAS Build the cleanest options are:
    - `react-native-ssl-pinning` (community) — works after `expo prebuild`.
    - Add an OkHttpInterceptor + URLSessionDelegate via a custom Expo config
      plugin if you want pinning without ejecting.
3. Always ship at least 2 valid pins (current + backup) so a single rotation
   can't brick installed apps. Add a kill-switch served from the API
   (`GET /api/security/pin-config`) that the app fetches on launch and uses
   to update its pinset before any pinned request runs.
4. Build a force-update flow: if pinning fails 3× in a row, force the user
   to a "Please update SnapTip" screen with the App/Play Store link. This
   is the bare-minimum recovery path if the pin set drifts.

## Other security controls that ARE in this build

- JWT, push token stored in `expo-secure-store` (Keychain/Keystore).
  AsyncStorage migration runs once per key on first launch.
- Root/jailbreak detection via `jail-monkey` — surfaces a one-time advisory
  alert; does not hard-block the user. Withdrawal flows can call
  `isHighRiskDevice()` from `lib/security` to gate sensitive actions.
- Deep-link audit log — every incoming `snaptip://` URL is parsed against a
  top-level path whitelist; suspicious links are logged.
- Withdrawal screen blocks screenshots / screen recording via
  `expo-screen-capture`.
- Production builds strip `console.log` (keeps `error` and `warn` for
  crash reporting) via `babel-plugin-transform-remove-console`.
- iOS ATS only allows `https://snaptip.me` (TLS 1.2+, forward secrecy
  required).
