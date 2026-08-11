import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { currentFyLabel } from './billingUtils';

const ASSETS = [
  { field: 'logo', pathKey: 'logo_path', label: 'Business Logo' },
  { field: 'signature', pathKey: 'signature_path', label: 'Authorized Signature' },
  { field: 'seal', pathKey: 'seal_path', label: 'Company Seal' },
];

const BANK_FIELDS = [
  ['bank_name', 'Bank Name'],
  ['bank_branch', 'Branch'],
  ['account_holder_name', 'Account Holder Name'],
  ['bank_account', 'Account Number'],
  ['bank_ifsc', 'IFSC'],
  ['swift_code', 'SWIFT Code'],
  ['account_type', 'Account Type'],
  ['upi_id', 'UPI ID'],
];

const PREFIX_FIELDS = [
  ['invoice_prefix', 'Tax Invoice/Bill of Supply Prefix', 'INV'],
  ['bill_of_supply_prefix', 'Bill of Supply Prefix', 'BOS'],
  ['credit_note_prefix', 'Credit Note Prefix', 'CN'],
  ['debit_note_prefix', 'Debit Note Prefix', 'DN'],
  ['quotation_prefix', 'Quotation Prefix', 'QT'],
];

function fyPrefixDefaults() {
  const fy = currentFyLabel(); // e.g. 2025-26
  return {
    invoice_prefix: `INV/${fy}/`,
    bill_of_supply_prefix: `BOS/${fy}/`,
    credit_note_prefix: `CN/${fy}/`,
    debit_note_prefix: `DN/${fy}/`,
    quotation_prefix: `QT/${fy}/`,
  };
}

function emptyForm() {
  return {
    bank_name: '',
    bank_branch: '',
    account_holder_name: '',
    bank_account: '',
    bank_ifsc: '',
    swift_code: '',
    account_type: '',
    upi_id: '',
    signatory_name: '',
    ...fyPrefixDefaults(),
    terms_conditions: '',
    logo_path: '',
    signature_path: '',
    seal_path: '',
  };
}

function mergeDraft(approved, pending) {
  const base = emptyForm();
  const text = approved?.text || {};
  Object.keys(base).forEach((k) => {
    if (k.endsWith('_path')) {
      base[k] = approved?.[k] || '';
    } else {
      base[k] = text[k] ?? '';
    }
  });
  if (pending) {
    const payload = pending.payload || {};
    Object.keys(payload).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(base, k)) base[k] = payload[k] ?? '';
    });
    ASSETS.forEach(({ pathKey }) => {
      if (pending[pathKey]) base[pathKey] = pending[pathKey];
    });
  }
  return base;
}

function AssetPreview({ path, label }) {
  if (!path) return <span className="bp-asset-empty">No {label.toLowerCase()} on file</span>;
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
  return (
    <a href={`/storage/${path}`} target="_blank" rel="noreferrer" className="bp-asset-preview">
      {isImage && <img src={`/storage/${path}`} alt={label} />}
      View current
    </a>
  );
}

