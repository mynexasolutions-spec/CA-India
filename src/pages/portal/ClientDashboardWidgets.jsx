import { useState } from 'react';
import { money } from '../billing/billingUtils';

/** Compact ₹ value for chart axis / bar labels (e.g. 12.4L, 3.2Cr). */
export function shortMoney(n) {
  const v = Number(n || 0);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(v / 1e3).toFixed(1)}k`;
  return money(v);
}

const CARD_STYLE = {
  background: '#fff',
  borderRadius: 16,
  padding: '20px 24px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
  border: '1px solid rgba(0,0,0,0.05)',
};

export function DashCard({ title, icon, iconColor = '#2563eb', badge, action, children, style }) {
  return (
    <section className="bp-dash-card" style={{ ...CARD_STYLE, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && (
            <span style={{ width: 30, height: 30, borderRadius: 9, background: iconColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 6px ${iconColor}55` }}>
              {icon}
            </span>
          )}
          {title}
          {badge}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LiveBadge({ children = 'Live data · updates every 15s' }) {
  return (
    <span style={{ fontSize: 10, background: '#e0e7ff', color: '#3730a3', padding: '3px 10px 3px 8px', borderRadius: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', boxShadow: '0 0 0 3px rgba(79,70,229,0.25)', flexShrink: 0 }} />
      {children}
    </span>
  );
}

const CHART_W = 720;
const CHART_H = 220;

/** Bold value box shown above a bar on hover, positioned by % so it tracks the
 * bar regardless of the SVG's actual rendered pixel size (viewBox scales uniformly). */
function ChartTooltip({ hover }) {
  if (!hover) return null;
  const leftPct = (hover.x / CHART_W) * 100;
  const topPct = (hover.topY / CHART_H) * 100;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: 'translate(-50%, calc(-100% - 10px))',
        background: '#fff',
        border: `1px solid ${hover.color}33`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: '0 8px 20px rgba(13, 31, 60, 0.18)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 5,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--bp-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {hover.label} · {hover.seriesLabel}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: hover.color, lineHeight: 1.3 }}>
        {money(hover.value)}
      </div>
    </div>
  );
}

/** Monthly / quarterly Taxable Value + GST Amount bars, pure inline SVG (no chart library),
 * with a custom bold tooltip that appears immediately on hover instead of the browser's
 * slow-to-appear native SVG <title> tooltip. */
export function SalesBarChart({ data }) {
  const rows = Array.isArray(data) ? data : [];
  const [hover, setHover] = useState(null);
  if (!rows.length) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 12px 8px' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <p style={{ color: 'var(--bp-muted)', fontSize: 13, margin: 0 }}>No billing activity yet for this period.</p>
      </div>
    );
  }

  const max = Math.max(1, ...rows.map((r) => Math.max(r.taxable_value || 0, r.gst_amount || 0)));
  const padLeft = 8;
  const padTop = 34; // headroom so the tallest bar's tooltip never needs to render above the chart
  const padBottom = 8; // month labels now render as HTML below the SVG, not as SVG <text>
  const chartH = CHART_H - padBottom;
  const groupW = (CHART_W - padLeft) / rows.length;
  const barW = Math.min(16, groupW / 3.2);

  const showTip = (x, topY, label, seriesLabel, value, color) =>
    setHover({ x, topY, label, seriesLabel, value, color });

  return (
    // The tooltip lives in this outer, non-scrolling wrapper (not the overflow-x:auto one below) —
    // `overflow-x: auto` implicitly forces `overflow-y` to clip too, which was hiding the tooltip
    // whenever a bar (like the tall Taxable Value bar) reached near the top of the chart.
    <div style={{ position: 'relative' }}>
      <ChartTooltip hover={hover} />
      {/* Plain HTML div for the leave handler — SVG elements can miss mouseleave when the
          cursor exits fast across a child shape's edge; a wrapping HTML div doesn't have that quirk. */}
      <div style={{ overflowX: 'auto' }} onMouseLeave={() => setHover(null)}>
        <div style={{ minWidth: 560 }}>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            role="img"
            aria-label="Monthly sales overview"
          >
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1={padLeft} x2={CHART_W} y1={chartH - (chartH - padTop) * f} y2={chartH - (chartH - padTop) * f} stroke="#eef2f7" strokeWidth="1" />
            ))}
            {rows.map((r, i) => {
              const x = padLeft + i * groupW + groupW / 2;
              const tH = ((r.taxable_value || 0) / max) * (chartH - padTop);
              const gH = ((r.gst_amount || 0) / max) * (chartH - padTop);
              const tX = x - barW - 2;
              const gX = x + 2;
              return (
                <g key={r.period}>
                  <rect
                    x={tX} y={chartH - tH} width={barW} height={Math.max(tH, 1)} rx="3" fill="#2563eb"
                    onMouseEnter={() => showTip(tX + barW / 2, chartH - tH, r.label, 'Taxable Value', r.taxable_value, '#2563eb')}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}
                  />
                  <rect
                    x={gX} y={chartH - gH} width={barW} height={Math.max(gH, 1)} rx="3" fill="#15803d"
                    onMouseEnter={() => showTip(gX + barW / 2, chartH - gH, r.label, 'GST Amount', r.gst_amount, '#15803d')}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              );
            })}
          </svg>
          {/* Month labels as plain HTML, not SVG <text> — an SVG scales its whole coordinate
              system (viewBox) to fit the card, which was quietly shrinking "10px" text below its
              true rendered size whenever the card was narrower than the chart's 720-unit viewBox.
              HTML text has no such scaling, so this renders at the exact same size as the
              GSTR-1 / GSTR-3B period labels below. */}
          <div style={{ display: 'flex', marginTop: 4 }}>
            {rows.map((r) => (
              <span key={r.period} style={{ flex: '1 0 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#000' }}>
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--bp-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#2563eb', display: 'inline-block' }} /> Taxable Value
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#15803d', display: 'inline-block' }} /> GST Amount
        </span>
      </div>
    </div>
  );
}

/** filed = actually filed. pending = past due date and still not filed (overdue).
 * upcoming = due date hasn't arrived yet — not late, just not due. */
const STATUS_STYLE = {
  filed: { bg: '#dcfce7', fg: '#15803d', icon: '✓', text: 'Filed' },
  pending: { bg: '#fef3c7', fg: '#b45309', icon: '!', text: 'Pending' },
  upcoming: { bg: '#e2e8f0', fg: '#475569', icon: '•', text: 'Upcoming' },
};

function shortDueDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

function PeriodCard({ period }) {
  const s = STATUS_STYLE[period.status] || STATUS_STYLE.upcoming;
  return (
    <div
      className="bp-period-card"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        flexShrink: 0, minWidth: 80, padding: '12px 8px 10px',
        background: s.bg, borderRadius: 12, border: `1px solid ${s.fg}26`,
        scrollSnapAlign: 'start',
      }}
    >
      <span style={{ fontSize: 11.5, color: 'var(--bp-navy)', fontWeight: 800 }}>{period.label}</span>
      <span style={{
        width: 28, height: 28, borderRadius: '50%', background: '#fff', color: s.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, border: `1.5px solid ${s.fg}44`, flexShrink: 0,
      }}>
        {s.icon}
      </span>
      <span style={{ fontSize: 10, color: s.fg, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.text}</span>
      {period.due_date && <span style={{ fontSize: 9, color: 'var(--bp-muted)', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>Due {shortDueDate(period.due_date)}</span>}
    </div>
  );
}

/** One GSTR-1 or GSTR-3B row: a period-by-period filed/pending/upcoming strip, each with its
 * due date, + X/Total filed count. */
function ComplianceRow({ label, row }) {
  if (!row) return null;
  const allFiled = row.total > 0 && row.filed_count === row.total;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--bp-navy)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
          background: allFiled ? '#dcfce7' : '#eff6ff', color: allFiled ? '#15803d' : '#2563eb',
        }}>
          {row.filed_count}/{row.total} filed
        </span>
      </div>
      <div className="bp-compliance-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x proximity' }}>
        {row.periods.map((p) => <PeriodCard key={p.period} period={p} />)}
      </div>
    </div>
  );
}

