import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getAuthToken } from '../../api/client';
import PasswordField from '../../components/PasswordField';
import StateSelect from '../../components/StateSelect';

const TABS = [
  { id: 'personal', label: 'Personal and Business Information' },
  { id: 'registration', label: 'Registration and Compliance Details' },
  { id: 'bank', label: 'Bank Account Details' },
  { id: 'numbering', label: 'Document Numbering' },
  { id: 'credentials', label: 'Client Login Credentials' },
];

const CONSTITUTIONS = [
  'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited Company',
  'One Person Company', 'Trust', 'Society',
];

const NUMBERING_FIELDS = [
  { prefix: 'invoice_prefix', next: 'invoice_next_number', label: 'Tax Invoice/Bill of Supply', defaultPrefix: 'INV' },
  { prefix: 'bill_of_supply_prefix', next: 'bill_of_supply_next_number', label: 'Bill of Supply', defaultPrefix: 'BOS' },
  { prefix: 'debit_note_prefix', next: 'debit_note_next_number', label: 'Debit Note', defaultPrefix: 'DN' },
  { prefix: 'credit_note_prefix', next: 'credit_note_next_number', label: 'Credit Note', defaultPrefix: 'CN' },
  { prefix: 'quotation_prefix', next: 'quotation_next_number', label: 'Quotation', defaultPrefix: 'QT' },
  { prefix: 'amendment_prefix', next: 'amendment_next_number', label: 'Amendment', defaultPrefix: 'AMD' },
];

const empty = () => ({
  client_name: '', business_name: '', constitution_type: '', business_type: '',
  date_of_incorporation: '', date_of_birth: '', mobile: '', alt_mobile: '',
  email: '', alt_email: '', address: '', city: '', state: '', state_code: '27',
  pincode: '', country: 'India', website: '',
  pan: '', aadhaar: '', gstin: '', has_gst: false, gst_compliance_enabled: true, dealer_type: '', gst_filing_frequency: 'monthly', gstr1_filing_frequency: 'monthly', composition_rate: '1.00', gst_portal_username: '', gst_portal_password: '',
  tan: '', tan_portal_password: '', it_portal_password: '',
  udyam: '', shop_establishment: '', iec: '', cin: '', llpin: '', pt_reg: '', esic: '', pf: '',
  bank_name: '', bank_branch: '', bank_account: '', account_holder_name: '',
  bank_ifsc: '', swift_code: '', account_type: '', upi_id: '',
  client_code: '', password: '', is_active: true,
  terms_conditions: '',
  invoice_prefix: 'INV', bill_of_supply_prefix: 'BOS', credit_note_prefix: 'CN',
  debit_note_prefix: 'DN', quotation_prefix: 'QT', amendment_prefix: 'AMD',
  invoice_next_number: 1, bill_of_supply_next_number: 1, credit_note_next_number: 1,
  debit_note_next_number: 1, quotation_next_number: 1, amendment_next_number: 1,
});

function Field({ label, children, full }) {
  return <label className={full ? 'full' : undefined}>{label}{children}</label>;
}

