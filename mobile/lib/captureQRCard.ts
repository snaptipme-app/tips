import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type EmployeeData = {
  username: string;
  full_name: string;
  photo_url?: string;
  job_title?: string;
};

type BusinessData = {
  business_name?: string;
  logo_url?: string;
  logo_base64?: string;
} | null;

export const downloadAndShareQRCard = async (
  employee: EmployeeData,
  business: BusinessData,
  onSuccess?: () => void,
  onError?: () => void,
  customMessage?: string,
  showPhoto = true,
): Promise<void> => {
  try {
    const qrValue = `https://snaptip.me/${employee.username}`;

    // Use qrserver.com for a clean dark QR matching our NAVY (#080818) color
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrValue)}&color=080818&bgcolor=ffffff&qzone=1`;

    const ctaText = customMessage?.trim() || 'Leave a tip!';
    const initials = (employee.full_name || '?').charAt(0).toUpperCase();
    const photoSrc = showPhoto ? (employee.photo_url || '') : '';
    const bizLogo = business?.logo_base64 || business?.logo_url || '';

    // ── Header section: business logo OR SnapTip brand ──
    const headerSection = bizLogo
      ? `<img src="${bizLogo}" style="width:56px;height:56px;border-radius:14px;border:1px solid #eee;object-fit:cover;display:block;margin:0 auto;" />`
      : `
        <div style="display:flex;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="38" height="38">
            <path d="M13 2L4.5 13.5H11L9 22L20 10H13.5L16 2Z" fill="#00C896" stroke-linejoin="round"/>
          </svg>
        </div>`;

    // ── Avatar section ──
    const avatarSection = photoSrc
      ? `<img src="${photoSrc}" style="width:52px;height:52px;border-radius:50%;border:2.5px solid #6c6cff;object-fit:cover;display:block;margin:0 auto;" />`
      : `<div style="width:52px;height:52px;border-radius:50%;background:#6c6cff;border:2.5px solid #a78bfa;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;line-height:52px;text-align:center;">${initials}</div>`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f0f0f8;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 40px 20px;
          }

          /* ── Card ── */
          .card {
            background: #ffffff;
            border-radius: 24px;
            padding: 28px 28px 22px;
            width: 320px;
            text-align: center;
            box-shadow: 0 8px 40px rgba(0,0,0,0.12);
          }

          /* ── Header ── */
          .header {
            margin-bottom: 18px;
          }

          /* ── CTA ── */
          .cta-sub {
            color: #666666;
            font-size: 13px;
            font-weight: 400;
            margin-bottom: 5px;
          }
          .cta-main {
            color: #00C896;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
            margin-bottom: 22px;
          }

          /* ── QR with scanner corners ── */
          .qr-outer {
            position: relative;
            display: inline-block;
            padding: 16px;
            margin-bottom: 0;
          }

          /* L-shaped scanner corner brackets */
          .corner {
            position: absolute;
            width: 20px;
            height: 20px;
            border-color: #c8c8d8;
            border-style: solid;
          }
          .corner-tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-radius: 6px 0 0 0; }
          .corner-tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 6px 0 0; }
          .corner-bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-radius: 0 0 0 6px; }
          .corner-br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 6px 0; }

          .qr-outer img {
            display: block;
            width: 192px;
            height: 192px;
          }

          /* ── Employee ── */
          .emp-section {
            margin-top: 20px;
            text-align: center;
          }
          .emp-name {
            font-size: 15px;
            font-weight: 800;
            color: #080818;
            margin-top: 10px;
            letter-spacing: 0.4px;
            text-transform: uppercase;
          }
          .emp-title {
            font-size: 12px;
            font-weight: 400;
            color: #999999;
            margin-top: 4px;
          }

          /* ── Footer ── */
          .footer {
            margin-top: 18px;
          }
          .footer-divider {
            border: none;
            border-top: 1px solid #e8e8ec;
            margin-bottom: 10px;
          }
          .footer-inner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            position: relative;
          }
          .footer-text-wrap {
            flex: 1;
            text-align: center;
          }
          .footer-secure {
            font-size: 10.5px;
            color: #c0c0cc;
          }
          .footer-url {
            font-size: 11px;
            font-weight: 600;
            color: #6c6cff;
            margin-top: 2px;
          }
          .footer-bolt {
            position: absolute;
            right: 0;
            opacity: 0.3;
          }
        </style>
      </head>
      <body>
        <div class="card">

          <!-- Header -->
          <div class="header">
            ${headerSection}
          </div>

          <!-- CTA -->
          <p class="cta-sub">Enjoyed the service?</p>
          <p class="cta-main">${ctaText}</p>

          <!-- QR with scanner corner brackets -->
          <div class="qr-outer">
            <div class="corner corner-tl"></div>
            <div class="corner corner-tr"></div>
            <div class="corner corner-bl"></div>
            <div class="corner corner-br"></div>
            <img src="${qrImageUrl}" alt="QR Code" />
          </div>

          <!-- Employee profile -->
          <div class="emp-section">
            ${showPhoto ? avatarSection : ''}
            <p class="emp-name">${(employee.full_name || '').toUpperCase()}</p>
            ${employee.job_title ? `<p class="emp-title">${employee.job_title}</p>` : ''}
          </div>

          <!-- Footer -->
          <div class="footer">
            <hr class="footer-divider" />
            <div class="footer-inner">
              <div class="footer-text-wrap">
                <p class="footer-secure">Secure payment via SnapTip</p>
                <p class="footer-url">snaptip.me/${employee.username}</p>
              </div>
              <svg class="footer-bolt" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="#c0c0cc">
                <path d="M13 2L4.5 13.5H11L9 22L20 10H13.5L16 2Z"/>
              </svg>
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share QR Card',
        UTI: 'com.adobe.pdf',
      });
    }

    onSuccess?.();
  } catch (error) {
    console.error('[captureQRCard] Error:', error);
    onError?.();
  }
};