export function ComplianceStatus({ compliance, financialYear, locked = false }) {
  if (locked) {
    return (
      <p style={{ color: 'var(--bp-muted)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
        GST Compliance isn't included in your current subscription. See "View Full Compliance Report" below for details.
      </p>
    );
  }
  if (!compliance) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ height: 14, borderRadius: 6, background: '#f1f5f9', width: i === 0 ? '40%' : '100%' }} />
        ))}
        <p style={{ color: 'var(--bp-muted)', fontSize: 13, margin: '4px 0 0' }}>Loading compliance status…</p>
      </div>
    );
  }
  // GSTR-1 and GSTR-3B are tracked on independent cycles (QRMP allows monthly GSTR-1 via IFF
  // alongside quarterly GSTR-3B) — each row's label reflects only its own frequency.
  const cycleLabel = (f) => (f === 'quarterly' ? 'Quarterly' : 'Monthly');
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--bp-muted)', marginBottom: 12, fontWeight: 600 }}>
        Financial Year {financialYear}
      </div>
      {compliance.cmp08 ? (
        // Composition dealers file CMP-08, not GSTR-1/GSTR-3B — a single row, always quarterly.
        <ComplianceRow label="CMP-08 (Quarterly)" row={compliance.cmp08} />
      ) : (
        <>
          <ComplianceRow label={`GSTR-1 (${compliance.gstr1_frequency === 'quarterly' ? 'Quarterly' : 'QRMP'})`} row={compliance.gstr1} />
          <ComplianceRow label={`GSTR-3B (${cycleLabel(compliance.gstr3b_frequency)})`} row={compliance.gstr3b} />
        </>
      )}
    </div>
  );
}
