import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import StateSelect from '../../components/StateSelect';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const empty = {
  name: '', proprietor_name: '', contact_person: '', email: '', phone: '',
  gst_status: 'registered', gstin: '',
  state: 'Maharashtra', state_code: '27', billing_address: '', shipping_address: '',
};

const ICON_PROPS = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
function PeopleIcon() {
  return <svg {...ICON_PROPS} width="20" height="20"><circle cx="9" cy="8" r="3" /><path d="M2.5 19c.6-3.4 3-5.3 6.5-5.3S15 15.6 15.5 19" /><circle cx="17" cy="9" r="2.3" /><path d="M15.3 13.9c2.4.3 3.9 2 4.5 4.6" /></svg>;
}
function InfoIcon() {
  return <svg {...ICON_PROPS}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>;
}
function WarningIcon() {
  return <svg {...ICON_PROPS}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17v.01" /></svg>;
}
function ShieldCheckIcon() {
  return <svg {...ICON_PROPS}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}
function DocIcon() {
  return <svg {...ICON_PROPS}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>;
}
function ChartIcon() {
  return <svg {...ICON_PROPS}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M4 20h16" /></svg>;
}
function SaveIcon() {
  return <svg {...ICON_PROPS}><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h8V4M8 14h8v6H8z" /></svg>;
}

const STEPS = [
  { Icon: DocIcon, bg: '#1d4ed8', title: 'Add Company', desc: 'Fill in all the required details of the company.' },
  { Icon: ShieldCheckIcon, bg: '#2563eb', title: 'Save & Use', desc: 'Company will be saved and available for invoicing and compliance.' },
  { Icon: ChartIcon, bg: '#3b82f6', title: 'Use in Reports', desc: 'Company data will be used in GST compliance and reports.' },
];

const NOTES = [
  'GSTIN format should be validated.',
  'If Unregistered is selected, GSTIN is not required.',
  'Company Name and Proprietor / Authorised Signatory are mandatory.',
  'You can edit company details anytime.',
  'Each company will be used for GST compliance, invoicing and reporting.',
];

function InfoPanel({ tone, icon, title, children }) {
  const tones = {
    blue: { bg: '#eef4fc', border: '#d7e6f7', iconBg: 'var(--bp-blue)', titleColor: 'var(--bp-navy)' },
    amber: { bg: '#fef3c7', border: '#fde68a', iconBg: '#d97706', titleColor: '#92400e' },
    green: { bg: '#eafaf0', border: '#bfe6d1', iconBg: '#15803d', titleColor: '#15803d' },
  };
  const t = tones[tone];
  return (
    <div className="bp-card" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: t.titleColor, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: t.iconBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, required, help, style, children }) {
  return (
    <label style={style}>
      <strong className="bp-field-title">{label}{required && ' *'}</strong>
      {children}
      {help && <span style={{ display: 'block', fontSize: 11, color: 'var(--bp-muted)', marginTop: 5 }}>{help}</span>}
    </label>
  );
}

/** Add New Company / Edit Company — a routed page (not a modal), so "Back" genuinely
 * navigates back to the Parties dashboard rather than just closing an overlay. */
