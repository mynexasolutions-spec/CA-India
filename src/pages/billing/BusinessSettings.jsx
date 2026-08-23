import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { LoadingBlock } from '../../components/Spinner';
import { currentFyLabel } from './billingUtils';

const ASSETS = [
  { field: 'logo', pathKey: 'logo_path', label: 'Business Logo' },
  { field: 'signature', pathKey: 'signature_path', label: 'Authorized Signature' },
  { field: 'seal', pathKey: 'seal_path', label: 'Company Seal' },
];

// Paired so a natural 2-col grid lands exactly like the approved layout — Account Number ends
// up alone on the last row since this list has an odd length.
const BANK_FIELDS = [
  ['bank_name', 'Bank Name'],
  ['bank_ifsc', 'IFSC Code'],
  ['bank_branch', 'Branch'],
  ['account_type', 'Account Type'],
  ['account_holder_name', 'Account Holder Name'],
  ['upi_id', 'UPI ID'],
  ['bank_account', 'Account Number'],
];

const PREFIX_FIELDS = [
  ['invoice_prefix', 'Tax Invoice Prefix', 'INV'],
  ['bill_of_supply_prefix', 'Bill of Supply Prefix', 'BOS'],
  ['credit_note_prefix', 'Credit Note Prefix', 'CN'],
  ['debit_note_prefix', 'Debit Note Prefix', 'DN'],
  ['quotation_prefix', 'Quotation Prefix', 'QT'],
];

/** Which Settings tab each editable field belongs to — mirrors the backend's
 * ClientChangeRequest::FIELD_SECTIONS. The backend re-enforces this itself; this copy is only
 * for building each tab's own submit payload, not a security boundary. */
const FIELD_SECTION = {
  bank_name: 'bank', bank_branch: 'bank', account_holder_name: 'bank', bank_account: 'bank',
  bank_ifsc: 'bank', swift_code: 'bank', account_type: 'bank', upi_id: 'bank',
  signatory_name: 'invoice_settings', terms_conditions: 'invoice_settings',
  invoice_prefix: 'numbering', bill_of_supply_prefix: 'numbering', credit_note_prefix: 'numbering',
  debit_note_prefix: 'numbering', quotation_prefix: 'numbering',
};

const SECTION_FIELDS = {
  bank: BANK_FIELDS.map(([k]) => k),
  invoice_settings: ['signatory_name', 'terms_conditions'],
  numbering: PREFIX_FIELDS.map(([k]) => k),
};

const SECTION_LABELS = {
  branding: 'Invoice Branding',
  bank: 'Bank Details',
  invoice_settings: 'Invoice Settings',
  numbering: 'Document Numbering & Prefix',
};

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

/** Merge the live approved values with whatever each section's own pending request (if any)
 * proposes — a pending request in one tab never affects another tab's draft. */
function mergeDraft(approved, sections) {
  const base = emptyForm();
  const text = approved?.text || {};
  Object.keys(base).forEach((k) => {
    if (k.endsWith('_path')) {
      base[k] = sections?.branding?.pending?.[k] || approved?.[k] || '';
    } else {
      const section = FIELD_SECTION[k];
      const pendingPayload = sections?.[section]?.pending?.payload;
      base[k] = pendingPayload && Object.prototype.hasOwnProperty.call(pendingPayload, k) ? pendingPayload[k] : (text[k] ?? '');
    }
  });
  return base;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${min} ${ampm}`;
}

const ICON_PROPS = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
function ImageIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  );
}
function BankIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 10l9-6 9 6" />
      <path d="M5 10v9M9 10v9M15 10v9M19 10v9" />
      <path d="M3 21h18" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}
function HashIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 9h14M5 15h14M10 4l-3 16M17 4l-3 16" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

const TABS = [
  { key: 'branding', label: 'Invoice Branding', Icon: ImageIcon },
  { key: 'bank', label: 'Bank Details', Icon: BankIcon },
  { key: 'invoice_settings', label: 'Invoice Settings', Icon: DocIcon },
  { key: 'numbering', label: 'Document Numbering & Prefix', Icon: HashIcon },
];

/** Preview box + styled Upload/Replace button + a "View Current" link — replaces the raw
 * browser file input with the same layout as the approved design. */
function AssetUploadBox({ field, label, path, approvedPath, onUpload }) {
  const inputRef = useRef(null);
  const isImage = path && /\.(png|jpe?g|gif|webp|svg)$/i.test(path);

  return (
    <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <strong className="bp-field-title" style={{ display: 'block', marginBottom: 8, alignSelf: 'flex-start' }}>{label}</strong>
      <div
        style={{
          width: '100%', height: 120, border: '1px solid var(--bp-border)', borderRadius: 10,
          background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', marginBottom: 10, boxSizing: 'border-box',
        }}
      >
        {isImage ? (
          <img src={`/storage/${path}`} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 10, color: 'var(--bp-muted)', textAlign: 'center', padding: 6 }}>No file</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && onUpload(field, e.target.files[0])}
      />
      <button
        type="button"
        className="bp-btn bp-btn-outline"
        style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'center' }}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon /> Upload / Replace
      </button>
      <div style={{ marginTop: 8, alignSelf: 'center' }}>
        {path ? (
          <a href={`/storage/${path}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--bp-blue)', fontWeight: 700, textDecoration: 'underline' }}>
            View Current
          </a>
        ) : (
          <span className="bp-asset-empty">No {label.toLowerCase()} on file</span>
        )}
      </div>
      {approvedPath && path !== approvedPath && (
        <div style={{ fontSize: 10, color: 'var(--bp-muted)', marginTop: 4, maxWidth: 160 }}>
          Still using previous file on invoices until admin approves.
        </div>
      )}
    </div>
  );
}

