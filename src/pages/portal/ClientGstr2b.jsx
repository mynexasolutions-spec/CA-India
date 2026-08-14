import { useCallback, useEffect, useState } from 'react';
import { api, getAuthToken } from '../../api/client';
import { buildFyOptions, fyMonthOptions } from '../billing/billingUtils';

const COLUMNS = [
  { key: 'supplier_gstin', label: 'Supplier GSTIN' },
  { key: 'supplier_name', label: 'Supplier Name' },
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'invoice_date', label: 'Invoice Date' },
  { key: 'taxable_value', label: 'Taxable Value' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'igst', label: 'IGST' },
  { key: 'total_gst', label: 'Total GST' },
  { key: 'itc_eligibility', label: 'ITC Eligibility' },
  { key: 'match_status', label: 'Match Status' },
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

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);

  const monthOptions = fy ? fyMonthOptions(fy) : [];

  const buildQuery = useCallback((extra = {}) => {
    const qs = new URLSearchParams({
      sort,
      dir,
      page: String(page),
      ...appliedFilters,
      ...extra,
    });
    Object.keys(Object.fromEntries(qs)).forEach((k) => {
      if (!qs.get(k)) qs.delete(k);
    });
    return qs;
  }, [appliedFilters, dir, page, sort]);

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
  const currentPage = result?.current_page || 1;
  const lastPage = result?.last_page || 1;
  const total = result?.total || 0;
  const summary = result?.summary || {};
  const summaryCards = [
    ['Total Invoices', summary.total_invoices ?? 0],
    ['Matched Invoices', summary.matched_invoices ?? 0],
    ['Unmatched Invoices', summary.unmatched_invoices ?? 0],
    ['Matched ITC Amount', money(summary.matched_itc_amount)],
    ['Unmatched ITC Amount', money(summary.unmatched_itc_amount)],
  ];

  return (
    <div>
      <div className="bp-toolbar no-print">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>GSTR-2B</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            ITC statement data uploaded by your CA — filter, sort, export, or print.
          </p>
        </div>
        <button type="button" className="bp-btn bp-btn-green" onClick={() => download('xlsx')}>Export Excel</button>
        <button type="button" className="bp-btn bp-btn-danger" onClick={() => download('pdf')}>Export PDF</button>
        <button type="button" className="bp-btn bp-btn-outline" onClick={() => window.print()}>Print</button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
          marginTop: 14,
        }}
      >
        {summaryCards.map(([label, value]) => (
          <div key={label} className="bp-card bp-kpi">
            <div className="label">{label}</div>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>

      <div className="bp-card no-print" style={{ marginTop: 14 }}>
        <form onSubmit={applyFilters} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <label>
            Financial Year
            <select className="bp-select" value={fy} onChange={(e) => { setFy(e.target.value); setTaxPeriod(''); }}>
              <option value="">All</option>
              {buildFyOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label>
            Tax Period
            <select className="bp-select" value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)} disabled={!fy}>
              <option value="">All</option>
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label>
            Supplier GSTIN
            <input className="bp-input" value={supplierGstin} onChange={(e) => setSupplierGstin(e.target.value)} placeholder="e.g. 27ABCDE..." />
          </label>
          <label>
            Supplier Name
            <input className="bp-input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Search supplier" />
          </label>
          <label>
            Invoice Number
            <input className="bp-input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Search invoice #" />
          </label>
          <label>
            Match Status
            <select className="bp-select" value={matchStatus} onChange={(e) => setMatchStatus(e.target.value)}>
              <option value="">All</option>
              <option value="matched">Matched</option>
              <option value="unmatched">Unmatched</option>
            </select>
          </label>
          <button type="submit" className="bp-btn bp-btn-primary">Search</button>
          <button type="button" className="bp-btn bp-btn-outline" onClick={clearFilters}>Clear</button>
        </form>
      </div>

      {err && <p className="bp-alert bp-alert-error" style={{ marginTop: 12 }}>{err}</p>}

      <div className="bp-card" style={{ marginTop: 14, overflowX: 'auto' }}>
        {loading ? <p>Loading…</p> : (
          <>
            <table className="bp-table">
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
                    <td>{formatDate(r.invoice_date)}</td>
                    <td>{money(r.taxable_value)}</td>
                    <td>{money(r.cgst)}</td>
                    <td>{money(r.sgst)}</td>
                    <td>{money(r.igst)}</td>
                    <td>{money(r.total_gst)}</td>
                    <td>{eligibilityBadge(r.itc_eligibility)}</td>
                    <td>
                      <select
                        className="bp-select"
                        aria-label={`Match status for invoice ${r.invoice_number || r.id}`}
                        value={pendingStatus?.invoiceId === r.id ? pendingStatus.status : (r.match_status || 'unmatched')}
                        disabled={pendingStatus !== null}
                        onChange={(e) => updateMatchStatus(r, e.target.value)}
                      >
                        <option value="matched">Matched</option>
                        <option value="unmatched">Unmatched</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={COLUMNS.length}>No GSTR-2B invoice data found for the selected filters</td></tr>}
              </tbody>
            </table>

            {rows.length > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13 }}>
                <span>Page {currentPage} of {lastPage} · {total} invoice{total === 1 ? '' : 's'}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="bp-btn bp-btn-outline" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                  <button type="button" className="bp-btn bp-btn-outline" disabled={currentPage >= lastPage} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