export default function PartyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [form, setForm] = useState(empty);
  const [loaded, setLoaded] = useState(!editing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [gstinError, setGstinError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api(`/billing/parties/${id}`).then((p) => {
      setForm({ ...empty, ...p, gst_status: p.gst_status || (p.gstin ? 'registered' : 'unregistered'), gstin: p.gstin || '' });
      setLoaded(true);
    }).catch((e) => setErr(e.message));
  }, [id, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setErr('');
    setGstinError('');
    if (form.gst_status === 'registered') {
      const gstin = (form.gstin || '').trim().toUpperCase();
      if (!gstin) {
        setGstinError('GSTIN is required for a registered party.');
        return;
      }
      if (!GSTIN_REGEX.test(gstin)) {
        setGstinError('Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5).');
        return;
      }
    }
    setBusy(true);
    try {
      const payload = { ...form, gstin: form.gst_status === 'registered' ? form.gstin.trim().toUpperCase() : '' };
      if (editing) await api(`/billing/parties/${id}`, { method: 'PUT', body: payload });
      else await api('/billing/parties', { method: 'POST', body: payload });
      navigate('/portal/billing/parties');
    } catch (ex) {
      setErr(ex.message || 'Could not save this company.');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <p>Loading…</p>;

  return (
    <div className="bp-section-wrap">
      <div style={{ fontSize: 12, color: 'var(--bp-muted)', fontWeight: 600 }}>
        <Link to="/portal" style={{ color: 'var(--bp-blue)', textDecoration: 'none' }}>Client Portal</Link>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
        <Link to="/portal/billing/parties" style={{ color: 'var(--bp-blue)', textDecoration: 'none' }}>Parties</Link>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
        {editing ? 'Edit Company' : 'Add New Company'}
      </div>

      <div className="bp-section-head">
        <div>
          <div className="bp-section-kicker">{editing ? 'Edit Company' : 'Add New Company'}</div>
          <p className="bp-section-desc">
            {editing ? 'Update this company’s (party’s) GST compliance and billing details.' : 'Add a new company (party) to manage GST compliance and billing.'}
          </p>
        </div>
        <Link to="/portal/billing/parties" className="bp-btn bp-btn-outline">← Back to Parties</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <form className="bp-card" onSubmit={onSave}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, marginBottom: 18, borderBottom: '1px solid var(--bp-border)' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bp-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PeopleIcon /></span>
            <span>
              Company Details
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--bp-muted)', marginTop: 2 }}>Fields marked with * are required.</span>
            </span>
          </h3>

          {err && <p className="bp-alert bp-alert-error">{err}</p>}

          <div className="bp-form two">
            <Field label="GST Registration Status" required>
              <div className="bp-gst-radio-row">
                <label className="bp-gst-radio">
                  <input type="radio" name="gst_status" checked={form.gst_status === 'registered'} onChange={() => { set('gst_status', 'registered'); setGstinError(''); }} />
                  Registered
                </label>
                <label className="bp-gst-radio">
                  <input type="radio" name="gst_status" checked={form.gst_status === 'unregistered'} onChange={() => { set('gst_status', 'unregistered'); set('gstin', ''); setGstinError(''); }} />
                  Unregistered
                </label>
              </div>
            </Field>

            {form.gst_status === 'registered' ? (
              <Field label="GSTIN" required help="Enter 15 digit GST Identification Number">
                <input
                  className="bp-input"
                  value={form.gstin}
                  maxLength={15}
                  placeholder="E.g. 27ABCDE1234F1Z5"
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => { set('gstin', e.target.value.toUpperCase()); setGstinError(''); }}
                  required
                />
                {gstinError && <span className="bp-gstin-error">{gstinError}</span>}
              </Field>
            ) : <div />}

            <Field label="Company Name" required help="Enter the legal name of the company">
              <input className="bp-input" placeholder="Enter company name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </Field>
            <Field label="Proprietor / Authorised Signatory" required help="Enter the name of proprietor or authorised signatory">
              <input className="bp-input" placeholder="Enter proprietor / authorised signatory name" value={form.proprietor_name} onChange={(e) => set('proprietor_name', e.target.value)} required />
            </Field>

            <Field label="Contact Person" help="Primary contact person of the company">
              <input className="bp-input" placeholder="Enter contact person name" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} />
            </Field>
            <Field label="Phone" help="Contact phone number">
              <input className="bp-input" placeholder="Enter phone number" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>

            <Field label="Email" help="Official email address">
              <input className="bp-input" type="email" placeholder="Enter email address" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="State" required help="Select the state">
              <StateSelect value={form.state_code} onChange={(code, name) => setForm((f) => ({ ...f, state_code: code, state: name }))} required />
            </Field>

            <Field label="Billing Address" required help="Registered / billing address of the company" style={{ gridColumn: '1 / -1' }}>
              <input className="bp-input" placeholder="Enter complete billing address" value={form.billing_address} onChange={(e) => set('billing_address', e.target.value)} required />
            </Field>
            <Field label="Shipping Address (If any)" help="Shipping address if different from billing address" style={{ gridColumn: '1 / -1' }}>
              <input className="bp-input" placeholder="Enter shipping address (if any)" value={form.shipping_address} onChange={(e) => set('shipping_address', e.target.value)} />
            </Field>
          </div>

          <div className="bp-actions" style={{ marginTop: 20 }}>
            <button type="submit" className="bp-btn bp-btn-blue" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <SaveIcon /> {busy ? 'Saving…' : editing ? 'Save Changes' : 'Save Company'}
            </button>
            <Link to="/portal/billing/parties" className="bp-btn bp-btn-outline">Cancel</Link>
          </div>
        </form>

        <div style={{ display: 'grid', gap: 20 }}>
          <InfoPanel tone="blue" icon={<InfoIcon />} title="How it works?">
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--bp-muted)', lineHeight: 1.5 }}>
              Add company details to manage invoices, GST compliance and reports.
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              {STEPS.map(({ Icon, bg, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon /></span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-blue)' }}>{title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--bp-muted)', lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </InfoPanel>

          <InfoPanel tone="amber" icon={<WarningIcon />} title="Important Notes">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
              {NOTES.map((n) => (
                <li key={n} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#92400e', lineHeight: 1.4 }}>
                  <span style={{ flexShrink: 0 }}>•</span>{n}
                </li>
              ))}
            </ul>
          </InfoPanel>

          <InfoPanel tone="green" icon={<ShieldCheckIcon />} title="GST Status Guide">
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', background: '#15803d', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Registered</div>
                  <div style={{ fontSize: 11.5, color: 'var(--bp-muted)' }}>Company is registered under GST.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', background: '#6b8499', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-text)' }}>Unregistered</div>
                  <div style={{ fontSize: 11.5, color: 'var(--bp-muted)' }}>Company is not registered under GST.</div>
                </div>
              </div>
            </div>
          </InfoPanel>
        </div>
      </div>
    </div>
  );
}
