import { useEffect, useState } from 'react';
import { api } from '../api/client';

function UnlockIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 9.5-2.2" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-amber)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}
function GroupIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M15.5 4.5a3.2 3.2 0 0 1 0 6.2" />
      <path d="M17 14.3c2.4.6 4 2.6 4 5.7" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2C9.5 21 3 14.5 3 6a2 2 0 0 1 1-2Z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 6.5L20.5 6" />
    </svg>
  );
}
function Gstr2bIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 14a3 3 0 1 0 3 3" /><path d="M12 11v3h3" />
    </svg>
  );
}
function ReturnsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function ConfirmationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.9z" />
    </svg>
  );
}
const FEATURES = [
  { Icon: Gstr2bIcon, label: 'GSTR-2B Reconciliation' },
  { Icon: ReturnsIcon, label: 'GST Returns Filing' },
  { Icon: ConfirmationIcon, label: 'Filing Confirmation' },
  { Icon: StarIcon, label: 'GST Compliance Hub' },
  { Icon: GroupIcon, label: 'Expert Support' },
];

/**
 * "GST Compliance Not Subscribed" popup — shown when a client tries to reach GSTR-2B,
 * GST Returns, or GST Filing Confirmation without the GST Compliance subscription
 * add-on (see EnsureGstComplianceSubscribed on the backend, ClientProfile.gst_compliance_enabled).
 * Content is dynamic: admin contact details are fetched live, not hardcoded.
 */
export default function GstComplianceLockedModal({ onClose }) {
  const [admin, setAdmin] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/client/gst-compliance/admin-contact').then(setAdmin).catch(() => setAdmin(null));
  }, []);

  const contactAdmin = () => {
    if (admin?.email) {
      window.location.href = `mailto:${admin.email}?subject=${encodeURIComponent('GST Compliance Access Request')}`;
    } else {
      setMsg('Admin contact details are unavailable right now.');
    }
  };

  const requestAccess = async () => {
    setRequesting(true);
    setMsg('');
    try {
      const res = await api('/client/gst-compliance/request-access', { method: 'POST', body: {} });
      setRequested(true);
      setMsg(res.message || 'Your request has been sent to the Admin.');
    } catch (e) {
      setMsg(e.message || 'Could not send your request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bp-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="bp-modal"
        role="dialog"
        aria-modal="true"
        aria-label="GST Compliance Not Subscribed"
        style={{ width: 580, maxWidth: '94vw', padding: '30px 30px 26px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="bp-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div style={{ position: 'relative', width: 68, height: 68, margin: '0 auto 16px' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#eff6ff', color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UnlockIcon />
          </div>
          <span style={{ position: 'absolute', top: -4, right: -8 }}><SparkIcon /></span>
        </div>

        <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: 'var(--bp-navy)' }}>You are not a subscriber</h3>
        <div style={{ width: 46, height: 3, background: 'var(--bp-amber)', borderRadius: 2, margin: '9px auto 16px' }} />

        <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--bp-text)', lineHeight: 1.55 }}>
          GST Compliance is not included in your current subscription plan.
        </p>

        <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, fontWeight: 700, color: 'var(--bp-navy)', lineHeight: 1.45 }}>
            Subscribe to unlock advanced GST compliance features and manage your filings with ease.
          </p>
          <div className="bp-gst-feature-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {FEATURES.map(({ Icon, label }) => (
              <div key={label} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--bp-blue)' }}><Icon /></span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--bp-navy)', lineHeight: 1.3 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 20, textAlign: 'left' }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#fde68a', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PersonIcon />
          </span>
          <span style={{ fontSize: 13, color: '#78350f', fontWeight: 600, lineHeight: 1.5 }}>
            To activate GST Compliance, please contact the admin for your account.
          </span>
        </div>

        {msg && (
          <p style={{ margin: '0 0 14px', fontSize: 12.5, fontWeight: 600, color: requested ? '#16a34a' : '#dc2626' }}>{msg}</p>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={contactAdmin}
            style={{ flex: '1 1 130px', height: 40, borderRadius: 8, border: '1.5px solid #2563eb', background: '#fff', color: '#2563eb', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}
          >
            <PhoneIcon /> Contact Admin
          </button>
          <button
            type="button"
            onClick={requestAccess}
            disabled={requesting || requested}
            style={{ flex: '1 1 130px', height: 40, borderRadius: 8, border: '1.5px solid #16a34a', background: '#fff', color: '#16a34a', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: requesting || requested ? 'default' : 'pointer', opacity: requesting || requested ? 0.65 : 1 }}
          >
            <MailIcon /> {requested ? 'Requested' : requesting ? 'Sending…' : 'Request Access'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: '1 1 90px', height: 40, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: 'var(--bp-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
