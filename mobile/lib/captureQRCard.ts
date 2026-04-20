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
  onError?: () => void
): Promise<void> => {
  try {
    const qrValue = `https://snaptip.me/${employee.username}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}&color=1a1a2e&bgcolor=ffffff`;

    const bizLogo = business?.logo_base64 || business?.logo_url || '';

    const businessSection = bizLogo
      ? `<img src="${bizLogo}" style="width:60px;height:60px;border-radius:50%;border:2px solid #e8e8e8;object-fit:cover;" />`
      : business?.business_name
      ? `<div style="background:#f0f0ff;border-radius:50px;padding:6px 16px;display:inline-block;"><span style="color:#6c6cff;font-weight:700;font-size:13px;">${business.business_name}</span></div>`
      : `<div style="background:#f5f5ff;border-radius:50px;padding:6px 14px;display:inline-block;"><span style="color:#6c6cff;font-weight:700;font-size:13px;">⚡ SnapTip</span></div>`;

    // For base64 photos, pass directly; for URLs, use img src
    const photoSrc = employee.photo_url || '';
    const employeePhoto = photoSrc
      ? `<img src="${photoSrc}" style="width:48px;height:48px;border-radius:50%;border:2px solid #e8e8e8;object-fit:cover;margin:0 auto;display:block;" />`
      : `<div style="width:48px;height:48px;border-radius:50%;background:#6c6cff;margin:0 auto;line-height:48px;font-size:20px;font-weight:700;color:white;text-align:center;">${(employee.full_name || '?').charAt(0).toUpperCase()}</div>`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 20px;
            padding: 28px 24px;
            width: 300px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .business-section { margin-bottom: 16px; }
          .cta-small { color: #666; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
          .cta-big { color: #00C896; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 20px; }
          .qr-container {
            border: 1px solid #e8e8e8;
            border-radius: 12px;
            padding: 12px;
            display: inline-block;
            margin-bottom: 16px;
          }
          .qr-container img { display: block; width: 180px; height: 180px; }
          .employee-section { margin-top: 4px; }
          .employee-name { color: #1a1a2e; font-size: 15px; font-weight: 700; margin-top: 8px; }
          .employee-title { color: #888; font-size: 12px; margin-top: 2px; }
          .divider { border-top: 1px solid #f0f0f0; margin: 16px 0 12px 0; }
          .footer-secure { color: #bbb; font-size: 11px; }
          .footer-url { color: #6c6cff; font-size: 11px; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="business-section">${businessSection}</div>
          <p class="cta-small">Enjoyed the service?</p>
          <p class="cta-big">Leave a tip!</p>
          <div class="qr-container">
            <img src="${qrImageUrl}" alt="QR Code" />
          </div>
          <div class="employee-section">
            ${employeePhoto}
            <p class="employee-name">${employee.full_name}</p>
            ${employee.job_title ? `<p class="employee-title">${employee.job_title}</p>` : ''}
          </div>
          <div class="divider"></div>
          <p class="footer-secure">Secure payment via SnapTip</p>
          <p class="footer-url">snaptip.me/${employee.username}</p>
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
