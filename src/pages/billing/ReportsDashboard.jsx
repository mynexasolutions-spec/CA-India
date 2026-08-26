import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { billingMode } from './billingProfile';
import { currentFyRange, money } from './billingUtils';
import { resolveGstMatrix, GST_MATRIX_COLS } from './GstSummaryMatrix';

/* ── Icons ─────────────────────────────────────────────────── */
function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function FunnelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h14l-5.5 6.5V16l-3 1.5v-7L3 4Z"/>
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

/* ── KPI icons (white on solid) ───────────────────────────────── */
const SalesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="3" width="18" height="26" rx="3" stroke="white" strokeWidth="1.7" fill="none"/>
    <line x1="11" y1="11" x2="21" y2="11" stroke="white" strokeWidth="1.5"/>
    <line x1="11" y1="15" x2="21" y2="15" stroke="white" strokeWidth="1.5"/>
    <line x1="11" y1="19" x2="17" y2="19" stroke="white" strokeWidth="1.5"/>
  </svg>
);
const TaxableIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 3h10l6 6v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="white" strokeWidth="1.7" fill="none"/>
    <path d="M19 3v6h6" stroke="white" strokeWidth="1.5" fill="none"/>
    <line x1="12" y1="18" x2="20" y2="18" stroke="white" strokeWidth="1.4"/>
    <line x1="12" y1="22" x2="17" y2="22" stroke="white" strokeWidth="1.4"/>
  </svg>
);
const RupeeCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="1.8" fill="none"/>
    <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="800" fill="white" stroke="none">₹</text>
  </svg>
);
const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="28" height="20" rx="3" stroke="white" strokeWidth="1.7" fill="none"/>
    <path d="M2 14h28" stroke="white" strokeWidth="1.5"/>
    <circle cx="23" cy="21" r="3" fill="white" fillOpacity="0.4" stroke="white" strokeWidth="1"/>
    <path d="M8 4h16a2 2 0 0 1 2 2v2H6V6a2 2 0 0 1 2-2z" stroke="white" strokeWidth="1.3" fill="none"/>
  </svg>
);

/* ── Report card icons (accent-colored, on tinted circle) ─────── */
const GstSummaryIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h10l6 6v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
    <path d="M19 3v6h6"/>
    <path d="M11 22l3-3 2 2 4-4" strokeWidth="2"/>
  </svg>
);
const GstLiabilityIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M25 11a9 9 0 1 0 1.5 8.5"/>
    <polyline points="26 4 26.5 11 19.5 10.5"/>
    <text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="800" fill={color} stroke="none">₹</text>
  </svg>
);
const HsnTagIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16.5V6a2 2 0 0 1 2-2h10.5L28 15.5a2 2 0 0 1 0 3L17.5 29a2 2 0 0 1-3 0L4 18.5a2 2 0 0 1 0-2z"/>
    <circle cx="11" cy="11" r="2.3" fill={color} stroke="none"/>
  </svg>
);
const PeopleIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="5"/><circle cx="22" cy="10" r="4"/>
    <path d="M2 26c0-5.5 4.5-9 10-9s10 3.5 10 9"/>
    <path d="M22 17c3 .5 6 2.5 6 7"/>
  </svg>
);
const ClipboardIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="5" width="20" height="24" rx="2"/>
    <rect x="11" y="2" width="10" height="5" rx="1.5" fill={color} stroke="none"/>
    <line x1="11" y1="14" x2="21" y2="14"/><line x1="11" y1="19" x2="21" y2="19"/><line x1="11" y1="24" x2="17" y2="24"/>
  </svg>
);

function fmt(n) { return money(Number(n) || 0); }

