import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import CancelDocumentModal from './CancelDocumentModal';
import { billingDocEditPath, billingDocPath, docTypeLabel, formatDMY, formatDMYTime } from './billingUtils';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = () => {
    setErr('');
    return api(`/billing/documents/${id}`)
      .then(setDoc)
      .catch((e) => setErr(e.message || 'Failed to load'));
  };
  useEffect(() => { setDoc(null); load(); }, [id]);

  if (err) {
    return (
      <div className="bp-card">
        <p style={{ color: '#b91c1c' }}>{err}</p>
        <Link className="bp-btn bp-btn-outline" to="/portal/billing">Back</Link>
      </div>
    );
  }
  if (!doc) return <p>Loading…</p>;

  const listBack = {
    tax_invoice: '/portal/billing/invoices',
    debit_note: '/portal/billing/debit-notes',
    credit_note: '/portal/billing/credit-notes',
    bill_of_supply: '/portal/billing/bill-of-supply',
    quotation: '/portal/quotation',
    amendment: '/portal/amendments',
  }[doc.type] || '/portal/billing';
  const editPath = billingDocEditPath(doc.type, doc.id);
  const canEdit = doc.status === 'draft' || (doc.edit_allowed && ['issued', 'partial', 'paid'].includes(doc.status));
  const cancellable = doc.status !== 'cancelled' && doc.status !== 'draft' && !(doc.type === 'quotation' && doc.converted_document_id);

  const confirmCancel = async (reason) => {
    setCancelBusy(true);
    try {
      await api(`/billing/documents/${doc.id}/cancel`, { method: 'POST', body: { reason } });
      setCancelling(false);
      setMsg('Document cancelled.');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="bp-card">
      <div className="bp-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>{docTypeLabel(doc.type)} · {doc.number}</h2>
          <div style={{ fontSize: 13, color: 'var(--bp-muted)' }}>
            {formatDMY(doc.document_date)}
            {doc.due_date ? ` · Due ${formatDMY(doc.due_date)}` : ''}
            {doc.currency && doc.currency !== 'INR' ? ` · ${doc.currency}` : ''}
            {' · '}
            <span className={`bp-badge ${doc.status === 'paid' ? 'bp-badge-paid' : doc.status === 'partial' ? 'bp-badge-partial' : doc.status === 'draft' ? 'bp-badge-draft' : doc.status === 'cancelled' ? 'bp-badge-cancelled' : 'bp-badge-unpaid'}`}>
              {doc.status === 'paid' ? 'Paid' : doc.status === 'partial' ? 'Partial' : doc.status === 'draft' ? 'Draft' : doc.status === 'cancelled' ? 'Cancelled' : 'Unpaid'}
            </span>
            {doc.edit_allowed ? <span className="bp-badge bp-badge-paid" style={{ marginLeft: 6 }}>Edit Allowed</span> : null}
          </div>
        </div>
        <div className="bp-actions" style={{ marginTop: 0 }}>
          <Link className="bp-btn bp-btn-outline" to={listBack}>Back</Link>
          {canEdit && editPath && (
            <Link className="bp-btn bp-btn-outline" to={editPath}>Edit</Link>
          )}
          {doc.status === 'draft' && (
            <button
              type="button"
              className="bp-btn bp-btn-green"
              onClick={async () => {
                await api(`/billing/documents/${doc.id}/issue`, { method: 'POST', body: {} });
                setMsg('Generated');
                load();
              }}
            >
              Generate / Issue
            </button>
          )}
          {doc.type === 'quotation' && !doc.converted_document_id && doc.status !== 'cancelled' && (
            <button
              type="button"
              className="bp-btn bp-btn-primary"
              onClick={async () => {
                try {
                  const inv = await api(`/billing/documents/${doc.id}/convert`, { method: 'POST', body: {} });
                  setMsg(`Converted to ${inv.number}`);
                  window.location.href = `/portal/billing/invoices/${inv.id}`;
                } catch (e) {
                  setErr(e.message);
                }
              }}
            >
              Convert to Tax Invoice/Bill of Supply
            </button>
          )}
          <button
            type="button"
            className="bp-btn bp-btn-outline"
            onClick={async () => {
              try {
                const copy = await api(`/billing/documents/${doc.id}/duplicate`, { method: 'POST', body: {} });
                setMsg(`Duplicated as ${copy.number}`);
                window.location.href = billingDocEditPath(copy.type, copy.id) || billingDocPath(copy.type, copy.id);
              } catch (e) {
                setErr(e.message);
              }
            }}
          >
            Duplicate
          </button>
          {doc.type === 'quotation' && !doc.converted_document_id && (
            <button
              type="button"
              className="bp-btn bp-btn-danger"
              onClick={async () => {
                if (!window.confirm('Delete this quotation?')) return;
                try {
                  await api(`/billing/documents/${doc.id}`, { method: 'DELETE' });
                  window.location.href = '/portal/quotation';
                } catch (e) {
                  setErr(e.message);
                }
              }}
            >
              Delete
            </button>
          )}
          {['issued', 'partial', 'paid'].includes(doc.status) && ['tax_invoice', 'credit_note', 'debit_note'].includes(doc.type) && !doc.edit_allowed && (
            doc.gst_return_filed ? (
              <span
                className="bp-btn bp-btn-amber"
                style={{ opacity: 0.45, cursor: 'not-allowed' }}
                title="Request Edit is disabled — the GST Return for this period has already been filed. Use Credit Note, Debit Note, or Amendment instead."
              >
                Request Edit
              </span>
            ) : (
              <Link className="bp-btn bp-btn-amber" to="/portal/edit-requests">Request Edit</Link>
            )
          )}
          {['issued', 'partial', 'paid'].includes(doc.status) && ['tax_invoice', 'credit_note', 'debit_note'].includes(doc.type) && (
            <Link className="bp-btn bp-btn-outline" to={`/portal/amendments/new?ref=${doc.id}`}>Create Amendment</Link>
          )}
          {['issued', 'partial', 'paid'].includes(doc.status) && (
            doc.status === 'paid' ? (
              <button
                type="button"
                className="bp-btn bp-btn-danger"
                onClick={async () => {
                  await api(`/billing/documents/${doc.id}/payment-status`, { method: 'POST', body: { status: 'unpaid' } });
                  setMsg('Marked Unpaid — appears in Outstanding');
                  load();
                }}
              >
                Mark Unpaid
              </button>
            ) : (
              <button
                type="button"
                className="bp-btn bp-btn-green"
                onClick={async () => {
                  await api(`/billing/documents/${doc.id}/payment-status`, { method: 'POST', body: { status: 'paid' } });
                  setMsg('Marked Paid — removed from Outstanding');
                  load();
                }}
              >
                Mark Paid
              </button>
            )
          )}
          <button
            type="button"
            className="bp-btn bp-btn-primary"
            onClick={async () => {
              const r = await api(`/billing/documents/${doc.id}/pdf`);
              window.open(r.url, '_blank');
            }}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="bp-btn bp-btn-outline"
            onClick={async () => {
              const r = await api(`/billing/documents/${doc.id}/pdf`);
              window.open(r.url, '_blank');
            }}
          >
            Print
          </button>
          <button
            type="button"
            className="bp-btn bp-btn-amber"
            onClick={async () => {
              const r = await api(`/billing/documents/${doc.id}/email`, { method: 'POST', body: {} });
              setMsg(r.message);
            }}
          >
            Email
          </button>
          {cancellable && (
            <button type="button" className="bp-btn bp-btn-danger" onClick={() => setCancelling(true)}>
              Cancel
            </button>
          )}
          {doc.share_token && (
            <a
              className="bp-btn bp-btn-green"
              href={`https://wa.me/?text=${encodeURIComponent(`Invoice ${doc.number}: https://abkhanassociates.com/api/billing/share/${doc.share_token}`)}`}
              title="Opens the invoice PDF"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {doc.status === 'cancelled' && (
        <div className="bp-info-note amber" style={{ marginTop: 14 }}>
          <div>
            <strong>This document is Cancelled{doc.cancelled_at ? ` — ${formatDMYTime(doc.cancelled_at)}` : ''}</strong>
            {doc.cancellation_reason ? `Reason: ${doc.cancellation_reason}` : 'No reason recorded.'}
            <br />
            It remains available to view and download, and was never deleted.
          </div>
        </div>
      )}

      <div className="bp-split" style={{ marginTop: 14 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Business</h3>
          <p style={{ margin: '4px 0' }}><strong>{doc.client_profile?.business_name || '—'}</strong></p>
          <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            GSTIN: {doc.client_profile?.gstin || '—'} · PAN: {doc.client_profile?.pan || '—'}
          </p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>{doc.client_profile?.address || ''}</p>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Party</h3>
          <p style={{ margin: '4px 0' }}><strong>{doc.customer?.name || '—'}</strong></p>
          <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            GSTIN: {doc.customer?.gstin_display || doc.customer?.gstin || 'Unregistered'} · State: {doc.customer?.state || doc.customer?.state_code || '—'}
          </p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>
            {doc.customer?.email || ''}{doc.customer?.phone ? ` · ${doc.customer.phone}` : ''}
          </p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>{doc.customer?.billing_address || ''}</p>
          <p style={{ margin: '4px 0', fontSize: 13 }}>
            Place of supply: {doc.place_of_supply || '—'} · {doc.is_inter_state ? 'Inter-state (IGST)' : 'Intra-state (CGST/SGST)'}
          </p>
        </div>
      </div>

      {doc.reference_document && (
        <p style={{ marginTop: 12 }}>
          Linked original invoice:{' '}
          <Link to={billingDocPath(doc.reference_document.type, doc.reference_document.id)}>
            <strong>{doc.reference_document.number}</strong>
          </Link>
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
            <th>#</th><th>Particulars</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Disc%</th>
            <th>Taxable</th><th>GST%</th>
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
        {doc.is_inter_state ? (
          <div className="bp-gst-row"><span>IGST</span><strong>{money(doc.igst_amount)}</strong></div>
        ) : (
          <>
            <div className="bp-gst-row"><span>CGST</span><strong>{money(doc.cgst_amount)}</strong></div>
            <div className="bp-gst-row"><span>SGST</span><strong>{money(doc.sgst_amount)}</strong></div>
          </>
        )}
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
      {msg && <p style={{ color: 'var(--bp-green)' }}>{msg}</p>}
      {cancelling && (
        <CancelDocumentModal
          docLabel={`${docTypeLabel(doc.type)} ${doc.number}`}
          busy={cancelBusy}
          onCancel={() => setCancelling(false)}
          onConfirm={confirmCancel}
        />
      )}
    </div>
  );
}
