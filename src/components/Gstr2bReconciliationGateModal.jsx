import { useNavigate } from 'react-router-dom';

function WarnIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * GSTR-3B reconciliation-gate blocking popup (client-portal GST Returns spec §6.1).
 * Shown when the client tries to raise a GSTR-3B filing request for a period whose
 * GSTR-2B reconciliation isn't complete. "View Reconciliation" routes to the actual
 * pending month for a quarterly period (via `period`, already resolved by the caller
 * from reconciliation_month_breakdown), not a meaningless quarter label — GSTR-2B's own
 * page is always month/quarter-grid-scoped per the client's GSTR-2B cadence.
 */
export default function Gstr2bReconciliationGateModal({ financialYear, period, onClose }) {
  const navigate = useNavigate();

  const viewReconciliation = () => {
    const qs = new URLSearchParams();
    if (financialYear) qs.set('financial_year', financialYear);
    if (period) qs.set('tax_period', period);
    onClose();
    navigate(`/portal/gstr-2b?${qs.toString()}`);
  };

  return (
    <div className="bp-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="bp-modal"
        role="dialog"
        aria-modal="true"
        aria-label="GSTR Reconciliation Pending"
        style={{ width: 460, maxWidth: '94vw', padding: '28px 26px 22px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="bp-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <WarnIcon />
        </div>

        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--bp-navy)' }}>GSTR Reconciliation Pending</h3>

        <p style={{ margin: '12px 0 22px', fontSize: 13.5, color: 'var(--bp-text)', lineHeight: 1.55 }}>
          GSTR reconciliation is pending for the selected period. Please complete GSTR-2B reconciliation before raising the GSTR-3B filing request.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={viewReconciliation}
            style={{ flex: 1, height: 40, borderRadius: 8, border: 'none', background: '#0052cc', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            View Reconciliation
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, height: 40, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: 'var(--bp-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
