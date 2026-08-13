import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isRetail } from '../billing/billingProfile';
import { billingDocEditPath, billingDocPath, docTypeLabel } from '../billing/billingUtils';

const REASONS = [
  'Incorrect GST Rate',
  'Wrong Quantity',
  'Wrong Customer Name',
  'Wrong HSN',
  'Others',
];

const DOC_TYPES = [
  { value: 'tax_invoice', label: 'Tax Invoice', retailLabel: 'Invoice' },
  { value: 'bill_of_supply', label: 'Bill of Supply' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'quotation', label: 'Quotation' },
];

export default function EditRequestPage() {
  const { user } = useAuth();
  const retail = isRetail(user?.client_profile);
  const types = DOC_TYPES.filter((t) => !(retail && t.value !== 'tax_invoice'));

  const [documentType, setDocumentType] = useState(types[0]?.value || 'tax_invoice');
  const [billNumber, setBillNumber] = useState('');
  const [lookup, setLookup] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [remarks, setRemarks] = useState('');
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/client/edit-requests?status=all')
      .then((d) => setRows(d.data?.data || d.data || []))
      .catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const doLookup = async () => {
    setErr('');
    setLookup(null);
    try {
      const d = await api(`/client/edit-requests/lookup?document_type=${encodeURIComponent(documentType)}&bill_number=${encodeURIComponent(billNumber)}`);
      setLookup(d);
    } catch (e) {
      setErr(e.message || 'Document not found');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await api('/client/edit-requests', {
        method: 'POST',
        body: { document_type: documentType, bill_number: billNumber, reason, remarks },
      });
      setMsg(res.message || 'Submitted');
      setLookup(null);
      setBillNumber('');
      setRemarks('');
      load();
    } catch (ex) {
      setErr(ex.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="bp-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Edit Request</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            Issued documents cannot be edited directly. Submit a request for Admin approval.
          </p>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 16 }}>
        <form onSubmit={submit} className="bp-form" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
          <label>
            <span className="bp-field-title">Document Type</span>
            <select className="bp-input" value={documentType} onChange={(e) => { setDocumentType(e.target.value); setLookup(null); }}>
              {types.map((t) => (
                <option key={t.value} value={t.value}>{retail && t.retailLabel ? t.retailLabel : t.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="bp-field-title">Invoice / Bill Number</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="bp-input" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="e.g. INV-1023" required />
              <button type="button" className="bp-btn bp-btn-outline" onClick={doLookup}>Fetch</button>
            </div>
          </label>

          {lookup && (
            <div className="bp-gst-box" style={{ maxWidth: '100%' }}>
              <div className="bp-gst-row"><span>Bill Number</span><strong>{lookup.bill_number}</strong></div>
              <div className="bp-gst-row"><span>Date</span><strong>{String(lookup.document_date).slice(0, 10)}</strong></div>
              <div className="bp-gst-row"><span>Customer</span><strong>{lookup.customer_name || '—'}</strong></div>
              <div className="bp-gst-row"><span>GSTIN</span><strong>{lookup.gstin || '—'}</strong></div>
              <div className="bp-gst-row"><span>Amount</span><strong>₹{Number(lookup.amount || 0).toLocaleString('en-IN')}</strong></div>
              <div className="bp-gst-row"><span>Status</span><strong>{lookup.status}</strong></div>
            </div>
          )}

          <label>
            <span className="bp-field-title">Reason for Edit</span>
            <select className="bp-input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>
            <span className="bp-field-title">Remarks</span>
            <textarea className="bp-input" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Describe the correction needed" />
          </label>
          <button type="submit" className="bp-btn bp-btn-primary" disabled={busy || !lookup}>
            {busy ? 'Submitting…' : 'Submit Request'}
          </button>
          {msg && <p style={{ color: 'var(--bp-green)', margin: 0 }}>{msg}</p>}
          {err && <p style={{ color: 'var(--bp-red)', margin: 0 }}>{err}</p>}
        </form>
      </div>

      <div className="bp-card">
        <h3 style={{ marginTop: 0 }}>My Requests</h3>
        <table className="bp-table">
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Bill</th><th>Type</th><th>Reason</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '—'}</td>
                <td>{r.bill_number}</td>
                <td>{docTypeLabel(r.document_type)}</td>
                <td>{r.reason}</td>
                <td>
                  <span className={`bp-badge ${r.status === 'approved' ? 'bp-badge-paid' : r.status === 'rejected' ? 'bp-badge-cancelled' : 'bp-badge-partial'}`}>
                    {r.status === 'approved' ? 'Edit Allowed' : r.status}
                  </span>
                </td>
                <td>
                  {r.status === 'approved' && r.document?.edit_allowed && billingDocEditPath(r.document_type, r.commercial_document_id) && (
                    <Link to={billingDocEditPath(r.document_type, r.commercial_document_id)}>Edit Bill</Link>
                  )}
                  {r.status === 'rejected' && (
                    <Link to={`/portal/amendments?bill=${encodeURIComponent(r.bill_number)}`}>Create Amendment</Link>
                  )}
                  {r.commercial_document_id && (
                    <> · <Link to={billingDocPath(r.document_type, r.commercial_document_id)}>View</Link></>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7}>No edit requests yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
