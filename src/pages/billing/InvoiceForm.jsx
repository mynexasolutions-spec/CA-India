import { useEffect, useMemo, useState } from 'react';
import { billingDocPath, CURRENCIES, docTypeLabel, documentDateLabel, formatDMY, money, normalizeGstRate } from './billingUtils';
import { useAuth } from '../../auth/AuthContext';
import { docTypeLock, isDocTypeDisabled, showGstFields, showHsnFields, showRcmCheckbox } from './billingProfile';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import StateSelect from '../../components/StateSelect';
import HsnSacSelect from '../../components/HsnSacSelect';
import GstRateSelect from '../../components/GstRateSelect';
import DocTypeTiles from './DocTypeTiles';
import PartySearchSelect from './PartySearchSelect';

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

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="12" height="8" rx="1.5" />
      <path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

function InfoDotIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9.2v4.3M10 6.7v.01" />
    </svg>
  );
}

/** Numbered section header, matching the ①②③ pattern from the approved Create Document mockup. */
function SectionHeader({ n, title, subtitle }) {
  return (
    <div className="bp-section-header">
      <span className="bp-section-header-num">{n}</span>
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}

const DOC_TYPE_TILE_SET = ['tax_invoice', 'bill_of_supply', 'debit_note', 'credit_note'];

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
  const [currency, setCurrency] = useState('INR');
  const [refId, setRefId] = useState(params.get('ref') || '');
  const [rcm, setRcm] = useState(false);
  const [lines, setLines] = useState([emptyLine()]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [docId, setDocId] = useState(id || null);
  const [docNumber, setDocNumber] = useState('');
  const [previewNumber, setPreviewNumber] = useState('');
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
  const showRcmBox = showRcmCheckbox(profile) && ['tax_invoice', 'debit_note', 'credit_note'].includes(docType);
  const showTaxSettingsSection = showRcmBox || tdsTcsApplicable;

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
      setDocNumber(d.number || '');
      setDocStatus(d.status || 'draft');
      setEditAllowed(!!d.edit_allowed);
      setPartyId(d.customer_id ? String(d.customer_id) : '');
      setParty(d.customer);
      setInter(!!d.is_inter_state);
      setDocumentDate(String(d.document_date).slice(0, 10));
      setPlaceOfSupply(d.place_of_supply || '');
      setPaymentTerms(d.payment_terms || '');
      setCurrency(d.currency || 'INR');
      setRefId(d.reference_document_id ? String(d.reference_document_id) : '');
      setRcm(!!d.is_reverse_charge);
      setTaxDeductionType(d.tax_deduction_type || '');
      setTdsTcsSectionId(d.tds_tcs_section_id ? String(d.tds_tcs_section_id) : '');
      const mapped = mapDocLines(d.line_items);
      setLines(mapped.length ? mapped : [emptyLine()]);
    });
  }, [id]);

  // Read-only preview of the number Generate/Issue will allocate — never reserved,
  // purely informational (Reference 2 mockup shows Document No. locked from the start).
  useEffect(() => {
    if (id) return undefined;
    let cancelled = false;
    api(`/billing/documents/next-number?type=${docType}`)
      .then((d) => { if (!cancelled) setPreviewNumber(d.number || ''); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id, docType]);

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
    currency,
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
    // Billing Module spec §16: default Place of Supply to the party's saved State.
    // It remains editable per document — this never writes back to the Party Master.
    setPlaceOfSupply(p.state || '');
    if (p.state_code && profile?.state_code) {
      setInter(p.state_code !== profile.state_code);
    }
  };

  const setLine = (idx, key, val) => setLines((L) => L.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));

  const quickAddByHsn = (code, row) => {
    setLines((L) => {
      const blank = L.find((l) => !l.description && !l.hsn_sac);
      const filled = { ...emptyLine(), hsn_sac: code, description: row?.description || '' };
      if (blank) return L.map((l) => (l === blank ? filled : l));
      return [...L, filled];
    });
  };

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

  const saveDraft = async () => {
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
      setDocNumber(doc.number || '');
      setDocStatus(doc.status);
      setEditAllowed(!!doc.edit_allowed);
      setMsg(unlockedEdit ? `Saved corrections: ${doc.number}` : `Draft saved: ${doc.number}`);
      if (unlockedEdit) navigate(billingDocPath(docType, doc.id));
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const generateDoc = async () => {
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
      setDocNumber(doc.number || '');
      setMsg(`Generated ${doc.number}`);
      navigate(billingDocPath(docType, doc.id));
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
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

  const backPath = {
    tax_invoice: '/portal/billing/invoices',
    debit_note: '/portal/billing/debit-notes',
    credit_note: '/portal/billing/credit-notes',
    bill_of_supply: '/portal/billing/bill-of-supply',
    quotation: '/portal/quotation',
    amendment: '/portal/amendments',
  }[docType] || '/portal/billing';
  let sectionNum = 0;

  return (
    <div>
      <div className="bp-toolbar" style={{ marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--bp-navy)' }}>{docId ? (title || 'Edit Document') : 'New Billing Document'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>Create and manage your business documents</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {docType === 'credit_note' ? (
            <Link className="bp-btn bp-btn-outline" style={{ borderRadius: 8, height: 40, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }} to={backPath}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Billing
            </Link>
          ) : (
            <>
              <Link className="bp-btn bp-btn-outline" style={{ borderRadius: 8, height: 40, display: 'flex', alignItems: 'center', fontWeight: 600 }} to={backPath}>Cancel</Link>
              <button type="button" className="bp-btn bp-btn-primary" style={{ borderRadius: 8, height: 40, backgroundColor: '#0052cc', fontWeight: 600 }} disabled={busy} onClick={saveDraft}>
                {unlockedEdit ? 'Save Changes' : 'Save Document'}
              </button>
            </>
          )}
        </div>
      </div>

      {!id && DOC_TYPE_TILE_SET.includes(docType) && (
        <DocTypeTiles docType={docType} profile={profile} />
      )}

      <div className="bp-card" style={{ marginBottom: 14 }}>
        <SectionHeader n={++sectionNum} title="Document Details" subtitle={docType === 'credit_note' ? 'Enter party and document details.' : 'Party, dates and basic settings for this document.'} />
        <form className="bp-form two">
          <label>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Document No. <InfoDotIcon /></span>
            <div style={{ position: 'relative' }}>
              <input className="bp-input" style={{ paddingRight: 30, color: 'var(--bp-muted)', background: '#f4f7fa' }} value={docNumber || previewNumber} readOnly disabled />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bp-muted)' }}><LockIcon /></span>
            </div>
          </label>
          <label>
            <span>{documentDateLabel(docType)} <span className="bp-required">*</span></span>
            <input className="bp-input" type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
          </label>
          <label>
            <span>Party <span className="bp-required">*</span></span>
            <PartySearchSelect parties={parties} value={partyId} onSelect={onParty} />
          </label>
          <label>
            <span>Place of Supply <span className="bp-required">*</span></span>
            <StateSelect
              value={placeOfSupply}
              valueMode="name"
              placeholder="Select state…"
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
          <label>
            Currency
            <select className="bp-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </label>

          {docType === 'bill_of_supply' && (
            <div
              className="bp-info-note"
              style={{
                gridColumn: '1 / -1',
                background: '#f0f7ff',
                border: '1px solid #dbeafe',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#1e40af',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 10
              }}
            >
              <InfoDotIcon />
              <span>Bill of Supply is applicable for supply to unregistered persons under GST.</span>
            </div>
          )}
          {unlockedEdit && (
            <p style={{ gridColumn: '1 / -1', color: 'var(--bp-green)', margin: 0, fontSize: 13 }}>
              Edit Allowed — save once to apply corrections. Unlock clears after save.
            </p>
          )}
        </form>
        {party && (
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--bp-muted)' }}>
            GSTIN: {party.gstin_display || party.gstin || 'Unregistered'} · {party.billing_address} · {party.phone}
          </p>
        )}
      </div>

      {['credit_note', 'debit_note', 'amendment'].includes(docType) && (
        <div className="bp-card" style={{ marginBottom: 14 }}>
          <SectionHeader
            n={++sectionNum}
            title={docType === 'amendment' ? 'Reference Bill (Amendment)' : `Reference Invoice (${docTypeLabel(docType)})`}
            subtitle={
              docType === 'amendment'
                ? 'Select the original bill against which this amendment is raised.'
                : `Select the original invoice against which this ${docTypeLabel(docType).toLowerCase()} is ${docType === 'credit_note' ? 'issued' : 'raised'}.`
            }
          />
          <div style={{ maxWidth: 650 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: '#475569' }}>
              {docType === 'amendment' ? 'Original Bill' : 'Original Invoice Number'} <span className="bp-required">*</span>
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select className="bp-select" style={{ height: 40, boxSizing: 'border-box', flex: 1 }} value={refId} onChange={(e) => setRefId(e.target.value)} required>
                <option value="">{docType === 'amendment' ? 'Select original bill…' : 'Search and select original invoice…'}</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} — {formatDMY(inv.document_date)} — {inv.customer?.name} ({docTypeLabel(inv.type)})
                  </option>
                ))}
              </select>
              {selectedRef && (
                <Link
                  className="bp-btn bp-btn-outline"
                  style={{
                    height: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1.5px solid #2563eb',
                    color: '#2563eb',
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: '0 16px',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box'
                  }}
                  to={billingDocPath(selectedRef.type, selectedRef.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View Invoice
                </Link>
              )}
            </div>
          </div>

          {selectedRef && (
            <div
              style={{
                marginTop: 16,
                background: '#f0f7ff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                padding: '12px 16px',
                gap: 16
              }}
            >
              <div style={{ borderRight: '1px solid #cbd5e1', paddingRight: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>Original Invoice No.</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>{selectedRef.number}</span>
              </div>
              <div style={{ borderRight: '1px solid #cbd5e1', paddingRight: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>Invoice Date</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>{formatDMY(selectedRef.document_date)}</span>
              </div>
              <div style={{ borderRight: '1px solid #cbd5e1', paddingRight: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>Original Taxable Value</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>{money(selectedRef.taxable_amount)}</span>
              </div>
              <div style={{ borderRight: '1px solid #cbd5e1', paddingRight: 12 }}>
                <span style={{ display: 'block', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>Original GST</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>{money(Number(selectedRef.cgst_amount) + Number(selectedRef.sgst_amount) + Number(selectedRef.igst_amount))}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>Original Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>{money(selectedRef.grand_total || selectedRef.total_amount)}</span>
              </div>
            </div>
          )}

          {docType === 'credit_note' && (
            <div
              className="bp-info-note"
              style={{
                background: '#f0f7ff',
                border: '1px solid #dbeafe',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#1e40af',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12
              }}
            >
              <InfoDotIcon />
              <span>Ensure the original invoice details are correct before raising a credit note.</span>
            </div>
          )}
        </div>
      )}

      {showTaxSettingsSection && (
        <div className="bp-card" style={{ marginBottom: 14 }}>
          <SectionHeader n={++sectionNum} title="Additional Tax Settings" subtitle="Configure tax related options for this invoice." />
          <div className="bp-tax-option-boxes">
            {showRcmBox && (
              <div className="bp-tax-option-box">
                <div className="bp-tax-option-box-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Supply Under Reverse Charge? <InfoDotIcon /></div>
                <div className="bp-tax-option-box-radios">
                  <label><input type="radio" name="rcm" checked={rcm} onChange={() => setRcm(true)} /> Yes</label>
                  <label><input type="radio" name="rcm" checked={!rcm} onChange={() => setRcm(false)} /> No</label>
                </div>
              </div>
            )}
            {tdsTcsApplicable && (
              <div className="bp-tax-option-box">
                <div className="bp-tax-option-box-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>TDS <InfoDotIcon /></div>
                <div className="bp-tax-option-box-radios">
                  <label><input type="radio" name="tds" checked={taxDeductionType === 'tds'} onChange={() => { setTaxDeductionType('tds'); setTdsTcsSectionId(''); }} /> Yes</label>
                  <label><input type="radio" name="tds" checked={taxDeductionType !== 'tds'} onChange={() => { if (taxDeductionType === 'tds') { setTaxDeductionType(''); setTdsTcsSectionId(''); } }} /> No</label>
                </div>
              </div>
            )}
            {tdsTcsApplicable && (
              <div className="bp-tax-option-box">
                <div className="bp-tax-option-box-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>TCS <InfoDotIcon /></div>
                <div className="bp-tax-option-box-radios">
                  <label><input type="radio" name="tcs" checked={taxDeductionType === 'tcs'} onChange={() => { setTaxDeductionType('tcs'); setTdsTcsSectionId(''); }} /> Yes</label>
                  <label><input type="radio" name="tcs" checked={taxDeductionType !== 'tcs'} onChange={() => { if (taxDeductionType === 'tcs') { setTaxDeductionType(''); setTdsTcsSectionId(''); } }} /> No</label>
                </div>
              </div>
            )}
          </div>
          {tdsTcsApplicable && taxDeductionType && (
            <div className="bp-form two" style={{ marginTop: 12 }}>
              <label>
                {taxDeductionType === 'tds' ? 'TDS' : 'TCS'} Section
                <select className="bp-select" value={tdsTcsSectionId} onChange={(e) => setTdsTcsSectionId(e.target.value)} required>
                  <option value="">Select section…</option>
                  {activeSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} — {s.description}</option>
                  ))}
                </select>
              </label>
              <label>
                Rate (%)
                <input className="bp-input" style={{ width: 90 }} value={selectedSection ? Number(selectedSection.rate).toFixed(2) : ''} readOnly disabled />
              </label>
            </div>
          )}
        </div>
      )}

      <div className="bp-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <SectionHeader n={++sectionNum} title="Item Details" subtitle="Add items or services for this document." />
          {hsnEnabled && (
            <div className="bp-global-hsn-search" style={{ minWidth: 260, position: 'relative' }}>
              <HsnSacSelect
                value=""
                onChange={quickAddByHsn}
                placeholder="Search HSN / SAC"
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--bp-muted)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="6" />
                  <path d="M19 19l-5-5" />
                </svg>
              </span>
            </div>
          )}
        </div>

        <div className="bp-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="bp-table bp-invoice-lines-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: 50, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>#</th>
                <th style={{ color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>Particulars <span className="bp-required">*</span></th>
                {hsnEnabled && <th style={{ width: 180, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>HSN / SAC <span className="bp-required">*</span></th>}
                <th style={{ width: 70, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>Qty <span className="bp-required">*</span></th>
                <th style={{ width: 85, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>Unit</th>
                <th style={{ width: 110, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>Rate (₹) <span className="bp-required">*</span></th>
                <th style={{ width: 75, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>Disc.%</th>
                {taxesEnabled && <th style={{ width: 100, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>GST % <span className="bp-required">*</span></th>}
                <th style={{ width: 130, color: 'var(--bp-text)', fontWeight: 700, borderRight: '1px solid var(--bp-border)' }}>Taxable Value (₹)</th>
                <th style={{ width: 60, color: 'var(--bp-text)', fontWeight: 700 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const gross = Number(l.qty || 0) * Number(l.rate || 0);
                const disc = (gross * Number(l.discount_percent || 0)) / 100;
                const lineTaxable = Math.max(0, gross - disc);

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, borderRight: '1px solid var(--bp-border)' }}>{idx + 1}</td>
                    <td style={{ borderRight: '1px solid var(--bp-border)' }}>
                      <textarea
                        className="bp-textarea"
                        style={{ height: 38, resize: 'none', padding: '6px 8px', fontSize: 13, border: '1px solid var(--bp-border)', borderRadius: 8 }}
                        value={l.description}
                        onChange={(e) => setLine(idx, 'description', e.target.value)}
                        placeholder="Description of product / service"
                        required
                      />
                    </td>
                    {hsnEnabled && (
                      <td style={{ borderRight: '1px solid var(--bp-border)' }}>
                        <HsnSacSelect
                          value={l.hsn_sac}
                          onChange={(code) => setLine(idx, 'hsn_sac', code)}
                          placeholder="Search HSN / SAC"
                          required
                        />
                      </td>
                    )}
                    <td style={{ borderRight: '1px solid var(--bp-border)' }}>
                      <input
                        className="bp-input"
                        type="number"
                        style={{ textAlign: 'center', border: '1px solid var(--bp-border)', borderRadius: 8 }}
                        required
                        value={l.qty}
                        onChange={(e) => setLine(idx, 'qty', +e.target.value)}
                      />
                    </td>
                    <td style={{ borderRight: '1px solid var(--bp-border)' }}>
                      <input
                        className="bp-input"
                        style={{ textAlign: 'center', border: '1px solid var(--bp-border)', borderRadius: 8 }}
                        value={l.unit}
                        onChange={(e) => setLine(idx, 'unit', e.target.value)}
                      />
                    </td>
                    <td style={{ borderRight: '1px solid var(--bp-border)' }}>
                      <input
                        className="bp-input"
                        type="number"
                        step="0.01"
                        style={{ textAlign: 'right', border: '1px solid var(--bp-border)', borderRadius: 8 }}
                        required
                        value={l.rate}
                        onChange={(e) => setLine(idx, 'rate', +e.target.value)}
                      />
                    </td>
                    <td style={{ borderRight: '1px solid var(--bp-border)' }}>
                      <input
                        className="bp-input"
                        type="number"
                        style={{ textAlign: 'center', border: '1px solid var(--bp-border)', borderRadius: 8 }}
                        required
                        value={l.discount_percent}
                        onChange={(e) => setLine(idx, 'discount_percent', +e.target.value)}
                      />
                    </td>
                    {taxesEnabled && (
                      <td style={{ borderRight: '1px solid var(--bp-border)' }}>
                        <GstRateSelect
                          value={rcm ? 0 : l.gst_rate}
                          onChange={(rate) => setLine(idx, 'gst_rate', rate)}
                          disabled={rcm}
                        />
                      </td>
                    )}
                    <td style={{ fontWeight: 600, borderRight: '1px solid var(--bp-border)' }}>
                      {money(lineTaxable)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="bp-line-remove"
                        aria-label="Remove item"
                        title="Remove item"
                        onClick={() => setLines((L) => (L.length > 1 ? L.filter((_, i) => i !== idx) : [emptyLine()]))}
                        style={{ margin: 'auto' }}
                      >
                        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 6h12" />
                          <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6" />
                          <path d="M5.5 6l.6 9.2A1.5 1.5 0 0 0 7.6 16.5h4.8a1.5 1.5 0 0 0 1.5-1.3L14.5 6" />
                          <path d="M8.3 9v4.5M11.7 9v4.5" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button
            type="button"
            className="bp-btn bp-btn-outline"
            style={{ border: '1.5px solid #2563eb', color: '#2563eb', fontWeight: 700 }}
            onClick={() => setLines((L) => [...L, emptyLine()])}
          >
            + Add Item
          </button>
          <span style={{ fontSize: 13, color: 'var(--bp-muted)' }}>You can add multiple items</span>
        </div>
      </div>

      <div className="bp-split" style={{ marginTop: 14 }}>
        <div className="bp-actions">
          <button type="button" className="bp-btn bp-btn-outline" disabled={busy} onClick={saveDraft}>
            {unlockedEdit ? 'Save Corrections' : 'Save Draft'}
          </button>
          {!unlockedEdit && (
            <button type="button" className="bp-btn bp-btn-green" disabled={busy} onClick={generateDoc}>
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
