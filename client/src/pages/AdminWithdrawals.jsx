import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Copy } from 'lucide-react';
import { clearAdminToken } from './AdminLogin';

const ACCENT = '#00ffcc';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const RED = '#ef4444';
const BLUE = '#5ab2ff';
const BG = '#0B0F14';
const PANEL = '#0f151c';
const PANEL_2 = '#111a23';
const BORDER = 'rgba(255,255,255,.08)';

const COUNTRY_CODES = {
  Morocco: 'MA',
  'United States': 'US',
  France: 'FR',
  Spain: 'ES',
  Germany: 'DE',
  Italy: 'IT',
  UAE: 'AE',
  'United Arab Emirates': 'AE',
  Philippines: 'PH',
  Indonesia: 'ID',
  Thailand: 'TH',
  'United Kingdom': 'GB',
  Netherlands: 'NL',
  Portugal: 'PT',
  Belgium: 'BE',
  Austria: 'AT',
  Ireland: 'IE',
  Poland: 'PL',
  Sweden: 'SE',
  Switzerland: 'CH',
  Denmark: 'DK',
  Norway: 'NO',
  Finland: 'FI',
  Singapore: 'SG',
  Japan: 'JP',
  'Hong Kong': 'HK',
  Malaysia: 'MY',
  Canada: 'CA',
  Mexico: 'MX',
  Australia: 'AU',
  'New Zealand': 'NZ',
};

const ISO_TO_COUNTRY = Object.fromEntries(
  Object.entries(COUNTRY_CODES).map(([name, code]) => [code, name])
);

const DRAWER_NOTE_SUGGESTIONS = [
  'Bank details verified.',
  'Transfer initiated via Wise.',
  'Waiting for Wise confirmation.',
  'Contacted employee to confirm payout details.',
  'Payout requires manual review.',
];

const PAID_NOTE_SUGGESTIONS = [
  'Wise transfer sent successfully.',
  'Marked as paid after Wise transfer was completed.',
  'Payment receipt confirmed.',
  'Manual payout completed.',
];

const REJECT_NOTE_SUGGESTIONS = [
  'Bank details are incorrect.',
  'Account holder name does not match.',
  'Payout details are incomplete.',
  'Rejected after admin review.',
  'Employee must update bank details and request again.',
];

function api() {
  return axios.create({ baseURL: '/api/admin', withCredentials: true });
}

function fmtDate(value) {
  return value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not set';
}

function fmtMoney(amount, currency = 'USD') {
  return `${Number(amount || 0).toFixed(2)} ${currency || ''}`.trim();
}

function countryCodeFor(withdrawal) {
  const raw = withdrawal?.country_code || withdrawal?.country;
  return COUNTRY_CODES[raw] || raw || '??';
}

