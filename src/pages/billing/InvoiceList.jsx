import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isDocTypeDisabled, isRetail, docTypeLock } from './billingProfile';
import BillingDateFilters from './BillingDateFilters';
import DocActionMenu from './DocActionMenu';
import NumberedPagination from './NumberedPagination';
import CancelDocumentModal from './CancelDocumentModal';
import {
  billingDocEditPath, billingDocPath, createButtonLabel, currentFyRange,
  docTypeLabel, formatDMY, formatDMYTime, money, paymentStatusBadge, paymentStatusLabel,
} from './billingUtils';

/** Billing Module spec §10 — the exact action set per document type, in order.
 * Edit Request spec: an issued document is directly editable (no admin approval)
 * as long as its month isn't locked (GST Filing Confirmation submitted, or the GST
 * Return actually filed) — matches the backend's InvoiceService::updateDraft(). */
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
  if (d.type === 'bill_of_supply') {
    return [view, downloadPdf, editOrRequest, send, cancel];
  }
  if (d.type === 'debit_note') {
    return [view, downloadPdf, editOrRequest, markPaid, cancel];
  }
  if (d.type === 'credit_note') {
    return [view, downloadPdf, editOrRequest, cancel];
  }
  // tax_invoice / amendment / default
  return [view, downloadPdf, editOrRequest, duplicate, send, markPaid, cancel];
}

export default function InvoiceList({ type = 'tax_invoice', title = 'Tax Invoices', newPath, createLabel }) {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const disabled = isDocTypeDisabled(profile, type);
  const displayTitle = (isRetail(profile) && type === 'tax_invoice') ? 'Invoice' : title;
  const fyDefault = currentFyRange();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [fy, setFy] = useState(fyDefault.fy);
  const [from, setFrom] = useState(fyDefault.from);
  const [to, setTo] = useState(fyDefault.to);
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = (targetPage = page) => {
    const qs = new URLSearchParams({ type });
    if (q) qs.set('q', q);
    if (month) qs.set('month', month);
    if (fy) qs.set('fy', fy);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (status) qs.set('status', status);
    qs.set('per_page', perPage);
    qs.set('page', targetPage);
    api(`/billing/documents?${qs}`).then((d) => {
      setRows(d.data || []);
      setMeta({ current_page: d.current_page || 1, last_page: d.last_page || 1, total: d.total || 0, per_page: d.per_page || perPage });
    });
  };

  // Route-scoped component: a distinct <InvoiceList type="..."> instance mounts fresh
  // per tab, so a single effect keyed on [type, page, perPage] covers both the initial
  // load and any later page/rows-per-page change without double-fetching on mount.
  useEffect(() => { load(page); }, [type, page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => { setPage(1); load(1); };

  const buttonText = createLabel || createButtonLabel(type, profile);

  const showGst = type !== 'bill_of_supply';

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

  return (
    <div>
      <div className="bp-toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>{displayTitle}</h2>
        {disabled ? null : (
          <Link className="bp-btn bp-btn-primary" to={newPath || `/portal/billing/invoices/new`}>{buttonText}</Link>
        )}
      </div>
      {disabled && (
        <div className="bp-card" style={{ marginBottom: 14, borderColor: '#f0c36d', background: '#fff8e8' }}>
          <p style={{ margin: 0, color: '#8a5a00', fontSize: 14 }}>
            {docTypeLock(profile, type) || 'This document type is locked for your GST dealer type.'}
          </p>
        </div>
      )}
      {msg && <p style={{ margin: '0 0 10px', color: 'var(--bp-green)', fontSize: 13 }}>{msg}</p>}
      {err && <p style={{ margin: '0 0 10px', color: 'var(--bp-red)', fontSize: 13 }}>{err}</p>}
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
          onApply={applyFilters}
          onClear={applyFilters}
        />
        <div style={{ overflowX: 'auto' }}>
          <table className="bp-table bp-doc-table">
            <thead>
              <tr>
                <th>Number</th><th>Date</th><th>Party</th><th>GSTIN</th>
                <th>Taxable Value</th>
                {showGst && <th>GST</th>}
                <th>Total</th><th>Status</th><th>Created</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td><Link className="bp-doc-num-link" to={billingDocPath(type, d.id)}>{d.number}</Link></td>
                  <td>{formatDMY(d.document_date)}</td>
                  <td>{d.customer?.name || '—'}</td>
                  <td>{d.customer?.gstin_display || d.customer?.gstin || 'Unregistered'}</td>
                  <td>{money(d.taxable_amount)}</td>
                  {showGst && <td>{money(Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount))}</td>}
                  <td className="bp-doc-total">{money(d.grand_total || d.total_amount)}</td>
                  <td><span className={`bp-badge ${paymentStatusBadge(d.status)}`}>{paymentStatusLabel(d.status)}</span></td>
                  <td>{formatDMYTime(d.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                      <Link className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} to={billingDocPath(type, d.id)}>View</Link>
                      <DocActionMenu
                        actions={buildActions(d, { onConvert: doConvert, onDuplicate: doDuplicate, onSend: doSend, onMarkPaid: doMarkPaid, onCancel: setCancelTarget })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={showGst ? 9 : 8} className="bp-table-empty">No documents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <NumberedPagination
          meta={meta}
          perPage={perPage}
          onPerPage={(v) => { setPerPage(v); setPage(1); }}
          onPage={setPage}
        />
      </div>
      {cancelTarget && (
        <CancelDocumentModal
          docLabel={`${docTypeLabel(cancelTarget.type)} ${cancelTarget.number}`}
          busy={cancelBusy}
          onCancel={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      )}
    </div>
  );
}
