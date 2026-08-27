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
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {[
          ['Tax Invoice / Bill of Supply', `${s.tax_invoices ?? 0}`, money(s.tax_invoices_value), '#2563eb', 'rgba(37, 99, 235, 0.08)'],
          ['Debit Notes', `${s.debit_notes ?? 0}`, money(s.debit_notes_value), '#7c3aed', 'rgba(124, 58, 237, 0.08)'],
          ['Credit Notes', `${s.credit_notes ?? 0}`, money(s.credit_notes_value), '#dc2626', 'rgba(220, 38, 38, 0.08)'],
          ['Cancelled Invoices', `${s.cancelled_invoices ?? 0}`, null, '#dc2626', 'rgba(220, 38, 38, 0.08)'],
        ].map(([label, count, val, color, bg]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bp-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 'auto', flexWrap: 'wrap' }}>
              <span style={{ background: bg, color: color, padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
                {count} {count === '1' ? 'Doc' : 'Docs'}
              </span>
              {val && <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--bp-navy)' }}>{val}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: '24px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)', marginTop: 24 }}>
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
