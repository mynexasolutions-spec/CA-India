import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api, getAuthToken } from '../../api/client';
import { LoadingBlock } from '../../components/Spinner';
import BillingDateFilters from './BillingDateFilters';
import DocActionMenu from './DocActionMenu';
import DocSummaryCards from './DocSummaryCards';
import NumberedPagination from './NumberedPagination';
import CancelDocumentModal from './CancelDocumentModal';
import { isDocTypeDisabled } from './billingProfile';
import {
  billingDocEditPath, billingDocPath, currentFyRange, docTypeLabel,
  formatDMY, formatDMYTime, money, paymentStatusBadge, paymentStatusLabel,
} from './billingUtils';

/** Billing Module spec §8/§9 — the only tab with a "+ Create Document ▼" dropdown. */
const CREATE_OPTIONS = [
  { type: 'quotation', label: 'Quotation', to: '/portal/billing/quotation/new' },
  { type: 'tax_invoice', label: 'Tax Invoice', to: '/portal/billing/invoices/new' },
  { type: 'bill_of_supply', label: 'Bill of Supply', to: '/portal/billing/bill-of-supply/new' },
  { type: 'debit_note', label: 'Debit Note', to: '/portal/billing/debit-notes/new' },
  { type: 'credit_note', label: 'Credit Note', to: '/portal/billing/credit-notes/new' },
];

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="14" y2="9"/>
    </svg>
  );
}