export default function BusinessSettings() {
  const [approved, setApproved] = useState(null);
  const [pending, setPending] = useState(null);
  const [lastReviewed, setLastReviewed] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/client/change-requests/current')
      .then((d) => {
        setApproved(d.approved);
        setPending(d.pending);
        setLastReviewed(d.last_reviewed);
        setForm(mergeDraft(d.approved, d.pending));
      })
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { load(); }, []);

  if (!form) return <p>Loading…</p>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (field, file) => {
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append(field, file);
      const res = await api(`/client/change-requests/assets/${field}`, { method: 'POST', body: fd });
      const pathKey = ASSETS.find((a) => a.field === field)?.pathKey;
      if (pathKey && res[pathKey]) set(pathKey, res[pathKey]);
      setPending(res.pending);
      setMsg(`${field.replace('_', ' ')} staged for approval`);
    } catch (e) {
      setErr(e.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const body = {};
      [...BANK_FIELDS, ['signatory_name', ''], ...PREFIX_FIELDS.map(([k, l]) => [k, l]), ['terms_conditions', '']].forEach(([k]) => {
        body[k] = form[k] ?? '';
      });
      const res = await api('/client/change-requests', { method: 'POST', body });
      setPending(res.pending);
      setApproved(res.approved);
      setMsg('Submitted for administrator approval. Invoices will keep using approved data until approved.');
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  let statusBadge = null;
  if (pending?.status === 'pending') {
    statusBadge = <span className="bp-badge bp-badge-partial">Pending approval · Request #{pending.id}</span>;
  } else if (!pending && lastReviewed?.status === 'rejected') {
    statusBadge = <span className="bp-badge bp-badge-cancelled">Last request rejected{lastReviewed.admin_note ? `: ${lastReviewed.admin_note}` : ''}</span>;
  } else if (!pending && lastReviewed?.status === 'approved') {
    statusBadge = <span className="bp-badge bp-badge-paid">Last request approved</span>;
  }

  return (
    <div className="bp-section-wrap" style={{ maxWidth: 860 }}>
      <div className="bp-section-head">
        <div>
          <div className="bp-section-kicker">Billing Settings</div>
          <p className="bp-section-desc">
            Edit invoice branding, bank details, and prefixes. Changes require administrator approval before they appear on invoices.
          </p>
        </div>
        {statusBadge}
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <div className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 2, color: 'var(--bp-navy)' }}>Invoice Branding</h3>
          <p className="bp-section-desc" style={{ marginBottom: 14 }}>Logo, signature and seal used when generating invoices.</p>
          <div className="bp-form two">
            {ASSETS.map(({ field, pathKey, label }) => (
              <label key={field}>
                <strong className="bp-field-title">{label}</strong>
                <input
                  type="file"
                  accept="image/*"
                  className="bp-file-input"
                  onChange={(e) => e.target.files?.[0] && upload(field, e.target.files[0])}
                />
                <div style={{ marginTop: 6 }}>
                  <AssetPreview path={form[pathKey]} label={label} />
                  {approved?.[pathKey] && form[pathKey] !== approved[pathKey] && (
                    <div style={{ fontSize: 11, color: 'var(--bp-muted)', marginTop: 4 }}>Still using previous file on invoices until admin approves</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 14, color: 'var(--bp-navy)' }}>Bank Details</h3>
          <div className="bp-form two">
            {BANK_FIELDS.map(([k, label]) => (
              <label key={k}>
                <strong className="bp-field-title">{label}</strong>
                <input className="bp-input" value={form[k] || ''} onChange={(e) => set(k, e.target.value)} />
              </label>
            ))}
          </div>
        </div>

        <div className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 14, color: 'var(--bp-navy)' }}>Invoice Settings</h3>
          <div className="bp-form two">
            <label>
              <strong className="bp-field-title">Signatory Name</strong>
              <input className="bp-input" value={form.signatory_name || ''} onChange={(e) => set('signatory_name', e.target.value)} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <strong className="bp-field-title">Terms &amp; Conditions</strong>
              <textarea
                className="bp-input"
                rows={4}
                value={form.terms_conditions || ''}
                onChange={(e) => set('terms_conditions', e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 2, color: 'var(--bp-navy)' }}>Document Numbering &amp; Prefix Configuration</h3>
          <p className="bp-section-desc" style={{ marginBottom: 14 }}>
            Set a prefix per document type (admin can also set the next starting number on the client profile).
            Example for FY {currentFyLabel()}: <code>INV/{currentFyLabel()}/</code> generates <code>INV/{currentFyLabel()}/0001</code>.
          </p>
          <div className="bp-form two">
            {PREFIX_FIELDS.map(([k, label, short]) => {
              const sample = form[k] || short;
              const preview = sample.endsWith('/') || sample.endsWith('-')
                ? `${sample}0001`
                : `${sample}-0001`;
              return (
                <label key={k}>
                  <strong className="bp-field-title">{label}</strong>
                  <input className="bp-input" value={form[k] || ''} onChange={(e) => set(k, e.target.value)} placeholder={`${short}/${currentFyLabel()}/`} />
                  <span style={{ fontSize: 11, color: 'var(--bp-muted)' }}>Next number example: {preview}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="bp-card bp-settings-submit">
          <button type="submit" className="bp-btn bp-btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit for Approval'}
          </button>
          {msg && <p className="bp-alert bp-alert-success">{msg}</p>}
          {err && <p className="bp-alert bp-alert-error">{err}</p>}
        </div>
      </form>
    </div>
  );
}
