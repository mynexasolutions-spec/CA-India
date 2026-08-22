import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import PasswordField from '../../components/PasswordField';
import { useClientPortal } from '../../components/portal/PortalShell';
import { billingMode } from '../billing/billingProfile';
import { currentFyLabel, currentFyRange, fyDateRange, fyQuarterOptions, money } from '../billing/billingUtils';
import { ComplianceStatus, DashCard, LiveBadge, SalesBarChart } from './ClientDashboardWidgets';

const card = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
};

const PROFILE_ICON_PROPS = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
function BuildingIcon() {
  return (
    <svg {...PROFILE_ICON_PROPS}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 21v-4h6v4M9 7h.01M9 11h.01M9 15h.01M15 7h.01M15 11h.01M15 15h.01" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg {...PROFILE_ICON_PROPS}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}
function HashIcon() {
  return (
    <svg {...PROFILE_ICON_PROPS}>
      <path d="M5 9h14M5 15h14M10 4l-3 16M17 4l-3 16" />
    </svg>
  );
}
function IdCardIcon() {
  return (
    <svg {...PROFILE_ICON_PROPS}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11.5" r="1.8" />
      <path d="M6 16c.5-1.5 1.7-2 2.5-2s2 .5 2.5 2M14 9h5M14 13h5M14 17h3" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg {...PROFILE_ICON_PROPS}>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg {...PROFILE_ICON_PROPS}>
      <path d="M4 5c0 8.3 6.7 15 15 15l3-4.5-6-2-1.5 2A12.8 12.8 0 0 1 8.5 9.5L10.5 8l-2-6L4 5Z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg {...PROFILE_ICON_PROPS}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 6.5 12 13l8-6.5" />
    </svg>
  );
}

const PROFILE_FIELDS = [
  ['business_name', 'Legal Entity / Company Name', BuildingIcon],
  ['client_name', 'Proprietor / Authorized Signatory', PersonIcon],
  ['gstin', 'GSTN', HashIcon],
  ['pan', 'PAN', IdCardIcon],
  ['address', 'Registered Address', PinIcon],
  ['city', 'City', PinIcon],
  ['pincode', 'Pincode', PinIcon],
  ['state_code', 'State Code', PinIcon],
  ['phone', 'Contact Number', PhoneIcon],
  ['email', 'Email', MailIcon],
];

/** GST configuration → dashboard label, per the Client Portal Master Developer Guide. */
function gstConfigLabel(profile) {
  const mode = billingMode(profile);
  if (mode === 'retail') return 'Non-GST';
  if (mode === 'composition') return 'GST Composition';
  return profile?.gst_filing_frequency === 'quarterly' ? 'GST Quarterly' : 'GST Monthly';
}

/** "(Monthly)" / "(Quarterly)" suffix for Regular-dealer card titles — the spec's condition
 * is Registration Type = Regular AND Return Frequency, not registration type alone.
 * Retail (no GST returns at all) clients don't carry this label. */
function freqSuffix(profile) {
  if (billingMode(profile) !== 'regular') return '';
  return profile?.gst_filing_frequency === 'quarterly' ? '(Quarterly)' : '(Monthly)';
}

/** e.g. freqTitle('Billing Overview', profile) -> "Billing Overview (Quarterly)", or just
 * "Billing Overview" when the suffix doesn't apply (Composition / Retail clients). */
function freqTitle(base, profile) {
  return `${base} ${freqSuffix(profile)}`.trim();
}

/** GST Reconciliation / GST Summary use CMP-08 terminology for Composition dealers,
 * Monthly/Quarterly for Regular dealers — reflects the actual return type being tracked. */
function returnTitle(base, profile) {
  const mode = billingMode(profile);
  const suffix = mode === 'composition' ? '(CMP-08)' : freqSuffix(profile);
  return `${base} ${suffix}`.trim();
}

/** Sales Overview's chart groups by whatever cadence the numbers are actually bucketed at:
 * Quarterly for Composition (its compliance cycle is quarterly by law) and Regular-Quarterly
 * dealers, Monthly for everyone else. */
function chartFreqTitle(base, profile) {
  const mode = billingMode(profile);
  if (mode === 'composition') return `${base} (Quarterly)`;
  if (mode !== 'regular') return base;
  return `${base} ${profile?.gst_filing_frequency === 'quarterly' ? '(Quarterly)' : '(Monthly)'}`;
}

function StatTile({ label, count, value, color, bg }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bp-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          {count} {count === 1 ? 'Doc' : 'Docs'}
        </span>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--bp-navy)' }}>{value}</span>
      </div>
    </div>
  );
}

