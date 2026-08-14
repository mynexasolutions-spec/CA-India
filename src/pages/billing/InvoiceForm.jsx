import { useEffect, useMemo, useState } from 'react';
import { billingDocPath, docTypeLabel, documentDateLabel, normalizeGstRate } from './billingUtils';
import { useAuth } from '../../auth/AuthContext';
import { docTypeLock, isDocTypeDisabled, showGstFields, showHsnFields, showRcmCheckbox } from './billingProfile';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import StateSelect from '../../components/StateSelect';
import HsnSacSelect from '../../components/HsnSacSelect';
import GstRateSelect from '../../components/GstRateSelect';

const emptyLine = () => ({
  description: '', hsn_sac: '', qty: 1, unit: 'NOS', rate: 0, discount_percent: 0, gst_rate: 18,
});

function mapDocLines(items) {
  return (items || []).map((l) => ({
    description: l.description,
    hsn_sac: l.hsn_sac || '',
    qty: Number(l.qty),
    unit: l.unit || 'NOS',
    rate: Number(l.rate),
    discount_percent: Number(l.discount_percent || 0),
    gst_rate: normalizeGstRate(l.gst_rate),
  }));
}

function calcLocal(lines, inter, taxesEnabled = true, tdsTcs = null) {
  let taxable = 0, cgst = 0, sgst = 0, igst = 0, discount = 0;
  lines.forEach((l) => {
    const gross = Number(l.qty || 0) * Number(l.rate || 0);
    const disc = (gross * Number(l.discount_percent || 0)) / 100;
    const t = Math.max(0, gross - disc);
    const g = taxesEnabled ? (t * Number(l.gst_rate || 0)) / 100 : 0;
    discount += disc;
    taxable += t;
    if (inter) igst += g;
    else { cgst += g / 2; sgst += g / 2; }
  });
  const sub = taxable + cgst + sgst + igst; // Total Value (Post GST)
  let round = Math.round(sub) - sub;
  let tdsTcsAmount = 0;
  let grand = sub + round;
  if (tdsTcs?.type && tdsTcs.rate) {
    round = 0;
    if (tdsTcs.type === 'tds') {
      // TDS (Income Tax) is deducted on the taxable value, excluding GST.
      tdsTcsAmount = (taxable * tdsTcs.rate) / 100;
      grand = sub - tdsTcsAmount;
    } else {
      // TCS is collected on the GST-inclusive invoice value.
      tdsTcsAmount = (sub * tdsTcs.rate) / 100;
      grand = sub + tdsTcsAmount;
    }
  }
  return { taxable, cgst, sgst, igst, discount, sub, round, tdsTcsAmount, grand };
}

