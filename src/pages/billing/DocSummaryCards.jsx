const ICON_PROPS = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

function StackIcon() {
  return <svg {...ICON_PROPS}><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="M3 12l9 4.5L21 12M3 16.5l9 4.5 9-4.5" /></svg>;
}
function DocIcon() {
  return <svg {...ICON_PROPS}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>;
}
function SheetIcon() {
  return <svg {...ICON_PROPS}><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 10h16M4 15h16M10 4v16" /></svg>;
}
function DocPlusIcon() {
  return <svg {...ICON_PROPS}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M12 12v5M9.5 14.5h5" /></svg>;
}
function DocMinusIcon() {
  return <svg {...ICON_PROPS}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 14.5h5" /></svg>;
}

const CARD_DEFS = [
  { key: 'total', label: 'Total Documents', Icon: StackIcon, color: '#2563eb', bg: '#e8f0fe' },
  { key: 'tax_invoice', label: 'Tax Invoices', Icon: DocIcon, color: '#2563eb', bg: '#e8f0fe' },
  { key: 'bill_of_supply', label: 'Bills of Supply', Icon: SheetIcon, color: '#15803d', bg: '#e6f7ec' },
  { key: 'debit_note', label: 'Debit Notes', Icon: DocPlusIcon, color: '#7c3aed', bg: '#f1e9fd' },
  { key: 'credit_note', label: 'Credit Notes', Icon: DocMinusIcon, color: '#dc2626', bg: '#fee2e2' },
];

/** Billing Module spec §24 — Summary cards reacting to the current FY/date/status/search filters. */
export default function DocSummaryCards({ typeCounts }) {
  const counts = {
    tax_invoice: typeCounts?.tax_invoice ?? 0,
    bill_of_supply: typeCounts?.bill_of_supply ?? 0,
    debit_note: typeCounts?.debit_note ?? 0,
    credit_note: typeCounts?.credit_note ?? 0,
  };
  counts.total = counts.tax_invoice + counts.bill_of_supply + counts.debit_note + counts.credit_note;

  return (
    <div className="bp-summary-cards">
      {CARD_DEFS.map(({ key, label, Icon, color, bg }) => (
        <div key={key} className="bp-summary-card">
          <span className="bp-summary-card-icon" style={{ background: bg, color }}><Icon /></span>
          <div>
            <div className="bp-summary-card-label">{label}</div>
            <div className="bp-summary-card-value">{counts[key]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