export default function ReportsDashboard() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const navigate = useNavigate();
  const hasGst = Boolean(profile?.has_gst);
  const mode = billingMode(profile);

  const fyDefault = currentFyRange();

  const [from, setFrom] = useState(fyDefault.from);
  const [to, setTo]     = useState(fyDefault.to);
  const [activeQuick, setActiveQuick] = useState('fy');

  const [gstData, setGstData] = useState(null);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const run = () => {
    setErr('');
    setLoading(true);
    const qs = new URLSearchParams({ from, to });
    Promise.all([
      api(`/billing/reports?type=gst_summary&${qs}`),
      api(`/billing/reports?type=outstanding_report&${qs}`),
    ])
      .then(([gst, outstanding]) => {
        setGstData(gst);
        const rows = Array.isArray(outstanding?.data) ? outstanding.data : [];
        setOutstandingTotal(rows.reduce((s, r) => s + Number(r.grand_total || r.total_amount || 0), 0));
      })
      .catch((e) => setErr(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { run(); }, []);

  const applyCurrentMonth = () => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1;
    const mStr = String(m).padStart(2, '0');
    const last = new Date(y, m, 0).getDate();
    setFrom(`${y}-${mStr}-01`); setTo(`${y}-${mStr}-${String(last).padStart(2, '0')}`);
    setActiveQuick('current');
  };
  const applyPreviousMonth = () => {
    const now = new Date(); now.setMonth(now.getMonth() - 1);
    const y = now.getFullYear(), m = now.getMonth() + 1;
    const mStr = String(m).padStart(2, '0');
    const last = new Date(y, m, 0).getDate();
    setFrom(`${y}-${mStr}-01`); setTo(`${y}-${mStr}-${String(last).padStart(2, '0')}`);
    setActiveQuick('prev');
  };
  const applyCurrentFy = () => {
    const next = currentFyRange();
    setFrom(next.from); setTo(next.to); setActiveQuick('fy');
  };
  const handleClear = () => {
    const next = currentFyRange();
    setFrom(next.from); setTo(next.to); setActiveQuick('fy');
    setTimeout(run, 0);
  };

  const matrix = resolveGstMatrix(gstData, profile);
  // Credit Notes reduce value, so they're subtracted rather than added when combining
  // across document types — same rule as the GST Summary report.
  const sumRow = (key) => GST_MATRIX_COLS.reduce(
    (acc, [col]) => acc + (col === 'credit_note' ? -1 : 1) * (matrix[col]?.[key] ?? 0),
    0
  );
  const totalGross   = sumRow('total_invoice_value');
  const totalTaxable = sumRow('taxable_value');
  const gstCollected = sumRow('cgst') + sumRow('sgst') + sumRow('igst');

  const REPORT_CARDS = [
    {
      key: 'gst-summary',
      show: hasGst,
      to: '/portal/reports/gst-summary',
      title: 'GST Summary',
      desc: 'View taxable value, CGST, SGST/UTGST, IGST and gross value by document type.',
      icon: GstSummaryIcon,
      color: '#2563eb',
      bg: '#eff6ff',
      iconBg: '#dbeafe',
    },
    {
      key: 'gst-liability',
      show: mode === 'regular',
      to: '/portal/reports/gst-liability',
      title: 'GST Liability',
      desc: 'Analyse output GST, eligible ITC, net GST liability and GST payable.',
      icon: GstLiabilityIcon,
      color: '#16a34a',
      bg: '#f0fdf4',
      iconBg: '#dcfce7',
    },
    {
      key: 'hsn-summary',
      show: hasGst,
      to: '/portal/reports/hsn-summary',
      title: 'HSN / SAC Summary',
      desc: 'View HSN/SAC-wise quantity, taxable value, GST rate and tax breakup.',
      icon: HsnTagIcon,
      color: '#ea580c',
      bg: '#fff7ed',
      iconBg: '#fed7aa',
    },
    {
      key: 'party-wise',
      show: true,
      to: '/portal/reports/party-wise',
      title: 'Party-wise Detail',
      desc: 'Analyse party-wise documents, taxable value and total billing.',
      icon: PeopleIcon,
      color: '#7c3aed',
      bg: '#faf5ff',
      iconBg: '#e9d5ff',
    },
    {
      key: 'outstanding',
      show: true,
      to: '/portal/reports/outstanding',
      title: 'Outstanding',
      desc: 'Track unpaid invoices, due dates, overdue amounts and payment status.',
      icon: ClipboardIcon,
      color: '#ef4444',
      bg: '#fef2f2',
      iconBg: '#fee2e2',
    },
  ].filter((c) => c.show);

  return (
    <div style={{ maxWidth: '100%' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--bp-navy)' }}>Reports</h2>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
          Business, GST &amp; receivables reports — all in one place.
        </p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', background: 'linear-gradient(145deg,#eff6ff,#dbeafe)', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px #2563eb44' }}>
            <SalesIcon />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Total Sales (Gross)</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--bp-navy)', lineHeight: 1.1 }}>{loading ? '…' : fmt(totalGross)}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Total gross value of all documents</div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'linear-gradient(145deg,#f0fdf4,#dcfce7)', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px #16a34a44' }}>
            <TaxableIcon />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Taxable Value</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--bp-navy)', lineHeight: 1.1 }}>{loading ? '…' : fmt(totalTaxable)}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Total taxable value</div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'linear-gradient(145deg,#fff7ed,#fed7aa)', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px #ea580c44' }}>
            <RupeeCircleIcon />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>GST Collected</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--bp-navy)', lineHeight: 1.1 }}>{loading ? '…' : fmt(gstCollected)}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Total GST (CGST + SGST + IGST)</div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'linear-gradient(145deg,#faf5ff,#e9d5ff)', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px #7c3aed44' }}>
            <WalletIcon />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Outstanding</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--bp-navy)', lineHeight: 1.1 }}>{loading ? '…' : fmt(outstandingTotal)}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Total unpaid amount</div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div className="bp-card" style={{ marginBottom: 24, padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          {[
            { id: 'current', label: 'Current Month', action: applyCurrentMonth },
            { id: 'prev',    label: 'Previous Month', action: applyPreviousMonth },
          ].map(({ id, label, action }) => (
            <button key={id} type="button" onClick={action} style={{
              height: 36, padding: '0 14px', borderRadius: 8, whiteSpace: 'nowrap',
              border: '1.5px solid ' + (activeQuick === id ? '#2563eb' : '#e2e8f0'),
              background: activeQuick === id ? '#eff6ff' : '#fff',
              color: activeQuick === id ? '#2563eb' : 'var(--bp-text)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>{label}</button>
          ))}
          <button type="button" onClick={applyCurrentFy} style={{
            height: 36, padding: '0 14px', borderRadius: 8, whiteSpace: 'nowrap',
            border: '1.5px solid ' + (activeQuick === 'fy' ? '#2563eb' : '#e2e8f0'),
            background: activeQuick === 'fy' ? '#eff6ff' : '#fff',
            color: activeQuick === 'fy' ? '#2563eb' : 'var(--bp-text)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><CalendarIcon /> Financial Year</button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--bp-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</span>
            <input type="date" className="bp-input" style={{ height: 36, minWidth: 148 }} value={from}
              onChange={(e) => { setFrom(e.target.value); setActiveQuick(''); }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--bp-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</span>
            <input type="date" className="bp-input" style={{ height: 36, minWidth: 148 }} value={to}
              onChange={(e) => { setTo(e.target.value); setActiveQuick(''); }} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button type="button" disabled={loading} onClick={run}
              style={{ height: 36, padding: '0 18px', borderRadius: 8, background: '#0052cc', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              <FunnelIcon /> Apply Filters
            </button>
            <button type="button" onClick={handleClear}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: 'var(--bp-text)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear
            </button>
          </div>
        </div>
        {err && <p style={{ color: '#ef4444', margin: '10px 0 0', fontSize: 13 }}>{err}</p>}
      </div>

      {/* ── Reports Grid ───────────────────────────────────── */}
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--bp-navy)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
        Reports
      </div>
      <div className="bp-stat-grid-3" style={{ gap: 16 }}>
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key}
              style={{ background: card.bg, borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.05)', padding: 20, cursor: 'pointer' }}
              onClick={() => navigate(card.to)}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon color={card.color} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: card.color, marginBottom: 6 }}>{card.title}</div>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5, minHeight: 40 }}>{card.desc}</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: card.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                Open Report <ArrowRightIcon />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