export default function ClientProfileForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [tab, setTab] = useState('personal');
  const [form, setForm] = useState(empty());
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api(`/admin/clients/${id}`).then((d) => {
      setForm({ ...empty(), ...d, password: '', is_active: d.user?.is_active ?? true });
    }).catch((e) => setErr(e.message));
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleStatus = async () => {
    if (!isEdit) return;
    await api(`/admin/clients/${id}/active`, { method: 'POST', body: { is_active: !form.is_active } });
    setForm((f) => ({ ...f, is_active: !f.is_active }));
    setMsg(`Client marked ${form.is_active ? 'inactive' : 'active'}`);
  };

  const save = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'password' && !v) return;
        if (k === 'dealer_type' && !form.has_gst) return;
        if (k === 'is_active' || k === 'has_gst' || k === 'gst_compliance_enabled') return; // sent as 1/0 below
        if (typeof v === 'boolean') return;
        if (v != null && v !== '') fd.append(k, v);
      });
      fd.append('has_gst', form.has_gst ? '1' : '0');
      fd.append('gst_compliance_enabled', form.gst_compliance_enabled ? '1' : '0');
      fd.append('is_active', form.is_active ? '1' : '0');

      const token = getAuthToken();
      const url = isEdit ? `/api/admin/clients/${id}` : '/api/admin/clients';
      if (isEdit) fd.append('_method', 'PUT');
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');

      setMsg('Client profile saved');
      if (!isEdit) navigate(`/admin/clients/${data.id}/edit`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="bp-toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>{isEdit ? 'Edit Client Profile' : 'Add New Client Profile'}</h2>
        <Link className="bp-btn bp-btn-outline" to="/admin/clients">Back to Clients</Link>
        {isEdit && (
          <button type="button" className="bp-btn bp-btn-outline" onClick={toggleStatus}>
            {form.is_active ? 'Mark Inactive' : 'Mark Active'}
          </button>
        )}
        <button type="button" className="bp-btn bp-btn-primary" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
      {err && <p style={{ color: '#c0392b' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--bp-green)' }}>{msg}</p>}

      <div className="cp-form-shell">
        <div className="cp-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="cp-panel">
          {tab === 'personal' && (
            <div className="cp-grid">
              <Field label="Client Name"><input className="bp-input" required value={form.client_name} onChange={(e) => set('client_name', e.target.value)} /></Field>
              <Field label="Business Name"><input className="bp-input" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} /></Field>
              <Field label="Constitution Type">
                <select className="bp-select" value={form.constitution_type} onChange={(e) => set('constitution_type', e.target.value)}>
                  <option value="">Select</option>
                  {CONSTITUTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Business Type"><input className="bp-input" value={form.business_type} onChange={(e) => set('business_type', e.target.value)} /></Field>
              <Field label="Date of Incorporation"><input className="bp-input" type="date" value={form.date_of_incorporation || ''} onChange={(e) => set('date_of_incorporation', e.target.value)} /></Field>
              <Field label="Date of Birth"><input className="bp-input" type="date" value={form.date_of_birth || ''} onChange={(e) => set('date_of_birth', e.target.value)} /></Field>
              <Field label="Mobile"><input className="bp-input" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></Field>
              <Field label="Alternate Mobile"><input className="bp-input" value={form.alt_mobile} onChange={(e) => set('alt_mobile', e.target.value)} /></Field>
              <Field label="Email"><input className="bp-input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Alternate Email"><input className="bp-input" type="email" value={form.alt_email} onChange={(e) => set('alt_email', e.target.value)} /></Field>
              <Field label="Office Address" full><textarea className="bp-textarea" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="City"><input className="bp-input" value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
              <Field label="State">
                <StateSelect
                  value={form.state_code}
                  onChange={(code, name) => setForm((f) => ({ ...f, state_code: code, state: name }))}
                />
              </Field>
              <Field label="Pincode"><input className="bp-input" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} /></Field>
              <Field label="Country"><input className="bp-input" value={form.country} onChange={(e) => set('country', e.target.value)} /></Field>
              <Field label="Website"><input className="bp-input" value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
            </div>
          )}

          {tab === 'registration' && (
            <div className="cp-grid">
              <Field label="Does the Client have GST / GSTIN? (GST Registered?)" full>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="has_gst"
                      checked={!form.has_gst}
                      onChange={() => setForm((f) => ({
                        ...f,
                        has_gst: false,
                        dealer_type: '',
                        gst_filing_frequency: '',
                        gstin: '',
                        gst_portal_username: '',
                        gst_portal_password: '',
                      }))}
                    />
                    No
                  </label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="has_gst"
                      checked={!!form.has_gst}
                      onChange={() => setForm((f) => ({ ...f, has_gst: true, dealer_type: f.dealer_type || 'regular' }))}
                    />
                    Yes
                  </label>
                </div>
              </Field>
              <Field label="GST Compliance Subscription (GSTR-2B, GST Returns, GST Filing Confirmation)" full>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="gst_compliance_enabled"
                      checked={!!form.gst_compliance_enabled}
                      onChange={() => setForm((f) => ({ ...f, gst_compliance_enabled: true }))}
                    />
                    Subscribed
                  </label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="gst_compliance_enabled"
                      checked={!form.gst_compliance_enabled}
                      onChange={() => setForm((f) => ({ ...f, gst_compliance_enabled: false }))}
                    />
                    Not Subscribed (Billing services only)
                  </label>
                </div>
                <div style={{ fontSize: 11, color: 'var(--bp-muted)', marginTop: 4 }}>
                  When not subscribed, the client sees a "Not Subscribed" notice instead of GSTR-2B, GST Returns, and GST Filing Confirmation.
                </div>
              </Field>
              {form.has_gst && (
                <Field label="Dealer Type" full>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="dealer_type"
                        checked={form.dealer_type === 'regular'}
                        onChange={() => setForm((f) => ({ ...f, dealer_type: 'regular' }))}
                      />
                      Regular Dealer
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="dealer_type"
                        checked={form.dealer_type === 'composition'}
                        onChange={() => setForm((f) => ({ ...f, dealer_type: 'composition', gst_filing_frequency: 'quarterly' }))}
                      />
                      Composition Dealer
                    </label>
                  </div>
                </Field>
              )}
              {form.has_gst && form.dealer_type === 'composition' && (
                <Field label="Composition Rate (%)">
                  <input
                    className="bp-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max="99.99"
                    value={form.composition_rate}
                    onChange={(e) => set('composition_rate', e.target.value)}
                    placeholder="1.00"
                  />
                  <div style={{ fontSize: 11, color: 'var(--bp-muted)', marginTop: 4 }}>
                    Typical: 1% traders/manufacturers, 5% restaurants (no alcohol), 6% other service providers.
                  </div>
                </Field>
              )}
              {form.has_gst && form.dealer_type && (
                <Field label="GSTR-3B Filing Frequency" full>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="gst_filing_frequency"
                        checked={form.gst_filing_frequency === 'monthly'}
                        onChange={() => set('gst_filing_frequency', 'monthly')}
                        disabled={form.dealer_type === 'composition'}
                      />
                      Monthly
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="gst_filing_frequency"
                        checked={form.gst_filing_frequency === 'quarterly'}
                        onChange={() => set('gst_filing_frequency', 'quarterly')}
                      />
                      Quarterly
                    </label>
                  </div>
                </Field>
              )}
              {form.has_gst && form.dealer_type === 'regular' && (
                <Field label="GSTR-1 Filing Frequency" full>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="gstr1_filing_frequency"
                        checked={form.gstr1_filing_frequency === 'monthly'}
                        onChange={() => set('gstr1_filing_frequency', 'monthly')}
                      />
                      Monthly
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="gstr1_filing_frequency"
                        checked={form.gstr1_filing_frequency === 'quarterly'}
                        onChange={() => set('gstr1_filing_frequency', 'quarterly')}
                      />
                      Quarterly (QRMP)
                    </label>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--bp-muted)', marginTop: 4 }}>
                    Under QRMP, GSTR-1 can be filed monthly (via IFF) even when GSTR-3B stays quarterly — set independently here.
                  </div>
                </Field>
              )}
              <Field label="PAN"><input className="bp-input" value={form.pan} onChange={(e) => set('pan', e.target.value)} /></Field>
              <Field label="Aadhaar"><input className="bp-input" value={form.aadhaar} onChange={(e) => set('aadhaar', e.target.value)} /></Field>
              <Field label="GSTIN">
                <input
                  className="bp-input"
                  value={form.gstin}
                  onChange={(e) => set('gstin', e.target.value)}
                  disabled={!form.has_gst}
                  placeholder={form.has_gst ? '' : 'Enable GST Registered to enter GSTIN'}
                />
              </Field>
              <Field label="GST Portal Username">
                <input
                  className="bp-input"
                  value={form.gst_portal_username}
                  onChange={(e) => set('gst_portal_username', e.target.value)}
                  disabled={!form.has_gst}
                />
              </Field>
              <Field label="GST Portal Password">
                <PasswordField
                  label=""
                  value={form.gst_portal_password}
                  onChange={(e) => set('gst_portal_password', e.target.value)}
                  autoComplete="new-password"
                  disabled={!form.has_gst}
                />
              </Field>
              <Field label="TAN"><input className="bp-input" value={form.tan} onChange={(e) => set('tan', e.target.value)} /></Field>
              <Field label="TAN Portal Password"><PasswordField label="" value={form.tan_portal_password} onChange={(e) => set('tan_portal_password', e.target.value)} autoComplete="new-password" /></Field>
              <Field label="Income Tax Portal Password"><PasswordField label="" value={form.it_portal_password} onChange={(e) => set('it_portal_password', e.target.value)} autoComplete="new-password" /></Field>
              <Field label="UDYAM"><input className="bp-input" value={form.udyam} onChange={(e) => set('udyam', e.target.value)} /></Field>
              <Field label="Shop & Establishment"><input className="bp-input" value={form.shop_establishment} onChange={(e) => set('shop_establishment', e.target.value)} /></Field>
              <Field label="IEC"><input className="bp-input" value={form.iec} onChange={(e) => set('iec', e.target.value)} /></Field>
              <Field label="CIN"><input className="bp-input" value={form.cin} onChange={(e) => set('cin', e.target.value)} /></Field>
              <Field label="LLPIN"><input className="bp-input" value={form.llpin} onChange={(e) => set('llpin', e.target.value)} /></Field>
              <Field label="Professional Tax Reg"><input className="bp-input" value={form.pt_reg} onChange={(e) => set('pt_reg', e.target.value)} /></Field>
              <Field label="ESIC"><input className="bp-input" value={form.esic} onChange={(e) => set('esic', e.target.value)} /></Field>
              <Field label="PF"><input className="bp-input" value={form.pf} onChange={(e) => set('pf', e.target.value)} /></Field>
            </div>
          )}

          {tab === 'bank' && (
            <div className="cp-grid">
              <Field label="Bank Name"><input className="bp-input" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} /></Field>
              <Field label="Branch"><input className="bp-input" value={form.bank_branch} onChange={(e) => set('bank_branch', e.target.value)} /></Field>
              <Field label="Account Holder Name"><input className="bp-input" value={form.account_holder_name} onChange={(e) => set('account_holder_name', e.target.value)} /></Field>
              <Field label="Account Number"><input className="bp-input" value={form.bank_account} onChange={(e) => set('bank_account', e.target.value)} /></Field>
              <Field label="IFSC"><input className="bp-input" value={form.bank_ifsc} onChange={(e) => set('bank_ifsc', e.target.value)} /></Field>
              <Field label="SWIFT Code"><input className="bp-input" value={form.swift_code} onChange={(e) => set('swift_code', e.target.value)} /></Field>
              <Field label="Account Type"><input className="bp-input" value={form.account_type} onChange={(e) => set('account_type', e.target.value)} /></Field>
              <Field label="UPI ID"><input className="bp-input" value={form.upi_id} onChange={(e) => set('upi_id', e.target.value)} /></Field>
              <p className="full" style={{ color: 'var(--bp-muted)', fontSize: 13, margin: 0 }}>
                Logo, signature, seal, and QR code are managed by the client via Settings and appear here only after you approve a change request.
              </p>
            </div>
          )}

          {tab === 'numbering' && (
            <div>
              <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 0, marginBottom: 14 }}>
                Set the prefix and the next starting number for each document type.
                Use this mid-year so new invoices continue from the client&apos;s existing series
                (e.g. if the last invoice was 0044, set Next Number to 45).
              </p>
              <div className="cp-grid">
                {NUMBERING_FIELDS.map((row) => {
                  const prefix = form[row.prefix] || row.defaultPrefix;
                  const next = Number(form[row.next] || 1);
                  const preview = (String(prefix).endsWith('/') || String(prefix).endsWith('-'))
                    ? `${prefix}${String(next).padStart(2, '0')}`
                    : `${prefix}-${String(next).padStart(2, '0')}`;
                  return (
                    <div key={row.next} className="full cp-numbering-row" style={{ paddingBottom: 10, borderBottom: '1px solid var(--bp-border, #e2e8f0)' }}>
                      <Field label={`${row.label} Prefix`}>
                        <input
                          className="bp-input"
                          value={form[row.prefix] || ''}
                          placeholder={row.defaultPrefix}
                          onChange={(e) => set(row.prefix, e.target.value)}
                        />
                      </Field>
                      <Field label="Next Number">
                        <input
                          className="bp-input"
                          type="number"
                          min={1}
                          value={form[row.next] ?? 1}
                          onChange={(e) => set(row.next, Math.max(1, parseInt(e.target.value, 10) || 1))}
                        />
                      </Field>
                      <div style={{ fontSize: 12, color: 'var(--bp-muted)', paddingBottom: 10 }}>
                        Next: <strong style={{ color: 'var(--bp-navy)' }}>{preview}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'credentials' && (
            <div className="cp-grid">
              <Field label="Client ID"><input className="bp-input" placeholder="Auto-generated if blank" value={form.client_code} onChange={(e) => set('client_code', e.target.value)} /></Field>
              <Field label="Login Email"><input className="bp-input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <div className="full">
                <PasswordField label={isEdit ? 'New Password (leave blank to keep)' : 'Password'} required={!isEdit} value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
              </div>
              <Field label="Status">
                <select className="bp-select" value={form.is_active ? 'active' : 'inactive'} onChange={(e) => set('is_active', e.target.value === 'active')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
