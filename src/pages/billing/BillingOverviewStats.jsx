import { currentFyRange, money } from './billingUtils';
import GstSummaryMatrix, { resolveGstMatrix } from './GstSummaryMatrix';
import { useAuth } from '../../auth/AuthContext';

export default function BillingOverviewStats({
  data,
  from = '',
  to = '',
  setFrom,
  setTo,
  onApply,
}) {
  const { user } = useAuth();
  const profile = user?.client_profile;
  if (!data) return null;
  const fy = currentFyRange();
  const s = data.summary || {};
  const matrix = resolveGstMatrix(data.gst_matrix ? { gst_matrix: data.gst_matrix } : data, profile);
  const showFilters = typeof setFrom === 'function' && typeof setTo === 'function';
  const fromValue = from || fy.from;
  const toValue = to || fy.to;

  return (
    <>
      <div className="bp-grid-4">
        {[
          ['Tax Invoice/Bill of Supply', `${s.tax_invoices ?? 0} · ${money(s.tax_invoices_value)}`],
          ['Debit Notes', `${s.debit_notes ?? 0} · ${money(s.debit_notes_value)}`],
          ['Credit Notes', `${s.credit_notes ?? 0} · ${money(s.credit_notes_value)}`],
          ['Cancelled Invoices', s.cancelled_invoices ?? 0],
        ].map(([label, val]) => (
          <div key={label} className="bp-card bp-kpi">
            <div className="label">{label}</div>
            <div className="value">{val ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="bp-card" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--bp-navy)' }}>GST Summary</h3>
          {showFilters && (
            <div className="bp-toolbar" style={{ margin: 0, flexWrap: 'wrap', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--bp-text)' }}>
                From date
                <input
                  className="bp-input"
                  style={{ maxWidth: 140, background: '#fff' }}
                  type="date"
                  value={fromValue}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--bp-text)' }}>
                To date
                <input
                  className="bp-input"
                  style={{ maxWidth: 140, background: '#fff' }}
                  type="date"
                  value={toValue}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <button type="button" className="bp-btn bp-btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onApply}>
                Apply
              </button>
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--bp-muted)', margin: '8px 0 12px' }}>
          Period: <strong>{fromValue}</strong> to <strong>{toValue}</strong>
        </div>
        <GstSummaryMatrix matrix={matrix} title="" profile={profile} />
      </div>
    </>
  );
}
