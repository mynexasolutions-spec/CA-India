import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import GstComplianceLockedModal from './GstComplianceLockedModal';

function LockBigIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
    </svg>
  );
}

/**
 * Wraps a GST Compliance route (GSTR-2B / GST Returns / GST Filing Confirmation).
 * When the logged-in client's subscription doesn't include GST Compliance, renders a
 * locked placeholder plus the "Not Subscribed" popup instead of mounting the real page —
 * the backend also enforces this (EnsureGstComplianceSubscribed) as a defense-in-depth
 * safety net for direct API calls.
 */
export default function GstComplianceGate({ children }) {
  const { user } = useAuth();
  const enabled = user?.client_profile?.gst_compliance_enabled !== false;
  const [showModal, setShowModal] = useState(true);

  if (enabled) {
    return children;
  }

  return (
    <div>
      <div className="bp-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fbecea', color: 'var(--bp-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <LockBigIcon />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'var(--bp-navy)' }}>GST Compliance Not Subscribed</h3>
        <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--bp-muted)' }}>
          This feature isn't included in your current subscription.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{ height: 38, padding: '0 18px', borderRadius: 8, border: '1.5px solid #2563eb', background: '#fff', color: '#2563eb', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          View Details
        </button>
      </div>

      {showModal && (
        <GstComplianceLockedModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