function CreateDocumentDropdown({ profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const options = CREATE_OPTIONS.filter((o) => !isDocTypeDisabled(profile, o.type));

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!options.length) return null;

  return (
    <div className="bp-dropdown-wrap" ref={ref}>
      <button type="button" className="bp-btn bp-btn-primary" onClick={() => setOpen((v) => !v)}>
        <PlusIcon /> Create Document {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>
      {open && (
        <div className="bp-dropdown-panel">
          <div className="bp-dropdown-panel-head">Create Document</div>
          {options.map((o) => (
            <Link key={o.type} className="bp-dropdown-item" to={o.to} onClick={() => setOpen(false)}>{o.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Billing Module spec §10 — action set per document type, reused for the All Documents tab.
 * Edit Request spec: an issued document is directly editable (no admin approval) as long as
 * its month isn't locked (GST Filing Confirmation submitted, or the GST Return actually
 * filed) — matches the backend's InvoiceService::updateDraft(). */
function buildActions(d, { onConvert, onDuplicate, onSend, onMarkPaid, onCancel }) {
  const editPath = billingDocEditPath(d.type, d.id);
  const isIssuedFamily = ['issued', 'partial', 'paid'].includes(d.status);
  const canEditDraft = d.status === 'draft' && editPath;
  const canDirectEdit = isIssuedFamily && !d.direct_edit_locked && editPath;
  const canAdminUnlockedEdit = isIssuedFamily && d.edit_allowed && editPath;
  const cancellable = d.status !== 'cancelled' && d.status !== 'draft' && !(d.type === 'quotation' && d.converted_document_id);
  const editOrRequest = canEditDraft
    ? { label: 'Edit', to: editPath }
    : canAdminUnlockedEdit
      ? { label: 'Edit Allowed', to: editPath }
      : canDirectEdit
        ? { label: 'Edit', to: editPath }
        : isIssuedFamily
          ? (d.gst_return_filed
            ? { label: 'Request Edit', disabled: true, disabledReason: 'GST Return for this period has already been filed. Use Credit Note, Debit Note, or Amendment instead.' }
            : { label: 'Request Edit', to: '/portal/edit-requests' })
          : null;

  const view = { label: `View ${docTypeLabel(d.type)}`, to: billingDocPath(d.type, d.id) };
  const downloadPdf = {
    label: 'Download PDF',
    onClick: () => api(`/billing/documents/${d.id}/pdf`)
      .then((r) => window.open(r.url, '_blank'))
      .catch((e) => alert(e.message || 'Failed to download PDF.')),
  };
  const send = { label: 'Send', onClick: () => onSend(d) };
  const duplicate = { label: 'Duplicate', onClick: () => onDuplicate(d) };
  const markPaid = ['issued', 'partial'].includes(d.status) ? { label: 'Mark as Paid', onClick: () => onMarkPaid(d) } : null;
  const cancel = cancellable ? { label: 'Cancel', danger: true, onClick: () => onCancel(d) } : null;

  if (d.type === 'quotation') {
    const convert = !d.converted_document_id && d.status !== 'cancelled' ? { label: 'Convert to Tax Invoice', onClick: () => onConvert(d) } : null;
    return [view, editOrRequest, downloadPdf, send, duplicate, convert, cancel];
  }
  if (d.type === 'bill_of_supply') return [view, downloadPdf, editOrRequest, send, cancel];
  if (d.type === 'debit_note') return [view, downloadPdf, editOrRequest, markPaid, cancel];
  if (d.type === 'credit_note') return [view, downloadPdf, editOrRequest, cancel];
  return [view, downloadPdf, editOrRequest, duplicate, send, markPaid, cancel];
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
  const [totals, setTotals] = useState(null);
  const [typeCounts, setTypeCounts] = useState(null);
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
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

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
        
        let apiTotals = d.totals || null;
        const hasValidTotals = apiTotals && typeof apiTotals === 'object' && 'count' in apiTotals && Number(apiTotals.count) > 0;
        
        if (!hasValidTotals && d.data && d.data.length > 0) {
          const taxable = d.data.reduce((sum, row) => sum + Number(row.taxable_amount || 0), 0);
          const gst = d.data.reduce((sum, row) => sum + (Number(row.cgst_amount || 0) + Number(row.sgst_amount || 0) + Number(row.igst_amount || 0)), 0);
          const grand = d.data.reduce((sum, row) => sum + Number(row.grand_total || row.total_amount || 0), 0);
          apiTotals = {
            count: d.total || d.data.length,
            taxable_amount: taxable,
            gst_amount: gst,
            grand_total: grand
          };
        }
        setTotals(apiTotals);
        setTypeCounts(d.type_counts || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => { setPage(1); load(1); };

  const doConvert = async (d) => {
    setMsg(''); setErr('');
    try {
      const inv = await api(`/billing/documents/${d.id}/convert`, { method: 'POST', body: {} });
      window.location.href = `/portal/billing/invoices/${inv.id}`;
    } catch (e) {
      setErr(e.message || 'Failed to convert to Tax Invoice.');
    }
  };
  const doDuplicate = async (d) => {
    setMsg(''); setErr('');
    try {
      const copy = await api(`/billing/documents/${d.id}/duplicate`, { method: 'POST', body: {} });
      window.location.href = billingDocEditPath(copy.type, copy.id) || billingDocPath(copy.type, copy.id);
    } catch (e) {
      setErr(e.message || 'Failed to duplicate document.');
    }
  };
  const doSend = async (d) => {
    setMsg(''); setErr('');
    try {
      const r = await api(`/billing/documents/${d.id}/email`, { method: 'POST', body: {} });
      setMsg(r.message || 'Email sent successfully.');
    } catch (e) {
      setErr(e.message || 'Failed to send email.');
    }
  };
  const doMarkPaid = async (d) => {
    setMsg(''); setErr('');
    try {
      await api(`/billing/documents/${d.id}/payment-status`, { method: 'POST', body: { status: 'paid' } });
      setMsg('Marked as Paid.');
      load();
    } catch (e) {
      setErr(e.message || 'Failed to mark as paid.');
    }
  };
  const confirmCancel = async (reason) => {
    setCancelBusy(true);
    setMsg(''); setErr('');
    try {
      await api(`/billing/documents/${cancelTarget.id}/cancel`, { method: 'POST', body: { reason } });
      setCancelTarget(null);
      setMsg(`${docTypeLabel(cancelTarget.type)} ${cancelTarget.number} cancelled.`);
      load();
    } catch (e) {
      setErr(e.message || 'Failed to cancel document.');
    } finally {
      setCancelBusy(false);
    }
  };

  /** §23 — export must reflect the same filtered result shown on screen, not just
   *  the current page: re-fetch the full filtered set (up to the API's 500 cap) first. */
  const exportCsv = async () => {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (month) qs.set('month', month);
    if (fy) qs.set('fy', fy);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (status) qs.set('status', status);
    if (docType) qs.set('type', docType);
    qs.set('per_page', 500);
    qs.set('page', 1);
    const d = await api(`/billing/documents?${qs}`);
    const allRows = d.data || [];
    const header = ['Number', 'Date', 'Created', 'Type', 'Party', 'GSTIN', 'Taxable', 'GST', 'Total', 'Status'];
    const lines = allRows.map((doc) => [
      doc.number,
      formatDMY(doc.document_date),
      formatDMYTime(doc.created_at),
      docTypeLabel(doc.type),
      doc.customer?.name || '—',
      doc.customer?.gstin_display || doc.customer?.gstin || 'Unregistered',
      doc.taxable_amount,
      Number(doc.cgst_amount) + Number(doc.sgst_amount) + Number(doc.igst_amount),
      doc.grand_total || doc.total_amount,
      paymentStatusLabel(doc.status),
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

  /** PDF export uses the shared reports endpoint (branded header, formatted table) —
   * scoped to the active From/To date range (the reports endpoint doesn't support the
   * search/status/type filters exportCsv respects). */
  const exportPdf = async () => {
    const token = getAuthToken();
    const qs = new URLSearchParams({ type: 'document_register', from, to, format: 'pdf' });
    const res = await fetch(`/api/billing/reports/export?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-and-documents_${from || 'all'}_to_${to || 'all'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bp-billing-dashboard" style={{ zoom: 0.9 }}>
      <div className="bp-toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>All Documents</h2>
        <CreateDocumentDropdown profile={profile} />
        <div className="bp-toolbar-export-row" style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="bp-toolbar-export-btn" onClick={exportCsv} disabled={!meta.total}
            style={{ height: 38, padding: '0 16px', borderRadius: 10, border: '1.5px solid #16a34a', background: '#fff', color: '#16a34a', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: meta.total ? 'pointer' : 'not-allowed', opacity: meta.total ? 1 : 0.5 }}>
            <ExcelIcon /> Export Excel
          </button>
          <button type="button" className="bp-toolbar-export-btn" onClick={exportPdf} disabled={!meta.total}
            style={{ height: 38, padding: '0 16px', borderRadius: 10, border: '1.5px solid #ef4444', background: '#fff', color: '#ef4444', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: meta.total ? 'pointer' : 'not-allowed', opacity: meta.total ? 1 : 0.5 }}>
            <DocIcon /> Export PDF
          </button>
        </div>
      </div>

      <DocSummaryCards typeCounts={typeCounts} />

      <div className="bp-card">
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
        {msg && <p style={{ margin: '0 0 10px', color: 'var(--bp-green)', fontSize: 13 }}>{msg}</p>}
        {err && <p style={{ margin: '0 0 10px', color: 'var(--bp-red)', fontSize: 13 }}>{err}</p>}
        {loading ? <LoadingBlock /> : (
          <div className="bp-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="bp-table bp-docs-table bp-doc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th>GSTIN</th>
                  <th>Taxable Value</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d, i) => (
                  <tr key={d.id}>
                    <td>{(meta.current_page - 1) * meta.per_page + i + 1}</td>
                    <td><Link className="bp-doc-num-link" to={billingDocPath(d.type, d.id)}>{d.number}</Link></td>
                    <td>{formatDMY(d.document_date)}</td>
                    <td>{d.customer?.name || '—'}</td>
                    <td>{d.customer?.gstin_display || d.customer?.gstin || 'Unregistered'}</td>
                    <td>{money(d.taxable_amount)}</td>
                    <td>{d.type === 'bill_of_supply' ? '—' : money(Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount))}</td>
                    <td className="bp-doc-total">{money(d.grand_total || d.total_amount)}</td>
                    <td><span className={`bp-badge ${paymentStatusBadge(d.status)}`}>{paymentStatusLabel(d.status)}</span></td>
                    <td>{formatDMYTime(d.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                        <Link className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} to={billingDocPath(d.type, d.id)}>View</Link>
                        <DocActionMenu
                          actions={buildActions(d, { onConvert: doConvert, onDuplicate: doDuplicate, onSend: doSend, onMarkPaid: doMarkPaid, onCancel: setCancelTarget })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={11} className="bp-table-empty">No documents for selected filters</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="bp-table-footer">
          {totals && totals.count > 0 && (
            <div className="bp-doc-totals-bar">
              <span className="bp-doc-totals-label">
                <span className="bp-doc-totals-rupee" aria-hidden="true">₹</span>
                Total (Filtered Results)
              </span>
              <div className="bp-doc-totals-stats">
                <div className="bp-doc-totals-stat"><strong>{money(totals.taxable_amount)}</strong>Taxable Value</div>
                <div className="bp-doc-totals-stat"><strong>{money(totals.gst_amount)}</strong>GST</div>
                <div className="bp-doc-totals-stat"><strong>{money(totals.grand_total)}</strong>Total</div>
              </div>
            </div>
          )}

          <NumberedPagination
            meta={meta}
            perPage={perPage}
            onPerPage={(v) => { setPerPage(v); setPage(1); }}
            onPage={setPage}
          />
        </div>
      </div>
      </div>
      {cancelTarget && (
        <CancelDocumentModal
          docLabel={`${docTypeLabel(cancelTarget.type)} ${cancelTarget.number}`}
          busy={cancelBusy}
          onCancel={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      )}
    </>
  );
}
