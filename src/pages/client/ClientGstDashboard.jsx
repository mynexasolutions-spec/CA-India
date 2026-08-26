import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { LoadingBlock } from '../../components/Spinner';

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

export default function ClientGstDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  
  // State for Integrated GST Filing Confirmation view
  const [selectedFilingRecord, setSelectedFilingRecord] = useState(null);
  
  // Confirmation filters
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [returnType, setReturnType] = useState('GSTR-1');
  const [returnPeriod, setReturnPeriod] = useState('');
  const [filingStatus, setFilingStatus] = useState('All Status');
  const [loadingConfirmData, setLoadingConfirmData] = useState(false);

  // Filing History table pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  useEffect(() => {
    fetchReturnsHistory();
  }, []);

  const fetchReturnsHistory = () => {
    api('/client/gst-returns')
      .then(setData)
      .catch(e => setErr(e.message));
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Filed':
      case 'filed':
        return { bg: '#dcfce7', text: '#166534' };
      case 'Pending':
      case 'pending':
        return { bg: '#ffedd5', text: '#ea580c' };
      case 'Failed':
      case 'failed':
      case 'rejected':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'Amended':
      case 'amended':
        return { bg: '#f3e8ff', text: '#7c3aed' };
      default:
        return { bg: '#f1f5f9', text: '#64748b' }; // Neutral / grey for Not Filed
    }
  };

  const formatPeriod = (periodStr) => {
    if (!periodStr) return '—';
    const parts = periodStr.split('-');
    if (parts.length < 2) return periodStr;
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[monthNum - 1]} ${year}`;
  };

  const formatFiledOn = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Helper: Calculate Due Date (13th for GSTR-1 (QRMP), 20th for GSTR-3B next month)
  const calculateDueDate = (periodStr, rType) => {
    if (!periodStr) return '—';
    const parts = periodStr.split('-');
    if (parts.length < 2) return '—';
    let year = parseInt(parts[0], 10);
    let monthNum = parseInt(parts[1], 10);
    monthNum += 1;
    if (monthNum > 12) {
      monthNum = 1;
      year += 1;
    }
    const day = rType === 'GSTR-3B' ? '20' : '13';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[monthNum - 1]} ${year}`;
  };

  if (err) {
    return (
      <div className="bp-content">
        <div className="bp-card" style={{ padding: '30px', textAlign: 'center' }}>
          <h3 style={{ color: '#e74c3c' }}>Notice</h3>
          <p>{err}</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="bp-content"><LoadingBlock label="Loading dashboard…" /></div>;

  // Filter returns based on confirmation view criteria
  const returnsList = data.returns || [];
  // Sorted desc by tax_period from the API, so the first filed row is the most recent.
  const lastFiledRecord = returnsList.find((r) => r.status === 'filed') || null;
  const filteredReturns = returnsList.filter(req => {
    if (financialYear) {
      const year = req.tax_period.split('-')[0];
      // Quick FY check (e.g. FY 2026-2027 includes 2026-04 to 2027-03)
      if (financialYear === '2026-2027' && !(year === '2026' || year === '2027')) return false;
    }
    if (returnType && req.return_type !== returnType) return false;
    if (returnPeriod) {
      const formatted = formatPeriod(req.tax_period);
      if (!formatted.toLowerCase().startsWith(returnPeriod.toLowerCase())) return false;
    }
    if (filingStatus !== 'All Status') {
      if (filingStatus === 'Filed' && req.status !== 'filed') return false;
      if (filingStatus === 'Pending' && req.status !== 'pending' && req.status !== 'upcoming') return false;
      if (filingStatus === 'Failed' && req.status !== 'failed' && req.status !== 'rejected') return false;
      if (filingStatus === 'Amended' && req.status !== 'amended') return false;
    }
    return true;
  });

  // Calculate Confirmation stats
  const totalCount = returnsList.length;
  const filedCount = returnsList.filter(r => r.status === 'filed').length;
  const pendingCount = returnsList.filter(r => r.status === 'pending' || r.status === 'upcoming').length;
  const failedCount = returnsList.filter(r => r.status === 'failed' || r.status === 'rejected').length;
  const amendedCount = returnsList.filter(r => r.status === 'amended').length;

  return (
    <div className="bp-content" style={{ maxWidth: '100%' }}>
      {/* Header Toolbar */}
      <div className="bp-toolbar no-print" style={{ marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--bp-navy)' }}>GST Returns</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            View your GST return filing status and history.
          </p>
        </div>
        {selectedFilingRecord ? (
          <button
            type="button"
            className="bp-btn bp-btn-outline"
            style={{ borderRadius: 8, height: 40, fontWeight: 600, borderColor: '#2563eb', color: '#2563eb' }}
            onClick={() => setSelectedFilingRecord(null)}
          >
            ← Back to Returns History
          </button>
        ) : (
          <button
            type="button"
            className="bp-btn bp-btn-outline"
            style={{ borderRadius: 8, height: 40, display: 'flex', alignItems: 'center', gap: 6, borderColor: '#2563eb', color: '#2563eb', fontWeight: 600 }}
            onClick={() => alert('Filing history report exported successfully.')}
          >
            <DownloadIcon />
            Download History
          </button>
        )}
      </div>

      {/* Main Profile Summary Card */}
      {!selectedFilingRecord && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: 12,
            padding: '16px 0',
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          {/* Card 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderRight: '1px solid #cbd5e1' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Dealer Type</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af', textTransform: 'capitalize' }}>
                {data.dealer_type ? `${data.dealer_type} Dealer` : 'Regular Dealer'}
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderRight: '1px solid #cbd5e1' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Filing Frequency</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af', textTransform: 'capitalize' }}>
                {data.frequency || 'quarterly'}
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderRight: '1px solid #cbd5e1' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Last Filed Return</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>
                {lastFiledRecord ? `${formatPeriod(lastFiledRecord.tax_period)} (${lastFiledRecord.return_type})` : 'None on record'}
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Next Due Date</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>
                {lastFiledRecord ? calculateDueDate(lastFiledRecord.tax_period, lastFiledRecord.return_type) : '—'}
              </span>
              {lastFiledRecord && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                  (For {formatPeriod(lastFiledRecord.tax_period)})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conditional Rendering: History Table OR Integrated Confirmation Dashboard */}
      {!selectedFilingRecord ? (
        <div className="bp-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 20px 0', color: 'var(--bp-navy)', fontSize: 16, fontWeight: 800 }}>Filing History</h3>
          <div className="bp-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="bp-table bp-doc-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>TAX PERIOD</th>
                  <th style={{ textAlign: 'center' }}>RETURN TYPE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>FILED ON</th>
                  <th style={{ textAlign: 'center' }}>ACK. NO.</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {returnsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--bp-muted)' }}>
                      No return filings history found.
                    </td>
                  </tr>
                ) : (
                  returnsList.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize).map((r) => {
                    const bStyle = getStatusBadgeStyle(r.status);
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: 'var(--bp-navy)' }}>{r.tax_period}</td>
                        <td style={{ fontWeight: 600 }}>{r.return_type}</td>
                        <td>
                          <span
                            className="bp-badge"
                            style={{
                              background: bStyle.bg,
                              color: bStyle.text,
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 999
                            }}
                          >
                            {r.status === 'filed' ? 'Filed' : (r.status === 'pending' ? 'Pending' : r.status)}
                          </span>
                        </td>
                        <td>{formatFiledOn(r.filed_at)}</td>
                        <td style={{ fontWeight: 700, color: r.ack_no ? '#2563eb' : '#64748b' }}>{r.ack_no || '—'}</td>
                        <td>
                          <button
                            className="bp-btn bp-btn-outline"
                            style={{
                              height: 28,
                              padding: '0 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              borderColor: '#2563eb',
                              color: '#2563eb',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700
                            }}
                            onClick={() => {
                              // Open integrated confirmation panel pre-filtered to this row's details
                              setFinancialYear('2026-2027');
                              setReturnType(r.return_type);
                              setReturnPeriod(formatPeriod(r.tax_period).split(' ')[0]);
                              setFilingStatus('All Status');
                              setSelectedFilingRecord(r);
                            }}
                          >
                            <ViewIcon /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {returnsList.length > 0 && (() => {
            const historyPageCount = Math.max(1, Math.ceil(returnsList.length / historyPageSize));
            const safeHistoryPage = Math.min(historyPage, historyPageCount);
            const rowFrom = (safeHistoryPage - 1) * historyPageSize + 1;
            const rowTo = Math.min(safeHistoryPage * historyPageSize, returnsList.length);
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, fontSize: 13 }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Showing {rowFrom} to {rowTo} of {returnsList.length} entries</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Rows per page:</span>
                    <select className="bp-select" style={{ height: 32, padding: '2px 24px 2px 8px', width: 70, fontSize: 12, boxSizing: 'border-box' }}
                      value={historyPageSize}
                      onChange={(e) => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(1); }}>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="bp-btn bp-btn-outline" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontWeight: 700 }}
                      disabled={safeHistoryPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>&laquo;</button>
                    <button type="button" className="bp-btn bp-btn-primary" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#0052cc', fontWeight: 700 }}>{safeHistoryPage}</button>
                    <button type="button" className="bp-btn bp-btn-outline" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontWeight: 700 }}
                      disabled={safeHistoryPage >= historyPageCount} onClick={() => setHistoryPage((p) => Math.min(historyPageCount, p + 1))}>&raquo;</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Integrated GST Filing Confirmation View */
        <div>
          {/* Filters Card */}
          <div className="bp-card no-print" style={{ marginBottom: 14, padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Financial Year</span>
                <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', minWidth: 140 }} value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Return Type</span>
                <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', minWidth: 140 }} value={returnType} onChange={(e) => setReturnType(e.target.value)}>
                  <option value="GSTR-1">GSTR-1</option>
                  <option value="GSTR-3B">GSTR-3B</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Return Period (Month)</span>
                <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', minWidth: 140 }} value={returnPeriod} onChange={(e) => setReturnPeriod(e.target.value)}>
                  <option value="">Select Month</option>
                  <option value="Aug">August</option>
                  <option value="Jul">July</option>
                  <option value="Jun">June</option>
                  <option value="May">May</option>
                  <option value="Apr">April</option>
                  <option value="Mar">March</option>
                  <option value="Feb">February</option>
                  <option value="Jan">January</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Filing Status</span>
                <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', minWidth: 140 }} value={filingStatus} onChange={(e) => setFilingStatus(e.target.value)}>
                  <option value="All Status">All Status</option>
                  <option value="Filed">Filed</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  className="bp-btn bp-btn-primary"
                  style={{ height: 40, borderRadius: 8, fontWeight: 600, backgroundColor: '#0052cc', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    setLoadingConfirmData(true);
                    setTimeout(() => setLoadingConfirmData(false), 300);
                  }}
                  disabled={loadingConfirmData}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  {loadingConfirmData ? 'Fetching...' : 'Fetch Data'}
                </button>
              </div>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
            <div className="bp-gstr-kpi" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #bfdbfe', color: '#2563eb', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Total Returns</span>
                <span style={{ fontSize: 18, fontWeight: 850, color: '#1e40af', lineHeight: 1.1 }}>{totalCount}</span>
              </div>
            </div>

            <div className="bp-gstr-kpi" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #bbf7d0', color: '#16a34a', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <polyline points="9 13 11 15 15 11" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Filed</span>
                <span style={{ fontSize: 18, fontWeight: 850, color: '#166534', lineHeight: 1.1 }}>{filedCount}</span>
              </div>
            </div>

            <div className="bp-gstr-kpi" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #fde68a', color: '#d97706', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Pending</span>
                <span style={{ fontSize: 18, fontWeight: 850, color: '#b45309', lineHeight: 1.1 }}>{pendingCount}</span>
              </div>
            </div>

            <div className="bp-gstr-kpi" style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #fecaca', color: '#dc2626', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Failed / Rejected</span>
                <span style={{ fontSize: 18, fontWeight: 850, color: '#991b1b', lineHeight: 1.1 }}>{failedCount}</span>
              </div>
            </div>

            <div className="bp-gstr-kpi" style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe' }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #ddd6fe', color: '#7c3aed', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Amended</span>
                <span style={{ fontSize: 18, fontWeight: 850, color: '#6d28d9', lineHeight: 1.1 }}>{amendedCount}</span>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bp-card" style={{ padding: 0 }}>
            <div className="bp-table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="bp-table bp-doc-table bp-gstr-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>#</th>
                    <th style={{ textAlign: 'center' }}>RETURN PERIOD</th>
                    <th style={{ textAlign: 'center' }}>RETURN TYPE</th>
                    <th style={{ textAlign: 'center' }}>DUE DATE</th>
                    <th style={{ textAlign: 'center' }}>FILED DATE</th>
                    <th style={{ textAlign: 'center' }}>STATUS</th>
                    <th style={{ textAlign: 'center' }}>ACK. NO.</th>
                    <th style={{ textAlign: 'center' }}>REMARKS</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--bp-muted)' }}>
                        No records match the selected confirmation filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((r, idx) => {
                      const statusMapped = r.status === 'filed' ? 'Filed' : (r.status === 'pending' ? 'Pending' : (r.status === 'failed' ? 'Failed' : r.status));
                      const bStyle = getStatusBadgeStyle(r.status);
                      const dueVal = calculateDueDate(r.tax_period, r.return_type);
                      const filedDate = r.status === 'filed' ? formatFiledOn(r.filed_at) : '—';
                      const remarks = r.status === 'filed' ? 'Filed Successfully' : (r.status === 'failed' ? 'Validation Error' : 'Not Filed Yet');

                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: 'var(--bp-navy)' }}>{formatPeriod(r.tax_period)}</td>
                          <td style={{ fontWeight: 600 }}>{r.return_type}</td>
                          <td>{dueVal}</td>
                          <td style={{ fontSize: 11 }}>{filedDate}</td>
                          <td>
                            <span
                              className="bp-badge"
                              style={{
                                background: bStyle.bg,
                                color: bStyle.text,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6
                              }}
                            >
                              {statusMapped}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: r.ack_no ? '#2563eb' : '#64748b' }}>{r.ack_no || '—'}</td>
                          <td style={{ fontSize: 11, fontWeight: 600 }}>{remarks}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                className="bp-btn bp-btn-outline"
                                style={{ height: 24, width: 24, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderColor: '#2563eb', color: '#2563eb', borderRadius: 4 }}
                                onClick={() => alert(`Filing request details for period ${r.tax_period}`)}
                              >
                                <ViewIcon />
                              </button>
                              {r.status === 'filed' && (
                                <button
                                  className="bp-btn bp-btn-outline"
                                  style={{ height: 24, width: 24, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderColor: '#2563eb', color: '#2563eb', borderRadius: 4 }}
                                  onClick={() => alert(`Downloading ACK for period ${r.tax_period}`)}
                                >
                                  <DownloadIcon />
                                </button>
                              )}
                              {r.status === 'failed' && (
                                <button
                                  className="bp-btn bp-btn-outline"
                                  style={{ height: 24, width: 24, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderColor: '#d97706', color: '#d97706', borderRadius: 4 }}
                                  onClick={() => alert(`Retrying filing workflow...`)}
                                >
                                  <RetryIcon />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredReturns.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--bp-border)', fontSize: 13 }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Showing 1 to {filteredReturns.length} of {filteredReturns.length} entries</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Rows per page:</span>
                    <select className="bp-select" style={{ height: 32, padding: '2px 24px 2px 8px', width: 70, fontSize: 12, boxSizing: 'border-box' }} disabled>
                      <option value="10">10</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="bp-btn bp-btn-outline" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontWeight: 700 }} disabled>&laquo;</button>
                    <button className="bp-btn bp-btn-primary" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#0052cc', fontWeight: 700 }}>1</button>
                    <button className="bp-btn bp-btn-outline" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontWeight: 700 }} disabled>&raquo;</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="no-print"
        style={{
          background: '#f0f7ff',
          border: '1px solid #dbeafe',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#1e40af',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 16,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9.2v4.3M10 6.7v.01" />
        </svg>
        <span>All dates are in format: DD:MM:YYYY&nbsp;&nbsp;|&nbsp;&nbsp;All times are in 12-hour format (hh:mm AM/PM)&nbsp;&nbsp;|&nbsp;&nbsp;All table data is center aligned</span>
      </div>
    </div>
  );
}
