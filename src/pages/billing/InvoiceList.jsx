import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isDocTypeDisabled, isRetail, docTypeLock } from './billingProfile';
import BillingDateFilters from './BillingDateFilters';
import { billingDocEditPath, billingDocPath, createButtonLabel, currentFyRange, money, paymentStatusBadge, paymentStatusLabel } from './billingUtils';

export default function InvoiceList({ type = 'tax_invoice', title = 'Tax Invoices', newPath, createLabel }) {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const disabled = isDocTypeDisabled(profile, type);
  const displayTitle = (isRetail(profile) && type === 'tax_invoice') ? 'Invoice' : title;
  const fyDefault = currentFyRange();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [fy, setFy] = useState(fyDefault.fy);
  const [from, setFrom] = useState(fyDefault.from);
  const [to, setTo] = useState(fyDefault.to);
  const [status, setStatus] = useState('');

  const load = () => {
    const qs = new URLSearchParams({ type });
    if (q) qs.set('q', q);
    if (month) qs.set('month', month);
    if (fy) qs.set('fy', fy);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (status) qs.set('status', status);
    api(`/billing/documents?${qs}`).then((d) => setRows(d.data || []));
  };

  useEffect(() => { load(); }, [type]);

  const buttonText = createLabel || createButtonLabel(type, profile);

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
          onApply={load}
          onClear={load}
        />
        <table className="bp-table">
          <thead>
            <tr>
              <th>Number</th><th>Date</th><th>Party</th><th>Taxable</th><th>GST</th><th>Total</th><th>Status</th><th>Created</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td><Link to={billingDocPath(type, d.id)}>{d.number}</Link></td>
                <td>{String(d.document_date).slice(0, 10)}</td>
                <td>{d.customer?.name || '—'}</td>
                <td>{money(d.taxable_amount)}</td>
                <td>{money(Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount))}</td>
                <td>{money(d.grand_total || d.total_amount)}</td>
                <td><span className={`bp-badge ${paymentStatusBadge(d.status)}`}>{paymentStatusLabel(d.status)}</span></td>
                <td>{d.created_at ? new Date(d.created_at).toLocaleString('en-IN') : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} to={billingDocPath(type, d.id)}>View</Link>
                  {d.status === 'draft' && billingDocEditPath(type, d.id) && (
                    <> · <Link to={billingDocEditPath(type, d.id)}>Edit</Link></>
                  )}
                  {d.edit_allowed && billingDocEditPath(type, d.id) && (
                    <> · <Link to={billingDocEditPath(type, d.id)}>Edit Allowed</Link></>
                  )}
                  {type === 'quotation' && !d.converted_document_id && d.status !== 'cancelled' && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="bp-btn bp-btn-primary"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={async () => {
                          const inv = await api(`/billing/documents/${d.id}/convert`, { method: 'POST', body: {} });
                          window.location.href = `/portal/billing/invoices/${inv.id}`;
                        }}
                      >
                        Convert
                      </button>
                    </>
                  )}
                  {type === 'quotation' && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="bp-btn bp-btn-outline"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={async () => {
                          const copy = await api(`/billing/documents/${d.id}/duplicate`, { method: 'POST', body: {} });
                          window.location.href = billingDocEditPath('quotation', copy.id);
                        }}
                      >
                        Duplicate
                      </button>
                    </>
                  )}
                  {['issued', 'partial'].includes(d.status) && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="bp-btn bp-btn-green"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={async () => {
                          await api(`/billing/documents/${d.id}/payment-status`, { method: 'POST', body: { status: 'paid' } });
                          load();
                        }}
                      >
                        Mark Paid
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9}>No documents found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
