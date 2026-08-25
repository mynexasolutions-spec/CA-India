import { useEffect, useState } from 'react';
import { api } from '../api/client';

function LockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
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
function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 6.5L20.5 6" />
    </svg>
  );
}

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
        style={{ width: 440, padding: '30px 30px 26px', textAlign: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="bp-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="bp-modal-icon" style={{ margin: '0 0 16px' }}>
          <LockIcon />
        </div>

        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--bp-navy)' }}>GST Compliance Not Subscribed</h3>
        <div style={{ width: 46, height: 3, background: 'var(--bp-red)', borderRadius: 2, margin: '9px 0 16px' }} />

        <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--bp-text)', lineHeight: 1.55 }}>
          GST Compliance is not included in your current subscription.
        </p>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--bp-text)', lineHeight: 1.55 }}>
          Your current subscription provides access to <b>Billing services only</b>. GST Compliance features such as GSTR-2B,
          GST Returns, GST Filing Confirmation and other GST Compliance services are available only to clients subscribed to
          the GST Compliance service.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#fde68a', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PersonIcon />
          </span>
          <span style={{ fontSize: 13, color: '#78350f', fontWeight: 600, lineHeight: 1.5 }}>
            Please contact the Admin to activate GST Compliance for your account
            {admin?.name ? <> — <b>{admin.name}</b></> : null}.
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
            <PersonIcon /> Contact Admin
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
