import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Path } from 'react-native-svg';

export type PrintableQRCardEmployee = {
  username: string;
  full_name: string;
  photo_url?: string;
  job_title?: string;
};

export type PrintableQRCardBusiness = {
  business_name?: string;
  logo_url?: string;
  logo_base64?: string;
} | null;

export type PrintableQRCardProps = {
  employee: PrintableQRCardEmployee;
  business?: PrintableQRCardBusiness;
  customMessage?: string;
  showPhoto?: boolean;
};

const GREEN = '#00C896';
const ACCENT = '#6c6cff';
const NAVY = '#080818';
const GRAY = '#666666';
const CORNER_COLOR = '#c8c8d8';
const CORNER_SIZE = 18;
const CORNER_THICK = 3;

/* ── SnapTip Logo — standalone green bolt, no container ─────────────── */
const SnapTipLogo = () => (
  <Svg width={36} height={36} viewBox="0 0 24 24">
    <Path
      d="M13 2L4.5 13.5H11L9 22L20 10H13.5L16 2Z"
      fill={GREEN}
      strokeLinejoin="round"
    />
  </Svg>
);

/* ── Lightning bolt watermark (footer) ──────────────────────────────── */
const LightningWatermark = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24">
    <Path
      d="M13 2L4.5 13.5H11L9 22L20 10H13.5L16 2Z"
      fill="#e0e0ec"
      strokeLinejoin="round"
    />
  </Svg>
);

/* ── Scanner corner brackets ─────────────────────────────────────────── */
const ScannerCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const isTL = position === 'tl';
  const isTR = position === 'tr';
  const isBL = position === 'bl';

  return (
    <View
      style={{
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        top: isTL || isTR ? 0 : undefined,
        bottom: isBL || position === 'br' ? 0 : undefined,
        left: isTL || isBL ? 0 : undefined,
        right: isTR || position === 'br' ? 0 : undefined,
        // Top border
        borderTopWidth: isTL || isTR ? CORNER_THICK : 0,
        // Bottom border
        borderBottomWidth: isBL || position === 'br' ? CORNER_THICK : 0,
        // Left border
        borderLeftWidth: isTL || isBL ? CORNER_THICK : 0,
        // Right border
        borderRightWidth: isTR || position === 'br' ? CORNER_THICK : 0,
        // Corner radii
        borderTopLeftRadius: isTL ? 6 : 0,
        borderTopRightRadius: isTR ? 6 : 0,
        borderBottomLeftRadius: isBL ? 6 : 0,
        borderBottomRightRadius: position === 'br' ? 6 : 0,
        borderColor: CORNER_COLOR,
      }}
    />
  );
};

/**
 * PrintableQRCard — redesigned to match the premium SnapTip card reference.
 * White card · SnapTip header · scanner brackets · purple-tinted avatar · minimal footer.
 */
export default function PrintableQRCard({
  employee,
  business,
  customMessage,
  showPhoto = true,
}: PrintableQRCardProps) {
  const tipUrl = `https://snaptip.me/${employee.username}`;
  const initials = (employee.full_name || '?').charAt(0).toUpperCase();
  const photoSrc = showPhoto ? (employee.photo_url || '') : '';
  const ctaText = customMessage?.trim() || 'Leave a tip!';

  // If a business logo is provided, show it above the SnapTip brand
  const bizLogo = business?.logo_base64 || business?.logo_url || '';

  return (
    <View style={styles.card}>

      {/* ① Header — SnapTip logo */}
      <View style={styles.header}>
        {bizLogo ? (
          <Image source={{ uri: bizLogo }} style={styles.bizLogo} resizeMode="cover" />
        ) : (
          <SnapTipLogo />
        )}
      </View>

      {/* ② Call to action */}
      <Text style={styles.ctaSub}>Enjoyed the service?</Text>
      <Text style={styles.ctaMain}>{ctaText}</Text>

      {/* ③ QR code with scanner corner brackets */}
      <View style={styles.qrOuter}>
        <ScannerCorner position="tl" />
        <ScannerCorner position="tr" />
        <ScannerCorner position="bl" />
        <ScannerCorner position="br" />
        <View style={styles.qrInner}>
          <QRCode value={tipUrl} size={168} color={NAVY} backgroundColor="#FFFFFF" />
        </View>
      </View>

      {/* ④ Employee profile */}
      <View style={styles.empSection}>
        {showPhoto && (
          photoSrc ? (
            <Image source={{ uri: photoSrc }} style={styles.empPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.empInitialsCircle}>
              <Text style={styles.empInitialsText}>{initials}</Text>
            </View>
          )
        )}
        <Text style={styles.empName}>{(employee.full_name || '').toUpperCase()}</Text>
        {employee.job_title ? (
          <Text style={styles.empJobTitle}>{employee.job_title}</Text>
        ) : null}
      </View>

      {/* ⑤ Footer */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <View style={styles.footerContent}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.footerSecure}>Secure payment via SnapTip</Text>
            <Text style={styles.footerUrl}>snaptip.me/{employee.username}</Text>
          </View>
          <LightningWatermark />
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  // Header
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  bizLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },

  // CTA
  ctaSub: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAY,
    textAlign: 'center',
  },
  ctaMain: {
    fontSize: 24,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },

  // QR
  qrOuter: {
    position: 'relative',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  qrInner: {
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Employee
  empSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  empPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: ACCENT,
  },
  empInitialsCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    // Purple-to-indigo gradient approximated with a solid purple
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#a78bfa',
  },
  empInitialsText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  empName: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  empJobTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: GRAY,
    marginTop: 3,
    textAlign: 'center',
  },

  // Footer
  footer: {
    width: '100%',
    marginTop: 16,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8ec',
    marginBottom: 10,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSecure: {
    fontSize: 10.5,
    color: '#c0c0cc',
    textAlign: 'center',
  },
  footerUrl: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    textAlign: 'center',
    marginTop: 2,
  },
});