export default function InvoiceForm({ docType = 'tax_invoice', title }) {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const taxesEnabled = showGstFields(profile);
  const hsnEnabled = showHsnFields(profile);
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [party, setParty] = useState(null);
  const [inter, setInter] = useState(false);
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [refId, setRefId] = useState(params.get('ref') || '');
  const [rcm, setRcm] = useState(false);
  const [lines, setLines] = useState([emptyLine()]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [docId, setDocId] = useState(id || null);
  const [docStatus, setDocStatus] = useState('draft');
  const [editAllowed, setEditAllowed] = useState(false);
  const [taxDeductionType, setTaxDeductionType] = useState(''); // '', 'tds', 'tcs'
  const [tdsTcsSectionId, setTdsTcsSectionId] = useState('');
  const [tdsSections, setTdsSections] = useState([]);
  const [tcsSections, setTcsSections] = useState([]);

  const tdsTcsApplicable = ['tax_invoice', 'bill_of_supply'].includes(docType);
  const activeSections = taxDeductionType === 'tds' ? tdsSections : taxDeductionType === 'tcs' ? tcsSections : [];
  const selectedSection = activeSections.find((s) => String(s.id) === String(tdsTcsSectionId));
  const tdsTcsRate = selectedSection ? Number(selectedSection.rate) : 0;
  const requireHsn = hsnEnabled;

  const totals = useMemo(
    () => calcLocal(lines, inter, taxesEnabled && !rcm, tdsTcsApplicable && taxDeductionType ? { type: taxDeductionType, rate: tdsTcsRate } : null),
    [lines, inter, taxesEnabled, rcm, tdsTcsApplicable, taxDeductionType, tdsTcsRate]
  );
  const selectedRef = invoices.find((inv) => String(inv.id) === String(refId));
  const unlockedEdit = editAllowed && ['issued', 'partial', 'paid'].includes(docStatus);

  useEffect(() => {
    api('/billing/tds-tcs-sections?type=tds').then((d) => setTdsSections(d.data || []));
    api('/billing/tds-tcs-sections?type=tcs').then((d) => setTcsSections(d.data || []));
  }, []);

  useEffect(() => {
    api('/billing/parties').then((d) => setParties(d.data || []));
    if (docType === 'credit_note' || docType === 'debit_note') {
      api('/billing/documents?type=tax_invoice&status=issued').then((d) => setInvoices(d.data || []));
    }
    if (docType === 'amendment') {
      Promise.all([
        api('/billing/documents?type=tax_invoice&status=issued'),
        api('/billing/documents?type=credit_note&status=issued'),
        api('/billing/documents?type=debit_note&status=issued'),
      ]).then(([a, b, c]) => setInvoices([...(a.data || []), ...(b.data || []), ...(c.data || [])]));
    }
  }, [docType]);

  useEffect(() => {
    if (!id) return;
    api(`/billing/documents/${id}`).then((d) => {
      setDocId(d.id);
      setDocStatus(d.status || 'draft');
      setEditAllowed(!!d.edit_allowed);
      setPartyId(d.customer_id ? String(d.customer_id) : '');
      setParty(d.customer);
      setInter(!!d.is_inter_state);
      setDocumentDate(String(d.document_date).slice(0, 10));
      setPlaceOfSupply(d.place_of_supply || '');
      setPaymentTerms(d.payment_terms || '');
      setRefId(d.reference_document_id ? String(d.reference_document_id) : '');
      setRcm(!!d.is_reverse_charge);
      setTaxDeductionType(d.tax_deduction_type || '');
      setTdsTcsSectionId(d.tds_tcs_section_id ? String(d.tds_tcs_section_id) : '');
      const mapped = mapDocLines(d.line_items);
      setLines(mapped.length ? mapped : [emptyLine()]);
    });
  }, [id]);

  // Prefill credit/debit notes and amendments from original document (?ref= or dropdown)
  useEffect(() => {
    if (id || !refId) return;
    if (!['amendment', 'credit_note', 'debit_note'].includes(docType)) return;
    api(`/billing/documents/${refId}`).then((d) => {
      setPartyId(d.customer_id ? String(d.customer_id) : '');
      setParty(d.customer);
      setInter(!!d.is_inter_state);
      setPlaceOfSupply(d.place_of_supply || '');
      setPaymentTerms(d.payment_terms || '');
      setRcm(!!d.is_reverse_charge);
      const mapped = mapDocLines(d.line_items);
      setLines(mapped.length ? mapped : [emptyLine()]);
    }).catch(() => {});
  }, [id, docType, refId]);

  const payload = () => ({
    type: docType,
    customer_id: partyId ? +partyId : null,
    reference_document_id: refId ? +refId : null,
    document_date: documentDate,
    place_of_supply: placeOfSupply,
    payment_terms: paymentTerms,
    is_inter_state: inter,
    is_reverse_charge: rcm,
    tax_deduction_type: tdsTcsApplicable && taxDeductionType ? taxDeductionType : null,
    tds_tcs_section_id: tdsTcsApplicable && taxDeductionType && tdsTcsSectionId ? +tdsTcsSectionId : null,
    lines,
  });

  const onParty = async (pid) => {
    setPartyId(pid);
    if (!pid) { setParty(null); return; }
    const p = await api(`/billing/parties/${pid}`);
    setParty(p);
    setPlaceOfSupply(''); // invoice-specific — do not copy from party master
    if (p.state_code && profile?.state_code) {
      setInter(p.state_code !== profile.state_code);
    }
  };

  const setLine = (idx, key, val) => setLines((L) => L.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));

  const validateBeforeSave = () => {
    if (!partyId) return 'Please select a party.';

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const rowNo = i + 1;

      if (!String(line.description || '').trim()) {
        return `Line ${rowNo}: Particulars is required.`;
      }

      if (requireHsn && !String(line.hsn_sac || '').trim()) {
        return `Line ${rowNo}: HSN/SAC is required.`;
      }

      if (Number(line.qty) <= 0) {
        return `Line ${rowNo}: Qty must be greater than 0.`;
      }

      if (Number(line.rate) < 0) {
        return `Line ${rowNo}: Rate cannot be negative.`;
      }

      const discount = Number(line.discount_percent || 0);
      if (Number.isNaN(discount) || discount < 0 || discount > 100) {
        return `Line ${rowNo}: Discount must be between 0 and 100.`;
      }
    }

    return '';
  };

  if (isDocTypeDisabled(profile, docType)) {
    return (
      <div className="bp-card">
        <h2 style={{ marginTop: 0 }}>{title || 'Create Document'}</h2>
        <p style={{ color: '#c0392b' }}>{docTypeLock(profile, docType)}</p>
        <Link className="bp-btn bp-btn-outline" to="/portal/billing">Back to Billing</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="bp-toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>{title || 'Create Document'}</h2>
        {docId && <Link className="bp-btn bp-btn-outline" to={billingDocPath(docType, docId)}>Open saved</Link>}
      </div>

      <div className="bp-card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0, marginBottom: 2, color: 'var(--bp-navy)' }}>Invoice Details</h3>
        <p className="bp-section-desc" style={{ marginBottom: 14 }}>Party, dates and tax settings for this document.</p>
        <form className="bp-form two">
          <label>
            <span>Party <span className="bp-required">*</span></span>
            <select className="bp-select" value={partyId} onChange={(e) => onParty(e.target.value)} required>
              <option value="">Select party…</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            {documentDateLabel(docType)}
            <input className="bp-input" type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
          </label>
          <label>
            Place of Supply
            <StateSelect
              value={placeOfSupply}
              valueMode="name"
              placeholder="Select state for this invoice…"
              onChange={(code, name) => {
                setPlaceOfSupply(name);
                if (code && profile?.state_code) {
                  setInter(code !== profile.state_code);
                }
              }}
            />
            {taxesEnabled && !rcm && placeOfSupply && (
              <span className={`bp-tax-type-hint ${inter ? 'inter' : 'intra'}`}>
                {inter ? 'Inter-state — IGST applies' : 'Intra-state — CGST + SGST applies'}
              </span>
            )}
          </label>
          <label>
            Payment Terms
            <input className="bp-input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 7 / Immediate" />
          </label>
          {(docType === 'credit_note' || docType === 'debit_note' || docType === 'amendment') && (
            <label style={{ gridColumn: '1 / -1' }}>
              {docType === 'amendment' ? 'Original Bill *' : 'Original Invoice Number *'}
              <select className="bp-select" value={refId} onChange={(e) => setRefId(e.target.value)} required>
                <option value="">{docType === 'amendment' ? 'Select original bill…' : 'Select original invoice…'}</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} — {String(inv.document_date).slice(0, 10)} — {inv.customer?.name} ({docTypeLabel(inv.type)})
                  </option>
                ))}
              </select>
              {selectedRef && (
                <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--bp-muted)' }}>
                  Original Date: {String(selectedRef.document_date).slice(0, 10)}
                </span>
              )}
            </label>
          )}
          {unlockedEdit && (
            <p style={{ gridColumn: '1 / -1', color: 'var(--bp-green)', margin: 0, fontSize: 13 }}>
              Edit Allowed — save once to apply corrections. Unlock clears after save.
            </p>
          )}
          {((showRcmCheckbox(profile) && ['tax_invoice', 'debit_note', 'credit_note'].includes(docType)) || tdsTcsApplicable) && (
            <div className="bp-tax-options" style={{ gridColumn: '1 / -1' }}>
              {showRcmCheckbox(profile) && ['tax_invoice', 'debit_note', 'credit_note'].includes(docType) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={rcm} onChange={(e) => setRcm(e.target.checked)} />
                  Supply Under Reverse Charge?
                </label>
              )}
              {tdsTcsApplicable && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={taxDeductionType === 'tds'}
                      onChange={(e) => { setTaxDeductionType(e.target.checked ? 'tds' : ''); setTdsTcsSectionId(''); }}
                    />
                    TDS
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={taxDeductionType === 'tcs'}
                      onChange={(e) => { setTaxDeductionType(e.target.checked ? 'tcs' : ''); setTdsTcsSectionId(''); }}
                    />
                    TCS
                  </label>
                  {taxDeductionType && (
                    <>
                      <label style={{ marginBottom: 0 }}>
                        {taxDeductionType === 'tds' ? 'TDS' : 'TCS'} Section
                        <select
                          className="bp-select"
                          value={tdsTcsSectionId}
                          onChange={(e) => setTdsTcsSectionId(e.target.value)}
                          required
                        >
                          <option value="">Select section…</option>
                          {activeSections.map((s) => (
                            <option key={s.id} value={s.id}>{s.code} — {s.description}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ marginBottom: 0 }}>
                        Rate (%)
                        <input
                          className="bp-input"
                          style={{ width: 90 }}
                          value={selectedSection ? Number(selectedSection.rate).toFixed(2) : ''}
                          readOnly
                          disabled
                        />
                      </label>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </form>
        {party && (
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--bp-muted)' }}>
            GSTIN: {party.gstin_display || party.gstin || 'Unregistered'} · {party.billing_address} · {party.phone}
          </p>
        )}
      </div>

      <div className="bp-card bp-line-grid">
        <h3 style={{ marginTop: 0 }}>Item Details</h3>
        <div className="bp-line-row" style={{ fontSize: 11, color: 'var(--bp-muted)', fontWeight: 700 }}>
          <span>Particulars <span className="bp-required">*</span></span>
          {hsnEnabled && <span>HSN/SAC <span className="bp-required">*</span></span>}
          <span>Qty <span className="bp-required">*</span></span>
          <span>Rate <span className="bp-required">*</span></span>
          <span>Disc% <span className="bp-required">*</span></span>
          {taxesEnabled && <span>GST%</span>}
          <span>Unit</span><span />
        </div>
        {lines.map((l, idx) => (
          <div className="bp-line-row" key={idx}>
            <input className="bp-input" value={l.description} onChange={(e) => setLine(idx, 'description', e.target.value)} placeholder="Description" required />
            {hsnEnabled && (
              <HsnSacSelect
                value={l.hsn_sac}
                onChange={(code) => setLine(idx, 'hsn_sac', code)}
                placeholder="Search HSN / SAC"
                required
              />
            )}
            <input className="bp-input" type="number" required value={l.qty} onChange={(e) => setLine(idx, 'qty', +e.target.value)} />
            <input className="bp-input" type="number" required value={l.rate} onChange={(e) => setLine(idx, 'rate', +e.target.value)} />
            <input className="bp-input" type="number" required value={l.discount_percent} onChange={(e) => setLine(idx, 'discount_percent', +e.target.value)} />
            {taxesEnabled && (
              <GstRateSelect
                value={l.gst_rate}
                onChange={(rate) => setLine(idx, 'gst_rate', rate)}
                disabled={rcm}
              />
            )}
            <input className="bp-input" value={l.unit} onChange={(e) => setLine(idx, 'unit', e.target.value)} />
            <button
              type="button"
              className="bp-line-remove"
              aria-label="Remove item"
              title="Remove item"
              onClick={() => setLines((L) => (L.length > 1 ? L.filter((_, i) => i !== idx) : [emptyLine()]))}
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h12" />
                <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6" />
                <path d="M5.5 6l.6 9.2A1.5 1.5 0 0 0 7.6 16.5h4.8a1.5 1.5 0 0 0 1.5-1.3L14.5 6" />
                <path d="M8.3 9v4.5M11.7 9v4.5" />
              </svg>
            </button>
          </div>
        ))}
        <button type="button" className="bp-btn bp-btn-outline" onClick={() => setLines((L) => [...L, emptyLine()])}>+ Add Item</button>
      </div>

      <div className="bp-split" style={{ marginTop: 14 }}>
        <div className="bp-actions">
          <button
            type="button"
            className="bp-btn bp-btn-outline"
            disabled={busy}
            onClick={async () => {
              const validationError = validateBeforeSave();
              if (validationError) {
                setMsg(validationError);
                return;
              }
              setBusy(true); setMsg('');
              try {
                const body = { ...payload(), status: unlockedEdit ? docStatus : 'draft' };
                const doc = docId
                  ? await api(`/billing/documents/${docId}`, { method: 'PUT', body })
                  : await api('/billing/documents', { method: 'POST', body: { ...body, status: 'draft' } });
                setDocId(doc.id);
                setDocStatus(doc.status);
                setEditAllowed(!!doc.edit_allowed);
                setMsg(unlockedEdit ? `Saved corrections: ${doc.number}` : `Draft saved: ${doc.number}`);
                if (unlockedEdit) navigate(billingDocPath(docType, doc.id));
              } catch (e) { setMsg(e.message); }
              finally { setBusy(false); }
            }}
          >
            {unlockedEdit ? 'Save Corrections' : 'Save Draft'}
          </button>
          {!unlockedEdit && (
          <button
            type="button"
            className="bp-btn bp-btn-green"
            disabled={busy}
            onClick={async () => {
              const validationError = validateBeforeSave();
              if (validationError) {
                setMsg(validationError);
                return;
              }
              setBusy(true); setMsg('');
              try {
                let doc;
                if (docId) {
                  await api(`/billing/documents/${docId}`, { method: 'PUT', body: { ...payload(), status: 'draft' } });
                  doc = await api(`/billing/documents/${docId}/issue`, { method: 'POST', body: {} });
                } else {
                  doc = await api('/billing/documents', { method: 'POST', body: { ...payload(), status: 'issued' } });
                }
                setDocId(doc.id);
                setMsg(`Generated ${doc.number}`);
                navigate(billingDocPath(docType, doc.id));
              } catch (e) { setMsg(e.message); }
              finally { setBusy(false); }
            }}
          >
            Generate {docType === 'tax_invoice' ? 'Tax Invoice' : docType === 'bill_of_supply' ? 'Bill of Supply' : docType === 'quotation' ? 'Quotation' : docType === 'debit_note' ? 'Debit Note' : docType === 'credit_note' ? 'Credit Note' : docType === 'amendment' ? 'Amendment' : 'Document'}
          </button>
          )}
        </div>
        <div className="bp-gst-box">
          <h3>Totals</h3>
          {[
            ['Discount', totals.discount],
            ['Taxable', totals.taxable],
            ...(taxesEnabled
              ? (inter
                ? [['IGST', rcm ? 0 : totals.igst]]
                : [['CGST', rcm ? 0 : totals.cgst], ['SGST', rcm ? 0 : totals.sgst]])
              : []),
            ...(tdsTcsApplicable && taxDeductionType
              ? [
                  ['Total Value (Post GST)', totals.sub],
                  [taxDeductionType === 'tds' ? 'Less: TDS' : 'Add: TCS', totals.tdsTcsAmount],
                ]
              : [['Round Off', totals.round]]),
            ['Grand Total', totals.grand],
          ].map(([k, v]) => (
            <div key={k} className="bp-gst-row"><span>{k}</span><strong>₹{v.toFixed(2)}</strong></div>
          ))}
        </div>
      </div>
      {msg && <p style={{ marginTop: 12, color: msg.includes('Generated') || msg.includes('saved') ? 'var(--bp-green)' : 'var(--bp-red)' }}>{msg}</p>}
    </div>
  );
}