/** Approval status footer shown at the bottom of each tab — driven by that section's own
 * independent pending/last-reviewed request, never a page-wide shared status. */
function ApprovalStatus({ data }) {
  if (!data) return null;
  const { pending, last_reviewed } = data;
  const row = (text, badgeClass, badgeText) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--bp-border)', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--bp-muted)' }}>{text}</span>
      <span className={`bp-badge ${badgeClass}`}>{badgeText}</span>
    </div>
  );

  if (pending) return row(`Submitted ${formatDateTime(pending.created_at)}`, 'bp-badge-partial', 'Pending Approval');
  if (last_reviewed?.status === 'approved') return row(`Last request approved on ${formatDateTime(last_reviewed.reviewed_at)}`, 'bp-badge-paid', 'Approved');
  if (last_reviewed?.status === 'rejected') {
    return row(
      `Last request rejected on ${formatDateTime(last_reviewed.reviewed_at)}${last_reviewed.admin_note ? ` — ${last_reviewed.admin_note}` : ''}`,
      'bp-badge-cancelled',
      'Rejected'
    );
  }
  return null;
}

export default function BusinessSettings() {
  const [approved, setApproved] = useState(null);
  const [sections, setSections] = useState(null);
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState('branding');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/client/change-requests/current')
      .then((d) => {
        setApproved(d.approved);
        setSections(d.sections);
        setForm(mergeDraft(d.approved, d.sections));
      })
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { load(); }, []);

  if (!form) return <LoadingBlock />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (field, file) => {
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append(field, file);
      await api(`/client/change-requests/assets/${field}`, { method: 'POST', body: fd });
      load();
      setMsg(`${field.replace('_', ' ')} staged for approval.`);
    } catch (e) {
      setErr(e.message);
    }
  };

  const submitSection = async (section) => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const body = { section };
      (SECTION_FIELDS[section] || []).forEach((k) => { body[k] = form[k] ?? ''; });
      await api('/client/change-requests', { method: 'POST', body });
      load();
      setMsg('Submitted for administrator approval. Invoices will keep using the approved values until then.');
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bp-section-wrap">
      <div style={{ fontSize: 12, color: 'var(--bp-muted)', fontWeight: 600 }}>
        <Link to="/portal" style={{ color: 'var(--bp-blue)', textDecoration: 'none' }}>Client Portal</Link>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
        Settings
      </div>

      <div className="bp-section-head">
        <div>
          <div className="bp-section-kicker">Settings</div>
          <p className="bp-section-desc">Manage your billing and invoice preferences.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 16px', maxWidth: 340 }}>
          <span aria-hidden="true">⚠</span>
          <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
            Changes require administrator approval before they appear on invoices.
          </span>
        </div>
      </div>

      <nav className="bp-uline-tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`bp-uline-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => {
              setActiveTab(key);
              document.getElementById(`settings-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <Icon /> {label}
          </button>
        ))}
      </nav>

      {msg && <p className="bp-alert bp-alert-success">{msg}</p>}
      {err && <p className="bp-alert bp-alert-error">{err}</p>}

      {/* All four sections render together, like a dashboard — the tabs above are a quick
          jump-to-section shortcut, not a show-one-hide-the-rest switcher. */}
      <div className="bp-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <div id="settings-branding" className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 2, color: 'var(--bp-navy)' }}>A. Invoice Branding</h3>
          <p className="bp-section-desc" style={{ marginBottom: 14 }}>Upload your business logo, signature and seal to appear on invoices.</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {ASSETS.map(({ field, pathKey, label }) => (
              <AssetUploadBox
                key={field}
                field={field}
                label={label}
                path={form[pathKey]}
                approvedPath={approved?.[pathKey]}
                onUpload={upload}
              />
            ))}
          </div>
          <ApprovalStatus data={sections?.branding} />
        </div>

        <div id="settings-bank" className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 2, color: 'var(--bp-navy)' }}>B. Bank Details</h3>
          <p className="bp-section-desc" style={{ marginBottom: 14 }}>Manage your bank account details for transactions.</p>
          <div className="bp-form two">
            {BANK_FIELDS.map(([k, label]) => (
              <label key={k}>
                <strong className="bp-field-title">{label}</strong>
                <input className="bp-input" value={form[k] || ''} onChange={(e) => set(k, e.target.value)} />
              </label>
            ))}
          </div>
          <button type="button" className="bp-btn bp-btn-primary" style={{ marginTop: 16 }} disabled={busy} onClick={() => submitSection('bank')}>
            {busy ? 'Submitting…' : 'Submit for Approval'}
          </button>
          <ApprovalStatus data={sections?.bank} />
        </div>

        <div id="settings-invoice_settings" className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 2, color: 'var(--bp-navy)' }}>C. Invoice Settings</h3>
          <p className="bp-section-desc" style={{ marginBottom: 14 }}>Set your signatory name and terms &amp; conditions for invoices.</p>
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
          <button type="button" className="bp-btn bp-btn-primary" style={{ marginTop: 16 }} disabled={busy} onClick={() => submitSection('invoice_settings')}>
            {busy ? 'Submitting…' : 'Submit for Approval'}
          </button>
          <ApprovalStatus data={sections?.invoice_settings} />
        </div>

        <div id="settings-numbering" className="bp-card">
          <h3 style={{ marginTop: 0, marginBottom: 2, color: 'var(--bp-navy)' }}>D. Document Numbering &amp; Prefix Configuration</h3>
          <p className="bp-section-desc" style={{ marginBottom: 14 }}>
            Configure prefixes for your documents. Numbering will be auto-generated.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, auto) 130px 1fr 20px', columnGap: 20, rowGap: 18, alignItems: 'center' }}>
            {PREFIX_FIELDS.map(([k, label, short]) => (
              <Fragment key={k}>
                <strong className="bp-field-title" style={{ whiteSpace: 'nowrap' }}>{label}</strong>
                <input
                  className="bp-input"
                  value={form[k] || ''}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder={`${short}/${currentFyLabel()}/`}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: 13, color: 'var(--bp-blue)', fontWeight: 700, whiteSpace: 'nowrap' }}>Sample: {short}-0001</span>
                <span title={`Sample: ${short}-0001`} style={{ color: 'var(--bp-muted)', display: 'inline-flex', justifySelf: 'center' }}><InfoIcon /></span>
              </Fragment>
            ))}
          </div>
          <button type="button" className="bp-btn bp-btn-primary" style={{ marginTop: 16 }} disabled={busy} onClick={() => submitSection('numbering')}>
            {busy ? 'Submitting…' : 'Submit for Approval'}
          </button>
          <ApprovalStatus data={sections?.numbering} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#eef4fc', border: '1px solid #d7e6f7', borderRadius: 10, padding: '12px 18px' }}>
        <span style={{ fontSize: 12, color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoIcon /> If you make any changes above, they will be sent to administrator for approval. Once approved, the changes will reflect on your invoices.
        </span>
        <Link to="/portal/settings/history" className="bp-btn bp-btn-outline" style={{ whiteSpace: 'nowrap' }}>
          View Request History →
        </Link>
      </div>
    </div>
  );
}

const SECTION_BADGE = {
  pending: ['bp-badge-partial', 'Pending Approval'],
  approved: ['bp-badge-paid', 'Approved'],
  rejected: ['bp-badge-cancelled', 'Rejected'],
};

export function ChangeRequestHistory() {
  const [data, setData] = useState(null);
  const [section, setSection] = useState('');

  const load = (sec) => {
    const qs = sec ? `?section=${sec}` : '';
    api(`/client/change-requests/history${qs}`).then(setData).catch(console.error);
  };

  useEffect(() => { load(section); }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bp-section-wrap">
      <div style={{ fontSize: 12, color: 'var(--bp-muted)', fontWeight: 600 }}>
        <Link to="/portal" style={{ color: 'var(--bp-blue)', textDecoration: 'none' }}>Client Portal</Link>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
        <Link to="/portal/settings" style={{ color: 'var(--bp-blue)', textDecoration: 'none' }}>Settings</Link>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
        Request History
      </div>

      <div className="bp-section-head">
        <div>
          <div className="bp-section-kicker">Request History</div>
          <p className="bp-section-desc">Every settings change you've submitted, and its approval status.</p>
        </div>
        <Link to="/portal/settings" className="bp-btn bp-btn-outline">← Back to Settings</Link>
      </div>

      <div className="bp-toolbar" style={{ marginBottom: 0 }}>
        <select className="bp-select" value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="">All Sections</option>
          {Object.entries(SECTION_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      {!data ? <LoadingBlock /> : (
        <table className="bp-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Reviewed</th>
              <th>Admin Note</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--bp-muted)', padding: 20 }}>No requests yet.</td></tr>
            ) : data.data.map((req) => {
              const [badgeClass, badgeText] = SECTION_BADGE[req.status] || SECTION_BADGE.pending;
              return (
                <tr key={req.id}>
                  <td>{SECTION_LABELS[req.section] || req.section || '—'}</td>
                  <td>{formatDateTime(req.created_at)}</td>
                  <td><span className={`bp-badge ${badgeClass}`}>{badgeText}</span></td>
                  <td>{req.reviewed_at ? formatDateTime(req.reviewed_at) : '—'}</td>
                  <td>{req.admin_note || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
