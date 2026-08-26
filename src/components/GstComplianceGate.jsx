import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import GstComplianceLockedModal from './GstComplianceLockedModal';

function UnlockIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 9.5-2.2" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-amber)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    </svg>
  );
}
function GstIllustration() {
  return (
    <svg width="150" height="148" viewBox="0 0 150 148" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gst-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eff6ff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="gst-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <g transform="rotate(-6 60 55)">
        <rect x="14" y="6" width="92" height="112" rx="8" fill="url(#gst-paper)" stroke="#93c5fd" strokeWidth="1.5" />
        <text x="60" y="34" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--bp-navy)" fontFamily="Inter, sans-serif">GST</text>
        {[50, 68, 86].map((y) => (
          <g key={y}>
            <rect x="26" y={y - 8} width="12" height="12" rx="3" fill="#fff" stroke="#60a5fa" strokeWidth="1.4" />
            <path d={`M28.5 ${y - 2} l2.4 2.4 5-5`} stroke="#2563eb" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="44" y={y - 3} width="46" height="6" rx="3" fill="#bfdbfe" />
          </g>
        ))}
      </g>
      <g transform="translate(84 68)">
        <path d="M30 0 L58 9 V34 C58 54 44 66 30 72 C16 66 2 54 2 34 V9 Z" fill="url(#gst-shield)" stroke="#1e3a8a" strokeWidth="1" />
        <rect x="18" y="34" width="24" height="18" rx="3" fill="#fff" />
        <path d="M22 34v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="30" cy="42" r="3" fill="#1e40af" />
      </g>
    </svg>
  );
}
function LockSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
    </svg>
  );
}
function Gstr2bIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 14a3 3 0 1 0 3 3" /><path d="M12 11v3h3" />
    </svg>
  );
}
function ReturnsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function ConfirmationIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.9z" />
    </svg>
  );
}
function ExpertIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  );
}
function CrownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 6.5L20.5 6" />
    </svg>
  );
}

const FEATURES = [
  { Icon: Gstr2bIcon, title: 'GSTR-2B Reconciliation', desc: 'Match purchases with ease and reduce errors.' },
  { Icon: ReturnsIcon, title: 'GST Returns Filing', desc: 'File GSTR-1, GSTR-3B and other returns accurately.' },
  { Icon: ConfirmationIcon, title: 'Filing Confirmation', desc: 'Get instant filing confirmation and acknowledgement.' },
  { Icon: StarIcon, title: 'GST Compliance Hub', desc: 'All your GST compliance in one place.' },
  { Icon: ExpertIcon, title: 'Expert Support', desc: 'Get assistance from our GST experts.' },
  { Icon: ChartIcon, title: 'Real-time Reports', desc: 'Track, analyze and export GST reports instantly.' },
];

/**
 * Wraps a GST Compliance route (GSTR-2B / GST Returns / GST Filing Confirmation).
 * When the logged-in client's subscription doesn't include GST Compliance, renders a
 * locked landing page plus the "Not Subscribed" popup instead of mounting the real page —
 * the backend also enforces this (EnsureGstComplianceSubscribed) as a defense-in-depth
 * safety net for direct API calls.
 */
export default function GstComplianceGate({ children }) {
  const { user } = useAuth();
  const enabled = user?.client_profile?.gst_compliance_enabled !== false;
  const [showModal, setShowModal] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!enabled) {
      api('/client/gst-compliance/admin-contact').then(setAdmin).catch(() => setAdmin(null));
    }
  }, [enabled]);

  if (enabled) {
    return children;
  }

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
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="bp-card bp-gate-hero" style={{ padding: '30px 32px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
        <div
          className="bp-gate-dots"
          style={{
            position: 'absolute', top: 0, right: 0, width: 190, height: 190,
            backgroundImage: 'radial-gradient(#cbd5e1 1.4px, transparent 1.4px)',
            backgroundSize: '14px 14px',
            maskImage: 'radial-gradient(circle at top right, #000 0%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle at top right, #000 0%, transparent 72%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#eff6ff', color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UnlockIcon />
          </div>
          <span style={{ position: 'absolute', top: -6, right: -10 }}><SparkIcon /></span>
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 260 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: 'var(--bp-navy)' }}>GST Compliance Not Subscribed</h2>
          <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--bp-muted)', lineHeight: 1.55, maxWidth: 560 }}>
            This feature isn't included in your current subscription. Unlock advanced GST compliance features and manage your filings with ease.
          </p>
          <button
            type="button"
            className="bp-gate-cta"
            onClick={() => setShowModal(true)}
            style={{ height: 42, padding: '0 20px', borderRadius: 9, border: 'none', background: 'var(--bp-blue)', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            View Details
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
        <div style={{ flexShrink: 0, marginLeft: 'auto' }} className="bp-gate-illustration">
          <GstIllustration />
        </div>
      </div>

      {/* ── Feature grid ─────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 800, color: 'var(--bp-navy)' }}>Unlock Powerful GST Compliance Features</h3>
        <div style={{ width: 54, height: 3, background: 'var(--bp-amber)', borderRadius: 2, margin: '0 auto' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 22 }}>
        {FEATURES.map(({ Icon, title, desc }) => (
          <div key={title} className="bp-card" style={{ padding: '22px 18px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#eff6ff', color: 'var(--bp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Icon />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bp-navy)', marginBottom: 6 }}>{title}</div>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--bp-muted)', lineHeight: 1.5 }}>{desc}</p>
            <span style={{ color: 'var(--bp-amber)' }}><LockSmallIcon /></span>
          </div>
        ))}
      </div>

      {/* ── Subscribe footer ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '18px 22px' }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bp-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CrownIcon />
        </div>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--bp-navy)', marginBottom: 3 }}>Subscribe to GST Compliance</div>
          <p style={{ margin: 0, fontSize: 12.5, color: '#78350f' }}>Stay 100% compliant and stress-free with our advanced GST compliance solution.</p>
        </div>
        <div className="bp-gate-footer-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bp-gate-footer-btn"
            onClick={contactAdmin}
            style={{ height: 40, padding: '0 16px', borderRadius: 8, border: '1.5px solid #2563eb', background: '#fff', color: '#2563eb', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}
          >
            <PersonIcon /> Contact Admin
          </button>
          <button
            type="button"
            className="bp-gate-footer-btn"
            onClick={requestAccess}
            disabled={requesting || requested}
            style={{ height: 40, padding: '0 16px', borderRadius: 8, border: 'none', background: 'var(--bp-amber)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: requesting || requested ? 'default' : 'pointer', opacity: requesting || requested ? 0.7 : 1 }}
          >
            <MailIcon /> {requested ? 'Requested' : requesting ? 'Sending…' : 'Request Access'}
          </button>
        </div>
        {msg && (
          <p style={{ width: '100%', margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: requested ? '#16a34a' : '#dc2626' }}>{msg}</p>
        )}
      </div>

      {showModal && (
        <GstComplianceLockedModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
