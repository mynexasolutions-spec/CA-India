import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import BillingDateFilters from './BillingDateFilters';
import { billingDocEditPath, billingDocPath, currentFyRange, docTypeLabel, money, paymentStatusBadge, paymentStatusLabel } from './billingUtils';

function formatCreatedAt(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function BillingDashboard() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const fyDefault = currentFyRange();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [fy, setFy] = useState(fyDefault.fy);
  const [from, setFrom] = useState(fyDefault.from);
  const [to, setTo] = useState(fyDefault.to);
  const [status, setStatus] = useState('');
  const [docType, setDocType] = useState('');

  const load = (targetPage = page) => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (month) qs.set('month', month);
    if (fy) qs.set('fy', fy);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (status) qs.set('status', status);
    if (docType) qs.set('type', docType);
    qs.set('per_page', perPage);
    qs.set('page', targetPage);
    api(`/billing/documents?${qs}`)
      .then((d) => {
        setRows(d.data || []);
        setMeta({ current_page: d.current_page || 1, last_page: d.last_page || 1, total: d.total || 0, per_page: d.per_page || perPage });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => { setPage(1); load(1); };
  const changePerPage = (value) => { setPerPage(value); setPage(1); };

  const exportCsv = () => {
    const header = ['Number', 'Date', 'Created', 'Type', 'Party', 'Taxable', 'GST', 'Total', 'Status'];
    const lines = rows.map((d) => [
      d.number,
      String(d.document_date).slice(0, 10),
      formatCreatedAt(d.created_at),
      docTypeLabel(d.type),
      d.customer?.name || '—',
      d.taxable_amount,
      Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount),
      d.grand_total || d.total_amount,
      paymentStatusLabel(d.status),
    ].map(csvCell).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-and-documents_${from || 'all'}_to_${to || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowFrom = meta.total ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  const rowTo = Math.min(meta.current_page * meta.per_page, meta.total);

  return (
    <div>
      <div className="bp-card">
        <div className="bp-docs-head">
          <span className="bp-docs-head-icon" aria-hidden="true">
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 2.5h7l3 3v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-14a.5.5 0 0 1 .5-.5Z" />
              <path d="M12 2.5V5.5a.5.5 0 0 0 .5.5H15.5" />
              <path d="M7 10.5h6M7 13h6M7 8h3" />
            </svg>
          </span>
          <div>
            <h3 style={{ margin: 0 }}>All Bills &amp; Documents</h3>
            <p className="bp-section-desc">View, track and manage all your invoices, debit notes and documents.</p>
          </div>
          <button type="button" className="bp-btn bp-btn-primary bp-docs-export" onClick={exportCsv} disabled={!rows.length}>
            ⭳ Export Report
          </button>
        </div>

        <BillingDateFilters
          q={q}
          setQ={setQ}
          month={month}
          setMonth={setMonth}
          fy={fy}
          setFy={setFy}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          status={status}
          setStatus={setStatus}
          docType={docType}
          setDocType={setDocType}
          showDocType
          profile={profile}
          onApply={applyFilters}
          onClear={applyFilters}
        />
        {loading ? <p>Loading…</p> : (
          <table className="bp-table bp-docs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Number</th>
                <th>Date</th>
                <th>Created</th>
                <th>Type</th>
                <th>Party</th>
                <th>Taxable</th>
                <th>GST</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const editPath = billingDocEditPath(d.type, d.id);
                return (
                  <tr key={d.id}>
                    <td>{rowFrom + i}</td>
                    <td><Link to={billingDocPath(d.type, d.id)}>{d.number}</Link></td>
                    <td>{String(d.document_date).slice(0, 10)}</td>
                    <td className="bp-docs-created">{formatCreatedAt(d.created_at)}</td>
                    <td>{docTypeLabel(d.type)}</td>
                    <td>{d.customer?.name || '—'}</td>
                    <td>{money(d.taxable_amount)}</td>
                    <td>{money(Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount))}</td>
                    <td>{money(d.grand_total || d.total_amount)}</td>
                    <td><span className={`bp-badge ${paymentStatusBadge(d.status)}`}>{paymentStatusLabel(d.status)}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} to={billingDocPath(d.type, d.id)}>View</Link>
                      {d.status === 'draft' && editPath && (
                        <> · <Link to={editPath}>Edit</Link></>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={11}>No documents for selected filters</td></tr>}
            </tbody>
          </table>
        )}

        {meta.total > 0 && (
          <div className="bp-pagination">
            <span>Showing {rowFrom} to {rowTo} of {meta.total} entries</span>
            <div className="bp-pagination-controls">
              <label>
                Rows per page:
                <select className="bp-select" style={{ width: 72 }} value={perPage} onChange={(e) => changePerPage(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <button type="button" className="bp-btn bp-btn-outline" disabled={meta.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>«</button>
              <span>{meta.current_page}</span>
              <button type="button" className="bp-btn bp-btn-outline" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