function CountryFlag({ code, size = 22 }) {
  const iso = String(code || '').toLowerCase();
  if (!iso || iso === '??') {
    return (
      <span
        style={{
          width: size,
          height: Math.round(size * 0.72),
          borderRadius: 4,
          background: 'rgba(255,255,255,.1)',
          display: 'inline-block',
        }}
      />
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${iso}.svg`}
      alt={iso.toUpperCase()}
      width={size}
      height={Math.round(size * 0.72)}
      loading="lazy"
      style={{
        width: size,
        height: Math.round(size * 0.72),
        borderRadius: 4,
        objectFit: 'cover',
        boxShadow: '0 0 0 1px rgba(255,255,255,.14)',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

function CountryBadge({ withdrawal, large = false, codeOverride }) {
  const code = codeOverride || countryCodeFor(withdrawal);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: 'rgba(255,255,255,.06)',
        border: `1px solid ${BORDER}`,
        borderRadius: large ? 10 : 8,
        padding: large ? '6px 10px' : '5px 8px',
        color: 'rgba(255,255,255,.75)',
        fontSize: large ? 13 : 12,
        fontWeight: 800,
      }}
    >
      <CountryFlag code={code} size={large ? 22 : 18} />
      {code}
    </span>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || 'pending').toLowerCase();
  const map = {
    pending: { label: 'Pending', bg: 'rgba(245,158,11,.14)', border: 'rgba(245,158,11,.28)', color: YELLOW },
    processing: { label: 'Processing', bg: 'rgba(90,178,255,.14)', border: 'rgba(90,178,255,.28)', color: BLUE },
    paid: { label: 'Paid', bg: 'rgba(0,200,150,.14)', border: 'rgba(0,200,150,.28)', color: GREEN },
    completed: { label: 'Paid', bg: 'rgba(0,200,150,.14)', border: 'rgba(0,200,150,.28)', color: GREEN },
    rejected: { label: 'Rejected', bg: 'rgba(239,68,68,.14)', border: 'rgba(239,68,68,.28)', color: RED },
    failed: { label: 'Failed', bg: 'rgba(239,68,68,.14)', border: 'rgba(239,68,68,.28)', color: RED },
  };
  const config = map[normalized] || map.pending;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        borderRadius: 9,
        padding: '6px 10px',
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}

function Button({ children, onClick, variant = 'neutral', small = false, disabled = false, style, title }) {
  const variants = {
    neutral: { bg: 'rgba(255,255,255,.07)', border: BORDER, color: 'rgba(255,255,255,.78)' },
    green: { bg: GREEN, border: GREEN, color: '#06120f' },
    greenSoft: { bg: 'rgba(0,200,150,.12)', border: 'rgba(0,200,150,.28)', color: GREEN },
    red: { bg: RED, border: RED, color: '#fff' },
    redSoft: { bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.28)', color: RED },
    blueSoft: { bg: 'rgba(90,178,255,.12)', border: 'rgba(90,178,255,.28)', color: BLUE },
  };
  const config = variants[variant] || variants.neutral;

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        height: small ? 34 : 40,
        padding: small ? '0 12px' : '0 16px',
        borderRadius: small ? 9 : 11,
        border: `1px solid ${config.border}`,
        background: config.bg,
        color: config.color,
        fontSize: small ? 12 : 13,
        fontWeight: 850,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function parseDetails(details) {
  if (!details) return {};
  if (typeof details === 'object') return details;
  try {
    return JSON.parse(details);
  } catch (_) {
    return { raw: details };
  }
}

function toNumber(value, fallback = 0) {
  return Number(value ?? fallback ?? 0);
}

function fmtUsd(amount) {
  const numeric = Number(amount);
  return Number.isFinite(numeric) ? `$${numeric.toFixed(2)}` : '-';
}

function fmtRate(rate, currency) {
  const numeric = Number(rate);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Rate unavailable';
  const cleanRate = numeric.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return `1 USD = ${cleanRate} ${currency || ''}`.trim();
}

function appendNote(existing, addition) {
  const current = String(existing || '').trim();
  const next = String(addition || '').trim();
  if (!next) return current;
  if (!current) return next;
  if (current.split('\n').map((line) => line.trim()).includes(next)) return current;
  return `${current}\n${next}`;
}

function maskVisibleValue(value, label = '') {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const lower = label.toLowerCase();
  if (raw.includes('*') || raw.includes('•')) return raw.replace(/\*/g, '•');
  if (lower.includes('email')) {
    const [name, domain] = raw.split('@');
    return domain ? `${(name || '').slice(0, 1)}***@${domain}` : 'Hidden';
  }
  if (lower.includes('phone')) {
    const compact = raw.replace(/\s+/g, '');
    return compact.length > 6 ? `${compact.slice(0, 4)}••••${compact.slice(-3)}` : 'Hidden';
  }
  if (lower.includes('address')) return 'Saved - reveal to view';
  const compact = raw.replace(/\s+/g, '');
  if (lower.includes('iban') && compact.length > 8) {
    return `${compact.slice(0, 2)}••••••••••••${compact.slice(-4)}`;
  }
  return compact.length > 4 ? `••••••••${compact.slice(-4)}` : 'Hidden';
}

function lastFour(value) {
  const digits = String(value || '').replace(/\s+/g, '');
  return digits ? digits.slice(-4) : '----';
}

export default function WithdrawalsSectionPro({ showToast, onLogout, onUpdate }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [usdSummary, setUsdSummary] = useState({ totalPendingPayoutsUsd: 0, totalPaidThisMonthUsd: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [revealedDetails, setRevealedDetails] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [paidDialog, setPaidDialog] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);

  const fetchWithdrawals = useCallback(() => {
    setLoading(true);
    api()
      .get('/withdrawals')
      .then((response) => {
        setWithdrawals(response.data.withdrawals || []);
        setUsdSummary(response.data.usdSummary || { totalPendingPayoutsUsd: 0, totalPaidThisMonthUsd: 0 });
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          clearAdminToken();
          onLogout();
        }
      })
      .finally(() => setLoading(false));
  }, [onLogout]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const employeeName = (withdrawal) => String(withdrawal?.full_name || withdrawal?.employee_name || 'Unknown employee').trim();
  const employeeHandle = (withdrawal) => (withdrawal?.username ? `@${withdrawal.username}` : '@employee');
  const employeeInitial = (withdrawal) => (employeeName(withdrawal)[0] || '?').toUpperCase();
  const employeeEmail = (withdrawal) => String(withdrawal?.email || withdrawal?.contact_email || '').trim();
  const statusKey = (withdrawal) => String(withdrawal?.status || withdrawal?.payout_status || 'pending').toLowerCase();
  const visibleStatus = (withdrawal) => (statusKey(withdrawal) === 'completed' ? 'paid' : statusKey(withdrawal));
  const methodRaw = (withdrawal) => String(withdrawal?.payout_method || withdrawal?.method || 'wise_manual').toLowerCase();
  const isStripe = (withdrawal) => methodRaw(withdrawal).includes('stripe');
  const isWise = (withdrawal) => !isStripe(withdrawal);
  const isPending = (withdrawal) => statusKey(withdrawal) === 'pending';
  const isManualPending = (withdrawal) => isWise(withdrawal) && isPending(withdrawal);
  const methodLabel = (withdrawal) => (isStripe(withdrawal) ? 'Stripe Connect' : 'Wise Manual');
  const grossRequested = (withdrawal) => toNumber(withdrawal?.gross_requested_amount, withdrawal?.amount);
  const feeAmount = (withdrawal) => toNumber(withdrawal?.platform_fee_amount, withdrawal?.fee);
  const netPayout = (withdrawal) =>
    toNumber(withdrawal?.net_payout_amount, withdrawal?.net_amount ?? Math.max(0, grossRequested(withdrawal) - feeAmount(withdrawal)));
  const netPayoutUsd = (withdrawal) => {
    const amount = Number(withdrawal?.net_payout_usd);
    return Number.isFinite(amount) ? amount : null;
  };
  const exchangeRateUsed = (withdrawal) => {
    const rate = Number(withdrawal?.withdrawal_exchange_rate_used);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  };
  const grossEarned = (withdrawal) => toNumber(withdrawal?.gross_earned, withdrawal?.total_earned);
  const availableBalance = (withdrawal) => toNumber(withdrawal?.net_balance, withdrawal?.available_balance ?? withdrawal?.balance);

  const closeDetail = () => {
    setDetail(null);
    setAdminNotes('');
    setRevealedDetails(null);
    setRevealing(false);
  };

  const getPayoutDetails = useCallback(
    (withdrawal) => {
      const revealed = withdrawal?.id && revealedDetails?.withdrawalId === withdrawal.id ? revealedDetails : null;
      const payoutDetails = revealed || withdrawal?.employee?.payout_details || withdrawal?.payout_details || {};
      const masked = payoutDetails.masked || {};
      const accountDetails = parseDetails(withdrawal?.employee?.account_details ?? withdrawal?.account_details);

      return {
        bankName: payoutDetails.bankName || accountDetails.bankName || accountDetails.bank_name || accountDetails.bank || accountDetails.Bank || '-',
        accountHolder:
          payoutDetails.accountHolderName ||
          payoutDetails.accountHolderNameEn ||
          accountDetails.fullName ||
          accountDetails.full_name ||
          accountDetails.accountHolder ||
          accountDetails.account_holder ||
          accountDetails.recipientName ||
          withdrawal?.full_name ||
          '-',
        accountNumber:
          payoutDetails.ribNumber ||
          payoutDetails.iban ||
          payoutDetails.accountNumber ||
          masked.ribNumber ||
          masked.iban ||
          masked.accountNumber ||
          accountDetails.accountNumber ||
          accountDetails.account_number ||
          accountDetails.rib ||
          accountDetails.RIB ||
          accountDetails.iban ||
          accountDetails.IBAN ||
          '-',
        email: payoutDetails.contactEmail || masked.contactEmail || accountDetails.contactEmail || accountDetails.email || withdrawal?.email || '-',
        phone:
          payoutDetails.phoneNumber ||
          masked.phoneNumber ||
          accountDetails.phone ||
          accountDetails.phoneNumber ||
          accountDetails.contactPhone ||
          withdrawal?.contact_phone ||
          '-',
        address: payoutDetails.address || masked.address || accountDetails.address || '-',
        country: payoutDetails.countryCode || countryCodeFor(withdrawal),
        currency: payoutDetails.currency || withdrawal?.currency || '-',
        revealed: Boolean(revealed),
      };
    },
    [revealedDetails]
  );

  const methodBadgeStyle = (withdrawal) =>
    isStripe(withdrawal)
      ? { bg: 'rgba(124,92,255,.16)', border: 'rgba(124,92,255,.30)', color: '#b8a7ff' }
      : { bg: 'rgba(0,200,150,.13)', border: 'rgba(0,200,150,.30)', color: GREEN };

  const openDetail = (withdrawal) => {
    setDetail(withdrawal);
    setAdminNotes(withdrawal?.admin_note || '');
    setRevealedDetails(null);
    setRevealing(false);
  };

  const saveNoteValue = useCallback(
    async (withdrawalId, note) => {
      await api().patch(`/withdrawals/${withdrawalId}/note`, { note: note || '' });
    },
    []
  );

  const copyText = useCallback(
    async (value, blockedMessage) => {
      if (blockedMessage) {
        showToast(blockedMessage, 'error');
        return false;
      }
      const text = String(value || '').trim();
      if (!text || text === '-') return false;
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
        return true;
      } catch (_) {
        showToast('Could not copy. Please copy manually.', 'error');
        return false;
      }
    },
    [showToast]
  );

  const buildPayoutSummary = useCallback(
    (withdrawal) => {
      const details = getPayoutDetails(withdrawal);
      const lines = [
        'SnapTip Manual Payout',
        `Employee: ${employeeName(withdrawal)}`,
        `Country: ${withdrawal.country || ISO_TO_COUNTRY[details.country] || 'Country'} (${details.country})`,
        `Currency: ${withdrawal.currency || details.currency}`,
        `Method: ${methodLabel(withdrawal)}`,
        `Gross amount: ${fmtMoney(grossRequested(withdrawal), withdrawal.currency)}`,
        `SnapTip fee: ${fmtMoney(feeAmount(withdrawal), withdrawal.currency)}`,
        `Net payout: ${fmtMoney(netPayout(withdrawal), withdrawal.currency)}`,
        `Net payout USD: ${fmtUsd(netPayoutUsd(withdrawal))}`,
        `Exchange rate: ${fmtRate(exchangeRateUsed(withdrawal), withdrawal.currency)}`,
        '',
        `Bank name: ${details.bankName}`,
        `Account holder: ${details.accountHolder}`,
      ];

      if (details.revealed) {
        lines.push(`RIB / Account number: ${details.accountNumber}`);
        lines.push(`Contact email: ${details.email}`);
        lines.push(`Phone: ${details.phone}`);
        if (details.address && details.address !== '-') {
          lines.push(`Address: ${details.address}`);
        }
      }

      return lines.join('\n');
    },
    [exchangeRateUsed, feeAmount, getPayoutDetails, grossRequested, netPayout, netPayoutUsd]
  );

  const revealPayoutDetails = async () => {
    if (!detail) return;
    setRevealing(true);
    try {
      const response = await api().get(`/withdrawals/${detail.id}/payout-details`);
      setRevealedDetails({ ...response.data.details, withdrawalId: detail.id });
      showToast('Full payout details revealed');
    } catch (error) {
      showToast(error.response?.data?.error || 'Could not reveal payout details', 'error');
    }
    setRevealing(false);
  };

  const handleSaveNote = async () => {
    if (!detail) return;
    try {
      await saveNoteValue(detail.id, adminNotes);
      setDetail({ ...detail, admin_note: adminNotes });
      showToast('Internal note saved');
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to save note', 'error');
    }
  };

  const openPaidDialog = (withdrawal) => {
    setPaidDialog({
      withdrawal,
      note: detail?.id === withdrawal.id ? adminNotes : withdrawal?.admin_note || '',
      confirmed: false,
    });
  };

  const openRejectDialog = (withdrawal) => {
    setRejectDialog({
      withdrawal,
      reason: '',
    });
  };

  const handleConfirmPaid = async () => {
    if (!paidDialog?.withdrawal) return;
    const withdrawal = paidDialog.withdrawal;
    setActionId(withdrawal.id);

    try {
      if (String(paidDialog.note || '').trim() !== String(withdrawal.admin_note || '').trim()) {
        await saveNoteValue(withdrawal.id, paidDialog.note);
      }
      await api().patch(`/withdrawals/${withdrawal.id}/status`);
      showToast('Withdrawal marked as paid.');
      setPaidDialog(null);
      closeDetail();
      fetchWithdrawals();
      onUpdate?.();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to mark withdrawal as paid', 'error');
    }

    setActionId(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectDialog?.withdrawal) return;
    const withdrawal = rejectDialog.withdrawal;
    const reason = String(rejectDialog.reason || '').trim();
    if (!reason) {
      showToast('Please add a rejection reason', 'error');
      return;
    }

    setActionId(withdrawal.id);
    try {
      const mergedNote = appendNote(withdrawal.admin_note || (detail?.id === withdrawal.id ? adminNotes : ''), reason);
      await saveNoteValue(withdrawal.id, mergedNote);
      await api().patch(`/withdrawals/${withdrawal.id}/reject`, { reason });
      showToast('Withdrawal rejected.');
      setRejectDialog(null);
      closeDetail();
      fetchWithdrawals();
      onUpdate?.();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to reject withdrawal', 'error');
    }

    setActionId(null);
  };

  const countries = useMemo(
    () => ['all', ...new Set(withdrawals.map(countryCodeFor).filter(Boolean).sort())],
    [withdrawals]
  );

  const filtered = useMemo(() => {
    let list = withdrawals;

    if (filter === 'paid') list = list.filter((withdrawal) => ['paid', 'completed'].includes(statusKey(withdrawal)));
    else if (filter !== 'all') list = list.filter((withdrawal) => statusKey(withdrawal) === filter);

    if (methodFilter === 'wise_manual') list = list.filter(isWise);
    if (methodFilter === 'stripe_connect') list = list.filter(isStripe);
    if (countryFilter !== 'all') list = list.filter((withdrawal) => countryCodeFor(withdrawal) === countryFilter);

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      list = list.filter((withdrawal) =>
        [
          employeeName(withdrawal),
          withdrawal.username,
          withdrawal.email,
          withdrawal.country,
          withdrawal.currency,
          withdrawal.method,
          withdrawal.payout_method,
        ].some((value) => String(value || '').toLowerCase().includes(query))
      );
    }

    const rank = { pending: 0, processing: 1, failed: 2, rejected: 3, paid: 4, completed: 4 };
    return [...list].sort((a, b) => {
      const delta = (rank[statusKey(a)] ?? 9) - (rank[statusKey(b)] ?? 9);
      if (delta) return delta;
      if (isManualPending(a) !== isManualPending(b)) return isManualPending(a) ? -1 : 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [countryFilter, filter, methodFilter, search, withdrawals]);

  const summary = useMemo(() => {
    const pending = withdrawals.filter(isPending);
    const manualPending = pending.filter(isWise);
    const rejected = withdrawals.filter((withdrawal) => ['rejected', 'failed'].includes(statusKey(withdrawal)));
    const paidToday = withdrawals.filter((withdrawal) => {
      if (!['paid', 'completed'].includes(statusKey(withdrawal))) return false;
      const date = new Date(withdrawal.processed_at || withdrawal.updated_at || withdrawal.created_at || 0);
      return date.toDateString() === new Date().toDateString();
    });
    const currencies = new Set(pending.map((withdrawal) => withdrawal.currency).filter(Boolean));
    const pendingCurrency = currencies.size === 1 ? [...currencies][0] : 'mixed';
    const pendingTotal = pending.reduce((sum, withdrawal) => sum + grossRequested(withdrawal), 0);
    const pendingUsdFallback = pending.reduce((sum, withdrawal) => sum + (netPayoutUsd(withdrawal) || 0), 0);
    const paidMonthFallback = withdrawals
      .filter((withdrawal) => {
        if (!['paid', 'completed'].includes(statusKey(withdrawal))) return false;
        const date = new Date(withdrawal.processed_at || withdrawal.created_at || 0);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, withdrawal) => sum + (netPayoutUsd(withdrawal) || 0), 0);
    return {
      pending,
      manualPending,
      rejected,
      paidToday,
      pendingCurrency,
      pendingTotal,
      pendingUsdTotal: toNumber(usdSummary.totalPendingPayoutsUsd, pendingUsdFallback),
      paidMonthUsdTotal: toNumber(usdSummary.totalPaidThisMonthUsd, paidMonthFallback),
    };
  }, [usdSummary, withdrawals]);

  const exportWiseCSV = () => {
    const pending = withdrawals.filter(isManualPending);
    if (!pending.length) {
      showToast('No pending Wise Manual withdrawals to export', 'error');
      return;
    }

    const rows = pending.map((withdrawal) => {
      const payout = getPayoutDetails(withdrawal);
      return [
        employeeName(withdrawal),
        withdrawal.currency,
        Number(netPayout(withdrawal)).toFixed(2),
        netPayoutUsd(withdrawal) === null ? '' : Number(netPayoutUsd(withdrawal)).toFixed(2),
        exchangeRateUsed(withdrawal) || '',
        payout.bankName,
        payout.accountHolder,
        maskVisibleValue(payout.accountNumber, 'account'),
        maskVisibleValue(payout.email, 'email'),
        employeeHandle(withdrawal),
      ]
        .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
        .join(',');
    });

    const csv = [
      'employee,currency,net_payout_local,net_payout_usd,exchange_rate_used,bank_name,account_holder,account_or_rib,contact_email,reference',
      ...rows,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wise_manual_payouts_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${pending.length} Wise Manual payout${pending.length !== 1 ? 's' : ''}`);
  };

  const FilterChip = ({ value, label }) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      style={{
        height: 40,
        border: `1px solid ${filter === value ? 'rgba(0,255,204,.35)' : BORDER}`,
        background: filter === value ? 'rgba(0,200,150,.16)' : 'rgba(255,255,255,.045)',
        color: filter === value ? ACCENT : 'rgba(255,255,255,.68)',
        borderRadius: 10,
        padding: '0 16px',
        fontSize: 13,
        fontWeight: 850,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  const SummaryCard = ({ title, value, sub, color = ACCENT }) => (
    <div
      className="withdrawals-stat"
      style={{
        background: `linear-gradient(145deg,${PANEL_2},${PANEL})`,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
        minHeight: 96,
        boxShadow: '0 18px 40px rgba(0,0,0,.22)',
      }}
    >
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,.48)', fontWeight: 750, marginBottom: 8 }}>{title}</p>
      <div style={{ fontSize: 24, fontWeight: 950, color: '#fff', lineHeight: 1 }}>{value}</div>
      <p style={{ fontSize: 12, color, marginTop: 9, fontWeight: 750 }}>{sub}</p>
    </div>
  );

  const MethodBadge = ({ withdrawal }) => {
    const style = methodBadgeStyle(withdrawal);
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color,
          borderRadius: 9,
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 850,
          whiteSpace: 'nowrap',
        }}
      >
        {methodLabel(withdrawal)}
      </span>
    );
  };

  const NoteChip = ({ text, onSelect, tone = 'default' }) => {
    const palette =
      tone === 'danger'
        ? { bg: 'rgba(239,68,68,.10)', border: 'rgba(239,68,68,.20)', color: '#ffb4b4' }
        : tone === 'success'
          ? { bg: 'rgba(0,200,150,.10)', border: 'rgba(0,200,150,.20)', color: '#9ef0dc' }
          : { bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.72)' };

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(text);
        }}
        style={{
          border: `1px solid ${palette.border}`,
          background: palette.bg,
          color: palette.color,
          borderRadius: 999,
          padding: '7px 10px',
          fontSize: 11,
          fontWeight: 800,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {text}
      </button>
    );
  };

  const MoneyCell = ({ label, value, currency, color = '#fff', muted = false, copyValueText }) => (
    <div
      style={{
        background: 'rgba(255,255,255,.035)',
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 13,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
          <div style={{ fontSize: 14, color: muted ? 'rgba(255,255,255,.62)' : color, fontWeight: 850, marginTop: 5, wordBreak: 'break-word' }}>
            {fmtMoney(value, currency)}
          </div>
        </div>
        {copyValueText ? (
          <CopyButton
            title={`Copy ${label}`}
            onClick={() => copyText(copyValueText)}
          />
        ) : null}
      </div>
    </div>
  );

  const CopyButton = ({ onClick, title, blockedMessage }) => {
    const muted = Boolean(blockedMessage);
    return (
      <button
        type="button"
        title={blockedMessage || title}
        aria-disabled={muted}
        onClick={(event) => {
          event.stopPropagation();
          if (blockedMessage) {
            showToast(blockedMessage, 'error');
            return;
          }
          onClick?.();
        }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          border: `1px solid ${muted ? 'rgba(255,255,255,.08)' : 'rgba(0,200,150,.28)'}`,
          background: muted ? 'rgba(255,255,255,.04)' : 'rgba(0,200,150,.10)',
          color: muted ? 'rgba(255,255,255,.25)' : GREEN,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Copy size={14} />
      </button>
    );
  };

  const DetailField = ({ label, value, sensitive = false, allowCopy = false, wide = false }) => {
    const details = getPayoutDetails(detail);
    const blockedMessage = sensitive && !details.revealed ? 'Reveal full details to copy' : '';
    const display = sensitive && !details.revealed ? maskVisibleValue(value, label) : String(value || '-').replace(/\*/g, '•');

    return (
      <div
        style={{
          background: 'rgba(255,255,255,.035)',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 13,
          gridColumn: wide ? '1 / -1' : 'auto',
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.42)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 750, wordBreak: 'break-word', minWidth: 0 }}>
            {display || '-'}
          </span>
          {allowCopy ? (
            <CopyButton
              title={`Copy ${label}`}
              blockedMessage={blockedMessage}
              onClick={() => copyText(value)}
            />
          ) : null}
        </div>
      </div>
    );
  };

  const ConfirmDialog = () => {
    if (!paidDialog && !rejectDialog) return null;

    if (paidDialog) {
      const withdrawal = paidDialog.withdrawal;
      const payout = getPayoutDetails(withdrawal);
      const accountTail = lastFour(payout.accountNumber);

      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#101820', border: `1px solid ${BORDER}`, borderRadius: 20, width: 'min(640px,100%)', maxHeight: 'calc(100vh - 48px)', boxShadow: '0 24px 80px rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 18px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <p style={{ fontSize: 18, fontWeight: 950, color: '#fff', marginBottom: 8 }}>Confirm Mark as Paid</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.58)', lineHeight: 1.55 }}>
                Confirm this manual payout has been sent to the correct bank details.
              </p>
            </div>

            <div style={{ padding: '18px 24px 24px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, minHeight: 0 }}>
              <div className="withdrawals-dialog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
                <DetailField label="Employee" value={employeeName(withdrawal)} />
                <DetailField label="Country" value={`${withdrawal.country || ISO_TO_COUNTRY[payout.country] || 'Country'} (${payout.country})`} />
                <DetailField label="Payout method" value={methodLabel(withdrawal)} />
                <DetailField label="Bank name" value={payout.bankName} allowCopy />
                <DetailField label="Gross withdrawal" value={fmtMoney(grossRequested(withdrawal), withdrawal.currency)} />
                <DetailField label="SnapTip fee" value={fmtMoney(feeAmount(withdrawal), withdrawal.currency)} />
                <DetailField label="Net payout" value={fmtMoney(netPayout(withdrawal), withdrawal.currency)} allowCopy />
                <DetailField label="Net payout USD" value={fmtUsd(netPayoutUsd(withdrawal))} allowCopy />
                <DetailField label="Exchange rate" value={fmtRate(exchangeRateUsed(withdrawal), withdrawal.currency)} />
                <DetailField label="Account last 4" value={accountTail} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.58)', fontWeight: 800, marginBottom: 10 }}>Internal note</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {PAID_NOTE_SUGGESTIONS.map((text) => (
                    <NoteChip
                      key={text}
                      text={text}
                      tone="success"
                      onSelect={(value) => setPaidDialog((current) => ({ ...current, note: appendNote(current.note, value) }))}
                    />
                  ))}
                </div>
                <textarea
                  value={paidDialog.note}
                  onChange={(event) => setPaidDialog((current) => ({ ...current, note: event.target.value }))}
                  rows={4}
                  placeholder="Add a payout processing note..."
                  style={{ width: '100%', resize: 'vertical', background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, borderRadius: 12, color: '#fff', padding: 12, outline: 'none', fontSize: 13 }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', paddingBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={paidDialog.confirmed}
                  onChange={(event) => setPaidDialog((current) => ({ ...current, confirmed: event.target.checked }))}
                  style={{ marginTop: 2 }}
                />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.76)', lineHeight: 1.5 }}>
                  I confirm the Wise transfer has been sent to the correct bank details.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: '#101820' }}>
              <Button onClick={() => setPaidDialog(null)}>Cancel</Button>
              <Button variant="green" disabled={!paidDialog.confirmed || actionId === withdrawal.id} onClick={handleConfirmPaid}>
                Confirm Mark as Paid
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const withdrawal = rejectDialog.withdrawal;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#101820', border: `1px solid ${BORDER}`, borderRadius: 20, width: 'min(640px,100%)', maxHeight: 'calc(100vh - 48px)', boxShadow: '0 24px 80px rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px 18px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 950, color: '#fff', marginBottom: 8 }}>Reject Withdrawal</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.58)', lineHeight: 1.55 }}>
              Rejected withdrawals may return funds to the employee balance depending on current backend logic.
            </p>
          </div>

          <div style={{ padding: '18px 24px 24px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, minHeight: 0 }}>
            <div className="withdrawals-dialog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
              <DetailField label="Employee" value={employeeName(withdrawal)} />
              <DetailField label="Status" value={visibleStatus(withdrawal)} />
              <DetailField label="Requested amount" value={fmtMoney(grossRequested(withdrawal), withdrawal.currency)} />
              <DetailField label="Net payout" value={fmtMoney(netPayout(withdrawal), withdrawal.currency)} />
              <DetailField label="Method" value={methodLabel(withdrawal)} />
              <DetailField label="Ticket" value={`#${withdrawal.id}`} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.58)', fontWeight: 800, marginBottom: 10 }}>Reject reason</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {REJECT_NOTE_SUGGESTIONS.map((text) => (
                  <NoteChip
                    key={text}
                    text={text}
                    tone="danger"
                    onSelect={(value) => setRejectDialog((current) => ({ ...current, reason: appendNote(current.reason, value) }))}
                  />
                ))}
              </div>
              <textarea
                value={rejectDialog.reason}
                onChange={(event) => setRejectDialog((current) => ({ ...current, reason: event.target.value }))}
                rows={4}
                placeholder="Add the rejection reason sent to the employee..."
                style={{ width: '100%', resize: 'vertical', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, color: '#fff', padding: 12, outline: 'none', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: '#101820' }}>
            <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="red"
              disabled={!String(rejectDialog.reason || '').trim() || actionId === withdrawal.id}
              onClick={handleConfirmReject}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const DetailDrawer = () => {
    if (!detail) return null;

    const payout = getPayoutDetails(detail);
    const country = countryCodeFor(detail);
    const stripeId = detail.stripe_account_id
      ? `${String(detail.stripe_account_id).slice(0, 10)}...${String(detail.stripe_account_id).slice(-4)}`
      : 'Not linked';
    const transferId = detail.stripe_transfer_id
      ? `${String(detail.stripe_transfer_id).slice(0, 10)}...${String(detail.stripe_transfer_id).slice(-4)}`
      : 'Not created';
    const canReveal = isWise(detail);
    const summaryText = buildPayoutSummary(detail);

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(3,7,12,.68)', display: 'flex', justifyContent: 'flex-end' }} onClick={closeDetail}>
        <aside
          onClick={(event) => event.stopPropagation()}
          style={{
            width: 'min(760px,calc(100vw - 24px))',
            maxWidth: '100vw',
            height: '100vh',
            background: '#0d141b',
            borderLeft: `1px solid ${BORDER}`,
            boxShadow: '-30px 0 90px rgba(0,0,0,.52)',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              background: 'rgba(13,20,27,.96)',
              backdropFilter: 'blur(18px)',
              borderBottom: `1px solid ${BORDER}`,
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <p style={{ fontSize: 18, fontWeight: 950, color: '#fff' }}>Payout Details</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <CountryBadge codeOverride={country} large />
                <MethodBadge withdrawal={detail} />
                <StatusBadge status={visibleStatus(detail)} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.42)' }}>Ticket #{detail.id}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDetail}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                background: 'rgba(255,255,255,.05)',
                color: 'rgba(255,255,255,.65)',
                cursor: 'pointer',
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          <div style={{ padding: 22, display: 'grid', gap: 16 }}>
            <section style={{ background: 'linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025))', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'rgba(0,255,204,.13)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 0 1px rgba(255,255,255,.12)',
                  }}
                >
                  {detail.photo_base64 || detail.profile_image_url ? (
                    <img src={detail.photo_base64 || detail.profile_image_url} alt="" style={{ width: 58, height: 58, objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 950, color: ACCENT }}>{employeeInitial(detail)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ fontSize: 18, color: '#fff', fontWeight: 950, marginBottom: 3 }}>{employeeName(detail)}</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,.48)', marginBottom: 9 }}>
                    {employeeHandle(detail)}
                    {employeeEmail(detail) ? ` - ${employeeEmail(detail)}` : ''}
                  </p>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)' }}>
                    {detail.country || ISO_TO_COUNTRY[country] || 'Country'} - {detail.currency || payout.currency}
                  </div>
                </div>
              </div>
            </section>

            <section style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
              <h3 style={{ fontSize: 14, color: '#fff', fontWeight: 950, marginBottom: 14 }}>Financial Summary</h3>
              <div className="withdrawals-drawer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                <MoneyCell label="Gross request" value={grossRequested(detail)} currency={detail.currency} />
                <MoneyCell label="SnapTip fee" value={feeAmount(detail)} currency={detail.currency} color={YELLOW} />
                <MoneyCell label="Net payout" value={netPayout(detail)} currency={detail.currency} color={GREEN} copyValueText={fmtMoney(netPayout(detail), detail.currency)} />
                <DetailField label="Net payout USD" value={fmtUsd(netPayoutUsd(detail))} allowCopy />
                <DetailField label="Exchange rate" value={fmtRate(exchangeRateUsed(detail), detail.currency)} />
                <MoneyCell label="Available balance" value={availableBalance(detail)} currency={detail.currency} muted />
                <div style={{ background: 'rgba(255,255,255,.035)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 13 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.4 }}>Requested at</div>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 850, marginTop: 5 }}>{fmtDate(detail.created_at)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,.035)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 13 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.4 }}>Processed at</div>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 850, marginTop: 5 }}>{detail.processed_at ? fmtDate(detail.processed_at) : 'Not processed yet'}</div>
                </div>
              </div>
            </section>

            <section style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: 14, color: '#fff', fontWeight: 950 }}>Bank / Payout Details</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', marginTop: 3 }}>
                    {isWise(detail) ? 'Manual Wise transfer information' : 'Stripe Connect account summary'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {canReveal ? (
                    <Button small variant="greenSoft" onClick={revealPayoutDetails} disabled={revealing || payout.revealed}>
                      {payout.revealed ? 'Full details shown' : revealing ? 'Revealing...' : 'Reveal full details'}
                    </Button>
                  ) : null}
                  <Button
                    small
                    variant="blueSoft"
                    title={canReveal && !payout.revealed ? 'Reveal full details to copy' : 'Copy all payout details'}
                    onClick={() => copyText(summaryText, canReveal && !payout.revealed ? 'Reveal full details to copy' : '')}
                  >
                    Copy all payout details
                  </Button>
                </div>
              </div>

              {isWise(detail) ? (
                <div className="withdrawals-drawer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                  <DetailField label="Bank name" value={payout.bankName} allowCopy />
                  <DetailField label="Account holder" value={payout.accountHolder} allowCopy />
                  <DetailField label="RIB / Account / IBAN" value={payout.accountNumber} sensitive allowCopy wide />
                  <DetailField label="Contact email" value={payout.email} sensitive allowCopy />
                  <DetailField label="Phone" value={payout.phone} sensitive allowCopy />
                  <DetailField label="Address" value={payout.address} sensitive allowCopy wide />
                  <DetailField label="Country" value={`${payout.country} / ${detail.country || ISO_TO_COUNTRY[payout.country] || 'Country'}`} />
                  <DetailField label="Currency" value={payout.currency} />
                </div>
              ) : (
                <div className="withdrawals-drawer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                  <DetailField label="Stripe account" value={stripeId} allowCopy />
                  <DetailField label="Transfer id" value={transferId} allowCopy={Boolean(detail.stripe_transfer_id)} />
                  <DetailField label="Payout status" value={detail.payout_status || detail.status} />
                  <DetailField label="Method" value="Stripe Express" />
                </div>
              )}
            </section>

            <section style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, color: '#fff', fontWeight: 950 }}>Internal Notes</h3>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>Visible to admins only</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {DRAWER_NOTE_SUGGESTIONS.map((text) => (
                  <NoteChip key={text} text={text} onSelect={(value) => setAdminNotes((current) => appendNote(current, value))} />
                ))}
              </div>
              <textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                rows={5}
                placeholder="Add processing notes, Wise reference, or review context..."
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,.045)',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 13,
                  color: '#fff',
                  padding: 13,
                  outline: 'none',
                  fontSize: 13,
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <Button small variant="greenSoft" onClick={handleSaveNote}>
                  Save Note
                </Button>
              </div>
            </section>
          </div>

          <div
            style={{
              position: 'sticky',
              bottom: 0,
              background: 'rgba(13,20,27,.96)',
              backdropFilter: 'blur(18px)',
              borderTop: `1px solid ${BORDER}`,
              padding: 16,
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <Button onClick={closeDetail}>Close</Button>
            {isPending(detail) ? <Button variant="redSoft" onClick={() => openRejectDialog(detail)}>Reject</Button> : null}
            {isManualPending(detail) ? <Button variant="green" onClick={() => openPaidDialog(detail)}>Mark as Paid</Button> : null}
          </div>
        </aside>
      </div>
    );
  };

  return (
    <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 22, boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}>
      <style>{`
        @media(max-width:1200px){
          .withdrawals-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .withdrawals-toolbar{align-items:stretch!important}
          .withdrawals-search{min-width:100%!important}
        }
        @media(max-width:820px){
          .withdrawals-stats{grid-template-columns:1fr!important}
          .withdrawals-filters{gap:8px!important}
          .withdrawals-filters button,.withdrawals-filters select{flex:1 1 140px}
          .withdrawals-drawer-grid,.withdrawals-dialog-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      <ConfirmDialog />
      <DetailDrawer />

      <div className="withdrawals-toolbar" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 950, color: '#fff', letterSpacing: 0 }}>Manual Payouts</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.52)', marginTop: 6 }}>Review, verify, and process employee withdrawal requests.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="withdrawals-search" style={{ position: 'relative', minWidth: 340, flex: '1 1 340px' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.35)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, username, or email..."
              style={{ width: '100%', height: 46, background: '#111820', border: `1px solid ${BORDER}`, borderRadius: 12, color: '#fff', outline: 'none', padding: '0 14px 0 42px', fontSize: 14 }}
            />
          </div>
          <Button variant="greenSoft" onClick={exportWiseCSV} style={{ height: 46 }}>
            Export Wise CSV
          </Button>
        </div>
      </div>

      <div className="withdrawals-filters" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.64)', fontWeight: 850, marginRight: 2 }}>Status</span>
        <FilterChip value="all" label="All" />
        <FilterChip value="pending" label="Pending" />
        <FilterChip value="paid" label="Paid" />
        <FilterChip value="rejected" label="Rejected" />
        <FilterChip value="failed" label="Failed" />
        <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} style={{ height: 40, background: '#111820', border: `1px solid ${BORDER}`, borderRadius: 12, color: 'rgba(255,255,255,.78)', padding: '0 14px', fontSize: 13, fontWeight: 750, outline: 'none' }}>
          <option value="all" style={{ background: '#111820' }}>All methods</option>
          <option value="wise_manual" style={{ background: '#111820' }}>Wise Manual</option>
          <option value="stripe_connect" style={{ background: '#111820' }}>Stripe Connect</option>
        </select>
        <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} style={{ height: 40, background: '#111820', border: `1px solid ${BORDER}`, borderRadius: 12, color: 'rgba(255,255,255,.78)', padding: '0 14px', fontSize: 13, fontWeight: 750, outline: 'none' }}>
          {countries.map((country) => (
            <option key={country} value={country} style={{ background: '#111820' }}>
              {country === 'all' ? 'All countries' : country}
            </option>
          ))}
        </select>
        {filter !== 'all' || methodFilter !== 'all' || countryFilter !== 'all' || search ? (
          <Button small onClick={() => { setFilter('all'); setMethodFilter('all'); setCountryFilter('all'); setSearch(''); }}>
            Clear Filters
          </Button>
        ) : null}
      </div>

      <div className="withdrawals-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
        <SummaryCard title="Pending Requests" value={summary.pending.length} sub={`${summary.manualPending.length} Wise Manual`} color={YELLOW} />
        <SummaryCard title="Pending Payouts USD" value={fmtUsd(summary.pendingUsdTotal)} sub="Net amount to send" color={BLUE} />
        <SummaryCard title="Paid This Month USD" value={fmtUsd(summary.paidMonthUsdTotal)} sub="Net payouts marked paid" color={GREEN} />
        <SummaryCard
          title="Total Pending Amount"
          value={summary.pendingCurrency === 'mixed' ? Number(summary.pendingTotal || 0).toFixed(2) : fmtMoney(summary.pendingTotal, summary.pendingCurrency)}
          sub={summary.pendingCurrency === 'mixed' ? 'Mixed currencies' : 'Gross requests'}
          color="rgba(255,255,255,.48)"
        />
        <SummaryCard title="Paid Today" value={summary.paidToday.length} sub="Completed tickets" color={GREEN} />
        <SummaryCard title="Needs Attention" value={summary.rejected.length} sub="Rejected or failed" color={RED} />
      </div>

      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 18px 0' }}>
          <div>
            <h2 style={{ fontSize: 18, color: '#fff', fontWeight: 950 }}>Withdrawal Requests ({filtered.length})</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', marginTop: 4 }}>Pending manual payouts are sorted first.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,.48)' }}>Loading withdrawal requests...</div>
        ) : (
          <div style={{ overflow: 'auto', padding: 12 }}>
            <table style={{ minWidth: 1400, borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: 'none' }}>Employee</th>
                  <th style={{ borderBottom: 'none' }}>Country</th>
                  <th style={{ borderBottom: 'none' }}>Payout Method</th>
                  <th style={{ borderBottom: 'none' }}>Gross Earned</th>
                  <th style={{ borderBottom: 'none' }}>SnapTip Fee</th>
                  <th style={{ borderBottom: 'none' }}>Net Payout</th>
                  <th style={{ borderBottom: 'none' }}>USD Payout</th>
                  <th style={{ borderBottom: 'none' }}>Available Balance</th>
                  <th style={{ borderBottom: 'none' }}>Requested Amount</th>
                  <th style={{ borderBottom: 'none' }}>Status</th>
                  <th style={{ borderBottom: 'none' }}>Requested Date</th>
                  <th style={{ borderBottom: 'none', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((withdrawal) => {
                  const pendingManual = isManualPending(withdrawal);
                  const usdPayout = netPayoutUsd(withdrawal);
                  const rate = exchangeRateUsed(withdrawal);
                  return (
                    <tr
                      key={withdrawal.id}
                      onClick={() => openDetail(withdrawal)}
                      style={{
                        cursor: 'pointer',
                        background: pendingManual ? 'rgba(0,200,150,.075)' : 'rgba(255,255,255,.028)',
                        outline: pendingManual ? '1px solid rgba(0,200,150,.38)' : `1px solid ${BORDER}`,
                        boxShadow: pendingManual ? '0 0 0 1px rgba(0,200,150,.08), 0 12px 28px rgba(0,0,0,.18)' : 'none',
                      }}
                    >
                      <td style={{ borderBottom: 'none', padding: '13px 14px', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 220 }}>
                          <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', background: 'rgba(0,255,204,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {withdrawal.photo_base64 || withdrawal.profile_image_url ? (
                              <img src={withdrawal.photo_base64 || withdrawal.profile_image_url} alt="" style={{ width: 42, height: 42, objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: 15, fontWeight: 950, color: ACCENT }}>{employeeInitial(withdrawal)}</span>
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, color: '#fff', fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employeeName(withdrawal)}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', marginTop: 2 }}>{employeeHandle(withdrawal)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ borderBottom: 'none' }}>
                        <CountryBadge withdrawal={withdrawal} />
                      </td>
                      <td style={{ borderBottom: 'none' }}>
                        <MethodBadge withdrawal={withdrawal} />
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 6 }}>
                          {String(withdrawal.withdrawal_source || 'manual').replace(/_/g, ' ')}
                          {withdrawal.schedule_period_key ? ` - ${withdrawal.schedule_period_key}` : ''}
                        </div>
                      </td>
                      <td style={{ borderBottom: 'none' }}>{fmtMoney(grossEarned(withdrawal), withdrawal.currency)}</td>
                      <td style={{ borderBottom: 'none', color: YELLOW }}>{fmtMoney(feeAmount(withdrawal), withdrawal.currency)}</td>
                      <td style={{ borderBottom: 'none', color: GREEN }}>
                        <div style={{ fontWeight: 850 }}>{fmtMoney(netPayout(withdrawal), withdrawal.currency)}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', marginTop: 4 }}>
                          {usdPayout === null ? 'USD unavailable' : `≈ ${fmtUsd(usdPayout)}`}
                        </div>
                      </td>
                      <td style={{ borderBottom: 'none', color: BLUE }}>
                        <div style={{ fontWeight: 950 }}>{fmtUsd(usdPayout)}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.42)', marginTop: 4 }}>
                          {fmtRate(rate, withdrawal.currency)}
                        </div>
                      </td>
                      <td style={{ borderBottom: 'none', color: 'rgba(255,255,255,.72)' }}>{fmtMoney(availableBalance(withdrawal), withdrawal.currency)}</td>
                      <td style={{ borderBottom: 'none', color: '#fff', fontWeight: 800 }}>{fmtMoney(grossRequested(withdrawal), withdrawal.currency)}</td>
                      <td style={{ borderBottom: 'none' }}>
                        <StatusBadge status={visibleStatus(withdrawal)} />
                      </td>
                      <td style={{ borderBottom: 'none', fontSize: 12, color: 'rgba(255,255,255,.58)', whiteSpace: 'nowrap' }}>{fmtDate(withdrawal.created_at)}</td>
                      <td style={{ borderBottom: 'none', textAlign: 'right', borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <Button small onClick={() => openDetail(withdrawal)}>View</Button>
                          {pendingManual ? <Button small variant="green" disabled={actionId === withdrawal.id} onClick={() => openPaidDialog(withdrawal)}>Mark as Paid</Button> : null}
                          {isPending(withdrawal) ? <Button small variant="redSoft" disabled={actionId === withdrawal.id} onClick={() => openRejectDialog(withdrawal)}>Reject</Button> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={12} style={{ borderBottom: 'none', padding: 54, textAlign: 'center', color: 'rgba(255,255,255,.45)' }}>
                      No withdrawal requests match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
