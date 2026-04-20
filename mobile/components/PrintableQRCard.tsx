import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

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
};

const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const NAVY = '#1a1a2e';
const GRAY = '#888888';
const LIGHT_BORDER = '#e8e8e8';

const PrintableQRCard = React.forwardRef<View, PrintableQRCardProps>(
  ({ employee, business }, ref) => {
    const tipUrl = `https://snaptip.me/${employee.username}`;
    const initials = (employee.full_name || '?').charAt(0).toUpperCase();
    const photoSrc = employee.photo_url || '';
    const bizLogo = business?.logo_base64 || business?.logo_url || '';
    const bizName = business?.business_name || '';

    return (
      <View ref={ref} collapsable={false} style={styles.card}>

        {/* ① Business Section */}
        <View style={styles.bizSection}>
          {bizLogo ? (
            <Image
              source={{ uri: bizLogo }}
              style={styles.bizLogo}
              resizeMode="cover"
            />
          ) : bizName ? (
            <View style={styles.bizPill}>
              <Text style={styles.bizPillText}>{bizName}</Text>
            </View>
          ) : (
            // SnapTip placeholder when no business
            <View style={styles.snapPill}>
              <Text style={styles.snapPillText}>⚡ SnapTip</Text>
            </View>
          )}
        </View>

        {/* ② Call to Action */}
        <Text style={styles.ctaSub}>Enjoyed the service?</Text>
        <Text style={styles.ctaMain}>Leave a tip!</Text>

        {/* ③ QR Code */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={tipUrl}
            size={180}
            color={NAVY}
            backgroundColor="#FFFFFF"
          />
        </View>

        {/* ④ Employee Info */}
        <View style={styles.empSection}>
          {photoSrc ? (
            <Image source={{ uri: photoSrc }} style={styles.empPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.empInitialsCircle}>
              <Text style={styles.empInitialsText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.empName}>{employee.full_name}</Text>
          {employee.job_title ? (
            <Text style={styles.empJobTitle}>{employee.job_title}</Text>
          ) : null}
        </View>

        {/* ⑤ Security Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerSecure}>Secure payment via SnapTip</Text>
          <Text style={styles.footerUrl}>snaptip.me/{employee.username}</Text>
        </View>

      </View>
    );
  }
);

PrintableQRCard.displayName = 'PrintableQRCard';

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // ① Business
  bizSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  bizLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: LIGHT_BORDER,
  },
  bizPill: {
    backgroundColor: '#f0f0ff',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  bizPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  snapPill: {
    backgroundColor: '#f5f5ff',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  snapPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  // ② CTA
  ctaSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },
  ctaMain: {
    fontSize: 22,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  // ③ QR
  qrWrapper: {
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  // ④ Employee
  empSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  empPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: LIGHT_BORDER,
  },
  empInitialsCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empInitialsText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginTop: 8,
    textAlign: 'center',
  },
  empJobTitle: {
    fontSize: 12,
    color: GRAY,
    marginTop: 2,
    textAlign: 'center',
  },
  // ⑤ Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 16,
    paddingTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  footerSecure: {
    fontSize: 11,
    color: '#bbbbbb',
    textAlign: 'center',
  },
  footerUrl: {
    fontSize: 11,
    color: ACCENT,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default PrintableQRCard;
