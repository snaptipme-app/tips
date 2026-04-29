import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clickjacking defence. CSP frame-ancestors works only as an HTTP header — when
// set via <meta> the browser ignores it. Until the static host (nginx) ships
// X-Frame-Options/CSP headers, this bundled script breaks out of any frame the
// page is loaded into. Same-origin frames trigger a redirect; cross-origin
// frames throw on access and we paint a blocked-screen fallback.
;(function preventFraming() {
  if (typeof window === 'undefined') return;
  if (window.top === window.self) return;
  try {
    window.top.location.href = window.self.location.href;
  } catch {
    document.documentElement.innerHTML =
      '<body style="margin:0;background:#080818;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px"><div><h1 style="margin:0 0 8px">SnapTip</h1><p style="opacity:0.6;margin:0">This page cannot be embedded in a frame.</p></div></body>';
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
