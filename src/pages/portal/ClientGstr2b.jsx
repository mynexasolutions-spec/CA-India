import { useCallback, useEffect, useState } from 'react';
import { api, getAuthToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { LoadingBlock } from '../../components/Spinner';
import { buildFyOptions, fyMonthOptions, fyQuarterPeriodOptions } from '../billing/billingUtils';
import NumberedPagination from '../billing/NumberedPagination';

const COLUMNS = [
  { key: 'supplier_gstin', label: 'SUPPLIER GSTIN' },
  { key: 'supplier_name', label: 'SUPPLIER NAME' },
  { key: 'invoice_number', label: 'INVOICE NUMBER' },
  { key: 'invoice_date', label: 'INVOICE DATE' },
  { key: 'taxable_value', label: 'TAXABLE VALUE (₹)' },
  { key: 'cgst', label: 'CGST (₹)' },
  { key: 'sgst', label: 'SGST (₹)' },
  { key: 'igst', label: 'IGST (₹)' },
  { key: 'total_gst', label: 'TOTAL GST (₹)' },
  { key: 'itc_eligibility', label: 'ITC ELIGIBILITY' },
  { key: 'match_status', label: 'MATCH STATUS' },
];

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN');
}

function eligibilityBadge(v) {
  if (v === 'eligible') return <span className="bp-badge bp-badge-paid">Eligible</span>;
  if (v === 'ineligible') return <span className="bp-badge bp-badge-cancelled">Not Eligible</span>;
  return '—';
}