function ViewLink({ to, children }) {
  return (
    <Link to={to} style={{ fontSize: 12, fontWeight: 700, color: 'var(--bp-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14 }}>
      {children} <span aria-hidden="true">→</span>
    </Link>
  );
}

export function ClientDashboard() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const mode = billingMode(profile);
  const hasGst = Boolean(profile?.has_gst);
  const isComposition = mode === 'composition';
  // Composition dealers also carry gst_filing_frequency='quarterly' by convention (their CMP-08
  // cycle is quarterly), but the Quarter-selector UI on GST Summary is a Regular-dealer feature
  // per the spec's Quarterly-dashboard table — Composition's GST Summary stays plain From/To.
  const isQuarterly = mode === 'regular' && profile?.gst_filing_frequency === 'quarterly';

  // Financial Year + Refresh Data are global controls, owned by ClientPortalLayout and rendered
  // in the shared topbar (visible on every portal page) — this page reads fy/range from context
  // and registers its own load() below so the global Refresh Data button actually refreshes it.
  const { fy, range, registerRefresh } = useClientPortal();
  const quarterOptions = fyQuarterOptions(fy);

  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const fyRef = useRef(fy);
  fyRef.current = fy;

  // GST Summary carries its own adjustable period filter, independent of the FY selector above —
  // it resets to the full FY (or, for Quarterly dealers, the quarter containing today) whenever
  // the FY changes, but can be narrowed to any custom range via the From/To inputs.
  const [gstFrom, setGstFrom] = useState(range.from);
  const [gstTo, setGstTo] = useState(range.to);
  const [gstSummary, setGstSummary] = useState(null);
  const [periodSummary, setPeriodSummary] = useState(null); // Billing Overview, scoped to the selected quarter
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    const opts = fyQuarterOptions(currentFyLabel());
    return opts.find((q) => today >= q.from && today <= q.to)?.value || 'Q1';
  });

  const [compositionSummary, setCompositionSummary] = useState(null);

  const loadGstSummary = useCallback((from, to) => {
    const qs = new URLSearchParams({ from, to });
    api(`/billing/dashboard?${qs}`).then((d) => {
      setGstSummary(d.gst_dashboard);
      setPeriodSummary(d.summary);
      setCompositionSummary(d.composition_dashboard);
    }).catch(console.error);
  }, []);

  const selectQuarter = useCallback((quarterValue, fyLabel) => {
    setSelectedQuarter(quarterValue);
    const opt = fyQuarterOptions(fyLabel).find((q) => q.value === quarterValue);
    if (opt) {
      setGstFrom(opt.from);
      setGstTo(opt.to);
      loadGstSummary(opt.from, opt.to);
    }
  }, [loadGstSummary]);

  const load = useCallback(() => {
    const r = fyDateRange(fyRef.current) || currentFyRange();
    const qs = new URLSearchParams({ from: r.from, to: r.to });
    return Promise.all([
      api('/client/dashboard').then(setData),
      api(`/billing/dashboard?${qs}`).then(setBilling),
      hasGst
        ? api(`/client/gst-compliance?financial_year=${fyRef.current}`).then(setCompliance)
        : Promise.resolve(setCompliance(null)),
    ]).catch(console.error);
  }, [hasGst]);

  useEffect(() => {
    load();
    const refreshInterval = window.setInterval(load, 15000);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  // Let the shared topbar's "Refresh Data" button actually refresh this page while it's mounted.
  useEffect(() => registerRefresh(load), [registerRefresh, load]);

  useEffect(() => {
    if (isQuarterly) {
      // FY changed — re-pick the quarter containing today if this is the current FY, else Q1.
      const today = new Date().toISOString().slice(0, 10);
      const opts = fyQuarterOptions(fy);
      const next = opts.find((q) => today >= q.from && today <= q.to)?.value || 'Q1';
      selectQuarter(next, fy);
    } else {
      // FY changed — snap the GST Summary filter back to the full FY and reload it.
      setGstFrom(range.from);
      setGstTo(range.to);
      loadGstSummary(range.from, range.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fy]);

  if (!data || !billing) return <p>Loading dashboard…</p>;

  const gst = billing.gst_dashboard;
  const matchTotal = (gst?.matched_invoices || 0) + (gst?.unmatched_invoices || 0);
  const matchRate = matchTotal ? ((gst.matched_invoices / matchTotal) * 100).toFixed(2) : '0.00';
  const s = billing.summary || {};
  const gstSummaryData = gstSummary || gst;
  // Quarterly dealers' Billing Overview reflects the selected quarter, not the whole FY.
  const billingOverviewData = isQuarterly ? (periodSummary || s) : s;

  const composition = billing.composition_dashboard;
  const compositionData = compositionSummary || composition;
  const compMatchTotal = (composition?.matched_invoices || 0) + (composition?.unmatched_invoices || 0);
  const compMatchRate = compMatchTotal ? ((composition.matched_invoices / compMatchTotal) * 100).toFixed(2) : '0.00';

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--bp-navy) 0%, #1a365d 100%)', borderRadius: 16, padding: '24px 32px', color: '#fff', marginBottom: 24, boxShadow: '0 8px 24px rgba(13, 31, 60, 0.12)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
        <h1 style={{ marginTop: 0, fontSize: 24, color: '#fff', fontWeight: 800, marginBottom: 4, position: 'relative', zIndex: 1 }}>
          Welcome back, {data.profile?.business_name} <span style={{ color: '#90cdf4', fontWeight: 700 }}>({gstConfigLabel(profile)})</span>
        </h1>
        <p style={{ color: '#cbd5e1', fontSize: 13, marginTop: 8, maxWidth: 650, lineHeight: 1.5, position: 'relative', zIndex: 1 }}>
          Your dashboard automatically shows key insights for Financial Year {fy}. Track your GST position, invoices, compliance status and manage your billing efficiently.
        </p>
      </div>

      {mode === 'regular' && gst && (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: 20 }}>
          <DashCard title={returnTitle('GST Reconciliation', profile)} badge={<LiveBadge />}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <StatTile label="GSTR-2B Invoices" count={gst.total_gstr2b_invoices} value={gst.total_gstr2b_invoices} color="#2563eb" bg="rgba(37,99,235,0.08)" />
              <StatTile label="Matched" count={gst.matched_invoices} value={gst.matched_invoices} color="#15803d" bg="rgba(21,128,61,0.08)" />
              <StatTile label="Unmatched" count={gst.unmatched_invoices} value={gst.unmatched_invoices} color="#c2410c" bg="rgba(194,65,12,0.08)" />
              <StatTile label="Match Rate" count={0} value={`${matchRate}%`} color="#3730a3" bg="rgba(55,48,163,0.08)" />
            </div>
            <ViewLink to="/portal/gstr-2b">View Reconciliation Details</ViewLink>
          </DashCard>

          <DashCard title={returnTitle('GST Summary', profile)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {isQuarterly && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--bp-text)' }}>
                  Quarter
                  <select
                    className="bp-select"
                    style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700 }}
                    value={selectedQuarter}
                    onChange={(e) => selectQuarter(e.target.value, fy)}
                  >
                    {quarterOptions.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
                  </select>
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--bp-text)' }}>
                From
                <input type="date" className="bp-input" style={{ padding: '4px 8px', fontSize: 11, maxWidth: 130 }} value={gstFrom} onChange={(e) => setGstFrom(e.target.value)} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--bp-text)' }}>
                To
                <input type="date" className="bp-input" style={{ padding: '4px 8px', fontSize: 11, maxWidth: 130 }} value={gstTo} onChange={(e) => setGstTo(e.target.value)} />
              </label>
              <button type="button" className="bp-btn bp-btn-primary" style={{ padding: '5px 14px', fontSize: 11 }} onClick={() => loadGstSummary(gstFrom, gstTo)}>
                Apply
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--bp-muted)', fontWeight: 600, marginBottom: 16 }}>
              Period: {gstFrom?.split('-').reverse().join('/')} – {gstTo?.split('-').reverse().join('/')}
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <StatTile label="Output GST" count={0} value={money(gstSummaryData.output_gst)} color="#2563eb" bg="rgba(37,99,235,0.08)" />
              <StatTile label="Eligible ITC" count={0} value={money(gstSummaryData.eligible_itc)} color="#0f766e" bg="rgba(15,118,110,0.08)" />
              <StatTile label="GST Payable" count={0} value={money(gstSummaryData.gst_payable)} color="#be123c" bg="rgba(190,18,60,0.08)" />
              <StatTile label="Excess ITC Available" count={0} value={money(gstSummaryData.excess_itc)} color="#15803d" bg="rgba(21,128,61,0.08)" />
            </div>
          </DashCard>
        </div>
      )}

      {isComposition && composition && (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: 20 }}>
          <DashCard title={returnTitle('GST Reconciliation', profile)} badge={<LiveBadge />}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <StatTile label="CMP-08 Filed" count={composition.total_gstr2b_invoices} value={composition.total_gstr2b_invoices} color="#2563eb" bg="rgba(37,99,235,0.08)" />
              <StatTile label="CMP-08 Matched" count={composition.matched_invoices} value={composition.matched_invoices} color="#15803d" bg="rgba(21,128,61,0.08)" />
              <StatTile label="CMP-08 Unmatched" count={composition.unmatched_invoices} value={composition.unmatched_invoices} color="#c2410c" bg="rgba(194,65,12,0.08)" />
              <StatTile label="Match Rate" count={0} value={`${compMatchRate}%`} color="#3730a3" bg="rgba(55,48,163,0.08)" />
            </div>
            <ViewLink to="/portal/gstr-2b">View Reconciliation Details</ViewLink>
          </DashCard>

          <DashCard title={returnTitle('GST Summary', profile)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--bp-text)' }}>
                From
                <input type="date" className="bp-input" style={{ padding: '4px 8px', fontSize: 11, maxWidth: 130 }} value={gstFrom} onChange={(e) => setGstFrom(e.target.value)} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--bp-text)' }}>
                To
                <input type="date" className="bp-input" style={{ padding: '4px 8px', fontSize: 11, maxWidth: 130 }} value={gstTo} onChange={(e) => setGstTo(e.target.value)} />
              </label>
              <button type="button" className="bp-btn bp-btn-primary" style={{ padding: '5px 14px', fontSize: 11 }} onClick={() => loadGstSummary(gstFrom, gstTo)}>
                Apply
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--bp-muted)', fontWeight: 600, marginBottom: 16 }}>
              Period: {gstFrom?.split('-').reverse().join('/')} – {gstTo?.split('-').reverse().join('/')}
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <StatTile label="Turnover" count={0} value={money(compositionData.turnover)} color="#2563eb" bg="rgba(37,99,235,0.08)" />
              <StatTile label="Tax Payable (Payable under Composition)" count={0} value={money(compositionData.tax_payable)} color="#be123c" bg="rgba(190,18,60,0.08)" />
              <StatTile label="Tax Paid (through CMP-08)" count={0} value={money(compositionData.tax_paid)} color="#15803d" bg="rgba(21,128,61,0.08)" />
              <StatTile label="ITC Availed" count={0} value={money(compositionData.itc_availed)} color="#6b8499" bg="rgba(107,132,153,0.08)" />
              <StatTile label="ITC Available" count={0} value={money(compositionData.itc_available)} color="#6b8499" bg="rgba(107,132,153,0.08)" />
            </div>
          </DashCard>
        </div>
      )}

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: 20 }}>
        <DashCard
          title={freqTitle('Billing Overview', profile)}
          badge={isQuarterly ? <span style={{ fontSize: 11, color: 'var(--bp-muted)', fontWeight: 600 }}>({quarterOptions.find((q) => q.value === selectedQuarter)?.label || selectedQuarter})</span> : null}
        >
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <StatTile label="Tax Invoices" count={billingOverviewData.tax_invoices ?? 0} value={money(billingOverviewData.tax_invoices_value)} color="#2563eb" bg="rgba(37,99,235,0.08)" />
            <StatTile label="Bill of Supply" count={billingOverviewData.bill_of_supply ?? 0} value={money(billingOverviewData.bill_of_supply_value)} color="#0f766e" bg="rgba(15,118,110,0.08)" />
            <StatTile label="Debit Notes" count={billingOverviewData.debit_notes ?? 0} value={money(billingOverviewData.debit_notes_value)} color="#d97706" bg="rgba(217,119,6,0.08)" />
            <StatTile label="Credit Notes" count={billingOverviewData.credit_notes ?? 0} value={money(billingOverviewData.credit_notes_value)} color="#059669" bg="rgba(5,150,105,0.08)" />
            <StatTile label="Cancelled Invoices" count={billingOverviewData.cancelled_invoices ?? 0} value="—" color="#dc2626" bg="rgba(220,38,38,0.08)" />
          </div>
          <ViewLink to="/portal/billing">View All Documents</ViewLink>
        </DashCard>

        <DashCard title={chartFreqTitle('Sales Overview', profile)} badge={<span style={{ fontSize: 11, color: 'var(--bp-muted)', fontWeight: 600 }}>({fy === currentFyLabel() ? 'Current FY' : fy})</span>}>
          <SalesBarChart data={billing.monthly_trend} />
          <ViewLink to="/portal/reports/gst-summary">View Detailed Report</ViewLink>
        </DashCard>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {hasGst && (
          <DashCard title="Compliance Status">
            <ComplianceStatus compliance={compliance} financialYear={fy} />
            <ViewLink to="/portal/gst-returns">View Full Compliance Report</ViewLink>
          </DashCard>
        )}

        <DashCard title="Billing Workspace">
          <p style={{ color: 'var(--bp-muted)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
            Create, manage and track your billing documents.
          </p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {[
              { to: '/portal/billing/invoices/new', label: 'Tax Invoice', desc: 'Create & manage tax invoices', show: mode !== 'composition' },
              { to: '/portal/billing/bill-of-supply/new', label: 'Bill of Supply', desc: 'Create & manage bills of supply', show: mode !== 'retail' },
              { to: '/portal/billing/debit-notes/new', label: 'Debit Note', desc: 'Create debit notes', show: mode === 'regular' },
              { to: '/portal/billing/credit-notes/new', label: 'Credit Note', desc: 'Create & manage credit notes', show: mode !== 'retail' },
            ].filter((a) => a.show).map((a) => (
              <Link key={a.to} to={a.to} style={{ textDecoration: 'none', border: '1px solid var(--bp-border)', borderRadius: 10, padding: '12px 14px', display: 'block' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--bp-navy)' }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'var(--bp-muted)', marginTop: 2 }}>{a.desc}</div>
              </Link>
            ))}
          </div>
          <Link to="/portal/billing" className="bp-btn bp-btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 16, padding: '10px 20px', borderRadius: 8 }}>
            Open Billing Workspace →
          </Link>
        </DashCard>
      </div>
    </div>
  );
}

export function ClientProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api('/client/profile').then((d) => {
      const u = d.user;
      const p = u.client_profile || {};
      setProfile({
        business_name: p.business_name || '',
        client_name: p.client_name || u.name || '',
        gstin: p.gstin || '—',
        pan: p.pan || '—',
        address: p.address || '',
        city: p.city || '',
        pincode: p.pincode || '',
        state_code: [p.state_code, p.state].filter(Boolean).join(' - ') || '',
        phone: u.phone || p.mobile || '—',
        email: p.email || u.email || '—',
      });
    });
  }, []);

  if (!profile) return <p>Loading…</p>;
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 12, color: 'var(--bp-muted)', marginBottom: 12, fontWeight: 600 }}>
        <Link to="/portal" style={{ color: 'var(--bp-blue)', textDecoration: 'none' }}>Client Portal</Link>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
        Profile
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: 'var(--bp-navy)' }}>Business Profile</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            View your registered business information.
          </p>
        </div>
        <Link to="/portal" className="bp-btn bp-btn-outline">← Back to Dashboard</Link>
      </div>

      <div className="bp-alert" style={{ background: '#eaf1fb', borderColor: '#cfe0f5', color: 'var(--bp-navy)', marginBottom: 20 }}>
        <span aria-hidden="true">ⓘ</span>
        <span>This information is view-only and cannot be edited.</span>
      </div>

      <div style={{ ...card }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 800, color: 'var(--bp-navy)' }}>Business Information</h2>
        <div style={{ display: 'grid', gap: '20px 32px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {PROFILE_FIELDS.map(([key, label, Icon]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bp-sky)', color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon />
              </span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--bp-muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bp-text)' }}>{profile[key] || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function ShieldIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
    </svg>
  );
}

