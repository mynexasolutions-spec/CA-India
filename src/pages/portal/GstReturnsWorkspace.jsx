import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { LoadingBlock } from '../../components/Spinner';
import { buildFyOptions, periodLabel } from '../billing/billingUtils';
import GstReturnsSummaryCards from './GstReturnsSummaryCards';
import GstFilingRequestFlow from './GstFilingRequestFlow';

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function formatDateOnly(dStr) {
  if (!dStr) return '—';
  const date = new Date(dStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const styles = {
    'Filed Successfully': { bg: '#dcfce7', color: '#166534' },
    'Reconciliation Pending': { bg: '#fef3c7', color: '#b45309' },
    'Pending CA Review': { bg: '#ffedd5', color: '#ea580c' },
    'Approved for Filing': { bg: '#dcfce7', color: '#166534' },
    'Correction Required': { bg: '#fee2e2', color: '#dc2626' },
    'Request Not Raised': { bg: '#f1f5f9', color: '#64748b' },
  };
  const s = styles[status] || { bg: '#f1f5f9', color: '#64748b' };
  return <span className="bp-badge" style={{ background: s.bg, color: s.color, fontWeight: 700 }}>{status}</span>;
}

/**
 * GST Returns workspace — client-portal spec's single "GST Returns" module with
 * GSTR-1 / GSTR-3B as internal tabs (default GSTR-1), mounted at /portal/gst-returns.
 * Replaces the old ClientGstDashboard at this route; ClientGstDashboard.jsx itself is
 * left in the repo, just unrouted (see App.jsx).
 */
export default function GstReturnsWorkspace() {
  const { user } = useAuth();
  const profile = user?.client_profile;

  const [returnType, setReturnType] = useState('GSTR-1');
  const [financialYear, setFinancialYear] = useState(buildFyOptions()[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [requestFlow, setRequestFlow] = useState(null); // { period } or {} for banner button
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    const params = new URLSearchParams({ financial_year: financialYear, return_type: returnType });
    return api(`/client/gst-filing/periods?${params.toString()}`)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [financialYear, returnType]);

  useEffect(() => { load(); }, [load]);

  const viewReconciliation = (row) => {
    let taxPeriod = row.period;
    if (row.reconciliation_month_breakdown) {
      const pending = Object.entries(row.reconciliation_month_breakdown).find(([, ok]) => !ok);
      if (pending) taxPeriod = pending[0];
    }
    const qs = new URLSearchParams({ financial_year: financialYear, tax_period: taxPeriod });
    navigate(`/portal/gstr-2b?${qs.toString()}`);
  };

  const viewDetails = async (row) => {
    if (!row.filing_request_id) return;
    setDetailLoading(true);
    try {
      const res = await api(`/client/gst-filing/requests/${row.filing_request_id}`);
      setDetail(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const isGstr3b = returnType === 'GSTR-3B';
  const bannerText = isGstr3b
    ? 'GSTR-3B can be requested only after GSTR-2B reconciliation is completed for the selected period.'
    : 'You can raise a request for GSTR-1 filing for the selected period.';

  return (
    <div className="bp-content" style={{ maxWidth: '100%' }}>
      <div className="bp-toolbar" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--bp-navy)' }}>GST Returns</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>File and track your GSTR-1 and GSTR-3B returns.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select className="bp-select" style={{ height: 40, boxSizing: 'border-box' }} value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
            {buildFyOptions().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {profile?.gstin && (
            <span className="bp-badge" style={{ background: '#f0fdf4', color: '#166534', fontWeight: 700, padding: '6px 12px' }}>
              GSTIN: {profile.gstin}
            </span>
          )}
        </div>
      </div>

      {/* Internal tab bar — GSTR-1 / GSTR-3B are never separate nav items, only tabs here */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, borderBottom: '1px solid var(--bp-border)' }}>
        {['GSTR-1', 'GSTR-3B'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setReturnType(t)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 14,
              color: returnType === t ? '#0052cc' : 'var(--bp-muted)',
              borderBottom: returnType === t ? '3px solid #0052cc' : '3px solid transparent',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {err && <p className="bp-alert bp-alert-error">{err}</p>}

      {loading || !data ? (
        <LoadingBlock label="Loading…" />
      ) : (
        <>
          <GstReturnsSummaryCards summary={data.summary} returnType={returnType} />

          <div style={{ background: '#f0f7ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 600 }}>{bannerText}</span>
            <button
              type="button"
              className="bp-btn bp-btn-primary"
              style={{ height: 38, borderRadius: 8, fontWeight: 700, background: '#0052cc', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setRequestFlow({})}
            >
              <SendIcon /> Request {returnType} Filing
            </button>
          </div>

          <div className="bp-card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px 0' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bp-navy)' }}>Filing Periods</h3>
            </div>
            <div className="bp-table-wrapper" style={{ overflowX: 'auto', padding: 16 }}>
              <table className="bp-table bp-doc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Tax Period</th>
                    <th style={{ textAlign: 'center' }}>Due Date</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Filed On</th>
                    <th style={{ textAlign: 'center' }}>Ack. No.</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.periods || []).map((row) => (
                    <tr key={row.period}>
                      <td style={{ fontWeight: 700, color: 'var(--bp-navy)' }}>{row.period_label || periodLabel(row.period)}</td>
                      <td>{formatDateOnly(row.due_date)}</td>
                      <td>{statusBadge(row.status)}</td>
                      <td>{row.filed_on ? formatDateOnly(row.filed_on) : '—'}</td>
                      <td style={{ fontWeight: 700, color: row.ack_no ? '#2563eb' : '#64748b' }}>{row.ack_no || '—'}</td>
                      <td>
                        {row.action === 'request_filing' && (
                          <button
                            className="bp-btn bp-btn-primary"
                            style={{ height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0052cc', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                            onClick={() => setRequestFlow({ period: row.period })}
                          >
                            <SendIcon /> Request Filing
                          </button>
                        )}
                        {row.action === 'view_details' && (
                          <button
                            className="bp-btn bp-btn-outline"
                            style={{ height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#2563eb', color: '#2563eb', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                            onClick={() => viewDetails(row)}
                            disabled={detailLoading}
                          >
                            <EyeIcon /> View Details
                          </button>
                        )}
                        {row.action === 'view_reconciliation' && (
                          <button
                            className="bp-btn bp-btn-outline"
                            style={{ height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#b45309', color: '#b45309', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                            onClick={() => viewReconciliation(row)}
                          >
                            <EyeIcon /> View Reconciliation
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{ background: '#f0f7ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '10px 14px', color: '#1e40af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 9.2v4.3M10 6.7v.01" />
            </svg>
            <span>All dates are in format: DD:MM:YYYY&nbsp;&nbsp;|&nbsp;&nbsp;All table data is center aligned</span>
          </div>
        </>
      )}

      {requestFlow && (
        <GstFilingRequestFlow
          returnType={returnType}
          financialYear={financialYear}
          quarterly={!!data?.quarterly}
          initialPeriod={requestFlow.period}
          onClose={() => setRequestFlow(null)}
          onSubmitted={() => { setRequestFlow(null); load(); }}
        />
      )}

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22, 58, 82, 0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101, padding: 20 }}>
          <div className="bp-card" style={{ width: '100%', maxWidth: 750, padding: 0, overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bp-border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--bp-navy)', fontWeight: 800 }}>
                Request Details: REQ-{String(detail.id).padStart(4, '0')}
              </h3>
              <button type="button" onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--bp-muted)' }}>×</button>
            </div>
            <div style={{ padding: 20, maxHeight: 450, overflowY: 'auto' }}>
              <div className="bp-stat-grid-3" style={{ gap: 16, marginBottom: 20, background: '#f8fafc', padding: 14, borderRadius: 8 }}>
                <div><span style={{ fontSize: 11, color: 'var(--bp-muted)', fontWeight: 600 }}>Period:</span> <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bp-navy)' }}>{periodLabel(detail.filing_period)}</div></div>
                <div><span style={{ fontSize: 11, color: 'var(--bp-muted)', fontWeight: 600 }}>Status:</span> <div>{statusBadge(detail.status === 'GST Filed' ? 'Filed Successfully' : detail.status)}</div></div>
                <div><span style={{ fontSize: 11, color: 'var(--bp-muted)', fontWeight: 600 }}>Total GST:</span> <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>₹{Number(detail.total_gst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
              </div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--bp-navy)', fontWeight: 800 }}>Attached Invoices</h4>
              <div className="bp-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--bp-border)', borderRadius: 6 }}>
                <table className="bp-table bp-doc-table" style={{ margin: 0, width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Taxable Amt</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.documents || []).map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 700 }}>{doc.number}</td>
                        <td>{formatDateOnly(doc.document_date)}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(doc.taxable_amount).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{Number(doc.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--bp-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setDetail(null)} className="bp-btn bp-btn-primary" style={{ height: 36, borderRadius: 6, background: '#0052cc' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
