import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Strict CSP for production builds only — Vite's dev server uses inline scripts
// and a WebSocket for HMR which would be blocked by the policy below. The
// `apply: 'build'` guard on the plugin keeps `npm run dev` working unchanged.
//
// Notes on directives:
//   - script-src 'self'         : no inline scripts, no eval. Bundled code only.
//   - style-src  + 'unsafe-inline': React inline style props rely on this. The
//                                   Google Fonts host is allowed for the admin
//                                   login screen's @import.
//   - connect-src              : axios baseURL is same-origin in prod, but list
//                                snaptip.me hosts explicitly so cross-subdomain
//                                XHR (e.g. api.snaptip.me) keeps working.
//   - frame-ancestors 'none'   : browsers IGNORE this when set via <meta>; it
//                                works only as an HTTP header. Real clickjacking
//                                protection ships via the frame-buster in
//                                main.jsx until nginx is in scope.
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://snaptip.me https://api.snaptip.me",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

function injectCspPlugin() {
  return {
    name: 'snaptip-inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const tag = `    <meta http-equiv="Content-Security-Policy" content="${PROD_CSP}" />\n    <meta http-equiv="X-Content-Type-Options" content="nosniff" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />\n`;
      return html.replace('<head>', `<head>\n${tag}`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), injectCspPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