const PASSWORD_TIPS = [
  'Use at least 8 characters.',
  'Include uppercase (A-Z) and lowercase (a-z).',
  'Include at least one number (0-9).',
  'Include at least one special character (! @ # $ % etc.).',
  'Avoid using easily guessable information.',
];

export function ClientResetPassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdBusy(true);
    setPwdErr('');
    setSuccess(false);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: newPasswordConfirm,
        },
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (ex) {
      setPwdErr(ex.message || 'Password update failed');
    } finally {
      setPwdBusy(false);
    }
  };

  const canSubmit = currentPassword && newPassword.length >= 8 && newPasswordConfirm.length >= 8;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 12, color: 'var(--bp-muted)', marginBottom: 12, fontWeight: 600 }}>
        <Link to="/portal" style={{ color: 'var(--bp-blue)', textDecoration: 'none' }}>Client Portal</Link>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
        Change Password
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: 'var(--bp-navy)' }}>Change Password</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            Update your account password to keep your account secure.
          </p>
        </div>
        <Link to="/portal" className="bp-btn bp-btn-outline">← Back to Dashboard</Link>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(280px, 1.3fr) minmax(220px, 1fr)', alignItems: 'start' }}>
        <div style={card}>
          <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 800, color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockIcon /> Change Your Password
          </h2>
          <form onSubmit={changePassword} style={{ display: 'grid', gap: 16 }}>
            <PasswordField
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your current password"
              icon={<LockIcon size={15} />}
            />
            <div>
              <PasswordField
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Enter your new password"
                icon={<LockIcon size={15} />}
              />
              <span style={{ display: 'block', fontSize: 11, color: 'var(--bp-muted)', marginTop: 6, lineHeight: 1.5 }}>
                Password must be at least 8 characters long with uppercase, lowercase, number and special character.
              </span>
            </div>
            <PasswordField
              label="Confirm New Password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              icon={<LockIcon size={15} />}
            />

            {pwdErr && <p className="bp-alert bp-alert-error" style={{ margin: 0 }}>{pwdErr}</p>}

            <button
              type="submit"
              className="bp-btn bp-btn-primary"
              disabled={pwdBusy || !canSubmit}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {pwdBusy ? 'Updating…' : (<><LockIcon size={14} /> Change Password</>)}
            </button>
          </form>
        </div>

        <div style={{ ...card, background: '#eef4fc', border: '1px solid #d7e6f7' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldIcon /> Password Security Tips
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {PASSWORD_TIPS.map((tip) => (
              <li key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--bp-text)', lineHeight: 1.4 }}>
                <span style={{ color: '#15803d', flexShrink: 0, fontWeight: 800 }}>✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {success && (
        <div style={{ marginTop: 20, background: '#eafaf0', border: '1px solid #bfe6d1', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800 }}>✓</span>
          <div>
            <div style={{ fontWeight: 800, color: '#15803d', fontSize: 14 }}>Password Changed Successfully!</div>
            <div style={{ fontSize: 12.5, color: 'var(--bp-muted)', marginTop: 2 }}>
              Your password has been updated successfully. You can now login with your new password.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            aria-label="Dismiss"
            style={{ position: 'absolute', top: 12, right: 16, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--bp-muted)', fontSize: 16 }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export function ClientDocuments() {
  return null;
}

export function ClientCompliance() {
  return null;
}