export default function ClientGstr2b() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  // GSTR-2B has no filing action of its own — it mirrors GSTR-3B's cycle 1:1
  // (BillingPolicy::gstr2bFrequency on the backend), and is always quarterly for
  // Composition dealers.
  const gstr2bQuarterly = !!profile && (
    profile.dealer_type === 'composition' ||
    (profile.gstr2b_filing_frequency ?? profile.gst_filing_frequency) === 'quarterly'
  );

  const [fy, setFy] = useState('');
  const [taxPeriod, setTaxPeriod] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [matchStatus, setMatchStatus] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({});
  const [sort, setSort] = useState('invoice_date');
  const [dir, setDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);

  const periodOptions = fy ? (gstr2bQuarterly ? fyQuarterPeriodOptions(fy) : fyMonthOptions(fy)) : [];

  const buildQuery = useCallback((extra = {}) => {
    const qs = new URLSearchParams({
      sort,
      dir,
      page: String(page),
      per_page: String(perPage),
      ...appliedFilters,
      ...extra,
    });
    Object.keys(Object.fromEntries(qs)).forEach((k) => {
      if (!qs.get(k)) qs.delete(k);
    });
    return qs;
  }, [appliedFilters, dir, page, sort, perPage]);

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    return api(`/client/gstr2b?${buildQuery()}`)
      .then(setResult)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({
      financial_year: fy,
      tax_period: taxPeriod,
      supplier_gstin: supplierGstin,
      supplier_name: supplierName,
      invoice_number: invoiceNumber,
      match_status: matchStatus,
    });
  };

  const clearFilters = () => {
    setFy('');
    setTaxPeriod('');
    setSupplierGstin('');
    setSupplierName('');
    setInvoiceNumber('');
    setMatchStatus('');
    setPage(1);
    setAppliedFilters({});
  };

  const toggleSort = (key) => {
    if (sort === key) {
      setDir(dir === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(key);
      setDir('asc');
    }
  };

  const updateMatchStatus = async (invoice, nextStatus) => {
    const currentStatus = invoice.match_status || 'unmatched';
    if (currentStatus === nextStatus) return;

    setErr('');
    setPendingStatus({ invoiceId: invoice.id, status: nextStatus });

    try {
      await api(`/client/gstr2b/invoices/${invoice.id}/match-status`, {
        method: 'PATCH',
        body: { match_status: nextStatus },
      });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setPendingStatus(null);
    }
  };

  const download = async (format) => {
    const token = getAuthToken();
    const qs = buildQuery({ format });
    const res = await fetch(`/api/client/gstr2b/export?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xls' : 'csv';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gstr2b.${ext}`;
    a.click();
  };

  const rows = result?.data || [];
  const summary = result?.summary || {};
  const kpis = [
    {
      label: 'Total Invoices',
      value: summary.total_invoices ?? 0,
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      Icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <circle cx="10" cy="13" r="3" />
          <line x1="12" y1="15" x2="16" y2="19" />
        </svg>
      )
    },
    {
      label: 'Matched Invoices',
      value: summary.matched_invoices ?? 0,
      color: '#16803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      Icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <polyline points="9 15 11 17 15 13" />
        </svg>
      )
    },
    {
      label: 'Unmatched Invoices',
      value: summary.unmatched_invoices ?? 0,
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      Icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="19" />
          <line x1="15" y1="13" x2="9" y2="19" />
        </svg>
      )
    },
    {
      label: 'Matched ITC Amount',
      value: money(summary.matched_itc_amount),
      color: '#16803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      Icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      label: 'Unmatched ITC Amount',
      value: money(summary.unmatched_itc_amount),
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      Icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    }
  ];

  return (
    <div>
      <div className="bp-toolbar no-print" style={{ marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--bp-navy)' }}>GSTR-2B Reconciliation</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            Match purchase invoices and verify eligible ITC.
          </p>
        </div>
        <button
          type="button"
          className="bp-btn bp-btn-outline"
          style={{
            borderRadius: 8,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderColor: '#2563eb',
            color: '#2563eb',
            fontWeight: 600
          }}
          onClick={load}
          disabled={loading}
        >
          <svg className={loading ? 'spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Refresh Data
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          marginTop: 14,
        }}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bp-gstr-kpi"
            style={{
              background: k.bg,
              border: `1.5px solid ${k.border}`,
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                border: `1px solid ${k.border}`,
                color: k.color,
                flexShrink: 0
              }}
            >
              <k.Icon />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{k.label}</span>
              <span style={{ fontSize: 18, fontWeight: 850, color: k.color, lineHeight: 1.1 }}>{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bp-card no-print" style={{ marginTop: 14 }}>
        <form onSubmit={applyFilters} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Financial Year</span>
            <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', minWidth: 120 }} value={fy} onChange={(e) => { setFy(e.target.value); setTaxPeriod(''); }}>
              <option value="">All</option>
              {buildFyOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Tax Period</span>
            <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', minWidth: 120 }} value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)} disabled={!fy}>
              <option value="">All</option>
              {periodOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Supplier GSTIN</span>
            <input className="bp-input" style={{ height: 40, boxSizing: 'border-box' }} value={supplierGstin} onChange={(e) => setSupplierGstin(e.target.value)} placeholder="e.g. 27ABCDE..." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Supplier Name</span>
            <input className="bp-input" style={{ height: 40, boxSizing: 'border-box' }} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Search supplier" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Invoice Number</span>
            <input className="bp-input" style={{ height: 40, boxSizing: 'border-box' }} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Search invoice #" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Match Status</span>
            <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', minWidth: 120 }} value={matchStatus} onChange={(e) => setMatchStatus(e.target.value)}>
              <option value="">All</option>
              <option value="matched">Matched</option>
              <option value="unmatched">Unmatched</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="bp-btn bp-btn-primary" style={{ height: 40, borderRadius: 8, fontWeight: 600 }}>Search</button>
            <button type="button" className="bp-btn bp-btn-outline" style={{ height: 40, borderRadius: 8, fontWeight: 600 }} onClick={clearFilters}>Clear</button>
          </div>
        </form>
      </div>

      {err && <p className="bp-alert bp-alert-error" style={{ marginTop: 12 }}>{err}</p>}

      {loading ? (
        <div className="bp-card" style={{ marginTop: 14 }}>
          <LoadingBlock />
        </div>
      ) : (
        <>
          <div className="bp-table-wrapper" style={{ overflowX: 'auto', marginTop: 14 }}>
            <table className="bp-table bp-doc-table bp-gstr-table">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.key} onClick={() => toggleSort(c.key)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {c.label}{sort === c.key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.supplier_gstin || '—'}</td>
                    <td>{r.supplier_name || '—'}</td>
                    <td>{r.invoice_number || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.invoice_date)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{money(r.taxable_value)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{money(r.cgst)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{money(r.sgst)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{money(r.igst)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 700, color: '#2563eb' }}>{money(r.total_gst)}</td>
                    <td>{eligibilityBadge(r.itc_eligibility)}</td>
                    <td>
                      {(() => {
                        const statusVal = pendingStatus?.invoiceId === r.id ? pendingStatus.status : (r.match_status || 'unmatched');
                        const statusColor = statusVal === 'matched'
                          ? { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' }
                          : { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
                        return (
                          <select
                            className="bp-select"
                            aria-label={`Match status for invoice ${r.invoice_number || r.id}`}
                            value={statusVal}
                            disabled={pendingStatus !== null}
                            onChange={(e) => updateMatchStatus(r, e.target.value)}
                            style={{
                              height: 28,
                              padding: '2px 20px 2px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              width: 110,
                              boxSizing: 'border-box',
                              borderRadius: 6,
                              background: statusColor.bg,
                              color: statusColor.text,
                              borderColor: statusColor.border,
                              cursor: 'pointer',
                              appearance: 'none',
                              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='none' stroke='${encodeURIComponent(statusColor.text)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='2 3.5 5 6.5 8 3.5'/></svg>")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 6px center',
                            }}
                          >
                            <option value="matched">Matched</option>
                            <option value="unmatched">Unmatched</option>
                          </select>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ padding: '60px 20px', background: '#fff' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'relative', width: 64, height: 64, background: '#f5f3ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <circle cx="10" cy="13" r="3" />
                            <line x1="12" y1="15" x2="16" y2="19" />
                          </svg>
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--bp-navy)' }}>
                          No GSTR-2B invoice data found for the selected filters.
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--bp-muted)' }}>
                          Please change your filters or refresh data.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <NumberedPagination
            meta={result}
            perPage={perPage}
            onPerPage={(v) => { setPerPage(v); setPage(1); }}
            onPage={setPage}
          />
        </>
      )}

      <div
        className="bp-info-note"
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
          marginTop: 14
        }}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9.2v4.3M10 6.7v.01" />
        </svg>
        <span>All amounts are in ₹ (Indian Rupee) | All dates are in format: DD:MM:YYYY | All times are in 12-hour format (hh:mm AM/PM)</span>
      </div>
    </div>
  );
}
