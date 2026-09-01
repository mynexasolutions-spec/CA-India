import { periodLabel } from '../billing/billingUtils';

function formatIsoDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

const CARD_ICONS = {
  dealer: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  frequency: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  lastFiled: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  nextDue: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

/** The 4 summary cards (Dealer Type / Filing Frequency / Last Filed Return / Next Due
 * Date) shown atop each GST Returns tab — visual reference: the two reference
 * screenshots in the client's spec PDF. Values are per-active-return-type (GSTR-1's
 * own last-filed/next-due differ from GSTR-3B's), fed by
 * GET /client/gst-filing/periods's `summary` block. */
export default function GstReturnsSummaryCards({ summary, returnType }) {
  const s = summary || {};

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: 12,
        padding: '16px 0',
        marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderRight: '1px solid #cbd5e1' }}>
        <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
          {CARD_ICONS.dealer}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Dealer Type</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af', textTransform: 'capitalize' }}>
            {s.dealer_type ? `${s.dealer_type} Dealer` : 'Regular Dealer'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderRight: '1px solid #cbd5e1' }}>
        <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
          {CARD_ICONS.frequency}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Filing Frequency</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>{s.filing_frequency_label || 'Monthly'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderRight: '1px solid #cbd5e1' }}>
        <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
          {CARD_ICONS.lastFiled}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Last Filed Return</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>
            {s.last_filed ? `${periodLabel(s.last_filed.period)} (${returnType})` : 'None on record'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
        <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
          {CARD_ICONS.nextDue}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>Next Due Date</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>
            {s.next_due ? formatIsoDate(s.next_due.date) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
