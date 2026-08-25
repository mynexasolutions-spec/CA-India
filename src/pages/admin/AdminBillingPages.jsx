import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getAuthToken } from '../../api/client';
import ReportTable from '../billing/ReportTable';
import GstSummaryMatrix, { resolveGstMatrix } from '../billing/GstSummaryMatrix';
import { docTypeLabel } from '../billing/billingUtils';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function AdminBillingDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/admin/billing/dashboard').then(setData).catch(console.error);
  }, []);
  if (!data) return <p>Loading…</p>;
  const k = data.kpis;
  const g = data.gst_fy;
  const max = Math.max(...(data.monthly_trend || []).map((m) => Number(m.total || 0)), 1);

  return (
    <div>
      <div className="bp-grid-4">
        {[
          ['Total Clients', k.total_clients],
          ['Total Invoices', k.total_invoices],
          ['Tax Invoice/Bill of Supply', k.tax_invoices],
          ['Debit / Credit', `${k.debit_notes} / ${k.credit_notes}`],
        ].map(([label, val]) => (
          <div key={label} className="bp-card bp-kpi"><div className="label">{label}</div><div className="value">{val}</div></div>
        ))}
      </div>
      <div className="bp-split" style={{ marginTop: 14 }}>
        <div className="bp-card">
          <h3 style={{ marginTop: 0 }}>Monthly Invoice Trend</h3>
          <div className="bp-chart">
            {(data.monthly_trend || []).map((m) => (
              <div key={m.month} className="bp-chart-bar" style={{ height: `${Math.max(8, (Number(m.total) / max) * 100)}%` }}>
                <span>{String(m.month).slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bp-gst-box">
          <h3>GST Summary (This FY)</h3>
          {[
            ['Taxable Value', money(g.taxable_value)],
            ['CGST', money(g.cgst)],
            ['SGST', money(g.sgst)],
            ['IGST', money(g.igst)],
            ['Total GST', money(g.total_gst)],
            ['Total Invoice Value', money(g.total_invoice_value)],
          ].map(([a, b]) => (
            <div key={a} className="bp-gst-row"><span>{a}</span><strong>{b}</strong></div>
          ))}
        </div>
      </div>
      <div className="bp-card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Client-wise Invoice Summary</h3>
        <table className="bp-table">
          <thead><tr><th>Client</th><th>Tax</th><th>DN</th><th>CN</th><th>Total</th></tr></thead>
          <tbody>
            {(data.client_wise || []).map((c) => (
              <tr key={c.id}>
                <td>{c.business_name}<div style={{ fontSize: 11, color: 'var(--bp-muted)' }}>{c.gstin}</div></td>
                <td>{c.tax_invoices_count}</td>
                <td>{c.debit_notes_count}</td>
                <td>{c.credit_notes_count}</td>
                <td>{money(c.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bp-card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>HSN/SAC Snapshot (FY)</h3>
        <table className="bp-table">
          <thead><tr><th>HSN/SAC</th><th>Description</th><th>Qty</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead>
          <tbody>
            {(data.hsn_summary || []).slice(0, 10).map((r) => (
              <tr key={r.hsn_sac || r.description}>
                <td>{r.hsn_sac || '—'}</td>
                <td>{r.description || '—'}</td>
                <td>{r.qty}</td>
                <td>{money(r.taxable)}</td>
                <td>{money(r.gst)}</td>
                <td>{money(r.total)}</td>
              </tr>
            ))}
            {!data.hsn_summary?.length && <tr><td colSpan={6}>No HSN data yet</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="bp-card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Recent Invoices</h3>
        <table className="bp-table">
          <thead><tr><th>No.</th><th>Client</th><th>Party</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {(data.recent_invoices || []).map((d) => (
              <tr key={d.id}>
                <td><Link to={`/admin/billing/invoices/${d.id}`}>{d.number}</Link></td>
                <td>{d.client_profile?.business_name}</td>
                <td>{d.customer?.name}</td>
                <td>{String(d.document_date).slice(0, 10)}</td>
                <td>{money(d.grand_total || d.total_amount)}</td>
                <td><span className={`bp-badge bp-badge-${d.status}`}>{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminBillingInvoices({ type = '', title = 'All Client Invoices' }) {
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState([]);

  const detailBase = type === 'debit_note'
    ? '/admin/billing/debit-notes'
    : type === 'credit_note'
      ? '/admin/billing/credit-notes'
      : '/admin/billing/invoices';

  const load = () => {
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (q) qs.set('q', q);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    api(`/admin/billing/invoices?${qs}`).then((d) => setRows(d.data || []));
  };

  useEffect(() => { load(); }, [type]);

  return (
    <div className="bp-card">
      <div className="bp-toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>{title}</h2>
        <input className="bp-input" style={{ maxWidth: 220 }} placeholder="Client / invoice / GSTIN / party" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="bp-input" style={{ maxWidth: 150 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="bp-input" style={{ maxWidth: 150 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="bp-btn bp-btn-outline" onClick={load}>Search</button>
      </div>
      <table className="bp-table">
        <thead><tr><th>No.</th><th>Client</th><th>Party</th><th>Date</th><th>Type</th><th>Total</th><th>Status</th><th>Created</th><th /></tr></thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td><Link to={`${detailBase}/${d.id}`}>{d.number}</Link></td>
              <td>{d.client_profile?.business_name}<div style={{ fontSize: 11, color: 'var(--bp-muted)' }}>{d.client_profile?.gstin}</div></td>
              <td>{d.customer?.name}</td>
              <td>{String(d.document_date).slice(0, 10)}</td>
              <td>{d.type}</td>
              <td>{money(d.grand_total || d.total_amount)}</td>
              <td><span className={`bp-badge bp-badge-${d.status}`}>{d.status}</span></td>
              <td>{d.created_at ? new Date(d.created_at).toLocaleString('en-IN') : '—'}</td>
              <td><Link className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} to={`${detailBase}/${d.id}`}>View</Link></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={9}>No documents found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function AdminInvoiceDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setDoc(null);
    setErr('');
    api(`/admin/billing/invoices/${id}`)
      .then(setDoc)
      .catch((e) => setErr(e.message || 'Failed to load invoice'));
  }, [id]);

  if (err) {
    return (
      <div className="bp-card">
        <p style={{ color: 'var(--bp-danger, #b91c1c)' }}>{err}</p>
        <Link className="bp-btn bp-btn-outline" to="/admin/billing/invoices">Back to invoices</Link>
      </div>
    );
  }
  if (!doc) return <p>Loading…</p>;

  const backPath = doc.type === 'debit_note'
    ? '/admin/billing/debit-notes'
    : doc.type === 'credit_note'
      ? '/admin/billing/credit-notes'
      : '/admin/billing/invoices';

  return (
    <div className="bp-card">
      <div className="bp-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>{docTypeLabel(doc.type)} · {doc.number}</h2>
          <div style={{ fontSize: 13, color: 'var(--bp-muted)' }}>
            {String(doc.document_date).slice(0, 10)}
            {doc.due_date ? ` · Due ${String(doc.due_date).slice(0, 10)}` : ''}
            {' · '}<span className={`bp-badge bp-badge-${doc.status}`}>{doc.status}</span>
            {doc.issued_at ? ` · Issued ${new Date(doc.issued_at).toLocaleString('en-IN')}` : ''}
          </div>
        </div>
        <div className="bp-actions" style={{ marginTop: 0 }}>
          <Link className="bp-btn bp-btn-outline" to={backPath}>Back</Link>
          <button
            type="button"
            className="bp-btn bp-btn-primary"
            onClick={async () => {
              const r = await api(`/admin/billing/invoices/${doc.id}/pdf`);
              window.open(r.url, '_blank');
            }}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="bp-split" style={{ marginTop: 14 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Client (Seller)</h3>
          <p style={{ margin: '4px 0' }}><strong>{doc.client_profile?.business_name || '—'}</strong></p>
          <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            GSTIN: {doc.client_profile?.gstin || '—'} · PAN: {doc.client_profile?.pan || '—'}
          </p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>{doc.client_profile?.email || ''}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>{doc.client_profile?.address || ''}</p>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Party (Buyer)</h3>
          <p style={{ margin: '4px 0' }}><strong>{doc.customer?.name || '—'}</strong></p>
          <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            GSTIN: {doc.customer?.gstin || '—'} · State: {doc.customer?.state || doc.customer?.state_code || '—'}
          </p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>{doc.customer?.email || ''} {doc.customer?.phone ? `· ${doc.customer.phone}` : ''}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>{doc.customer?.billing_address || ''}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>Place of supply: {doc.place_of_supply || '—'} · {doc.is_inter_state ? 'Inter-state (IGST)' : 'Intra-state (CGST/SGST)'}</p>
        </div>
      </div>

      {doc.reference_document && (
        <p style={{ marginTop: 12 }}>
          Linked original: <Link to={`/admin/billing/invoices/${doc.reference_document.id}`}><strong>{doc.reference_document.number}</strong></Link>
          {' '}({docTypeLabel(doc.reference_document.type)})
        </p>
      )}

      {(doc.payment_terms || doc.notes || doc.terms) && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          {doc.payment_terms && <p><strong>Payment terms:</strong> {doc.payment_terms}</p>}
          {doc.notes && <p><strong>Notes:</strong> {doc.notes}</p>}
          {doc.terms && <p><strong>Terms:</strong> {doc.terms}</p>}
        </div>
      )}

      <table className="bp-table bp-invoice-table" style={{ marginTop: 16 }}>
        <colgroup>
          <col style={{ width: '3%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '6%' }} />
          {doc.is_inter_state ? (
            <col style={{ width: '21%' }} />
          ) : (
            <>
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </>
          )}
          <col style={{ width: doc.is_inter_state ? '12%' : '9%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>#</th><th>Particulars</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Disc%</th><th>Taxable</th><th>GST%</th>
            {doc.is_inter_state ? <th>IGST</th> : <><th>CGST</th><th>SGST</th></>}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {(doc.line_items || []).map((l, i) => (
            <tr key={l.id}>
              <td>{i + 1}</td>
              <td>{l.description}</td>
              <td>{l.hsn_sac}</td>
              <td>{l.qty} {l.unit}</td>
              <td>{money(l.rate)}</td>
              <td>{l.discount_percent}</td>
              <td>{money(l.taxable_amount)}</td>
              <td>{l.gst_rate}</td>
              {doc.is_inter_state ? (
                <td>{money(l.igst_amount)}</td>
              ) : (
                <>
                  <td>{money(l.cgst_amount)}</td>
                  <td>{money(l.sgst_amount)}</td>
                </>
              )}
              <td>{money(l.total_amount)}</td>
            </tr>
          ))}
          {!doc.line_items?.length && <tr><td colSpan={doc.is_inter_state ? 10 : 11}>No line items</td></tr>}
        </tbody>
      </table>

      <div className="bp-gst-box" style={{ maxWidth: 360, marginTop: 16, marginLeft: 'auto' }}>
        <div className="bp-gst-row"><span>Discount</span><strong>{money(doc.discount_total)}</strong></div>
        <div className="bp-gst-row"><span>Taxable</span><strong>{money(doc.taxable_amount)}</strong></div>
        <div className="bp-gst-row">
          <span>GST</span>
          <strong>{money(doc.is_inter_state ? doc.igst_amount : Number(doc.cgst_amount) + Number(doc.sgst_amount))}</strong>
        </div>
        {doc.tax_deduction_type ? (
          <>
            <div className="bp-gst-row"><span>Total Value (Post GST)</span><strong>{money(doc.total_amount)}</strong></div>
            <div className="bp-gst-row" style={{ color: doc.tax_deduction_type === 'tds' ? 'var(--bp-red)' : 'var(--bp-green)' }}>
              <span>
                {doc.tax_deduction_type === 'tds' ? 'Less: TDS' : 'Add: TCS'}
                {doc.tds_tcs_section ? ` (${Number(doc.tds_tcs_rate).toFixed(2)}% u/s ${doc.tds_tcs_section.code})` : ''}
              </span>
              <strong>{money(doc.tds_tcs_amount)}</strong>
            </div>
            <div className="bp-gst-row"><span>Grand Total</span><strong>{money(doc.grand_total || doc.total_amount)}</strong></div>
          </>
        ) : (
          <>
            <div className="bp-gst-row"><span>Round Off</span><strong>{money(doc.round_off)}</strong></div>
            <div className="bp-gst-row"><span>Grand Total</span><strong>{money(doc.grand_total || doc.total_amount)}</strong></div>
          </>
        )}
        {doc.amount_in_words && <p style={{ fontSize: 12 }}><em>{doc.amount_in_words}</em></p>}
      </div>
    </div>
  );
}

function ReportExportBar({ type, from, to, setFrom, setTo, onRun }) {
  const download = async (format) => {
    const token = getAuthToken();
    const qs = new URLSearchParams({ type, format });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const res = await fetch(`/api/admin/billing/reports?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // Export is legacy SpreadsheetML XML, not real OOXML — must be named .xls, not
    // .xlsx, or Excel refuses to open it ("file format or extension is not valid").
    const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xls' : 'csv';
    a.download = `admin-${type}.${ext}`;
    a.click();
  };

  return (
    <div className="bp-card" style={{ marginBottom: 14 }}>
      <div className="bp-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          From date
          <input className="bp-input" style={{ maxWidth: 160 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          To date
          <input className="bp-input" style={{ maxWidth: 160 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="bp-btn bp-btn-primary" onClick={onRun}>Apply</button>
        <button type="button" className="bp-btn bp-btn-green" onClick={() => download('xlsx')}>Export Excel</button>
        <button type="button" className="bp-btn bp-btn-danger" onClick={() => download('pdf')}>Export PDF</button>
      </div>
    </div>
  );
}

export function AdminBillingReports() {
  const [type, setType] = useState('gst_summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const run = () => {
    setLoading(true);
    api(`/admin/billing/reports?type=${type}&from=${from}&to=${to}`)
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(() => { run(); }, [type]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Reports</h2>
      <div className="bp-report-grid">
        {[
          { t: 'gst_summary', l: 'GST Summary' },
          { t: 'hsn_summary', l: 'HSN/SAC Summary' },
          { t: 'monthly_sales', l: 'Monthly Sales' },
          { t: 'client_wise_register', l: 'Client-wise Register' },
          { t: 'party_wise', l: 'Party-wise Detail' },
        ].map(({ t, l }) => (
          <button key={t} type="button" className={`bp-report-tile ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>{l}</button>
        ))}
      </div>
      <ReportExportBar type={type} from={from} to={to} setFrom={setFrom} setTo={setTo} onRun={run} />
      <div className="bp-card" style={{ marginTop: 14, overflowX: 'auto' }}>
        {loading ? <p>Loading…</p> : (
          type === 'gst_summary' ? (
            <GstSummaryMatrix matrix={resolveGstMatrix(data)} title="" />
          ) : (
            <ReportTable type={type} payload={data} detailBasePath="/admin/billing/invoices" />
          )
        )}
      </div>
    </div>
  );
}

export function AdminGstSummary() {
  const [data, setData] = useState(null);
  const [dash, setDash] = useState(null);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const run = () => {
    api(`/admin/billing/reports?type=gst_summary&from=${from}&to=${to}`).then(setData);
    api('/admin/billing/dashboard').then(setDash);
  };
  useEffect(() => { run(); }, []);

  const g = data?.data || data || {};
  const fy = dash?.gst_fy || {};

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>GST & Tax Summary</h2>
      <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 0 }}>
        Filter selected-period GST totals using From date and To date below.
      </p>
      <ReportExportBar type="gst_summary" from={from} to={to} setFrom={setFrom} setTo={setTo} onRun={run} />
      <div className="bp-grid-4" style={{ marginTop: 14 }}>
        {[
          ['Total Invoices', dash?.kpis?.total_invoices ?? '—'],
          ['Taxable Value (FY)', money(fy.taxable_value)],
          ['Total GST (FY)', money(fy.total_gst)],
          ['Invoice Value (FY)', money(fy.total_invoice_value)],
        ].map(([label, val]) => (
          <div key={label} className="bp-card bp-kpi"><div className="label">{label}</div><div className="value">{val}</div></div>
        ))}
      </div>
      <div className="bp-split" style={{ marginTop: 14 }}>
        <div className="bp-gst-box">
          <h3>Financial Year GST</h3>
          {[
            ['CGST', money(fy.cgst)],
            ['SGST', money(fy.sgst)],
            ['IGST', money(fy.igst)],
            ['Total GST', money(fy.total_gst)],
          ].map(([a, b]) => (
            <div key={a} className="bp-gst-row"><span>{a}</span><strong>{b}</strong></div>
          ))}
        </div>
        <div className="bp-card">
          <h3 style={{ marginTop: 0 }}>Selected Period ({from} to {to})</h3>
          <GstSummaryMatrix matrix={resolveGstMatrix(data)} title="" />
        </div>
      </div>
      <div className="bp-card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Monthly GST Collection</h3>
        <table className="bp-table">
          <thead><tr><th>Month</th><th>Count</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead>
          <tbody>
            {(dash?.monthly_trend || []).map((m) => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td>{m.count}</td>
                <td>{money(m.taxable)}</td>
                <td>{money(m.gst)}</td>
                <td>{money(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminHsnSummary() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const run = () => api(`/admin/billing/reports?type=hsn_summary&from=${from}&to=${to}`).then((d) => {
    const raw = d?.data ?? d;
    setRows(Array.isArray(raw) ? raw : (raw?.rows || raw?.items || []));
  });

  useEffect(() => { run(); }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>HSN/SAC Summary</h2>
      <ReportExportBar type="hsn_summary" from={from} to={to} setFrom={setFrom} setTo={setTo} onRun={run} />
      <div className="bp-card" style={{ marginTop: 14 }}>
        <table className="bp-table">
          <thead>
            <tr>
              <th>HSN/SAC</th><th>Description</th><th>Qty</th><th>Taxable</th>
              <th>GST %</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.hsn_sac || r.hsn || i}`}>
                <td>{r.hsn_sac || r.hsn || '—'}</td>
                <td>{r.description || '—'}</td>
                <td>{r.qty ?? r.quantity ?? '—'}</td>
                <td>{money(r.taxable || r.taxable_amount)}</td>
                <td>{r.gst_rate != null ? `${r.gst_rate}%` : '—'}</td>
                <td>{money(r.cgst || r.cgst_amount)}</td>
                <td>{money(r.sgst || r.sgst_amount)}</td>
                <td>{money(r.igst || r.igst_amount)}</td>
                <td>{money(r.total || r.total_amount)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9}>No HSN/SAC data for this period</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
